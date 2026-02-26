import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, AlertTriangle, ChevronRight, Plus, Calendar, TrendingUp, HeartPulse, Sparkles, Sun, CloudSun, Moon } from 'lucide-react';
import DisclaimerModal from '../../components/ui/DisclaimerModal';
import GlassCard from '../../components/ui/GlassCard';
import StatPill from '../../components/ui/StatPill';
import SectionHeader from '../../components/ui/SectionHeader';
import AnimatedMetric from '../../components/ui/AnimatedMetric';
import TrustBanner from '../../components/ui/TrustBanner';
import { staggerContainer, fadeUp } from '../../utils/motionPresets';
import { currentUser, children, alerts, dashboardSummary } from '../../data/mockData';

/* Time-of-day greeting helper */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Bonjour', Icon: Sun };
  if (h < 18) return { text: 'Bon après-midi', Icon: CloudSun };
  return { text: 'Bonsoir', Icon: Moon };
}

/* Severity config for alert styling */
const severityConfig = {
  warning: { border: 'border-l-warning-500', bg: 'bg-warning-50', icon: TrendingUp, iconColor: 'text-warning-600' },
  info: { border: 'border-l-primary-500', bg: 'bg-primary-50', icon: HeartPulse, iconColor: 'text-primary-600' },
};

export default function Dashboard() {
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const navigate = useNavigate();
  const { text: greetingText, Icon: GreetingIcon } = getGreeting();

  return (
    <motion.div
      className="max-w-6xl mx-auto font-sans"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      {showDisclaimer && <DisclaimerModal onClose={() => setShowDisclaimer(false)} />}

      {/* ── Hero Greeting ── */}
      <motion.div variants={fadeUp} className="mb-10">
        <div className="flex items-center gap-2 mb-1">
          <GreetingIcon className="h-5 w-5 text-primary-500" />
          <p className="text-sm font-medium text-primary-500 tracking-wide uppercase">
            {greetingText}
          </p>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
          {currentUser.firstName}, voici le résumé.
        </h1>
        <p className="text-base text-gray-400 mt-2">
          Suivi de santé de vos enfants aujourd'hui.
        </p>
      </motion.div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5 mb-10">
        <StatPill
          label="Prochain RDV"
          value={dashboardSummary.nextAppointmentLabel}
          icon={Calendar}
          trend={dashboardSummary.nextAppointmentType}
          trendUp={true}
        />
        <StatPill
          label="Mesures Récentes"
          value={String(dashboardSummary.recentMeasurementsThisWeek)}
          icon={Activity}
          trend="Cette semaine"
          trendUp={true}
        />
        <StatPill
          label="Alertes Actives"
          value={String(dashboardSummary.activeAlerts)}
          icon={AlertTriangle}
          trend="À vérifier"
          trendUp={false}
        />
      </div>

      {/* ── Children Overview ── */}
      <SectionHeader
        title="Profils des Enfants"
        subtitle="Suivi de croissance et mesures récentes"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
        {children.map((child) => (
          <GlassCard key={child.id} onClick={() => navigate(`/children/${child.id}`)}>
            <div className="flex justify-between items-start mb-5">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{child.name}</h3>
                <p className="text-sm font-medium text-gray-400 mt-0.5">{child.age}</p>
              </div>
              <div className="h-11 w-11 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
                {child.name.charAt(0)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Poids</p>
                <div className="flex items-baseline space-x-1">
                  <AnimatedMetric value={child.weight} />
                  <span className="text-xs text-gray-400 font-medium">kg</span>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Taille</p>
                <div className="flex items-baseline space-x-1">
                  <AnimatedMetric value={child.height} />
                  <span className="text-xs text-gray-400 font-medium">cm</span>
                </div>
              </div>
            </div>

            {/* Trend indicator */}
            <div className="flex items-center gap-1.5 mb-4">
              <Sparkles className={`h-3.5 w-3.5 ${child.trend === 'stable' ? 'text-success-500' : 'text-warning-500'}`} />
              <span className={`text-xs font-medium ${child.trend === 'stable' ? 'text-success-600' : 'text-warning-600'}`}>
                {child.trend === 'stable' ? 'Croissance normale' : 'À surveiller'}
              </span>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <span className="text-xs text-gray-400">Mis à jour : {child.lastUpdate}</span>
              <span className="text-primary-500 text-sm font-semibold flex items-center group-hover:text-primary-600 transition-colors">
                Détails <ChevronRight size={14} className="ml-0.5" />
              </span>
            </div>
          </GlassCard>
        ))}

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
      </div>

      {/* ── Alerts & Insights ── */}
      <SectionHeader
        title="Insights & Alertes"
        action={
          <button
            type="button"
            onClick={() => navigate('/alerts')}
            className="text-sm font-semibold text-primary-500 hover:text-primary-600 transition-colors"
          >
            Voir l'historique
          </button>
        }
      />

      <GlassCard className="!p-0 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {alerts.map((alert) => {
            const config = severityConfig[alert.type] || severityConfig.info;
            const IconEl = config.icon;
            return (
              <motion.div
                key={alert.id}
                className={`p-5 flex items-start hover:bg-gray-50/50 transition-colors cursor-pointer border-l-[3px] ${config.border}`}
                whileHover={{ x: 2 }}
                transition={{ duration: 0.15 }}
              >
                <div className={`mt-0.5 mr-4 flex-shrink-0 h-9 w-9 rounded-xl flex items-center justify-center ${config.bg}`}>
                  <IconEl size={18} className={config.iconColor} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-gray-900 text-sm">{alert.child}</p>
                    <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{alert.date}</span>
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed">{alert.message}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </GlassCard>

      <TrustBanner />

    </motion.div>
  );
}
