"""
Rule-based parser for extracting candidate measurement values from OCR text variants.
Provides confidence scores and candidates for parent review.
"""
import re
from decimal import Decimal, InvalidOperation
from collections import defaultdict


def parse_measurement_variants(variants_text_list):
    """
    Parse raw OCR text from multiple variants/pages and extract candidates.
    variants_text_list: list of dicts [{'text': '...', 'variant': '...', 'page': 1}, ...]
    
    Returns a dict with:
        - extracted_data: dict of field_name -> candidate structure
        - warnings: list of warning messages
    """
    extracted = {
        'date_recorded': _process_field(variants_text_list, _extract_date_candidates),
        'weight_kg': _process_field(variants_text_list, _extract_weight_candidates),
        'height_cm': _process_field(variants_text_list, _extract_height_candidates),
        'head_circumference_cm': _process_field(variants_text_list, _extract_hc_candidates),
    }
    warnings = []

    # Count how many fields have a best_guess
    field_count = sum(1 for k, v in extracted.items() if v.get('best_guess'))
    ambiguous_count = sum(1 for k, v in extracted.items() if v.get('requires_confirmation'))

    if field_count == 0:
        warnings.append(
            "L'extraction automatique n'a pas permis d'identifier des valeurs fiables. "
            "Saisissez ou vérifiez les mesures manuellement."
        )
    elif ambiguous_count > 0:
        warnings.append(
            "Certaines valeurs extraites sont ambiguës ou contradictoires. "
            "Veuillez les vérifier attentivement avant de confirmer."
        )
    else:
        warnings.append(
            "Veuillez vérifier toutes les valeurs extraites avant de les enregistrer. "
            "L'extraction OCR est approximative et peut contenir des erreurs."
        )

    return {'extracted_data': extracted, 'warnings': warnings}


def _process_field(variants, extraction_func):
    """
    Runs extraction_func across all variants, merges duplicates, scores confidence,
    and structures the result.
    """
    all_candidates = []
    
    for v in variants:
        text = v['text']
        if not text.strip():
            continue
            
        cands = extraction_func(text)
        for c in cands:
            c['variant'] = v['variant']
            c['page'] = v['page']
            all_candidates.append(c)
            
    return _consolidate_candidates(all_candidates)


def _consolidate_candidates(candidates):
    """
    Merge identical values from different variants.
    Boost confidence if multiple variants agree.
    Determine best guess and ambiguity.
    """
    if not candidates:
        return {'candidates': [], 'best_guess': None, 'requires_confirmation': False}
        
    grouped = defaultdict(list)
    for c in candidates:
        grouped[c['value']].append(c)
        
    merged_candidates = []
    for val, group in grouped.items():
        # Base confidence on the highest pattern confidence in the group
        conf_levels = [c['confidence_level'] for c in group]
        if 'high' in conf_levels:
            best_conf = 'high'
        elif 'medium' in conf_levels:
            best_conf = 'medium'
        else:
            best_conf = 'low'
            
        reasons = set(r for c in group for r in c['reasons'])
        variants = list(set(c['variant'] for c in group))
        
        if len(variants) > 1:
            reasons.add('multiple_variants_agree')
            # Boost confidence if multiple variants agree
            if best_conf == 'low': best_conf = 'medium'
            elif best_conf == 'medium': best_conf = 'high'
            
        # Pick the best representative raw_match (longest or first)
        raw_match = group[0]['raw_match']
        
        merged_candidates.append({
            'value': val,
            'raw_match': raw_match,
            'page': group[0]['page'], # Just take the first page found
            'variants': variants,
            'confidence_level': best_conf,
            'reasons': list(reasons)
        })
        
    # Sort by confidence (high > medium > low) and then by number of variants agreeing
    conf_score = {'high': 3, 'medium': 2, 'low': 1}
    merged_candidates.sort(key=lambda x: (conf_score[x['confidence_level']], len(x['variants'])), reverse=True)
    
    best_guess = merged_candidates[0]['value']
    
    # Check ambiguity: if top 2 candidates have the same confidence score
    requires_confirmation = False
    if len(merged_candidates) > 1:
        if conf_score[merged_candidates[0]['confidence_level']] == conf_score[merged_candidates[1]['confidence_level']]:
            if merged_candidates[0]['confidence_level'] in ['high', 'medium']:
                requires_confirmation = True

    return {
        'candidates': merged_candidates,
        'best_guess': best_guess,
        'requires_confirmation': requires_confirmation
    }


