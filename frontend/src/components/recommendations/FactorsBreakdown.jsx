import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Activity, Info, TrendingUp, TrendingDown, HelpCircle, FileX } from 'lucide-react';
import { fadeUp } from '../../utils/motionPresets';

const statusConfig = {
  normal: { icon: ShieldCheck, color: 'text-green-600', bg: 'bg-green-50' },
  warning: { icon: Activity, color: 'text-orange-600', bg: 'bg-orange-50' },
  info: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50' },
  skipped: { icon: HelpCircle, color: 'text-gray-400', bg: 'bg-gray-50' },
};

export default function FactorsBreakdown({ factors, riskScore = null, riskLevel }) {
  if (!factors || factors.length === 0) return null;

  // Visual bar: if riskScore exists (doctor view), we can show a filled bar.
  const hasScore = riskScore !== null && riskScore !== undefined;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
      <div className="p-4 sm:p-5 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-gray-900">Analyse des facteurs de risque</h4>
          <p className="text-xs text-gray-500 mt-1">Détail du calcul d'aide à la décision</p>
        </div>
        {hasScore && (
          <div className="text-right">
            <span className="text-2xl font-black text-gray-900">{riskScore}</span>
            <span className="text-sm font-medium text-gray-500">/100</span>
          </div>
        )}
      </div>

      <div className="divide-y divide-gray-50">
        {factors.map((factor, idx) => {
          const config = statusConfig[factor.status] || statusConfig.skipped;
          const Icon = config.icon;
          
          return (
            <motion.div 
              key={factor.name}
              custom={idx}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="p-4 sm:p-5 flex gap-4 hover:bg-gray-50/50 transition-colors"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${config.bg} ${config.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2 mb-1">
                  <span className="text-sm font-bold text-gray-900">{factor.label}</span>
                  {hasScore && factor.points > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-600 shrink-0">
                      +{factor.points} pts
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {factor.detail}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
      
      <div className="bg-gray-50/80 p-4 border-t border-gray-100 text-xs text-gray-500 leading-relaxed">
        <strong>Transparence :</strong> Le score global (de 0 à 100) est la somme pondérée de ces facteurs. 
        Un score élevé déclenche des recommandations de suivi prioritaire.
      </div>
    </div>
  );
}
