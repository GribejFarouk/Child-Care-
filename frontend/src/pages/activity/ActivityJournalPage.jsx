import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { staggerContainer, fadeUp } from '../../utils/motionPresets';
import { listActivityLogs } from '../../api/audit';
import { listChildren } from '../../api/children';
import SectionHeader from '../../components/ui/SectionHeader';
import { ClipboardList, Shield, Activity, Calendar, FileText, Users, Filter, Loader2, AlertCircle } from 'lucide-react';

const typeIcons = {
  auth: Shield,
  profile: Users,
  measurement: Activity,
  calendar: Calendar,
  ocr: FileText,
  collaboration: Users,
  analytics: Activity,
};

const typeColors = {
  auth: 'text-gray-500 bg-gray-100',
  profile: 'text-indigo-500 bg-indigo-50',
  measurement: 'text-primary-500 bg-primary-50',
  calendar: 'text-blue-500 bg-blue-50',
  ocr: 'text-amber-500 bg-amber-50',
  collaboration: 'text-emerald-500 bg-emerald-50',
  analytics: 'text-purple-500 bg-purple-50',
};

const typeLabels = {
  auth: 'Authentification',
  profile: 'Profil',
  measurement: 'Mesures',
  calendar: 'Calendrier',
  ocr: 'OCR',
  collaboration: 'Collaboration',
  analytics: 'Analyse',
  other: 'Autres',
};

const getEventCategory = (eventType = '') => {
  if (eventType.includes('auth') || eventType.includes('login')) return 'auth';
  if (eventType.includes('child') || eventType.includes('profile')) return 'profile';
  if (eventType.includes('measurement')) return 'measurement';
  if (eventType.includes('calendar')) return 'calendar';
  if (eventType.includes('ocr')) return 'ocr';
  if (eventType.includes('share') || eventType.includes('consultation')) return 'collaboration';
  if (eventType.includes('alert') || eventType.includes('recommendation') || eventType.includes('risk')) return 'analytics';
  return 'other';
};

export default function ActivityJournalPage() {
  const [logs, setLogs] = useState([]);
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [filterChild, setFilterChild] = useState('all');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [logsResult, childrenResult] = await Promise.allSettled([
        listActivityLogs(),
        listChildren()
      ]);
      
      if (logsResult.status === 'fulfilled') setLogs(logsResult.value || []);
      if (childrenResult.status === 'fulfilled') setChildren(childrenResult.value || []);
      if (logsResult.status === 'rejected') throw logsResult.reason;
    } catch (err) {
      setError('Erreur lors du chargement du journal d\'activité.');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filterChild !== 'all' && String(log.child_id) !== String(filterChild)) return false;
    if (filterType !== 'all' && getEventCategory(log.event_type) !== filterType) return false;
    return true;
  });

  const uniqueTypes = [...new Set(logs.map(log => getEventCategory(log.event_type)))];

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
        title="Journal d'Activité"
        subtitle="Historique des accès et actions de sécurité"
        icon={ClipboardList}
      />

      <motion.div variants={fadeUp} className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 mr-4">
          <Filter size={14} className="text-gray-400" />
          <span className="text-xs font-medium text-gray-400 uppercase">Filtre:</span>
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-white rounded-xl px-3 py-2 text-sm font-medium text-gray-600 border border-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        >
          <option value="all">Tous les types</option>
          {uniqueTypes.map((type) => (
            <option key={type} value={type}>
              {typeLabels[type]}
            </option>
          ))}
        </select>
        <select
          value={filterChild}
          onChange={(e) => setFilterChild(e.target.value)}
          className="bg-white rounded-xl px-3 py-2 text-sm font-medium text-gray-600 border border-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 mr-auto"
        >
          <option value="all">Tous les accès</option>
          {children.map((child) => (
            <option key={child.id} value={child.id}>
              Enfant: {child.first_name || child.name || 'Inconnu'}
            </option>
          ))}
        </select>
      </motion.div>

      {filteredLogs.length === 0 ? (
        <motion.div variants={fadeUp} className="text-center py-16 bg-white rounded-3xl border border-gray-100 border-dashed">
          <AlertCircle className="h-12 w-12 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400 font-medium">Aucun historique d'activité trouvé.</p>
        </motion.div>
      ) : (
        <motion.div variants={fadeUp} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-50">
            {filteredLogs.map((log) => {
              const category = getEventCategory(log.event_type);
              const Icon = typeIcons[category] || Shield;
              const colors = typeColors[category] || typeColors.auth;
              const [iconColor, iconBg] = colors.split(' ');

              return (
                <div key={log.id} className="p-4 sm:p-5 hover:bg-gray-50/50 transition-colors flex items-start gap-4">
                  <div className={`h-10 w-10 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`h-5 w-5 ${iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                      <h4 className="text-sm font-bold text-gray-900">
                        {log.summary || log.event_type}
                      </h4>
                      <span className="text-xs font-medium text-gray-400 whitespace-nowrap">
                        {log.occurred_at ? new Date(log.occurred_at).toLocaleString('fr-FR', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        }) : 'Date inconnue'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs">
                      <span className="text-gray-500">{typeLabels[category]}</span>
                      <span className={`font-medium ${log.outcome === 'success' ? 'text-success-600' : 'text-danger-600'}`}>
                        {log.outcome === 'success' ? 'Succès' : 'Échec'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
