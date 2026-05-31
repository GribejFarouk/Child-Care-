import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, Camera, Check, Edit3, Save, Trash2, Eye, RefreshCw, AlertTriangle, CheckCircle2, Image as ImageIcon, X } from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import SectionHeader from '../../components/ui/SectionHeader';
import { staggerContainer, fadeUp } from '../../utils/motionPresets';
import { extractOcr, listOcrImports, confirmOcrImport } from '../../api/ocr';
import { listChildren } from '../../api/children';
import { listMeasurements } from '../../api/measurements';
import { analyzeMeasurement } from '../../api/analytics';

export default function OcrImportPage() {
  const fileInputRef = useRef(null);
  const [step, setStep] = useState('upload'); // upload, processing, review, saved, error
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [importId, setImportId] = useState(null);
  
  const [extractedData, setExtractedData] = useState(null);
  const [editData, setEditData] = useState({});
  const [selectedChild, setSelectedChild] = useState(null);
  const [children, setChildren] = useState([]);
  const [history, setHistory] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [warnings, setWarnings] = useState([]);
  const [rawText, setRawText] = useState('');
  const [showRawText, setShowRawText] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [reviewedFields, setReviewedFields] = useState(new Set());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const kids = await listChildren();
        setChildren(kids);
        if (kids.length > 0) setSelectedChild(kids[0].id);

        const ocrHist = await listOcrImports();
        setHistory(ocrHist);
      } catch (err) {
        console.error("Failed to load initial data", err);
      }
    };
    fetchData();
  }, []);

  // Cleanup object URL
  useEffect(() => {
    return () => {
      if (filePreview) URL.revokeObjectURL(filePreview);
    };
  }, [filePreview]);

  const processFile = async (selectedFile) => {
    setFile(selectedFile);
    if (selectedFile.type.startsWith('image/') || selectedFile.type === 'application/pdf') {
      setFilePreview(URL.createObjectURL(selectedFile));
    }
    
    setStep('processing');
    setErrorMsg('');
    setWarnings([]);
    setRawText('');
    setShowRawText(false);
    try {
      const result = await extractOcr(selectedFile, selectedChild);
      setImportId(result.id);
      
      if (result.status === 'failed') {
        // We still allow manual entry if extraction failed entirely, unless it's a validation error
        const firstWarning = result.warnings?.[0] || '';
        if (firstWarning.includes('type de fichier') || firstWarning.includes('limite atteinte')) {
            setErrorMsg(result.warnings[0]);
            setStep('error');
            return;
        }
      }
      
      setExtractedData(result.extracted_data);
      
      setEditData(buildInitialEditData(result.extracted_data));
      
      setWarnings(result.warnings || []);
      setRawText(result.raw_text || '');
      setStep('review');
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || err.response?.data?.file?.[0] || "Erreur lors de la communication avec le serveur OCR.");
      setStep('error');
    }
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) processFile(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const selectedFile = e.dataTransfer.files?.[0];
    if (selectedFile) processFile(selectedFile);
  };

  const handleConfirm = async () => {
    if (!selectedChild) {
      alert("Veuillez sélectionner un enfant.");
      return;
    }
    if (!editData.date_recorded) {
      alert("La date de la mesure est requise.");
      return;
    }
    if (!editData.weight_kg && !editData.height_cm && !editData.head_circumference_cm) {
      alert("Veuillez saisir au moins une mesure (poids, taille ou périmètre crânien).");
      return;
    }

    setIsSaving(true);
    try {
      const childObj = children.find(c => c.id === selectedChild) || {};
      
      // Calculate age at recording
      let ageAtRecordingMonths = null;
      if (childObj.date_of_birth && editData.date_recorded) {
        const dob = new Date(childObj.date_of_birth);
        const recorded = new Date(editData.date_recorded);
        if (!isNaN(dob) && !isNaN(recorded)) {
          const diffMs = recorded - dob;
          if (diffMs >= 0) {
            ageAtRecordingMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.4375));
          }
        }
      }

      const measurementData = {
        child_id: selectedChild,
        date_recorded: editData.date_recorded,
        weight_kg: editData.weight_kg || null,
        height_cm: editData.height_cm || null,
        head_circumference_cm: editData.head_circumference_cm || null,
        notes: editData.notes || '',
        age_at_recording_months: ageAtRecordingMonths,
      };

      const result = await confirmOcrImport(importId, measurementData);
      
      // Trigger analytics non-blockingly with full context
      if (result.measurement) {
        let prevMeas = null;
        try {
          // Fetch history to find the chronologically preceding measurement
          const historyList = await listMeasurements(selectedChild);
          
          if (historyList && historyList.length > 0) {
            // Exclude newly created one, then sort chronologically descending
            const valid = historyList
              .filter(m => String(m.id) !== String(result.measurement.id))
              .sort((a, b) => {
                const dateA = new Date(a.date_recorded || a.date).getTime();
                const dateB = new Date(b.date_recorded || b.date).getTime();
                if (dateB !== dateA) return dateB - dateA;
                // fallback to creation time
                return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
              });
              
            // The immediately preceding measurement is the first one in the sorted list that occurred
            // BEFORE or AT the same time as the current confirmed measurement.
            const confirmedDate = new Date(result.measurement.date_recorded).getTime();
            const preceding = valid.find(m => new Date(m.date_recorded || m.date).getTime() <= confirmedDate);
            if (preceding) prevMeas = preceding;
          }
        } catch(err) {
          console.error("Could not fetch previous measurement", err);
        }

        analyzeMeasurement(
          result.measurement,
          prevMeas,
          { 
            sex: childObj.sex || childObj.gender, 
            age_at_recording_months: result.measurement.age_at_recording_months || ageAtRecordingMonths 
          }
        ).catch(err => console.error("Analytics failed silently", err));
      }

      setStep('saved');
      
      // Refresh history
      const newHist = await listOcrImports();
      setHistory(newHist);
    } catch (err) {
      console.error("Failed to save measurement", err);
      alert(err.response?.data?.detail || "Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setStep('upload');
    setFile(null);
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFilePreview(null);
    setExtractedData(null);
    setEditData({});
    setReviewedFields(new Set());
    setErrorMsg('');
    setImportId(null);
  };

  const buildInitialEditData = (data, confirmedData = null) => {
    if (confirmedData && Object.keys(confirmedData).length > 0) {
      return {
        date_recorded: confirmedData.date_recorded || '',
        weight_kg: confirmedData.weight_kg || '',
        height_cm: confirmedData.height_cm || '',
        head_circumference_cm: confirmedData.head_circumference_cm || '',
        notes: confirmedData.notes || '',
      };
    }

    const initialEditData = {};
    if (data) {
      for (const [key, value] of Object.entries(data)) {
        if (value && typeof value === 'object') {
          if (value.requires_confirmation || value.candidates?.every(c => c.confidence_level === 'low')) {
            initialEditData[key] = '';
          } else {
            initialEditData[key] = value.best_guess || '';
          }
        } else if (value && typeof value !== 'object') {
          initialEditData[key] = value;
        } else {
          initialEditData[key] = '';
        }
      }
    }
    return initialEditData;
  };

  const startReviewFromHistory = (entry) => {
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFile(null);
    setFilePreview(null);
    setImportId(entry.id);
    setSelectedChild(entry.child_id || entry.childId || selectedChild);
    setExtractedData(entry.extracted_data || {});
    setEditData(buildInitialEditData(entry.extracted_data || {}, entry.confirmed_data || null));
    setWarnings(entry.warnings || []);
    setRawText(entry.raw_text || '');
    setShowRawText(false);
    setReviewedFields(new Set());
    setErrorMsg('');
    setStep('review');
  };

  const editField = (key, value) => {
    setEditData((prev) => ({ ...prev, [key]: value }));
    setReviewedFields((prev) => new Set(prev).add(key));
  };

  // Helper to render candidate options
  const renderFieldInput = (key, label, type) => {
    const fieldData = extractedData?.[key];
    const isStructured = fieldData && typeof fieldData === 'object' && Array.isArray(fieldData.candidates);
    
    // Legacy fallback or empty extraction
    if (!isStructured || fieldData.candidates.length === 0) {
      return (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <label className="text-sm font-medium text-gray-500 w-48 flex-shrink-0">{label}</label>
          <input
            type={type}
            value={editData[key] || ''}
            onChange={(e) => editField(key, e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all"
          />
        </div>
      );
    }

    const requiresConfirmation = fieldData.requires_confirmation;
    const candidates = fieldData.candidates;
    const isCustom = !candidates.some(c => c.value === editData[key]) && editData[key] !== '';

    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-500 w-48 flex-shrink-0">{label}</label>
          {requiresConfirmation && <span className="text-[10px] bg-warning-100 text-warning-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Ambiguïté à vérifier</span>}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:ml-48">
          <select 
            value={isCustom ? "custom" : (editData[key] || "")} 
            onChange={(e) => {
              if (e.target.value === "ignore") {
                editField(key, "");
              } else if (e.target.value !== "custom") {
                editField(key, e.target.value);
              } else {
                // When selecting custom, keep empty but mark as reviewed
                editField(key, ""); 
              }
            }}
            className={`flex-1 px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all ${
              requiresConfirmation && !reviewedFields.has(key) ? 'border-warning-400 ring-2 ring-warning-200 bg-warning-50' : 'border-gray-200 bg-white/50 focus:ring-primary-500/30 focus:border-primary-400'
            }`}
          >
            <option value="" disabled>-- Sélectionner une valeur --</option>
            {candidates.map((c, idx) => (
              <option key={idx} value={c.value}>
                {c.value} {type === 'number' ? '' : ''} (Confiance: {c.confidence_level})
              </option>
            ))}
            <option value="custom">Autre (Saisie manuelle)</option>
            <option value="ignore">Ignorer (laisser vide)</option>
          </select>
          
          {(isCustom || editData[key] === '') && (
            <input
              type={type}
              value={isCustom ? editData[key] || '' : ''}
              onChange={(e) => editField(key, e.target.value)}
              placeholder="Saisie manuelle"
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all"
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <motion.div className="max-w-5xl mx-auto" variants={staggerContainer} initial="hidden" animate="show">
      <motion.div variants={fadeUp} className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Camera className="h-5 w-5 text-primary-500" />
          <p className="text-sm font-medium text-primary-500 tracking-wide uppercase">Import OCR</p>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Numériser un document</h1>
        <p className="text-base text-gray-400 mt-1">Importez un document médical et extrayez les données automatiquement.</p>
      </motion.div>

      {/* Step: Upload */}
      {step === 'upload' && (
        <motion.div variants={fadeUp}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Enfant concerné</label>
            <div className="flex gap-2 flex-wrap">
              {children.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedChild(c.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    selectedChild === c.id ? 'bg-primary-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {c.first_name || c.name}
                </button>
              ))}
            </div>
          </div>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="glass-panel rounded-3xl p-12 text-center cursor-pointer border-2 border-dashed border-gray-200 hover:border-primary-300 transition-all group"
          >
            <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleFileSelect} className="hidden" />
            <div className="h-16 w-16 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <Upload className="h-8 w-8 text-primary-500" />
            </div>
            <p className="text-lg font-semibold text-gray-700 mb-1">Déposez un fichier ici</p>
            <p className="text-sm text-gray-400 mb-4">ou cliquez pour parcourir</p>
            <p className="text-xs text-gray-300">Formats acceptés : JPG, PNG, PDF | Max 10 MB | 5 pages max</p>
          </div>
        </motion.div>
      )}

      {/* Step: Processing */}
      {step === 'processing' && (
        <motion.div variants={fadeUp} className="glass-panel rounded-3xl p-12 text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            className="h-16 w-16 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-4"
          >
            <RefreshCw className="h-8 w-8 text-primary-500" />
          </motion.div>
          <p className="text-lg font-semibold text-gray-700 mb-1">Analyse en cours...</p>
          <p className="text-sm text-gray-400">Application du prétraitement et extraction des données...</p>
        </motion.div>
      )}

      {/* Step: Error */}
      {step === 'error' && (
        <motion.div variants={fadeUp} className="glass-panel rounded-3xl p-12 text-center">
          <div className="h-16 w-16 rounded-2xl bg-error-50 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-error-500" />
          </div>
          <p className="text-lg font-semibold text-gray-700 mb-1">Échec de l'import</p>
          <p className="text-sm text-gray-400 mb-6">{errorMsg}</p>
          <button onClick={handleReset} className="px-6 py-3 rounded-xl text-sm font-semibold text-white bg-error-500 hover:bg-error-600 transition-all">
            Réessayer avec un autre fichier
          </button>
        </motion.div>
      )}

      {/* Step: Review */}
      {step === 'review' && (
        <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Preview & Raw Text */}
          <div className="space-y-6 flex flex-col">
            <div className="glass-panel rounded-2xl p-4 flex items-center gap-3 bg-primary-50/50">
              <ImageIcon className="h-5 w-5 text-primary-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">{file?.name || 'Document OCR historique'}</p>
                <p className="text-xs text-gray-400">
                  {filePreview ? 'Aperçu du document original' : 'Révision depuis l’historique OCR'}
                </p>
              </div>
              <button onClick={handleReset} className="p-1.5 rounded-lg hover:bg-white/50 text-gray-400 hover:text-gray-600 transition-all">
                <X size={16} />
              </button>
            </div>

            {filePreview && (
              <div className="glass-panel rounded-3xl p-2 flex-1 flex flex-col min-h-[300px]">
                {file.type === 'application/pdf' ? (
                  <object data={filePreview} type="application/pdf" className="w-full h-full min-h-[400px] rounded-2xl">
                    <p className="text-sm text-center text-gray-500 mt-10">Aperçu PDF non disponible.</p>
                  </object>
                ) : (
                  <div className="w-full h-full min-h-[300px] rounded-2xl overflow-hidden bg-gray-50 flex items-center justify-center">
                    <img src={filePreview} alt="Aperçu" className="max-w-full max-h-[600px] object-contain" />
                  </div>
                )}
              </div>
            )}
            
            {rawText && (
              <div className="glass-panel rounded-3xl p-6">
                <button 
                  onClick={() => setShowRawText(!showRawText)}
                  className="text-sm font-medium text-gray-500 flex items-center gap-2 hover:text-gray-700 transition-colors w-full"
                >
                  <FileText size={14} /> 
                  {showRawText ? 'Masquer le texte brut' : 'Voir le texte brut extrait'}
                </button>
                {showRawText && (
                  <div className="mt-4 bg-gray-50 rounded-xl p-4 text-xs font-mono text-gray-600 whitespace-pre-wrap max-h-64 overflow-y-auto border border-gray-100">
                    {rawText}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Review Form */}
          <div className="space-y-6">
            {warnings.length > 0 && (
              <div className="bg-warning-50 border border-warning-200 rounded-2xl p-4 flex gap-3">
                <AlertTriangle className="h-5 w-5 text-warning-500 shrink-0" />
                <div className="flex-1 space-y-1">
                  {warnings.map((warn, i) => (
                    <p key={i} className="text-sm text-warning-700">{warn}</p>
                  ))}
                </div>
              </div>
            )}

            <div className="glass-panel rounded-3xl p-6 space-y-6 shadow-sm border border-primary-100/50">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                <Edit3 size={14} className="text-primary-500" /> Validation des données
              </h3>
              
              <div className="space-y-5">
                {renderFieldInput('date_recorded', 'Date de la mesure', 'date')}
                <hr className="border-gray-100" />
                {renderFieldInput('weight_kg', 'Poids (kg)', 'number')}
                {renderFieldInput('height_cm', 'Taille (cm)', 'number')}
                {renderFieldInput('head_circumference_cm', 'Périmètre crânien (cm)', 'number')}
                <hr className="border-gray-100" />
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <label className="text-sm font-medium text-gray-500 w-48 flex-shrink-0">Notes additionnelles</label>
                  <input
                    type="text"
                    value={editData.notes || ''}
                    onChange={(e) => editField('notes', e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100 flex-col sm:flex-row">
                {(() => {
                  const unreviewedAmbiguousFields = Object.keys(extractedData || {}).filter(k => {
                    const fieldData = extractedData[k];
                    if (fieldData && typeof fieldData === 'object') {
                      const needsReview = fieldData.requires_confirmation || fieldData.candidates?.every(c => c.confidence_level === 'low');
                      return needsReview && !reviewedFields.has(k);
                    }
                    return false;
                  });
                  const canConfirm = unreviewedAmbiguousFields.length === 0;

                  return (
                    <>
                      {!canConfirm && (
                        <div className="flex-1 text-sm text-warning-700 bg-warning-50 px-4 py-3 rounded-xl border border-warning-200 flex items-center gap-2">
                          <AlertTriangle size={16} /> 
                          Veuillez vérifier tous les champs marqués comme ambigus avant de confirmer.
                        </div>
                      )}
                      <button 
                        onClick={handleConfirm} 
                        disabled={isSaving || !canConfirm}
                        className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white transition-all shadow-md ${
                          !canConfirm ? 'bg-gray-400 cursor-not-allowed shadow-none' : 'bg-primary-600 hover:bg-primary-700 hover:shadow-lg disabled:opacity-70 disabled:shadow-none'
                        }`}
                      >
                        <CheckCircle2 size={18} /> {isSaving ? 'Enregistrement...' : 'Confirmer et enregistrer'}
                      </button>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Step: Saved */}
      {step === 'saved' && (
        <motion.div variants={fadeUp} className="glass-panel rounded-3xl p-12 text-center">
          <div className="h-16 w-16 rounded-2xl bg-success-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-success-500" />
          </div>
          <p className="text-lg font-semibold text-gray-700 mb-1">Mesure confirmée et enregistrée !</p>
          <p className="text-sm text-gray-400 mb-6">Les données ont été ajoutées au profil de l'enfant de manière sécurisée.</p>
          <button onClick={handleReset} className="px-6 py-3 rounded-xl text-sm font-semibold text-primary-500 bg-primary-50 hover:bg-primary-100 transition-all">
            Scanner un autre document
          </button>
        </motion.div>
      )}

      {/* History */}
      {history.length > 0 && step === 'upload' && (
        <div className="mt-12">
          <SectionHeader title="Historique OCR" subtitle={`${history.length} import(s)`} />
          <div className="space-y-3 mb-8">
            {history.map((entry) => {
              const child = children.find((c) => String(c.id) === String(entry.child_id || entry.childId));
              const isConfirmed = entry.confirmation_status === 'confirmed';
              
              return (
                <motion.div key={entry.id} variants={fadeUp} className="glass-panel rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isConfirmed ? 'bg-success-50 text-success-500' : 'bg-warning-50 text-warning-500'}`}>
                    <FileText size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{entry.original_filename || entry.fileName}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(entry.created_at || entry.date).toLocaleDateString('fr-FR')} &middot; {child?.first_name || child?.name || 'Inconnu'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {isConfirmed ? (
                      <span className="text-xs font-medium bg-success-100 text-success-700 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Check size={12} /> Confirmé
                      </span>
                    ) : (
                      <span className="text-xs font-medium bg-warning-100 text-warning-700 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <AlertTriangle size={12} /> En attente de révision
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => startReviewFromHistory(entry)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-primary-100 bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700 hover:bg-primary-100 transition-colors"
                    >
                      <Eye size={13} />
                      {isConfirmed ? 'Revoir' : 'Réviser'}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
