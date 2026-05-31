import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Heart, Mail, Lock, User, ArrowRight, Home, Stethoscope } from 'lucide-react';
import { motion } from 'framer-motion';
import { staggerContainer, fadeUp, blurFade } from '../../utils/motionPresets';
import { useAuth } from '../../contexts/AuthContext';
import { updateDoctorProfileMe } from '../../api/profiles';

export default function SignupPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [role, setRole] = useState('parent');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const password = e.target.password.value;
    const confirmPassword = e.target['confirm-password'].value;
    
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    
    const fullName = e.target.name.value;
    const first_name = fullName.split(' ')[0] || '';
    const last_name = fullName.split(' ').slice(1).join(' ') || '';
    
    const userData = {
      email: e.target.email.value,
      password: password,
      first_name,
      last_name,
    };
    
    let specialtyValue = '';
    if (role === 'doctor' && e.target.specialty) {
      specialtyValue = e.target.specialty.value;
    }
    
    try {
      const data = await register(userData, role);
      
      // Patch the doctor profile with the specialty
      if (role === 'doctor' && specialtyValue) {
        await updateDoctorProfileMe({ specialty: specialtyValue });
      }
      
      navigate(data.user.role === 'doctor' ? '/doctor/dashboard' : '/dashboard');
    } catch (err) {
      const errData = err.response?.data;
      if (typeof errData === 'object' && errData !== null) {
        const firstError = Object.values(errData)[0];
        setError(Array.isArray(firstError) ? firstError[0] : firstError);
      } else {
        setError(err.message || 'Erreur lors de la création du compte');
      }
    }
  };

  const fields = [
    { id: 'name', label: 'Nom complet', type: 'text', icon: User, placeholder: 'Jean Dupont', autoComplete: 'name', delay: 0.38 },
    { id: 'email', label: 'Adresse email', type: 'email', icon: Mail, placeholder: 'vous@exemple.com', autoComplete: 'email', delay: 0.46 },
    { id: 'password', label: 'Mot de passe', type: 'password', icon: Lock, placeholder: '••••••••', autoComplete: 'new-password', delay: 0.54 },
    { id: 'confirm-password', label: 'Confirmer le mot de passe', type: 'password', icon: Lock, placeholder: '••••••••', autoComplete: 'new-password', delay: 0.62 },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-mesh-gradient opacity-60 pointer-events-none" />

      <motion.div className="absolute w-64 h-64 rounded-full pointer-events-none"
        style={{ top: '5%', left: '10%', background: 'radial-gradient(circle, rgba(0,122,255,0.06) 0%, transparent 70%)', filter: 'blur(40px)' }}
        animate={{ y: [0, -20, 0] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }} />

      <motion.div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10" variants={staggerContainer} initial="hidden" animate="show">
        <motion.div variants={fadeUp} className="flex justify-center">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-card border border-gray-100">
            <Heart className="h-8 w-8 text-primary-500" fill="currentColor" />
          </div>
        </motion.div>
        <motion.h2 variants={fadeUp} className="mt-6 text-center text-3xl font-bold text-gray-900 tracking-tight">
          Créer un compte ChildCare+
        </motion.h2>
        <motion.p variants={fadeUp} className="mt-2 text-center text-sm text-gray-500">
          Commencez le suivi de santé de vos enfants en quelques secondes.
        </motion.p>
      </motion.div>

      <motion.div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10" variants={blurFade} initial="hidden" animate="show">
        <div className="mx-auto w-24 h-1 rounded-full bg-gradient-to-r from-primary-400 to-primary-600 mb-6 opacity-60" />

        <div className="bg-white/70 backdrop-blur-2xl py-8 px-4 shadow-card sm:rounded-3xl sm:px-10 border border-gray-200/50 gradient-border">
          {/* Role Selector */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">Je crée un compte en tant que</label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setRole('parent')}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${role === 'parent' ? 'border-primary-500 bg-primary-50 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                <Home size={24} className={role === 'parent' ? 'text-primary-500' : 'text-gray-400'} />
                <span className={`text-sm font-semibold ${role === 'parent' ? 'text-primary-700' : 'text-gray-600'}`}>Je suis parent</span>
              </button>
              <button type="button" onClick={() => setRole('doctor')}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${role === 'doctor' ? 'border-teal-500 bg-teal-50 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                <Stethoscope size={24} className={role === 'doctor' ? 'text-teal-500' : 'text-gray-400'} />
                <span className={`text-sm font-semibold ${role === 'doctor' ? 'text-teal-700' : 'text-gray-600'}`}>Je suis médecin</span>
              </button>
            </div>
          </motion.div>

          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm text-center">
              {error}
            </motion.div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            {fields.map((field) => {
              const Icon = field.icon;
              return (
                <motion.div key={field.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: field.delay }}>
                  <label htmlFor={field.id} className="block text-sm font-medium text-gray-700 mb-1.5">{field.label}</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Icon className="h-5 w-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                    </div>
                    <input id={field.id} name={field.id} type={field.type} autoComplete={field.autoComplete} required
                      className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 sm:text-sm transition-all bg-white/50 backdrop-blur-sm hover:border-gray-300"
                      placeholder={field.placeholder} />
                  </div>
                </motion.div>
              );
            })}

            {/* Specialty field for doctors */}
            {role === 'doctor' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
                <label htmlFor="specialty" className="block text-sm font-medium text-gray-700 mb-1.5">Spécialité</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Stethoscope className="h-5 w-5 text-gray-400 group-focus-within:text-teal-500 transition-colors" />
                  </div>
                  <input id="specialty" name="specialty" type="text" required
                    className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 sm:text-sm transition-all bg-white/50 backdrop-blur-sm hover:border-gray-300"
                    placeholder="ex : Pédiatrie" />
                </div>
              </motion.div>
            )}

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}>
              <button type="submit"
                className={`w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all hover:shadow-lg hover:-translate-y-0.5 group ${
                  role === 'doctor' ? 'bg-teal-600 hover:bg-teal-700 focus:ring-teal-600' : 'bg-gray-900 hover:bg-gray-800 focus:ring-gray-900'
                }`}>
                S'inscrire {role === 'doctor' ? '(Espace Médecin)' : ''}
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </motion.div>
          </form>

          <div className="mt-6 space-y-3">
            <Link to="/login" className="w-full flex justify-center py-3 px-4 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all">
              Déjà un compte ? Se connecter
            </Link>
            <Link to="/" className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl text-sm font-medium text-gray-400 hover:text-gray-600 hover:bg-gray-50/50 transition-all">
              Retour à l'accueil
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

