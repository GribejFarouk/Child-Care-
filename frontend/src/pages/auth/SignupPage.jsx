import { useNavigate, Link } from 'react-router-dom';
import { Heart, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { staggerContainer, fadeUp, blurFade } from '../../utils/motionPresets';

export default function SignupPage() {
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate('/dashboard');
  };

  const fields = [
    { id: 'name', label: 'Nom complet', type: 'text', icon: User, placeholder: 'Jean Dupont', autoComplete: 'name', delay: 0.3 },
    { id: 'email', label: 'Adresse email', type: 'email', icon: Mail, placeholder: 'vous@exemple.com', autoComplete: 'email', delay: 0.38 },
    { id: 'password', label: 'Mot de passe', type: 'password', icon: Lock, placeholder: '••••••••', autoComplete: 'new-password', delay: 0.46 },
    { id: 'confirm-password', label: 'Confirmer le mot de passe', type: 'password', icon: Lock, placeholder: '••••••••', autoComplete: 'new-password', delay: 0.54 },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-mesh-gradient opacity-60 pointer-events-none" />

      {/* Floating orbs */}
      <motion.div
        className="absolute w-64 h-64 rounded-full pointer-events-none"
        style={{
          top: '5%', left: '10%',
          background: 'radial-gradient(circle, rgba(0,122,255,0.06) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
        animate={{ y: [0, -20, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute w-48 h-48 rounded-full pointer-events-none"
        style={{
          bottom: '10%', right: '8%',
          background: 'radial-gradient(circle, rgba(0,122,255,0.05) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
        animate={{ y: [0, 15, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
      />

      <motion.div
        className="sm:mx-auto sm:w-full sm:max-w-md relative z-10"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={fadeUp} className="flex justify-center">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-card border border-gray-100">
            <Heart className="h-8 w-8 text-primary-500" fill="currentColor" />
          </div>
        </motion.div>
        <motion.h2 variants={fadeUp} className="mt-6 text-center text-3xl font-bold text-gray-900 tracking-tight">
          Créer un compte ChildCare+
        </motion.h2>
        <motion.p variants={fadeUp} className="mt-2 text-center text-sm text-gray-500">
          Commencez le suivi de santé de votre enfant en quelques secondes.
        </motion.p>
      </motion.div>

      <motion.div
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10"
        variants={blurFade}
        initial="hidden"
        animate="show"
      >
        {/* Gradient accent line */}
        <div className="mx-auto w-24 h-1 rounded-full bg-gradient-to-r from-primary-400 to-primary-600 mb-6 opacity-60" />

        <div className="bg-white/70 backdrop-blur-2xl py-8 px-4 shadow-card sm:rounded-3xl sm:px-10 border border-gray-200/50 gradient-border">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {fields.map((field) => {
              const Icon = field.icon;
              return (
                <motion.div
                  key={field.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: field.delay, duration: 0.4 }}
                >
                  <label htmlFor={field.id} className="block text-sm font-medium text-gray-700 mb-1.5">
                    {field.label}
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Icon className="h-5 w-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                    </div>
                    <input
                      id={field.id}
                      name={field.id}
                      type={field.type}
                      autoComplete={field.autoComplete}
                      required
                      className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 sm:text-sm transition-all bg-white/50 backdrop-blur-sm hover:border-gray-300"
                      placeholder={field.placeholder}
                    />
                  </div>
                </motion.div>
              );
            })}

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.62, duration: 0.4 }}
            >
              <button
                type="submit"
                className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-all hover:shadow-lg hover:-translate-y-0.5 group"
              >
                S'inscrire
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </motion.div>
          </form>

          <div className="mt-6 space-y-3">
            <Link
              to="/login"
              className="w-full flex justify-center py-3 px-4 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all"
            >
              Déjà un compte ? Se connecter
            </Link>
            <Link
              to="/"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl text-sm font-medium text-gray-400 hover:text-gray-600 hover:bg-gray-50/50 transition-all"
            >
              Retour à l'accueil
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
