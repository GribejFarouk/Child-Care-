import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Weight, Ruler, Activity, FileText, AlertTriangle, CheckCircle2, Footprints, Ear, CircleDot } from 'lucide-react';
import { staggerContainer, fadeUp } from '../../utils/motionPresets';
import { getChild } from '../../api/children';
import { createMeasurement, listMeasurements } from '../../api/measurements';
import { analyzeMeasurement } from '../../api/analytics';

export default function MeasurementFormPage() {
  const { childId } = useParams();
  const navigate = useNavigate();

  const [child, setChild] = useState(null);
  const [previousMeasurement, setPreviousMeasurement] = useState(null);
  const [childLoading, setChildLoading] = useState(true);

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    weight: '', height: '', headCircumference: '',
    footSize: '', earSize: '', neckCircumference: '', wristCircumference: '',
    source: 'manual', notes: '',
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        const [childData, measurements] = await Promise.all([
          getChild(childId),
          listMeasurements(childId),
        ]);
        // Normalize child name
        const name = childData.first_name
          ? `${childData.first_name} ${childData.last_name || ''}`.trim()
          : childData.name;
        setChild({ ...childData, name });
        // Most recent measurement for change-detection analytics
        if (measurements && measurements.length > 0) {
          const sorted = [...measurements].sort(
            (a, b) => new Date(b.date_recorded || b.date) - new Date(a.date_recorded || a.date)
          );
          setPreviousMeasurement(sorted[0]);
        }
      } catch (err) {
        setErrors({ global: 'Impossible de charger les données de l\'enfant.' });
      } finally {
        setChildLoading(false);
      }
    };
    load();
  }, [childId]);

  // Auto-calculate BMI client-side for display (server also calculates it)
  const bmi = useMemo(() => {
    const w = parseFloat(form.weight);
    const h = parseFloat(form.height);
    if (w > 0 && h > 0) {
      return (w / ((h / 100) ** 2)).toFixed(1);
    }
    return null;
  }, [form.weight, form.height]);

  // Auto-calculate age in months from child.date_of_birth + form.date
  const ageAtRecordingMonths = useMemo(() => {
    if (child?.date_of_birth && form.date) {
      const dob = new Date(child.date_of_birth);
      const recorded = new Date(form.date);
      if (isNaN(dob) || isNaN(recorded)) return null;
      const diffMs = recorded - dob;
      if (diffMs < 0) return null;
      return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.4375));
    }
    return null;
  }, [child, form.date]);

  const validate = () => {
    const errs = {};
    if (!form.date) errs.date = 'La date est requise';
    else {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (new Date(form.date) > today) errs.date = 'La date ne peut pas être dans le futur.';
    }
    const numericFields = [
      { id: 'weight',    label: 'Poids',                min: 0.1, max: 300  },
      { id: 'height',    label: 'Taille',                min: 1,   max: 300  },
      { id: 'headCircumference', label: 'Périmètre crânien', min: 1, max: 100 },
      { id: 'footSize',  label: 'Taille du pied',        min: 1,   max: 50   },
      { id: 'earSize',   label: "Taille de l'oreille",   min: 0.5, max: 20   },
      { id: 'neckCircumference',  label: 'Tour du cou',   min: 1,   max: 100  },
      { id: 'wristCircumference', label: 'Tour du poignet', min: 1, max: 50  },
    ];
    for (const f of numericFields) {
      const v = parseFloat(form[f.id]);
      if (form[f.id] !== '' && form[f.id] !== null && form[f.id] !== undefined) {
        if (isNaN(v) || v <= 0) errs[f.id] = `${f.label} doit être un nombre positif.`;
        else if (v < f.min) errs[f.id] = `${f.label} semble trop faible (min ${f.min}).`;
        else if (v > f.max) errs[f.id] = `${f.label} semble trop élevée (max ${f.max}).`;
      }
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setSaving(true);

    try {
      const apiData = {
        child_id:              childId,
        date_recorded:         form.date,
        weight_kg:             form.weight ? form.weight : null,
        height_cm:             form.height ? form.height : null,
        head_circumference_cm: form.headCircumference ? form.headCircumference : null,
        foot_size_cm:          form.footSize ? form.footSize : null,
        ear_size_cm:           form.earSize ? form.earSize : null,
        neck_circumference_cm: form.neckCircumference ? form.neckCircumference : null,
        wrist_circumference_cm:form.wristCircumference ? form.wristCircumference : null,
        age_at_recording_months: ageAtRecordingMonths !== null ? ageAtRecordingMonths : undefined,
        notes:                 form.notes,
        source:                form.source,
      };

      // Step 1: Save the measurement
      const savedMeasurement = await createMeasurement(apiData);

      // Step 2: Trigger analytics (non-blocking — failure does not cancel the save)
      await analyzeMeasurement(savedMeasurement, previousMeasurement, {
        sex: child?.sex || child?.gender || null,
        age_at_recording_months: ageAtRecordingMonths,
      });

      setSaved(true);
      setTimeout(() => navigate(`/children/${childId}`), 1500);
    } catch (err) {
      const errData = err?.response?.data;
      if (typeof errData === 'object' && errData !== null) {
        const firstError = Object.values(errData)[0];
        setErrors({ global: Array.isArray(firstError) ? firstError[0] : firstError });
      } else {
        setErrors({ global: 'Erreur lors de l\'enregistrement.' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  if (childLoading) {
    return <div className="max-w-2xl mx-auto text-center py-20 text-gray-500">Chargement...</div>;
  }

  if (!child) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <p className="text-gray-500">Enfant introuvable.</p>
      </div>
    );
  }

  const primaryFields = [
    { id: 'weight', label: 'Poids (kg)', icon: Weight, placeholder: 'ex : 10.6', type: 'number', step: '0.1', hint: null },
    { id: 'height', label: 'Taille (cm)', icon: Ruler, placeholder: 'ex : 80', type: 'number', step: '0.1', hint: null },
    { id: 'headCircumference', label: 'Périmètre crânien (cm)', icon: Activity, placeholder: 'ex : 47.1', type: 'number', step: '0.1',
      hint: 'Tour de tête — particulièrement pertinent chez les nourrissons et jeunes enfants (0–5 ans).' },
  ];

  const secondaryFields = [
    { id: 'footSize', label: 'Taille du pied (cm)', icon: Footprints, placeholder: 'ex : 10.5', type: 'number', step: '0.1' },
    { id: 'earSize', label: 'Taille de l\'oreille (cm)', icon: Ear, placeholder: 'ex : 4.8', type: 'number', step: '0.1' },
    { id: 'neckCircumference', label: 'Tour du cou (cm)', icon: CircleDot, placeholder: 'ex : 24.5', type: 'number', step: '0.1' },
    { id: 'wristCircumference', label: 'Tour du poignet (cm)', icon: CircleDot, placeholder: 'ex : 10.2', type: 'number', step: '0.1' },
  ];

  const renderField = (field) => {
    const Icon = field.icon;
    return (
      <div key={field.id}>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">{field.label}</label>
        <div className="relative group">
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
          <input type={field.type} step={field.step} value={form[field.id]}
            onChange={(e) => handleChange(field.id, e.target.value)}
            className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all ${errors[field.id] ? 'border-danger-500' : 'border-gray-200 hover:border-gray-300'}`}
            placeholder={field.placeholder} />
        </div>
        {field.hint && <p className="mt-1 text-xs text-gray-400">{field.hint}</p>}
        {errors[field.id] && <p className="mt-1 text-xs text-danger-500 flex items-center gap-1"><AlertTriangle size={12} /> {errors[field.id]}</p>}
      </div>
    );
  };

  return (
    <motion.div className="max-w-2xl mx-auto" variants={staggerContainer} initial="hidden" animate="show">
      <motion.div variants={fadeUp} className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Nouvelle mesure</h1>
          <p className="text-sm text-gray-400 mt-0.5">Ajouter une mesure pour {child.name}</p>
        </div>
      </motion.div>

      {/* Child info card */}
      <motion.div variants={fadeUp} className="mb-6 p-4 rounded-2xl bg-primary-50 border border-primary-100 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-lg flex-shrink-0">
          {child.name?.charAt(0) || '?'}
        </div>
        <div>
          <p className="font-semibold text-primary-900">{child.name}</p>
          <p className="text-sm text-primary-600">
            {child.date_of_birth ? `Né(e) le ${new Date(child.date_of_birth).toLocaleDateString('fr-FR')}` : 'Date de naissance non renseignée'}
            {ageAtRecordingMonths !== null && ` · ${ageAtRecordingMonths} mois à la date de mesure`}
          </p>
        </div>
      </motion.div>

      {errors.global && (
        <div className="mb-6 p-4 rounded-2xl bg-danger-50 border border-danger-100 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-danger-500" />
          <p className="text-sm font-medium text-danger-700">{errors.global}</p>
        </div>
      )}

      {saved && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 rounded-2xl bg-success-50 border border-success-100 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-success-500" />
          <p className="text-sm font-medium text-success-700">Mesure enregistrée avec succès !</p>
        </motion.div>
      )}

      <motion.form variants={fadeUp} onSubmit={handleSubmit} className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Date de la mesure *</label>
          <input type="date" value={form.date} onChange={(e) => handleChange('date', e.target.value)}
            className={`w-full px-4 py-3 rounded-xl border text-sm bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all ${errors.date ? 'border-danger-500' : 'border-gray-200 hover:border-gray-300'}`} />
          {errors.date && <p className="mt-1 text-xs text-danger-500 flex items-center gap-1"><AlertTriangle size={12} /> {errors.date}</p>}
        </div>

        {/* Primary Metrics */}
        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Mesures principales</h3>
          <p className="text-xs text-gray-400 mb-4">Les comparaisons OMS utilisent l'âge, le sexe, le poids, la taille et le périmètre crânien.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {primaryFields.map(renderField)}
            {/* BMI auto-calc (read-only display) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">IMC (auto-calculé)</label>
              <div className="relative">
                <Activity className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                <input type="text" readOnly value={bmi ? `${bmi} kg/m2` : '—'}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-100 text-sm bg-gray-50 text-gray-500 cursor-not-allowed" />
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Metrics */}
        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Mesures complémentaires</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {secondaryFields.map(renderField)}
          </div>
        </div>

        {/* Source */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Source de saisie</label>
          <select value={form.source} onChange={(e) => handleChange('source', e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all hover:border-gray-300">
            <option value="manual">Saisie manuelle</option>
            <option value="ocr_import">Import OCR</option>
          </select>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
          <div className="relative group">
            <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
            <textarea rows={3} value={form.notes} onChange={(e) => handleChange('notes', e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all hover:border-gray-300 resize-none"
              placeholder="Observations, contexte de la visite..." />
          </div>
        </div>

        <div className="pt-2">
          <button type="submit" disabled={saving || saved}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed">
            <Save size={16} />
            {saving ? 'Enregistrement...' : 'Enregistrer la mesure'}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}
