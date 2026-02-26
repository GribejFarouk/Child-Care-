import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { fadeUp } from '../../utils/motionPresets';

export default function TrustBanner() {
  return (
    <motion.div
      variants={fadeUp}
      className="mt-12 mb-8 p-5 rounded-2xl bg-gradient-to-r from-primary-50/60 to-transparent border border-primary-100/40 flex items-start space-x-3 relative overflow-hidden"
    >
      {/* Subtle left accent */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary-400 to-primary-200 rounded-r-full" />

      <ShieldCheck className="text-primary-500 mt-0.5 flex-shrink-0 ml-2" size={20} strokeWidth={1.5} />
      <div>
        <p className="text-sm font-semibold text-gray-900">
          Outil d'assistance parentale
        </p>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
          ChildCare+ vous aide à suivre la croissance de votre enfant. Les données et alertes fournies ne remplacent en aucun cas l'avis, le diagnostic ou le traitement d'un professionnel de santé. Consultez toujours votre pédiatre.
        </p>
      </div>
    </motion.div>
  );
}
