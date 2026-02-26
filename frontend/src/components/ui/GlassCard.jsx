import { motion } from 'framer-motion';
import { fadeUp } from '../../utils/motionPresets';

export default function GlassCard({ children, className = '', onClick, accent }) {
  const Component = onClick ? motion.button : motion.div;

  /* Optional accent top border color */
  const accentBorder = accent ? `border-t-2 border-t-${accent}` : '';

  return (
    <Component
      variants={fadeUp}
      onClick={onClick}
      whileHover={onClick ? { y: -4, transition: { duration: 0.2 } } : undefined}
      className={`glass-panel rounded-3xl p-6 text-left w-full shimmer-hover ${accentBorder} ${onClick ? 'cursor-pointer group' : ''} ${className}`}
    >
      {children}
    </Component>
  );
}
