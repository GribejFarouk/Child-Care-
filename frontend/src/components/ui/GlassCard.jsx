import { motion } from 'framer-motion';
import { fadeUp } from '../../utils/motionPresets';

export default function GlassCard({ children, className = '', onClick, delay = 0 }) {
  const Component = onClick ? motion.button : motion.div;
  
  return (
    <Component
      variants={fadeUp}
      onClick={onClick}
      className={`glass-panel rounded-3xl p-6 text-left w-full ${onClick ? 'glass-panel-hover cursor-pointer' : ''} ${className}`}
    >
      {children}
    </Component>
  );
}