def _extract_date_candidates(text):
    candidates = []
    # DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    for match in re.finditer(r'(\d{2})[/\-.](\d{2})[/\-.](\d{4})', text):
        day, month, year = match.group(1), match.group(2), match.group(3)
        if _is_valid_date(year, month, day):
            candidates.append({
                'value': f"{year}-{month}-{day}",
                'raw_match': match.group(0),
                'confidence_level': 'high',
                'reasons': ['standard_date_format']
            })
            
    # YYYY-MM-DD
    for match in re.finditer(r'(\d{4})-(\d{2})-(\d{2})', text):
        year, month, day = match.group(1), match.group(2), match.group(3)
        if _is_valid_date(year, month, day):
            candidates.append({
                'value': f"{year}-{month}-{day}",
                'raw_match': match.group(0),
                'confidence_level': 'high',
                'reasons': ['iso_date_format']
            })
    return candidates


def _extract_weight_candidates(text):
    patterns = [
        # High confidence: label + value + unit
        (r'(?:poids|pds|weight|masse)\s*[:=]?\s*(\d+[.,]?\d*)\s*(?:kg)', 'high', ['label_detected', 'unit_detected']),
        # Medium confidence: label + value
        (r'(?:poids|pds|weight|masse)\s*[:=]?\s*(\d+[.,]?\d*)', 'medium', ['label_detected']),
        # Low confidence: value + unit only
        (r'(\d+[.,]?\d*)\s*kg', 'low', ['unit_detected']),
    ]
    return _extract_numeric_candidates(text, patterns)


def _extract_height_candidates(text):
    patterns = [
        (r'(?:taille|longueur|height|length|stature)\s*[:=]?\s*(\d+[.,]?\d*)\s*(?:cm)', 'high', ['label_detected', 'unit_detected']),
        (r'(?:taille|longueur|height|length|stature)\s*[:=]?\s*(\d+[.,]?\d*)', 'medium', ['label_detected']),
        (r'(\d+[.,]?\d*)\s*cm', 'low', ['unit_detected']),
    ]
    return _extract_numeric_candidates(text, patterns, exclude=[r'(?:p[ée]rim[eè]tre|pc|hc|cranien)'])


def _extract_hc_candidates(text):
    patterns = [
        (r'(?:p[ée]rim[eè]tre\s*cr[aâ]nien|pc|hc|head\s*circumference)\s*[:=]?\s*(\d+[.,]?\d*)\s*(?:cm)', 'high', ['label_detected', 'unit_detected']),
        (r'(?:p[ée]rim[eè]tre\s*cr[aâ]nien|pc|hc|head\s*circumference)\s*[:=]?\s*(\d+[.,]?\d*)', 'medium', ['label_detected']),
    ]
    return _extract_numeric_candidates(text, patterns)


def _extract_numeric_candidates(text, pattern_configs, exclude=None):
    candidates = []
    text_lower = text.lower()
    
    for pattern, conf, reasons in pattern_configs:
        for match in re.finditer(pattern, text_lower):
            raw_match = match.group(0)
            
            # Skip if it matches exclusion words nearby (very simplistic check)
            if exclude:
                skip = False
                for ex in exclude:
                    # Check 20 chars before
                    start_idx = max(0, match.start() - 20)
                    if re.search(ex, text_lower[start_idx:match.start()]):
                        skip = True
                        break
                if skip: continue
                
            raw_value = match.group(1).replace(',', '.')
            try:
                value = Decimal(raw_value)
                if 0 < value < 999:
                    str_val = str(value.quantize(Decimal('0.01'))) if value % 1 != 0 else str(int(value))
                    # Re-format slightly for consistency (always 2 decimals for our DB)
                    str_val = str(Decimal(str_val).quantize(Decimal('0.01')))
                    candidates.append({
                        'value': str_val,
                        'raw_match': raw_match,
                        'confidence_level': conf,
                        'reasons': reasons
                    })
            except (InvalidOperation, ValueError):
                continue
                
    return candidates


def _is_valid_date(year_str, month_str, day_str):
    try:
        year, month, day = int(year_str), int(month_str), int(day_str)
        return 1900 <= year <= 2100 and 1 <= month <= 12 and 1 <= day <= 31
    except (ValueError, TypeError):
        return False
