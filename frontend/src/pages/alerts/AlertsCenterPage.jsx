import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellOff, CheckCircle2, AlertTriangle, Info, Filter, Sparkles, Loader2, HeartPulse } from 'lucide-react';
import { staggerContainer, fadeUp } from '../../utils/motionPresets';
import { listAlerts, markAlertRead, listClinicalFindings } from '../../api/analytics';
import { listChildren } from '../../api/children';
import SectionHeader from '../../components/ui/SectionHeader';
import ClinicalFindingCard from '../../components/findings/ClinicalFindingCard';

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

export default function AlertsCenterPage() {
  const [activeTab, setActiveTab] = useState('alerts'); // 'alerts' or 'recommendations'
  
  // Alert states
  const [filterType, setFilterType] = useState('all');
  const [filterRead, setFilterRead] = useState('all');
  const [filterChild, setFilterChild] = useState('all');
  const [localAlerts, setLocalAlerts] = useState([]);
  
  // Rec states
  const [findings, setFindings] = useState([]);
  const [recFilterChild, setRecFilterChild] = useState('all');
  const [children, setChildren] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [alertsResult, findingsResult, childrenResult] = await Promise.allSettled([
        listAlerts(),
        listClinicalFindings(),
        listChildren(),
      ]);
      if (alertsResult.status === 'fulfilled') setLocalAlerts(alertsResult.value || []);
      if (findingsResult.status === 'fulfilled') setFindings(findingsResult.value || []);
      if (childrenResult.status === 'fulfilled') setChildren(childrenResult.value || []);
      if (alertsResult.status === 'rejected' && findingsResult.status === 'rejected') {
        throw alertsResult.reason;
      }
    } catch (err) {
      setError('Erreur lors du chargement des données.');
    } finally {
      setLoading(false);
    }
  };

  // -- Alerts Logic --
  const normalize = (a) => ({
    ...a,
    type: a.type || a.severity || a.alert_type || 'info',
    read: a.read ?? a.is_read ?? false,
    title: a.title || a.child || 'Alerte',
    date: a.date || (a.created_at ? new Date(a.created_at).toLocaleDateString('fr-FR') : ''),
  });

  const normalizedAlerts = localAlerts.map(normalize);
  const types = ['all', ...new Set(normalizedAlerts.map((a) => a.type))];

  const filteredAlerts = normalizedAlerts.filter((a) => {
    if (filterType !== 'all' && a.type !== filterType) return false;
    if (filterRead === 'unread' && a.read) return false;
    if (filterRead === 'read' && !a.read) return false;
    if (filterChild !== 'all' && String(a.child_id) !== String(filterChild)) return false;
    return true;
  });

  const toggleAlertRead = async (id) => {
    setLocalAlerts((prev) => prev.map((a) => (String(a.id) === String(id) ? { ...a, read: true, is_read: true } : a)));
    try {
      await markAlertRead(id);
    } catch (e) {
      setLocalAlerts((prev) => prev.map((a) => (String(a.id) === String(id) ? { ...a, read: false, is_read: false } : a)));
    }
  };

  const markAllAlertsRead = async () => {
    const unread = localAlerts.filter((a) => !(a.read || a.is_read));
    setLocalAlerts((prev) => prev.map((a) => ({ ...a, read: true, is_read: true })));
    for (const a of unread) {
      try { await markAlertRead(a.id); } catch (e) { /* non-blocking */ }
    }
  };

  const unreadAlertsCount = normalizedAlerts.filter((a) => !a.read).length;

  // -- Recommendations Logic --
  const filteredFindings = findings.filter((finding) => {
    if (recFilterChild !== 'all' && String(finding.child_id) !== String(recFilterChild)) return false;
    return true;
  });
  const warningFindingsCount = findings.filter(finding => ['warning', 'danger'].includes(finding.severity)).length;

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh]">
      <Loader2 className="w-8 h-8 text-primary-500 animate-spin mb-4" />
      <p className="text-gray-500 font-medium">Chargement...</p>
    </div>
  );
  
  if (error) return (
    <div className="max-w-4xl mx-auto text-center py-20 text-red-500 font-medium bg-red-50 rounded-2xl border border-red-100">
      {error}
    </div>
  );

  return (
    <motion.div className="max-w-4xl mx-auto font-sans pb-10" variants={staggerContainer} initial="hidden" animate="show">
      <SectionHeader
        title="Centre d'Analyse"
        subtitle="Alertes préliminaires et recommandations d'aide à la décision"
        icon={HeartPulse}
      />

      {/* Main Tabs */}
      <motion.div variants={fadeUp} className="flex gap-2 p-1.5 bg-gray-100/50 rounded-2xl w-fit mb-8 border border-gray-100">
        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            activeTab === 'alerts' 
              ? 'bg-white text-gray-900 shadow-sm' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Bell className="w-4 h-4" />
          Alertes
          {unreadAlertsCount > 0 && (
            <span className="ml-1.5 px-2 py-0.5 rounded-md bg-danger-100 text-danger-700 text-xs font-bold">
              {unreadAlertsCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('recommendations')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            activeTab === 'recommendations' 
              ? 'bg-white text-primary-700 shadow-sm' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Interprétations
          {warningFindingsCount > 0 && (
            <span className="ml-1.5 px-2 py-0.5 rounded-md bg-primary-100 text-primary-700 text-xs font-bold">
              {warningFindingsCount}
            </span>
          )}
        </button>
      </motion.div>

      {/* -- ALERTS TAB -- */}
      {activeTab === 'alerts' && (
        <motion.div variants={fadeUp} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1 mr-4">
                <Filter size={14} className="text-gray-400" />
                <span className="text-xs font-medium text-gray-400 uppercase">Filtres:</span>
              </div>
              <div className="bg-white rounded-xl p-1 shadow-sm border border-gray-100 flex gap-1">
                {['all', 'unread', 'read'].map((r) => (
                  <button
                    key={r}
                    onClick={() => setFilterRead(r)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      filterRead === r ? 'bg-gray-800 text-white' : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {r === 'all' ? 'Tous' : r === 'unread' ? 'Non lus' : 'Lus'}
                  </button>
                ))}
              </div>
              <select
                value={filterChild}
                onChange={(e) => setFilterChild(e.target.value)}
                className="bg-white rounded-xl px-3 py-2 text-xs font-medium text-gray-600 border border-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="all">Tous les enfants</option>
                {children.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.first_name || child.name || 'Enfant'}
                  </option>
                ))}
              </select>
            </div>
            
            {unreadAlertsCount > 0 && (
              <button
                onClick={markAllAlertsRead}
                className="text-sm font-medium text-primary-600 hover:text-primary-700 px-4 py-2 rounded-xl bg-primary-50 hover:bg-primary-100 transition-colors"
              >
                Tout marquer comme lu
              </button>
            )}
          </div>

          {filteredAlerts.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 border-dashed">
              <BellOff className="h-12 w-12 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400 font-medium">Aucune alerte trouvée pour ce filtre.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAlerts.map((alert) => {
                const Icon = typeIcons[alert.type] || Bell;
                const colors = typeColors[alert.type] || typeColors.info;
                const [iconColor, iconBg] = colors.split(' ');

                return (
                  <div
                    key={alert.id}
                    className={`bg-white rounded-2xl p-5 border border-gray-100 flex items-start gap-4 group hover:shadow-md transition-all cursor-pointer relative overflow-hidden ${
                      !alert.read ? 'border-l-4 border-l-primary-400' : 'opacity-70'
                    }`}
                    onClick={() => toggleAlertRead(alert.id)}
                  >
                    <div className={`h-10 w-10 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`h-5 w-5 ${iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <h4 className={`text-sm font-bold truncate ${!alert.read ? 'text-gray-900' : 'text-gray-600'}`}>
                          {alert.title}
                        </h4>
                        <span className="text-xs text-gray-400 font-medium whitespace-nowrap">{alert.date}</span>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed mb-1">{alert.message}</p>
                      
                      {alert.recommendation && (
                        <div className="mt-3 flex items-start gap-2 bg-gray-50 p-3 rounded-lg border border-gray-100/50">
                          <Info className="w-4 h-4 text-primary-500 shrink-0 mt-0.5" />
                          <p className="text-xs text-gray-700 leading-relaxed">
                            <span className="font-semibold text-primary-700 block mb-0.5">Conseil préliminaire</span>
                            {alert.recommendation}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* -- RECOMMENDATIONS TAB -- */}
      {activeTab === 'recommendations' && (
        <motion.div variants={fadeUp} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-1 mr-auto">
              <Filter size={14} className="text-gray-400" />
              <span className="text-xs font-medium text-gray-400 uppercase">Filtrer par enfant :</span>
            </div>
            <select
              value={recFilterChild}
              onChange={(e) => setRecFilterChild(e.target.value)}
              className="bg-white rounded-xl px-3 py-2 text-xs font-medium text-gray-600 border border-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="all">Tous les enfants</option>
              {children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.first_name || child.name || 'Enfant'}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-6 flex items-start gap-3 bg-primary-50/50 border border-primary-100/50 rounded-2xl p-4">
            <Sparkles className="w-5 h-5 text-primary-500 shrink-0 mt-0.5" />
            <p className="text-sm text-primary-900/80 leading-relaxed">
              <strong>Aide à la décision :</strong> Ces interprétations sont produites par des règles OMS explicables.
              Elles ne constituent pas un diagnostic médical.
            </p>
          </div>

          {filteredFindings.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 border-dashed">
              <CheckCircle2 className="h-12 w-12 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400 font-medium">Aucune interprétation pour cet enfant.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFindings.map((finding) => (
                <ClinicalFindingCard key={finding.id} finding={finding} />
              ))}
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
