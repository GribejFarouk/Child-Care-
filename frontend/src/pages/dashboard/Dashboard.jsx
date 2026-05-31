import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, AlertTriangle, CalendarDays, ChevronRight, Plus, Users, Stethoscope, HeartPulse, Sparkles, Sun, CloudSun, Moon, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { listChildren } from '../../api/children';
import { listMeasurements } from '../../api/measurements';
import { listClinicalFindings } from '../../api/analytics';
import { listShares } from '../../api/collaboration';
import { listEvents } from '../../api/calendar';

import DisclaimerModal from '../../components/ui/DisclaimerModal';
import GlassCard from '../../components/ui/GlassCard';
import StatPill from '../../components/ui/StatPill';
import SectionHeader from '../../components/ui/SectionHeader';
import AnimatedMetric from '../../components/ui/AnimatedMetric';
import ClinicalFindingCard from '../../components/findings/ClinicalFindingCard';
import TrustBanner from '../../components/ui/TrustBanner';
import { staggerContainer, fadeUp } from '../../utils/motionPresets';

/* Time-of-day greeting helper */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Bonjour', Icon: Sun };
  if (h < 18) return { text: 'Bon après-midi', Icon: CloudSun };
  return { text: 'Bonsoir', Icon: Moon };
}

/* Severity config for alert styling */
const severityConfig = {
  high: { border: 'border-l-danger-500', bg: 'bg-danger-50', icon: AlertTriangle, iconColor: 'text-danger-600' },
  medium: { border: 'border-l-warning-500', bg: 'bg-warning-50', icon: Activity, iconColor: 'text-warning-600' },
  low: { border: 'border-l-primary-500', bg: 'bg-primary-50', icon: HeartPulse, iconColor: 'text-primary-600' },
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  
  const [children, setChildren] = useState([]);
  const [latestMeasurements, setLatestMeasurements] = useState({});
  const [nextEvent, setNextEvent] = useState(null);
  const [findings, setFindings] = useState([]);
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { text: greetingText, Icon: GreetingIcon } = getGreeting();
  const firstName = user?.first_name || user?.firstName || 'Utilisateur';

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch children
        const childrenData = await listChildren();
        setChildren(childrenData || []);

        // Fetch latest measurement for each child
        const measurementsMap = {};
        let latestDate = null;

        if (childrenData && childrenData.length > 0) {
          for (const child of childrenData) {
            const childMeasurements = await listMeasurements(child.id);
            if (childMeasurements && childMeasurements.length > 0) {
              const latest = childMeasurements[0]; // Assuming sorted by date desc
              measurementsMap[child.id] = latest;
              
              if (!latestDate || new Date(latest.date_recorded) > new Date(latestDate)) {
                latestDate = latest.date_recorded;
              }
            }
          }
        }
        setLatestMeasurements(measurementsMap);

        try {
          const eventRows = [];
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          for (const child of childrenData || []) {
            const childEvents = await listEvents({ child_id: child.id });
            (childEvents || []).forEach((event) => {
              const eventDate = new Date(event.scheduled_date);
              eventDate.setHours(0, 0, 0, 0);
              if (event.status === 'planned' && eventDate >= today) {
                eventRows.push({
                  ...event,
                  child_name: `${child.first_name || child.name || 'Enfant'} ${child.last_name || ''}`.trim(),
                });
              }
            });
          }

          eventRows.sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
          setNextEvent(eventRows[0] || null);
        } catch (calendarError) {
          console.warn('Calendar events unavailable:', calendarError);
          setNextEvent(null);
        }

        try {
          const findingsData = await listClinicalFindings();
          setFindings(findingsData || []);
        } catch (findingError) {
          console.warn('Clinical findings unavailable:', findingError);
          setFindings([]);
        }

        try {
          const sharesData = await listShares();
          setShares(sharesData || []);
        } catch (sharesError) {
          console.warn('Medical team unavailable:', sharesError);
          setShares([]);
        }

      } catch (err) {
        console.error("Dashboard error:", err);
        setError("Backend indisponible - vérifiez que le serveur est démarré.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Chargement des données...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto mt-10">
        <GlassCard className="border-danger-200 bg-danger-50 text-center">
          <AlertTriangle className="w-10 h-10 text-danger-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-danger-800 mb-2">Erreur de connexion</h2>
          <p className="text-danger-600">{error}</p>
        </GlassCard>
      </div>
    );
  }

  // Compute KPI values
  const childCount = children.length;
  const activeRecsCount = findings.filter(f => ['warning', 'danger'].includes(f.severity)).length;
  const activeShares = shares.filter(share => share.status === 'active');
  const childNameById = children.reduce((acc, child) => {
    acc[String(child.id)] = `${child.first_name || child.name || 'Enfant'} ${child.last_name || ''}`.trim();
    return acc;
  }, {});
  
  const eventTypeLabel = {
    vaccination: 'Vaccination',
    appointment: 'Rendez-vous',
    checkup: 'Contrôle',
    other: 'Événement',
  };
  const nextEventDate = nextEvent
    ? new Date(nextEvent.scheduled_date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : 'Aucun';
  const nextEventTrend = nextEvent
    ? `${nextEvent.child_name} · ${eventTypeLabel[nextEvent.event_type] || 'Événement'}`
    : 'Calendrier à jour';

  return (
    <motion.div
      className="max-w-6xl mx-auto font-sans pb-10"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      {showDisclaimer && <DisclaimerModal onClose={() => setShowDisclaimer(false)} />}

      {/* Greeting */}
      <motion.div variants={fadeUp} className="mb-10">
        <div className="flex items-center gap-2 mb-1">
          <GreetingIcon className="h-5 w-5 text-primary-500" />
          <p className="text-sm font-medium text-primary-500 tracking-wide uppercase">
            {greetingText}
          </p>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
          {firstName}, voici le résumé.
        </h1>
        <p className="text-base text-gray-400 mt-2">
          Suivi de santé de vos enfants aujourd'hui.
        </p>
      </motion.div>

      {/* Summary metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5 mb-10">
        <StatPill
          label="Enfants enregistrés"
          value={String(childCount)}
          icon={Users}
          trend={childCount > 0 ? "Actifs" : "Aucun"}
          trendUp={childCount > 0}
        />
        <StatPill
          label="Prochain rendez-vous"
          value={nextEventDate}
          icon={CalendarDays}
          trend={nextEventTrend}
          trendUp={Boolean(nextEvent)}
        />
        <StatPill
          label="Nouvelles Recommandations"
          value={String(activeRecsCount)}
          icon={AlertTriangle}
          trend="À consulter"
          trendUp={activeRecsCount === 0} // Green if 0 alerts
        />
      </div>

      {/* Children overview */}
      <SectionHeader
        title="Profils des Enfants"
        subtitle="Suivi de croissance et mesures récentes"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
        {children.length === 0 ? (
          <GlassCard className="col-span-full py-10 flex flex-col items-center justify-center text-center border-dashed border-2 border-gray-200">
            <Users className="w-12 h-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">Aucun enfant ajouté</h3>
            <p className="text-gray-500 mb-6">Commencez par ajouter le profil de votre enfant pour suivre sa croissance.</p>
            <button
              onClick={() => navigate('/children/add')}
              className="bg-primary-500 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-primary-600 transition-colors"
            >
              Ajouter un profil
            </button>
          </GlassCard>
        ) : (
          <>
            {children.map((child) => {
              const latest = latestMeasurements[child.id];
              const childName = child.first_name || child.name || 'Enfant';
              const childInitial = childName.charAt(0).toUpperCase();
              
              return (
                <GlassCard key={child.id} onClick={() => navigate(`/children/${child.id}`)} className="cursor-pointer hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-5">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{childName} {child.last_name}</h3>
                      <p className="text-sm font-medium text-gray-400 mt-0.5">
                        {child.birth_date ? new Date(child.birth_date).toLocaleDateString('fr-FR') : ''}
                      </p>
                    </div>
                    <div className="h-11 w-11 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
                      {childInitial}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Poids</p>
                      <div className="flex items-baseline space-x-1">
                        <span className="text-lg font-bold text-gray-900">{latest?.weight_kg || '--'}</span>
                        <span className="text-xs text-gray-400 font-medium">kg</span>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Taille</p>
                      <div className="flex items-baseline space-x-1">
                        <span className="text-lg font-bold text-gray-900">{latest?.height_cm || '--'}</span>
                        <span className="text-xs text-gray-400 font-medium">cm</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <span className="text-xs text-gray-400">
                      {latest?.date_recorded 
                        ? `Mesuré le : ${new Date(latest.date_recorded).toLocaleDateString('fr-FR')}` 
                        : 'Aucune mesure'}
                    </span>
                    <span className="text-primary-500 text-sm font-semibold flex items-center group-hover:text-primary-600 transition-colors">
                      Détails <ChevronRight size={14} className="ml-0.5" />
                    </span>
                  </div>
                </GlassCard>
              );
            })}

            {/* Add Child Card */}
            <motion.button
              type="button"
              onClick={() => navigate('/children/add')}
              variants={fadeUp}
              className="glass-panel rounded-3xl p-6 flex flex-col items-center justify-center text-gray-400 hover:text-primary-500 hover:bg-white/80 hover:shadow-card-hover transition-all duration-500 min-h-[240px] group border-dashed border-2 border-gray-200 w-full"
            >
              <div className="h-14 w-14 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-primary-50 group-hover:border-primary-200 transition-all duration-300">
                <Plus size={24} strokeWidth={2} />
              </div>
              <p className="font-medium text-sm">Ajouter un profil</p>
            </motion.button>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        {/* Recommendations and insights */}
        <div className="lg:col-span-2">
          <SectionHeader
            title="Insights & Recommandations"
            action={
              <button
                type="button"
                onClick={() => navigate('/alerts')}
                className="text-sm font-semibold text-primary-500 hover:text-primary-600 transition-colors"
              >
                Tout voir
              </button>
            }
          />

          <div className="space-y-4">
            {findings.length === 0 ? (
              <GlassCard className="p-8 text-center border-dashed border-2 border-gray-200">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-gray-100">
                  <Sparkles className="w-6 h-6 text-gray-300" />
                </div>
                <p className="text-gray-500 font-medium text-sm">Aucune recommandation</p>
                <p className="text-gray-400 text-xs mt-1">Tout semble en ordre selon les dernières mesures.</p>
              </GlassCard>
            ) : (
              findings.slice(0, 3).map((finding) => (
                <ClinicalFindingCard key={finding.id} finding={finding} compact />
              ))
            )}
          </div>
        </div>

        {/* Doctors Card */}
        <div className="lg:col-span-1">
          <SectionHeader title="Équipe Médicale" />
          <GlassCard className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="h-10 w-10 rounded-xl bg-teal-50 flex items-center justify-center">
                <Stethoscope className="h-5 w-5 text-teal-600" />
              </div>
              {activeShares.length > 0 && (
                <span className="text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-100 px-2.5 py-1 rounded-full">
                  {activeShares.length} actif{activeShares.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex-1 flex flex-col justify-center">
              {activeShares.length === 0 ? (
                <>
                  <h3 className="text-base font-bold text-gray-900 mb-2">Aucun médecin lié</h3>
                  <p className="text-sm text-gray-500 mb-6">
                    Partagez un dossier enfant avec un médecin depuis la page Médecins.
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-base font-bold text-gray-900 mb-4">Équipe médicale liée</h3>
                  <div className="space-y-3 mb-6">
                    {activeShares.slice(0, 3).map((share) => {
                      const doctorName = share.doctor_display_name || share.doctor_email || 'Médecin lié';
                      const childName = childNameById[String(share.child_id)] || 'Enfant partagé';

                      return (
                        <button
                          key={share.id}
                          type="button"
                          onClick={() => navigate('/collaboration')}
                          className="w-full text-left rounded-2xl border border-gray-100 bg-gray-50/70 hover:bg-teal-50 hover:border-teal-100 transition-colors p-3"
                        >
                          <p className="text-sm font-bold text-gray-900 truncate">{doctorName}</p>
                          <p className="text-xs text-gray-500 mt-1 truncate">{childName}</p>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
              <button
                onClick={() => navigate('/collaboration')}
                className="w-full bg-white border border-gray-200 text-gray-700 font-medium py-2 rounded-xl text-sm hover:bg-gray-50 hover:border-gray-300 transition-colors"
              >
                Gérer les accès
              </button>
            </div>
          </GlassCard>
        </div>
      </div>

      <TrustBanner />

    </motion.div>
  );
}
