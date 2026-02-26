import { Link, useNavigate } from 'react-router-dom';
import { Heart, Mail, Lock, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { staggerContainer, fadeUp, blurFade } from '../../utils/motionPresets';

export default function LoginPage() {
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    // Mock login success -> redirect to dashboard
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Mesh Gradient Background */}
      <div className="absolute inset-0 bg-mesh-gradient opacity-60 pointer-events-none" />

      {/* Floating decorative orbs */}
      <motion.div
        className="absolute w-72 h-72 rounded-full pointer-events-none"
        style={{
          top: '10%', right: '10%',
          background: 'radial-gradient(circle, rgba(0,122,255,0.06) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
        animate={{ y: [0, -20, 0], x: [0, 10, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute w-56 h-56 rounded-full pointer-events-none"
        style={{
          bottom: '15%', left: '5%',
          background: 'radial-gradient(circle, rgba(0,122,255,0.05) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
        animate={{ y: [0, 15, 0], x: [0, -10, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />

      <motion.div
        className="sm:mx-auto sm:w-full sm:max-w-md relative z-10"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        {/* Logo & Header */}
        <motion.div variants={fadeUp} className="flex justify-center">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-card border border-gray-100">
            <Heart className="h-8 w-8 text-primary-500" fill="currentColor" />
          </div>
        </motion.div>
        <motion.h2 variants={fadeUp} className="mt-6 text-center text-3xl font-bold text-gray-900 tracking-tight">
          Connectez-vous à votre compte
        </motion.h2>
        <motion.p variants={fadeUp} className="mt-2 text-center text-sm text-gray-500">
          Accédez au dossier de votre enfant
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
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Adresse email
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 sm:text-sm transition-all bg-white/50 backdrop-blur-sm hover:border-gray-300"
                  placeholder="vous@exemple.com"
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
            >
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Mot de passe
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 sm:text-sm transition-all bg-white/50 backdrop-blur-sm hover:border-gray-300"
                  placeholder="••••••••"
                />
              </div>
            </motion.div>

            <motion.div
              className="flex items-center justify-between"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-primary-500 focus:ring-primary-500 border-gray-300 rounded transition-colors"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-600">
                  Se souvenir de moi
                </label>
              </div>

              <div className="text-sm">
                <Link to="/forgot-password" className="font-medium text-primary-500 hover:text-primary-600 transition-colors">
                  Mot de passe oublié ?
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.4 }}
            >
              <button
                type="submit"
                className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-all hover:shadow-lg hover:-translate-y-0.5 group"
              >
                Se connecter
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </motion.div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white/70 text-gray-400 rounded-full">
                  Nouveau sur ChildCare+ ?
                </span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <Link
                to="/signup"
                className="w-full flex justify-center py-3 px-4 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all"
              >
                Créer un compte
              </Link>

              <Link
                to="/"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl text-sm font-medium text-gray-400 hover:text-gray-600 hover:bg-gray-50/50 transition-all"
              >
                Retour à l'accueil
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
