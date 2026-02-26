import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { popIn } from '../../utils/motionPresets';
import { useState } from 'react';

export default function FAB({ onNotImplemented }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <motion.div
      className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-50"
      variants={popIn}
      initial="hidden"
      animate="show"
    >
      {/* Pulse ring animation */}
      <span className="absolute inset-0 rounded-full bg-primary-500/20 animate-pulse-ring pointer-events-none" />

      {/* Tooltip */}
      <motion.div
        className="absolute bottom-full right-0 mb-3 whitespace-nowrap"
        initial={false}
        animate={showTooltip ? { opacity: 1, y: 0 } : { opacity: 0, y: 4 }}
        transition={{ duration: 0.15 }}
      >
        <div className="bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-lg">
          Ajouter une mesure
          <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
        </div>
      </motion.div>

      <button
        type="button"
        onClick={() => onNotImplemented?.('Ajouter une mesure - Not Implemented')}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="relative bg-primary-500 text-white p-4 rounded-full shadow-glow hover:bg-primary-600 hover:shadow-glow-lg hover:-translate-y-1 hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        aria-label="Ajouter une mesure"
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>
    </motion.div>
  );
}
