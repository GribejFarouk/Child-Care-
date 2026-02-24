import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Mail, ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { fadeUp } from '../../utils/motionPresets';

export default function ForgotPasswordPage() {
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSent(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-mesh-gradient opacity-60 pointer-events-none" />

      <motion.div
        className="sm:mx-auto sm:w-full sm:max-w-md relative z-10"
        initial="hidden"
        animate="show"
        variants={fadeUp}
      >
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-gray-100">
            <Heart className="h-8 w-8 text-primary-500" fill="currentColor" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-primary-900 tracking-tight">
          Mot de passe oublié
        </h2>
        <p className="mt-2 text-center text-sm text-gray-500">
          Entrez votre email pour recevoir un lien de réinitialisation.
        </p>
      </motion.div>

      <motion.div
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10"
        initial="hidden"
        animate="show"
        variants={fadeUp}
        transition={{ delay: 0.1 }}
      >
        <div className="bg-white/70 backdrop-blur-2xl py-8 px-4 shadow-apple sm:rounded-3xl sm:px-10 border border-gray-200/50">
          {!isSent ? (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent sm:text-sm transition-all bg-white/50 backdrop-blur-sm"
                    placeholder="vous@exemple.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                Envoyer le lien
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            </form>
          ) : (
            <div className="rounded-2xl bg-primary-50 border border-primary-100 p-5">
              <div className="flex items-start space-x-3">
                <CheckCircle2 className="h-5 w-5 text-primary-600 mt-0.5" />
                <p className="text-sm text-primary-900 leading-relaxed">
                  Un lien de réinitialisation a été envoyé à votre adresse email. Vérifiez votre boîte de réception.
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 space-y-3">
            <Link
              to="/login"
              className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all"
            >
              Retour à la connexion
            </Link>
            <Link
              to="/"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50/50 transition-all"
            >
              Retour à l'accueil
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
