import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Edit3, Ruler, Weight, Activity, Calendar, Syringe, TrendingUp, Plus, Trash2, ChevronRight } from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import SectionHeader from '../../components/ui/SectionHeader';
import { staggerContainer, fadeUp } from '../../utils/motionPresets';
import { children, measurements, vaccinations, appointments } from '../../data/mockData';

export default function ChildDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const child = children.find((c) => c.id === Number(id));

  if (!child) {
    return (
      <div className="max-w-6xl mx-auto text-center py-20">
        <p className="text-gray-500 text-lg">Profil introuvable.</p>
        <Link to="/children" className="text-primary-500 font-medium mt-4 inline-block">Retour a la liste</Link>
      </div>
    );
  }

  const childMeasurements = measurements
    .filter((m) => m.childId === child.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const childVaccinations = vaccinations.filter((v) => v.childId === child.id);
  const childAppointments = appointments.filter((a) => a.childId === child.id);

  return (
    <motion.div className="max-w-6xl mx-auto" variants={staggerContainer} initial="hidden" animate="show">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate('/children')} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{child.name}</h1>
          <p className="text-sm text-gray-400 mt-0.5">{child.age} &middot; {child.sex === 'M' ? 'Garcon' : 'Fille'} &middot; Ne(e) le {new Date(child.birthDate).toLocaleDateString('fr-FR')}</p>
        </div>
        <div className={`h-14 w-14 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md ${
          child.sex === 'M' ? 'bg-gradient-to-br from-primary-400 to-primary-600' : 'bg-gradient-to-br from-pink-400 to-pink-600'
        }`}>
          {child.name.charAt(0)}
        </div>
      </motion.div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Poids', value: `${child.weight} kg`, icon: Weight, color: 'text-primary-500' },
          { label: 'Taille', value: `${child.height} cm`, icon: Ruler, color: 'text-success-500' },
          { label: 'PC', value: `${child.headCircumference} cm`, icon: Activity, color: 'text-warning-500' },
          { label: 'Groupe sanguin', value: child.bloodType, icon: TrendingUp, color: 'text-danger-500' },
        ].map((stat) => (
          <motion.div key={stat.label} variants={fadeUp} className="glass-panel rounded-2xl p-4">
            <stat.icon className={`h-5 w-5 ${stat.color} mb-2`} />
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{stat.label}</p>
            <p className="text-lg font-bold text-gray-900 mt-0.5">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Medical Info */}
      <motion.div variants={fadeUp} className="glass-panel rounded-2xl p-5 mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Pediatre</p>
            <p className="text-sm font-medium text-gray-900">{child.pediatrician}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Allergies</p>
            <div className="flex flex-wrap gap-1.5">
              {child.allergies.map((a, i) => (
                <span key={i} className={`text-xs font-medium px-2 py-0.5 rounded-full ${a === 'Aucune connue' ? 'bg-success-50 text-success-600' : 'bg-danger-50 text-danger-600'}`}>{a}</span>
              ))}
            </div>
          </div>
          <div className="flex items-end gap-2">
            <Link to={`/children/${child.id}/edit`} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-all hover:shadow-lg hover:-translate-y-0.5">
              <Edit3 size={14} /> Modifier
            </Link>
            <Link to={`/children/${child.id}/growth`} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-50 text-primary-600 text-sm font-medium hover:bg-primary-100 transition-all">
              <TrendingUp size={14} /> Courbes
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Measurements Table */}
      <SectionHeader
        title="Mesures recentes"
        subtitle={`${childMeasurements.length} enregistrement(s)`}
        action={
          <Link to={`/children/${child.id}/measurements/add`} className="flex items-center gap-1.5 text-sm font-semibold text-primary-500 hover:text-primary-600 transition-colors">
            <Plus size={16} /> Ajouter
          </Link>
        }
      />
      <motion.div variants={fadeUp} className="glass-panel rounded-2xl overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Poids (kg)</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Taille (cm)</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">PC (cm)</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {childMeasurements.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-900">{new Date(m.date).toLocaleDateString('fr-FR')}</td>
                  <td className="px-5 py-3 text-gray-600">{m.weight}</td>
                  <td className="px-5 py-3 text-gray-600">{m.height}</td>
                  <td className="px-5 py-3 text-gray-600">{m.headCircumference}</td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{m.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Vaccinations */}
      <SectionHeader title="Vaccinations" subtitle="Historique et prochains vaccins" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        {childVaccinations.map((v) => (
          <motion.div key={v.id} variants={fadeUp} className={`glass-panel rounded-2xl p-4 flex items-center gap-3 ${v.status === 'scheduled' ? 'border-l-[3px] border-l-primary-500' : ''}`}>
            <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${v.status === 'done' ? 'bg-success-50' : 'bg-primary-50'}`}>
              <Syringe size={16} className={v.status === 'done' ? 'text-success-500' : 'text-primary-500'} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{v.name}</p>
              <p className="text-xs text-gray-400">{new Date(v.date).toLocaleDateString('fr-FR')}</p>
            </div>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${v.status === 'done' ? 'bg-success-50 text-success-600' : 'bg-primary-50 text-primary-600'}`}>
              {v.status === 'done' ? 'Fait' : 'Prevu'}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Upcoming Appointments */}
      {childAppointments.length > 0 && (
        <>
          <SectionHeader title="Rendez-vous" />
          <div className="space-y-3 mb-8">
            {childAppointments.map((apt) => (
              <motion.div key={apt.id} variants={fadeUp} className="glass-panel rounded-2xl p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-primary-50 flex items-center justify-center">
                  <Calendar size={18} className="text-primary-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{apt.type}</p>
                  <p className="text-xs text-gray-400">{apt.dateDisplay} &middot; {apt.location}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
}
