import { motion } from 'framer-motion';
import { fadeUp } from '../../utils/motionPresets';

export default function StatPill({ label, value, icon: Icon, trend, trendUp }) {
  return (
    <motion.div 
      variants={fadeUp}
      className="glass-panel rounded-3xl p-5 flex items-center justify-between"
    >
      <div className="flex items-center space-x-4">
        <div className="h-12 w-12 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600 shadow-sm border border-primary-100">
          <Icon size={24} strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500 tracking-wide uppercase">{label}</p>
          <div className="flex items-baseline space-x-2 mt-1">
            <h3 className="text-2xl font-bold text-primary-900">{value}</h3>
            {trend && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                trendUp ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
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
