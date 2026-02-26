import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Weight, Ruler, Activity, FileText, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { staggerContainer, fadeUp } from '../../utils/motionPresets';
import { children } from '../../data/mockData';

export default function MeasurementFormPage() {
  const { childId } = useParams();
  const navigate = useNavigate();
  const child = children.find((c) => c.id === Number(childId));

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    weight: '',
    height: '',
    headCircumference: '',
    notes: '',
  });

  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!form.date) errs.date = 'La date est requise';
    if (!form.weight || isNaN(form.weight) || Number(form.weight) <= 0) errs.weight = 'Poids invalide';
    if (!form.height || isNaN(form.height) || Number(form.height) <= 0) errs.height = 'Taille invalide';
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setSaved(true);
    setTimeout(() => navigate(`/children/${childId}`), 1500);
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  if (!child) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <p className="text-gray-500">Enfant introuvable.</p>
      </div>
    );
  }

  const fields = [
    { id: 'weight', label: 'Poids (kg) *', icon: Weight, placeholder: 'ex : 10.6', type: 'number', step: '0.1' },
    { id: 'height', label: 'Taille (cm) *', icon: Ruler, placeholder: 'ex : 80', type: 'number', step: '0.1' },
    { id: 'headCircumference', label: 'Perimetre cranien (cm)', icon: Activity, placeholder: 'ex : 47.1', type: 'number', step: '0.1' },
  ];

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

      {saved && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 rounded-2xl bg-success-50 border border-success-100 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-success-500" />
          <p className="text-sm font-medium text-success-700">Mesure enregistree avec succes !</p>
        </motion.div>
      )}

      <motion.form variants={fadeUp} onSubmit={handleSubmit} className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Date de la mesure *</label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => handleChange('date', e.target.value)}
            className={`w-full px-4 py-3 rounded-xl border text-sm bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all ${errors.date ? 'border-danger-500' : 'border-gray-200 hover:border-gray-300'}`}
          />
          {errors.date && <p className="mt-1 text-xs text-danger-500 flex items-center gap-1"><AlertTriangle size={12} /> {errors.date}</p>}
        </div>

        {/* Metric Fields */}
        {fields.map((field) => {
          const Icon = field.icon;
          return (
            <div key={field.id}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{field.label}</label>
              <div className="relative group">
                <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                <input
                  type={field.type}
                  step={field.step}
                  value={form[field.id]}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all ${errors[field.id] ? 'border-danger-500' : 'border-gray-200 hover:border-gray-300'}`}
                  placeholder={field.placeholder}
                />
              </div>
              {errors[field.id] && <p className="mt-1 text-xs text-danger-500 flex items-center gap-1"><AlertTriangle size={12} /> {errors[field.id]}</p>}
            </div>
          );
        })}

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
          <div className="relative group">
            <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all hover:border-gray-300 resize-none"
              placeholder="Observations, contexte de la visite..."
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={saved}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            Enregistrer la mesure
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}
