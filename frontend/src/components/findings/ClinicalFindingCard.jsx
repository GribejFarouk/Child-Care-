import { AlertTriangle, ArrowRight, Info, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ClinicalFindingCard({ finding, compact = false }) {
  const navigate = useNavigate();
  const warning = finding.severity === 'warning' || finding.severity === 'danger';
  return (
    <article className={`rounded-2xl border p-5 ${warning ? 'border-warning-100 bg-warning-50/40' : 'border-primary-100 bg-white'}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${warning ? 'bg-warning-100 text-warning-700' : 'bg-primary-50 text-primary-600'}`}>
          {warning ? <AlertTriangle size={18} /> : <Sparkles size={18} />}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-gray-900">{finding.child_friendly_title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-gray-600">{finding.parent_explanation}</p>
          {!compact && finding.possible_meaning && (
            <p className="mt-3 rounded-xl bg-white/80 p-3 text-sm text-gray-700">
              <span className="font-semibold">Ce que cela peut signifier : </span>{finding.possible_meaning}
            </p>
          )}
          {!compact && finding.recommended_actions?.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-gray-700">
              {finding.recommended_actions.map((action) => (
                <li key={action} className="flex gap-2">
                  <ArrowRight size={14} className="mt-1 shrink-0 text-primary-500" />
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => navigate(`/assistant?childId=${finding.child_id}`)}
            className="mt-4 text-sm font-semibold text-primary-600 hover:text-primary-700"
          >
            Demander à l'assistant
          </button>
        </div>
      </div>
      {!compact && (
        <p className="mt-4 flex items-start gap-2 border-t border-gray-100 pt-3 text-xs text-gray-500">
          <Info size={14} className="shrink-0" />
          {finding.disclaimer}
        </p>
      )}
    </article>
  );
}
