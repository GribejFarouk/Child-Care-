import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, User, Calendar, Heart, Stethoscope, AlertTriangle } from 'lucide-react';
import { staggerContainer, fadeUp } from '../../utils/motionPresets';
import { children } from '../../data/mockData';

export default function ChildFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const existing = isEdit ? children.find((c) => c.id === Number(id)) : null;

  const [form, setForm] = useState({
    name: existing?.name || '',
    birthDate: existing?.birthDate || '',
    sex: existing?.sex || 'M',
    bloodType: existing?.bloodType || '',
    allergies: existing?.allergies?.join(', ') || '',
    pediatrician: existing?.pediatrician || '',
  });

  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Le nom est requis';
    if (!form.birthDate) errs.birthDate = 'La date est requise';
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
    setTimeout(() => {
      navigate(isEdit ? `/children/${id}` : '/children');
    }, 1200);
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  return (
    <motion.div className="max-w-2xl mx-auto" variants={staggerContainer} initial="hidden" animate="show">
      <motion.div variants={fadeUp} className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{isEdit ? 'Modifier le profil' : 'Nouveau profil'}</h1>
          <p className="text-sm text-gray-400 mt-0.5">{isEdit ? `Modifier les informations de ${existing?.name}` : 'Ajoutez les informations de votre enfant'}</p>
        </div>
      </motion.div>

      {saved && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 rounded-2xl bg-success-50 border border-success-100 flex items-center gap-3">
          <Heart className="h-5 w-5 text-success-500" />
          <p className="text-sm font-medium text-success-700">Profil enregistre avec succes !</p>
        </motion.div>
      )}

      <motion.form variants={fadeUp} onSubmit={handleSubmit} className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Prenom de l'enfant *</label>
          <div className="relative group">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all ${errors.name ? 'border-danger-500' : 'border-gray-200 hover:border-gray-300'}`}
              placeholder="ex : Youssef"
            />
          </div>
          {errors.name && <p className="mt-1 text-xs text-danger-500 flex items-center gap-1"><AlertTriangle size={12} />{errors.name}</p>}
        </div>

        {/* Birth Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Date de naissance *</label>
          <div className="relative group">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
            <input
              type="date"
              value={form.birthDate}
              onChange={(e) => handleChange('birthDate', e.target.value)}
              className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all ${errors.birthDate ? 'border-danger-500' : 'border-gray-200 hover:border-gray-300'}`}
            />
          </div>
          {errors.birthDate && <p className="mt-1 text-xs text-danger-500 flex items-center gap-1"><AlertTriangle size={12} />{errors.birthDate}</p>}
        </div>

        {/* Sex */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Sexe</label>
          <div className="flex gap-3">
            {[{ value: 'M', label: 'Garcon' }, { value: 'F', label: 'Fille' }].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleChange('sex', opt.value)}
                className={`flex-1 py-3 rounded-xl text-sm font-medium border transition-all ${
                  form.sex === opt.value
                    ? 'bg-primary-50 border-primary-200 text-primary-700'
                    : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Blood Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Groupe sanguin</label>
          <select
            value={form.bloodType}
            onChange={(e) => handleChange('bloodType', e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all hover:border-gray-300"
          >
            <option value="">Non renseigne</option>
            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bt) => (
              <option key={bt} value={bt}>{bt}</option>
            ))}
          </select>
        </div>

        {/* Allergies */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Allergies</label>
          <input
            type="text"
            value={form.allergies}
            onChange={(e) => handleChange('allergies', e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all hover:border-gray-300"
            placeholder="ex : Arachides, Lait (separees par des virgules)"
          />
        </div>

        {/* Pediatrician */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Pediatre</label>
          <div className="relative group">
            <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
            <input
              type="text"
              value={form.pediatrician}
              onChange={(e) => handleChange('pediatrician', e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all hover:border-gray-300"
              placeholder="ex : Dr. Hichem Trabelsi"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={saved}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            {isEdit ? 'Enregistrer les modifications' : 'Creer le profil'}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}
