import { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, AlertTriangle, ChevronRight, Plus, Calendar, TrendingUp, HeartPulse } from 'lucide-react';
import DisclaimerModal from '../../components/ui/DisclaimerModal';
import GlassCard from '../../components/ui/GlassCard';
import StatPill from '../../components/ui/StatPill';
import SectionHeader from '../../components/ui/SectionHeader';
import AnimatedMetric from '../../components/ui/AnimatedMetric';
import TrustBanner from '../../components/ui/TrustBanner';
import { staggerContainer, fadeUp } from '../../utils/motionPresets';

export default function Dashboard() {
  const [showDisclaimer, setShowDisclaimer] = useState(true);

  // Mock Data
  const children = [
    { id: 1, name: 'Léo', age: '14 mois', weight: 10.2, height: 78, lastUpdate: 'Il y a 2 jours', trend: 'stable' },
    { id: 2, name: 'Mia', age: '3 ans', weight: 14.5, height: 95, lastUpdate: 'Il y a 1 semaine', trend: 'attention' },
  ];

  const alerts = [
    { id: 1, child: 'Léo', message: 'Rappel : Vaccin ROR prévu la semaine prochaine.', type: 'info', date: 'Aujourd\'hui' },
    { id: 2, child: 'Mia', message: 'La courbe de poids montre un léger ralentissement.', type: 'warning', date: 'Hier' },
  ];

  return (
    <motion.div 
      className="max-w-6xl mx-auto font-sans"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      {showDisclaimer && <DisclaimerModal onClose={() => setShowDisclaimer(false)} />}

      {/* Hero Section */}
      <motion.div variants={fadeUp} className="mb-12">
        <h1 className="text-4xl font-bold text-primary-900 tracking-tight">
          Bonjour, Sarah
        </h1>
        <p className="text-lg text-gray-500 mt-2 font-medium">
          Voici le résumé de santé de vos enfants aujourd'hui.
        </p>
      </motion.div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <StatPill 
          label="Prochain Rendez-vous" 
          value="12 Oct" 
          icon={Calendar} 
          trend="Pédiatre" 
          trendUp={true} 
        />
        <StatPill 
          label="Mesures Récentes" 
          value="2" 
          icon={Activity} 
          trend="Cette semaine" 
          trendUp={true} 
        />
        <StatPill 
          label="Alertes Actives" 
          value="1" 
          icon={AlertTriangle} 
          trend="À vérifier" 
          trendUp={false} 
        />
      </div>

      {/* Children Overview */}
      <SectionHeader 
        title="Profils des Enfants" 
        subtitle="Suivi de croissance et mesures récentes"
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {children.map((child) => (
          <GlassCard key={child.id} onClick={() => console.log('Navigate to profile')}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-primary-900">{child.name}</h3>
                <p className="text-sm font-medium text-gray-500 mt-1">{child.age}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary-50 flex items-center justify-center text-primary-600 font-bold text-lg shadow-sm border border-primary-100">
                {child.name.charAt(0)}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white/60 rounded-xl p-4 border border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Poids</p>
                <div className="flex items-baseline space-x-1">
                  <AnimatedMetric value={child.weight} />
                  <span className="text-sm text-gray-500 font-medium">kg</span>
                </div>
              </div>
              <div className="bg-white/60 rounded-xl p-4 border border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Taille</p>
                <div className="flex items-baseline space-x-1">
                  <AnimatedMetric value={child.height} />
                  <span className="text-sm text-gray-500 font-medium">cm</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100/50">
              <span className="text-xs font-medium text-gray-400">Mis à jour : {child.lastUpdate}</span>
              <span className="text-primary-600 text-sm font-semibold flex items-center group-hover:text-primary-700 transition-colors">
                Détails <ChevronRight size={16} className="ml-1" />
              </span>
            </div>
          </GlassCard>
        ))}

        {/* Add Child Card */}
        <motion.button 
          variants={fadeUp}
          className="glass-panel rounded-3xl p-6 flex flex-col items-center justify-center text-gray-400 hover:text-primary-600 hover:bg-white/80 hover:shadow-apple-hover transition-all duration-500 min-h-[240px] group border-dashed border-2 border-gray-300/50 w-full"
        >
          <div className="h-14 w-14 rounded-full bg-white shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500">
            <Plus size={24} strokeWidth={2} />
          </div>
          <p className="font-medium text-sm tracking-wide">Ajouter un profil</p>
        </motion.button>
      </div>

      {/* Alerts & Insights */}
      <SectionHeader 
        title="Insights & Alertes" 
        action={
          <button className="text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors">
            Voir l'historique
          </button>
        }
      />

      <GlassCard className="!p-0 overflow-hidden">
        <div className="divide-y divide-gray-100/50">
          {alerts.map((alert) => (
            <div 
              key={alert.id} 
              className="p-6 flex items-start hover:bg-white/40 transition-colors cursor-pointer"
            >
              <div className={`mt-1 mr-4 flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
                alert.type === 'warning' 
                  ? 'bg-primary-50 text-primary-600' 
                  : 'bg-primary-50 text-primary-600'
              }`}>
                {alert.type === 'warning' ? <TrendingUp size={20} /> : <HeartPulse size={20} />}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-primary-900">{alert.child}</p>
                  <span className="text-xs font-medium text-gray-400">{alert.date}</span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{alert.message}</p>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      <TrustBanner />
      
    </motion.div>
  );
}
