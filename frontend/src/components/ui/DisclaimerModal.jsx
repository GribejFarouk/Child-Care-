import { AlertCircle, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { blurFade } from '../../utils/motionPresets';

export default function DisclaimerModal({ onClose }) {
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          className="bg-white rounded-3xl shadow-xl max-w-md w-full overflow-hidden relative z-10"
          variants={blurFade}
          initial="hidden"
          animate="show"
          exit="exit"
        >
          <div className="p-6 sm:p-8">
            <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-2xl bg-warning-50 mb-6 border border-warning-100">
              <AlertCircle className="h-7 w-7 text-warning-500" aria-hidden="true" />
            </div>

            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Avis Médical Important
              </h3>
              <div className="mt-2 text-sm text-gray-600 space-y-4 text-left">
                <p>
                  <strong className="text-gray-900">ChildCare+</strong> est un outil d'assistance conçu pour vous aider à suivre la croissance et la santé de votre enfant.
                </p>
                <p className="font-medium text-gray-800 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  Cette application ne remplace en aucun cas l'avis, le diagnostic ou le traitement d'un professionnel de santé.
                </p>
                <p>
                  En cas de doute sur la santé de votre enfant, ou si une alerte est déclenchée par l'application, veuillez <strong>toujours consulter un pédiatre ou un médecin</strong>.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-6 py-4 sm:px-8 border-t border-gray-100">
            <button
              type="button"
              className="w-full inline-flex justify-center items-center rounded-xl border border-transparent px-4 py-3.5 bg-gray-900 text-base font-semibold text-white shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-all hover:shadow-lg hover:-translate-y-0.5"
              onClick={onClose}
            >
              <Check className="mr-2 h-4 w-4" />
              J'ai compris et j'accepte
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
