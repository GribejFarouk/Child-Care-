import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  MessageSquare,
  Bell,
  Calendar as CalendarIcon,
  ShieldAlert,
  ArrowRight,
  Clock,
} from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import { staggerContainer, fadeUp } from '../../utils/motionPresets';
import { listShares, getUnreadMessagesCount } from '../../api/collaboration';
import { getChild } from '../../api/children';
import { listAlerts } from '../../api/analytics';
import { listEvents } from '../../api/calendar';

export default function DoctorDashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    patients: 0,
    messages: 0,
    appointments: 0,
    alerts: 0,
  });
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [patientNames, setPatientNames] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [shares, unreadData] = await Promise.all([
          listShares(),
          getUnreadMessagesCount(),
        ]);
        const activeShares = (shares || []).filter((share) => share.status === 'active');
        const names = {};
        const alerts = [];
        const events = [];

        await Promise.all(activeShares.map(async (share) => {
          try {
            const child = await getChild(share.child_id);
            names[share.child_id] = child.first_name
              ? `${child.first_name} ${child.last_name || ''}`.trim()
              : `Patient ${String(share.child_id).slice(0, 8)}`;
          } catch {
            names[share.child_id] = `Patient ${String(share.child_id).slice(0, 8)}`;
          }

          if (share.permissions?.alerts) {
            try {
              const childAlerts = await listAlerts(share.child_id);
              alerts.push(...childAlerts.map((alert) => ({ ...alert, child_id: share.child_id })));
            } catch (err) {
              console.warn('Unable to fetch shared alerts', err);
            }
          }

          if (share.permissions?.calendar) {
            try {
              const childEvents = await listEvents({ child_id: share.child_id, status: 'planned' });
              events.push(...childEvents.map((event) => ({ ...event, child_id: share.child_id })));
            } catch (err) {
              console.warn('Unable to fetch shared calendar events', err);
            }
          }
        }));

        alerts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        events.sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));

        setPatientNames(names);
        setRecentAlerts(alerts.slice(0, 5));
        setUpcomingEvents(events.slice(0, 5));
        setStats({
          patients: activeShares.length,
          messages: unreadData?.unread_count || 0,
          appointments: events.length,
          alerts: alerts.length,
        });
      } catch (err) {
        console.error('Failed to fetch doctor dashboard data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const kpis = [
    { label: 'Patients partages', value: stats.patients, icon: Users, color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: 'Messages non lus', value: stats.messages, icon: MessageSquare, color: 'text-primary-600', bg: 'bg-primary-50' },
    { label: 'Prochains RDV', value: stats.appointments, icon: CalendarIcon, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Alertes recentes', value: stats.alerts, icon: Bell, color: 'text-warning-600', bg: 'bg-warning-50' },
  ];

  const severityClass = {
    danger: 'bg-red-50 text-red-600 border-red-100',
    warning: 'bg-amber-50 text-amber-700 border-amber-100',
    info: 'bg-blue-50 text-blue-600 border-blue-100',
  };

  const formatDate = (value) => {
    if (!value) return '';
    return new Date(value).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <motion.div
      className="max-w-6xl mx-auto pb-10"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={fadeUp} className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Vue d'ensemble</h1>
        <p className="text-gray-500 mt-2">Suivi de l'activite de vos patients ChildCare+</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {kpis.map((kpi) => (
          <motion.div key={kpi.label} variants={fadeUp}>
            <GlassCard className="p-5 flex items-center justify-between border-transparent hover:border-teal-100 transition-colors cursor-default shadow-sm">
              <div>
                <p className="text-sm font-semibold text-gray-500 mb-1">{kpi.label}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? <span className="inline-block w-8 h-8 bg-gray-200 animate-pulse rounded" /> : kpi.value}
                </p>
              </div>
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${kpi.bg}`}>
                <kpi.icon size={22} className={kpi.color} />
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div variants={fadeUp} className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Activite recente</h2>
          </div>

          {stats.patients === 0 ? (
            <GlassCard className="h-[400px] flex flex-col items-center justify-center text-center p-8 border-dashed border-2 border-gray-200">
              <ShieldAlert className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Aucun patient lie</h3>
              <p className="text-gray-500 max-w-sm">
                Une fois qu'un parent aura partage le dossier de son enfant avec vous, les alertes apparaitront ici.
              </p>
            </GlassCard>
          ) : recentAlerts.length === 0 ? (
            <GlassCard className="h-[400px] flex flex-col items-center justify-center text-center p-8">
              <ShieldAlert className="w-12 h-12 text-teal-200 mb-4" />
              <p className="text-gray-500 font-medium">Aucune alerte partagee pour le moment.</p>
              <p className="text-xs text-gray-400 mt-2">Seules les alertes des patients avec permission sont affichees.</p>
            </GlassCard>
          ) : (
            <GlassCard className="h-[400px] overflow-hidden p-0">
              <div className="h-full overflow-y-auto divide-y divide-gray-100 pr-1">
                {recentAlerts.map((alert) => (
                  <button
                    key={alert.id}
                    type="button"
                    onClick={() => navigate(`/doctor/patients/${alert.child_id}`)}
                    className="w-full text-left p-4 hover:bg-gray-50/80 transition-colors focus:outline-none focus:bg-teal-50/60"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 h-9 w-9 rounded-xl flex items-center justify-center border ${severityClass[alert.severity] || severityClass.info}`}>
                        <Bell size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-bold text-gray-900 leading-snug">{alert.title}</p>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${severityClass[alert.severity] || severityClass.info}`}>
                            {alert.severity}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{alert.message}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs font-medium text-teal-600">{patientNames[alert.child_id] || 'Patient partage'}</span>
                          <span className="text-[11px] text-gray-400 flex items-center gap-1">
                            {formatDate(alert.created_at)}
                            <ArrowRight size={12} />
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </GlassCard>
          )}
        </motion.div>

        <motion.div variants={fadeUp}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Prochains rendez-vous</h2>
          </div>

          {upcomingEvents.length === 0 ? (
            <GlassCard className="h-[400px] flex flex-col items-center justify-center text-center p-6">
              <CalendarIcon className="w-12 h-12 text-gray-200 mb-3" />
              <p className="text-gray-400 font-medium text-sm">Aucun rendez-vous partage pour le moment.</p>
            </GlassCard>
          ) : (
            <GlassCard className="h-[400px] overflow-hidden p-0">
              <div className="h-full overflow-y-auto divide-y divide-gray-100 pr-1">
                {upcomingEvents.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => navigate(`/doctor/patients/${event.child_id}`)}
                    className="w-full text-left p-4 hover:bg-gray-50/80 transition-colors focus:outline-none focus:bg-teal-50/60"
                  >
                    <div className="flex gap-3">
                      <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                        <CalendarIcon size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-gray-900 truncate">{event.title}</p>
                        <p className="text-xs text-teal-600 font-medium mt-1">{patientNames[event.child_id] || 'Patient partage'}</p>
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-2">
                          <Clock size={12} />
                          <span>{formatDate(event.scheduled_date)}</span>
                        </div>
                        {event.location && <p className="text-xs text-gray-400 mt-1 truncate">{event.location}</p>}
                      </div>
                      <ArrowRight size={14} className="text-gray-300 mt-1" />
                    </div>
                  </button>
                ))}
              </div>
            </GlassCard>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
