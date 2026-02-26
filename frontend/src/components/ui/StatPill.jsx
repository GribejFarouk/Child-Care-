import { motion } from 'framer-motion';
import { fadeUp } from '../../utils/motionPresets';

export default function StatPill({ label, value, icon: Icon, trend, trendUp }) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="glass-panel rounded-2xl p-5 flex items-center justify-between relative overflow-hidden group"
    >
      {/* Decorative subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-primary-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <div className="flex items-center space-x-4 relative z-10">
        <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center text-primary-500 border border-primary-100/50">
          <Icon size={22} strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-400 tracking-wider uppercase">{label}</p>
          <div className="flex items-baseline space-x-2 mt-0.5">
            <h3 className="text-xl font-bold text-gray-900">{value}</h3>
            {trend && (
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${trendUp ? 'bg-success-50 text-success-600' : 'bg-danger-50 text-danger-600'
                }`}>
                {trend}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
