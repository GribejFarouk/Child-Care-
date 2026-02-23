import { motion } from 'framer-motion';
import { fadeUp } from '../../utils/motionPresets';

export default function SectionHeader({ title, subtitle, action }) {
  return (
    <motion.div 
      variants={fadeUp}
      className="flex items-end justify-between mb-6 mt-12 first:mt-0"
    >
      <div>
        <h2 className="text-2xl font-bold text-primary-900 tracking-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm text-gray-500 mt-1 font-medium">
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <div className="flex-shrink-0 ml-4">
          {action}
        </div>
      )}
    </motion.div>
  );
}
