import React from 'react';
import { ShieldCheck, Activity, AlertTriangle, AlertOctagon, HelpCircle } from 'lucide-react';

const riskConfig = {
  low: {
    label: 'Faible',
    color: 'text-green-700',
    bg: 'bg-green-50 border-green-200',
    icon: ShieldCheck,
  },
  moderate: {
    label: 'Modéré',
    color: 'text-amber-700',
    bg: 'bg-amber-50 border-amber-200',
    icon: Activity,
  },
  elevated: {
    label: 'Élevé',
    color: 'text-orange-700',
    bg: 'bg-orange-50 border-orange-200',
    icon: AlertTriangle,
  },
  high: {
    label: 'Risque élevé',
    color: 'text-red-700',
    bg: 'bg-red-50 border-red-200',
    icon: AlertOctagon,
  },
  unknown: {
    label: 'Non évalué',
    color: 'text-gray-500',
    bg: 'bg-gray-50 border-gray-200',
    icon: HelpCircle,
  }
};

export default function RiskScoreBadge({ riskLevel, riskScore = null, showScore = false, className = '' }) {
  const config = riskConfig[riskLevel] || riskConfig.unknown;
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-sm font-semibold ${config.bg} ${config.color} ${className}`}>
      <Icon className="w-4 h-4" />
      <span>{config.label}</span>
      {(showScore && riskScore !== null && riskScore !== undefined) && (
        <>
          <span className="opacity-50">·</span>
          <span>{riskScore}/100</span>
        </>
      )}
    </div>
  );
}
