import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { fadeUp } from '../../utils/motionPresets';

export default function TrustBanner() {
  return (
    <motion.div 
      variants={fadeUp}
      className="mt-12 mb-8 p-4 rounded-2xl bg-gradient-to-r from-primary-50/50 to-transparent border border-primary-100/50 flex items-start space-x-3"
    >
      <ShieldCheck className="text-primary-500 mt-0.5 flex-shrink-0" size={20} strokeWidth={1.5} />
      <div>
        <p className="text-sm font-medium text-primary-900">
          Outil d'assistance parentale
        </p>
        <p className="text-xs text-primary-700/80 mt-1 leading-relaxed">
          ChildCare+ vous aide à suivre la croissance de votre enfant. Les données et alertes fournies ne remplacent en aucun cas l'avis, le diagnostic ou le traitement d'un professionnel de santé. Consultez toujours votre pédiatre.
        </p>
      </div>
    </motion.div>
  );
}
