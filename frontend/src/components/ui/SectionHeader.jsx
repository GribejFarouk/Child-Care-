import { motion } from 'framer-motion';
import { fadeUp } from '../../utils/motionPresets';

export default function SectionHeader({ title, subtitle, action }) {
  return (
    <motion.div
      variants={fadeUp}
      className="flex items-end justify-between mb-6 mt-10 first:mt-0"
    >
      <div className="flex items-center gap-3">
        {/* Decorative accent dot */}
        <div className="h-6 w-1 rounded-full bg-gradient-to-b from-primary-400 to-primary-200 hidden sm:block" />
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm text-gray-400 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && (
        <div className="flex-shrink-0 ml-4">
          {action}
        </div>
      )}
    </motion.div>
  );
}
