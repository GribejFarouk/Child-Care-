import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, AlertTriangle, Activity, Calendar, User, Info, Check, ShieldAlert } from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import { markRecommendationRead } from '../../api/analytics';

const categoryConfig = {
  nutrition: { icon: Activity, color: 'text-purple-600', bg: 'bg-purple-50' },
  follow_up: { icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
  measurement_verification: { icon: Info, color: 'text-gray-600', bg: 'bg-gray-50' },
  appointment: { icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-50' },
  doctor_consultation: { icon: User, color: 'text-red-600', bg: 'bg-red-50' },
};

const priorityConfig = {
  low: { label: 'Basse', classes: 'bg-gray-100 text-gray-600' },
  medium: { label: 'Moyenne', classes: 'bg-warning-50 text-warning-700' },
  high: { label: 'Haute', classes: 'bg-danger-50 text-danger-700 font-medium' },
};

export default function RecommendationCard({ recommendation, onRead }) {
  const [expanded, setExpanded] = useState(false);
  const [marking, setMarking] = useState(false);

  const { id, category, title, message, why, priority, is_read, disclaimer } = recommendation;
  const config = categoryConfig[category] || { icon: Info, color: 'text-gray-600', bg: 'bg-gray-50' };
  const prio = priorityConfig[priority] || priorityConfig.low;
  const Icon = config.icon;

  const handleMarkRead = async () => {
    try {
      setMarking(true);
      await markRecommendationRead(id);
      if (onRead) onRead(id);
    } catch (err) {
      console.error(err);
      setMarking(false);
    }
  };

  return (
    <GlassCard className={`relative overflow-hidden transition-all ${is_read ? 'opacity-70' : 'shadow-md border-l-4 border-l-primary-400'}`}>
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-2xl ${config.bg} ${config.color} shrink-0`}>
            <Icon className="w-6 h-6" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className="text-base font-bold text-gray-900 truncate">{title}</h4>
              <span className={`px-2.5 py-1 rounded-lg text-xs tracking-wide ${prio.classes}`}>
                {prio.label}
              </span>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed mb-3">
              {message}
            </p>
            
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
            >
              Pourquoi cette recommandation ?
              <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 pt-4 border-t border-gray-100/60 pl-[3.25rem]">
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm mb-4 relative">
                  <div className="absolute -left-2 top-4 w-4 h-4 bg-white border-t border-l border-gray-100 rotate-[-45deg]" />
                  <p className="text-sm text-gray-700 relative z-10 leading-relaxed">
                    {why}
                  </p>
                </div>
                
                {/* Disclaimer */}
                <div className="flex items-start gap-2 bg-amber-50/50 p-3 rounded-lg">
                  <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700/80 leading-relaxed">
                    {disclaimer}
                  </p>
                </div>
                
                {!is_read && (
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={handleMarkRead}
                      disabled={marking}
                      className="flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-600 hover:bg-primary-100 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      {marking ? 'En cours...' : 'Marquer comme lu'}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GlassCard>
  );
}
