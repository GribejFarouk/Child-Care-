import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Edit3, Ruler, Weight, Activity, Calendar, Syringe, TrendingUp, Plus, ChevronRight, Sparkles, AlertTriangle } from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import SectionHeader from '../../components/ui/SectionHeader';
import { staggerContainer, fadeUp } from '../../utils/motionPresets';
import { getChild, getChildVaccinations, getChildAppointments } from '../../api/children';
import { listMeasurements } from '../../api/measurements';
import { getChildRiskScore, listClinicalFindings } from '../../api/analytics';
import ClinicalFindingCard from '../../components/findings/ClinicalFindingCard';
export default function ChildDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [child, setChild] = useState(null);
  const [measurements, setMeasurements] = useState([]);
  const [vaccinations, setVaccinations] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [riskScore, setRiskScore] = useState(null);
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchChildAndData = async () => {
      try {
        const data = await getChild(id);
        const mappedData = {
          ...data,
          name: data.first_name ? `${data.first_name} ${data.last_name || ''}`.trim() : data.name,
          age: data.age || null,
          bloodType: data.blood_group || data.bloodType || 'Non renseigne',
          pediatrician: data.pediatrician || 'Non renseigné',
          allergies: Array.isArray(data.allergies) ? data.allergies : (data.allergies ? data.allergies.split(',') : ['Aucune connue']),
          birthDate: data.date_of_birth || data.birthDate || new Date().toISOString(),
        };
        setChild(mappedData);

        const [m, v, a] = await Promise.all([
          listMeasurements(id),
          getChildVaccinations(id),
          getChildAppointments(id)
        ]);
        setMeasurements(m);
        setVaccinations(v);
        setAppointments(a);

        try {
          const [riskData, findingsData] = await Promise.all([
            getChildRiskScore(id),
            listClinicalFindings(id),
          ]);
          setRiskScore(riskData);
          setFindings(findingsData || []);
        } catch (analyticsError) {
          console.warn('Analyse indisponible pour cet enfant', analyticsError);
          setRiskScore(null);
          setFindings([]);
        }

      } catch (err) {
        setError('Profil introuvable.');
      } finally {
        setLoading(false);
      }
    };
    fetchChildAndData();
  }, [id]);

  if (loading) {
    return <div className="max-w-6xl mx-auto text-center py-20 text-gray-500">Chargement...</div>;
  }

  if (error || !child) {
    return (
      <div className="max-w-6xl mx-auto text-center py-20">
        <p className="text-gray-500 text-lg">Profil introuvable.</p>
        <Link to="/children" className="text-primary-500 font-medium mt-4 inline-block">Retour a la liste</Link>
      </div>
    );
  }

  const childMeasurements = [...measurements].sort((a, b) => new Date(b.date_recorded || b.date) - new Date(a.date_recorded || a.date));
  const latestMeasurement = childMeasurements[0] || null;
  const childVaccinations = vaccinations;
  const childAppointments = appointments;

  const formatAge = (birthDate) => {
    const birth = new Date(birthDate);
    const today = new Date();
    if (Number.isNaN(birth.getTime())) return 'Age non renseigne';

    let months = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
    if (today.getDate() < birth.getDate()) months -= 1;
    if (months < 0) return 'Age non renseigne';
    if (months < 24) return `${months} mois`;

    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    return remainingMonths ? `${years} ans ${remainingMonths} mois` : `${years} ans`;
  };

  const formatMetric = (value, unit) => {
    if (value === null || value === undefined || value === '') return 'Aucune mesure';
    const numeric = Number(value);
    const display = Number.isNaN(numeric) ? value : numeric.toFixed(1);
    return `${display} ${unit}`;
  };

  const displayAge = child.age || formatAge(child.birthDate);
  const latestWeight = latestMeasurement?.weight_kg ?? latestMeasurement?.weight;
  const latestHeight = latestMeasurement?.height_cm ?? latestMeasurement?.height;
  const latestBmi = latestMeasurement?.bmi;
  const latestHeadCircumference = latestMeasurement?.head_circumference_cm ?? latestMeasurement?.headCircumference;
  const riskLevel = riskScore?.risk_level || 'unknown';
  const riskLabel = riskScore?.risk_label || (riskLevel === 'unknown' ? 'Non disponible' : riskLevel);
  const concerningRisk = ['elevated', 'high'].includes(riskLevel);
  const riskClasses = {
    low: 'bg-success-50 text-success-700 border-success-100',
    moderate: 'bg-warning-50 text-warning-700 border-warning-100',
    elevated: 'bg-orange-50 text-orange-700 border-orange-100',
    high: 'bg-danger-50 text-danger-700 border-danger-100',
    unknown: 'bg-gray-50 text-gray-600 border-gray-100',
  };

  return (
    <motion.div className="max-w-6xl mx-auto" variants={staggerContainer} initial="hidden" animate="show">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate('/children')} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{child.name}</h1>
          <p className="text-sm text-gray-400 mt-0.5">{displayAge} &middot; {child.sex === 'M' ? 'Garcon' : 'Fille'} &middot; Ne(e) le {new Date(child.birthDate).toLocaleDateString('fr-FR')}</p>
        </div>
        <div className={`h-14 w-14 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md ${
          child.sex === 'M' ? 'bg-gradient-to-br from-primary-400 to-primary-600' : 'bg-gradient-to-br from-pink-400 to-pink-600'
        }`}>
          {child.name.charAt(0)}
        </div>
      </motion.div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
        {[
          { label: 'Poids', value: formatMetric(latestWeight, 'kg'), icon: Weight, color: 'text-primary-500' },
          { label: 'Taille', value: formatMetric(latestHeight, 'cm'), icon: Ruler, color: 'text-success-500' },
          { label: 'IMC', value: formatMetric(latestBmi, 'kg/m2'), icon: TrendingUp, color: 'text-indigo-500' },
          { label: 'Perimetre cranien', value: formatMetric(latestHeadCircumference, 'cm'), icon: Activity, color: 'text-warning-500' },
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
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">IMC</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">PC (cm)</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {childMeasurements.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-900">{new Date(m.date_recorded || m.date).toLocaleDateString('fr-FR')}</td>
                  <td className="px-5 py-3 text-gray-600">{m.weight_kg || m.weight || '-'}</td>
                  <td className="px-5 py-3 text-gray-600">{m.height_cm || m.height || '-'}</td>
                  <td className="px-5 py-3 text-gray-600">{m.bmi || '-'}</td>
                  <td className="px-5 py-3 text-gray-600">{m.head_circumference_cm || m.headCircumference || '-'}</td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{m.notes || '-'}</td>
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
      {/* AI Risk Insight */}
      <motion.div variants={fadeUp} className={`glass-panel rounded-2xl p-5 mb-8 border ${riskClasses[riskLevel] || riskClasses.unknown}`}>
        <div className="flex items-center gap-2 mb-3">
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${concerningRisk ? 'bg-danger-50' : 'bg-indigo-50'}`}>
            {concerningRisk ? <AlertTriangle size={16} className="text-danger-500" /> : <Sparkles size={16} className="text-indigo-500" />}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Aperçu risque / aide à la décision</p>
            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-500">Module préliminaire</span>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-xs font-bold uppercase px-2 py-1 rounded-lg border ${riskClasses[riskLevel] || riskClasses.unknown}`}>
            Niveau de risque : {riskLabel}
          </span>
        </div>
        <div className="space-y-2">
          {riskScore?.available ? (
            <>
              {concerningRisk && (
                <div className="flex items-start gap-2 rounded-xl border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-700">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <span>Certains indicateurs demandent une attention particulière. Vérifiez les mesures et consultez un professionnel si nécessaire.</span>
                </div>
              )}
              {riskScore.factors?.slice(0, 3).map((factor) => (
                <p key={factor.name} className="text-sm text-gray-700">
                  <strong>{factor.label} :</strong> {factor.detail}
                </p>
              ))}
            </>
          ) : (
            <p className="text-sm text-gray-700">Aucune analyse disponible pour <strong>{child.name}</strong>. Ajoutez ou analysez une mesure pour générer des recommandations.</p>
          )}
        </div>
        {findings.length > 0 && (
          <div className="mt-4 space-y-3">
            {findings.slice(0, 3).map((finding) => (
              <ClinicalFindingCard key={finding.id} finding={finding} />
            ))}
          </div>
        )}
        <p className="text-[11px] text-gray-400 mt-3 italic">
          Analyse générée à titre indicatif. Consultez votre pédiatre pour toute interprétation médicale.
        </p>
      </motion.div>
    </motion.div>
  );
}
