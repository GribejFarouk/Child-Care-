import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, BellOff, CheckCircle2, AlertTriangle, Info, Filter, Trash2, Baby, ShieldCheck } from 'lucide-react';
import { staggerContainer, fadeUp } from '../../utils/motionPresets';
import SectionHeader from '../../components/ui/SectionHeader';
import { alerts, children } from '../../data/mockData';

const typeIcons = {
  warning: AlertTriangle,
  danger: AlertTriangle,
  info: Info,
  success: CheckCircle2,
  vaccination: Bell,
};
const typeColors = {
  warning: 'text-warning-500 bg-warning-50',
  danger: 'text-danger-500 bg-danger-50',
  info: 'text-primary-500 bg-primary-50',
  success: 'text-success-500 bg-success-50',
  vaccination: 'text-indigo-500 bg-indigo-50',
};
const priorityBadge = {
  high: 'bg-danger-50 text-danger-600',
  medium: 'bg-warning-50 text-warning-600',
  low: 'bg-gray-100 text-gray-500',
};

export default function AlertsCenterPage() {
  const [filterType, setFilterType] = useState('all');
  const [filterRead, setFilterRead] = useState('all');
  const [localAlerts, setLocalAlerts] = useState(alerts);

  const types = ['all', ...new Set(alerts.map((a) => a.type))];

  const filtered = localAlerts.filter((a) => {
    if (filterType !== 'all' && a.type !== filterType) return false;
    if (filterRead === 'unread' && a.read) return false;
    if (filterRead === 'read' && !a.read) return false;
    return true;
  });

  const toggleRead = (id) => {
    setLocalAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: !a.read } : a)));
  };

  const markAllRead = () => {
    setLocalAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
  };

  const unreadCount = localAlerts.filter((a) => !a.read).length;

  return (
    <motion.div className="max-w-4xl mx-auto" variants={staggerContainer} initial="hidden" animate="show">
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Bell className="h-5 w-5 text-primary-500" />
            <p className="text-sm font-medium text-primary-500 tracking-wide uppercase">Centre d'alertes</p>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Notifications</h1>
          <p className="text-sm text-gray-400 mt-0.5">{unreadCount} non lue(s) &middot; {localAlerts.length} au total</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="self-start flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-primary-500 hover:bg-primary-50 transition-all">
            <CheckCircle2 size={16} /> Tout marquer comme lu
          </button>
        )}
      </motion.div>

      {/* Filters */}
      <motion.div variants={fadeUp} className="flex flex-wrap gap-2 mb-6">
        <div className="flex items-center gap-1 mr-4">
          <Filter size={14} className="text-gray-400" />
          <span className="text-xs font-medium text-gray-400 uppercase">Type:</span>
        </div>
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterType === t ? 'bg-primary-500 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {t === 'all' ? 'Tous' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
        <div className="w-px bg-gray-200 mx-2" />
        {['all', 'unread', 'read'].map((r) => (
          <button
            key={r}
            onClick={() => setFilterRead(r)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterRead === r ? 'bg-gray-900 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {r === 'all' ? 'Tous' : r === 'unread' ? 'Non lus' : 'Lus'}
          </button>
        ))}
      </motion.div>

      {/* Alert Cards */}
      {filtered.length === 0 ? (
        <motion.div variants={fadeUp} className="text-center py-16">
          <BellOff className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Aucune alerte trouvee pour ce filtre.</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {filtered.map((alert) => {
            const Icon = typeIcons[alert.type] || Bell;
            const colors = typeColors[alert.type] || typeColors.info;
            const [iconColor, iconBg] = colors.split(' ');
            const child = alert.childId ? children.find((c) => c.id === alert.childId) : null;

            return (
              <motion.div
                key={alert.id}
                variants={fadeUp}
                className={`glass-panel rounded-2xl p-5 flex items-start gap-4 group hover:shadow-card-hover transition-all cursor-pointer ${
                  !alert.read ? 'border-l-[3px] border-l-primary-400' : 'opacity-75'
                }`}
                onClick={() => toggleRead(alert.id)}
              >
                <div className={`h-10 w-10 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={18} className={iconColor} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm font-semibold ${!alert.read ? 'text-gray-900' : 'text-gray-500'}`}>{alert.title}</p>
                      {alert.priority && (
                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${priorityBadge[alert.priority] || priorityBadge.low}`}>
                          {alert.priority}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{new Date(alert.date).toLocaleDateString('fr-FR')}</span>
                  </div>
                  <p className="text-sm text-gray-500 mb-1">{alert.message}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    {child && (
                      <span className="flex items-center gap-1">
                        <Baby size={12} /> {child.name}
                      </span>
                    )}
                    <span>{!alert.read ? 'Non lu' : 'Lu'}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Medical Disclaimer */}
      <motion.div variants={fadeUp} className="mt-8 p-5 rounded-2xl bg-gradient-to-r from-primary-50/60 to-transparent border border-primary-100/40 flex items-start gap-3 relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary-400 to-primary-200 rounded-r-full" />
        <ShieldCheck className="text-primary-500 mt-0.5 flex-shrink-0 ml-2" size={20} strokeWidth={1.5} />
        <div>
          <p className="text-sm font-semibold text-gray-900">Avertissement medical</p>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            Les alertes sont generees automatiquement a titre informatif. Elles ne constituent en aucun cas un diagnostic medical. En cas de doute sur la sante de votre enfant, consultez toujours votre pediatre ou un professionnel de sante.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
