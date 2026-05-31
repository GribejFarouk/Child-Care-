import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, UserX, Activity, ShieldAlert, Lock, User, FileText, CalendarDays, ScanText, TrendingUp, Scale, Ruler, Brain, HeartPulse } from 'lucide-react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import GlassCard from '../../components/ui/GlassCard';
import { staggerContainer, fadeUp } from '../../utils/motionPresets';
import { getChild } from '../../api/children';
import { listMeasurements } from '../../api/measurements';
import { listShares } from '../../api/collaboration';
import { listAlerts, listRecommendations, getChildRiskScore, getGrowthReferenceCurve } from '../../api/analytics';
import { listEvents } from '../../api/calendar';
import { listOcrImports } from '../../api/ocr';
import RecommendationCard from '../../components/recommendations/RecommendationCard';
import FactorsBreakdown from '../../components/recommendations/FactorsBreakdown';

export default function DoctorPatientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [child, setChild] = useState(null);
  const [share, setShare] = useState(null);
  const [measurements, setMeasurements] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [riskScoreData, setRiskScoreData] = useState(null);
  const [events, setEvents] = useState(null);
  const [ocrImports, setOcrImports] = useState(null);
  const [growthRef, setGrowthRef] = useState(null);
  const [growthMetric, setGrowthMetric] = useState('weight');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    fetchPatientData();
  }, [id]);

  const growthMetricConfig = {
    weight: { label: 'Poids', icon: Scale, unit: 'kg', metricKey: 'weight', dataKey: 'weight_kg', color: '#0ea5e9' },
    height: { label: 'Taille', icon: Ruler, unit: 'cm', metricKey: 'height', dataKey: 'height_cm', color: '#8b5cf6' },
    bmi: { label: 'IMC', icon: HeartPulse, unit: 'kg/m²', metricKey: 'bmi', dataKey: 'bmi', color: '#ef4444' },
    head: { label: 'Périmètre crânien', icon: Brain, unit: 'cm', metricKey: 'head_circumference', dataKey: 'head_circumference_cm', color: '#f59e0b' },
  };

  useEffect(() => {
    const loadReference = async () => {
      if (!child || !share?.permissions?.growth) return;
      const sex = child.sex === 'F' ? 'F' : 'M';
      const metric = growthMetricConfig[growthMetric];
      const ref = await getGrowthReferenceCurve({
        sex,
        metric: metric.metricKey,
        minAgeMonths: 0,
        maxAgeMonths: metric.metricKey === 'head_circumference' ? 60 : 228,
      });
      setGrowthRef(ref?.available ? ref : null);
    };
    loadReference();
  }, [child, share, growthMetric]);

  const fetchPatientData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch child profile
      const childData = await getChild(id);
      
      // 2. Fetch shares to get permissions
      const sharesData = await listShares();
      const patientShare = sharesData.find(s => s.child_id === id && s.status === 'active');
      
      if (!patientShare) {
        setError('Accès révoqué ou introuvable.');
        setLoading(false);
        return;
      }

      setChild(childData);
      setShare(patientShare);

      // 3. Fetch measurements if permitted
      if (patientShare.permissions?.measurements || patientShare.permissions?.growth) {
        try {
          const mData = await listMeasurements(id);
          setMeasurements(mData);
        } catch (e) {
          console.error("Failed to fetch measurements", e);
          setMeasurements([]);
        }
      }

      if (patientShare.permissions?.alerts) {
        try {
          const alertsData = await listAlerts(id);
          setAlerts(alertsData);
        } catch (e) {
          console.error("Failed to fetch alerts", e);
          setAlerts([]);
        }

        try {
          const recsData = await listRecommendations(id);
          setRecommendations(recsData);
        } catch (e) {
          console.error("Failed to fetch recommendations", e);
          setRecommendations([]);
        }

        try {
          const scoreData = await getChildRiskScore(id);
          setRiskScoreData(scoreData);
        } catch (e) {
          // It's normal if there's no score yet (404).
          setRiskScoreData(null);
        }
      }

      if (patientShare.permissions?.calendar) {
        try {
          const eventsData = await listEvents({ child_id: id });
          setEvents(eventsData);
        } catch (e) {
          console.error("Failed to fetch calendar events", e);
          setEvents([]);
        }
      }

      if (patientShare.permissions?.ocr) {
        try {
          const importsData = await listOcrImports(id);
          setOcrImports(importsData);
        } catch (e) {
          console.error("Failed to fetch OCR imports", e);
          setOcrImports([]);
        }
      }

    } catch (err) {
      console.error(err);
      setError('Impossible de charger le dossier du patient. Vérifiez vos accès.');
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (dob) => {
    if (!dob) return 'N/A';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    if (age === 0) {
      const months = m < 0 ? 12 + m : m;
      return `${months} mois`;
    }
    return `${age} ans`;
  };

  const getChildInitials = () => {
    const first = child?.first_name?.charAt(0) || '';
    const last = child?.last_name?.charAt(0) || '';
    return `${first}${last}` || '?';
  };

  const getSexLabel = (sex) => {
    if (sex === 'M') return 'Garçon';
    if (sex === 'F') return 'Fille';
    return 'Sexe non renseigné';
  };

  const getAllergies = () => {
    if (!child?.allergies) return [];
    if (Array.isArray(child.allergies)) return child.allergies.filter(Boolean);
    if (typeof child.allergies === 'string') {
      return child.allergies.split(',').map((a) => a.trim()).filter(Boolean);
    }
    return [];
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (error || !child) {
    return (
      <motion.div className="max-w-4xl mx-auto" variants={staggerContainer} initial="hidden" animate="show">
        <motion.button onClick={() => navigate('/doctor/patients')} className="flex items-center text-sm font-semibold text-gray-500 hover:text-gray-900 mb-6 transition-colors">
          <ArrowLeft size={16} className="mr-1.5" /> Retour aux patients
        </motion.button>
        <motion.div variants={fadeUp}>
          <GlassCard className="py-24 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
              <UserX className="w-10 h-10 text-red-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Accès refusé</h3>
            <p className="text-gray-500 max-w-md mx-auto text-lg leading-relaxed">{error}</p>
          </GlassCard>
        </motion.div>
      </motion.div>
    );
  }

  const hasPermission = (key) => share?.permissions?.[key] === true;
  const metricConfig = growthMetricConfig[growthMetric];
  const getMeasurementAgeMonths = (measurement) => {
    if (measurement.age_at_recording_months !== null && measurement.age_at_recording_months !== undefined) {
      return Number(measurement.age_at_recording_months);
    }
    if (!child?.date_of_birth || !measurement.date_recorded) return null;
    const dob = new Date(child.date_of_birth);
    const date = new Date(measurement.date_recorded);
    if (Number.isNaN(dob.getTime()) || Number.isNaN(date.getTime()) || date < dob) return null;
    let months = (date.getFullYear() - dob.getFullYear()) * 12 + date.getMonth() - dob.getMonth();
    if (date.getDate() < dob.getDate()) months -= 1;
    return Math.max(0, months);
  };
  const interpolateReference = (points, ageMonths) => {
    if (!points?.length || ageMonths === null || ageMonths === undefined) return {};
    if (ageMonths <= points[0].age_months) return points[0];
    if (ageMonths >= points[points.length - 1].age_months) return points[points.length - 1];
    for (let i = 0; i < points.length - 1; i += 1) {
      const lower = points[i];
      const upper = points[i + 1];
      if (lower.age_months <= ageMonths && upper.age_months >= ageMonths) {
        const t = (ageMonths - lower.age_months) / (upper.age_months - lower.age_months);
        return {
          p3: lower.p3 + t * (upper.p3 - lower.p3),
          p50: lower.p50 + t * (upper.p50 - lower.p50),
          p97: lower.p97 + t * (upper.p97 - lower.p97),
        };
      }
    }
    return {};
  };
  const growthChartData = (measurements || [])
    .map((measurement) => {
      const ageMonths = getMeasurementAgeMonths(measurement);
      const actual = measurement[metricConfig.dataKey] !== null && measurement[metricConfig.dataKey] !== undefined
        ? Number(measurement[metricConfig.dataKey])
        : null;
      if (ageMonths === null || actual === null || Number.isNaN(actual)) return null;
      const ref = interpolateReference(growthRef?.points, ageMonths);
      return {
        age_months: ageMonths,
        label: `${ageMonths} m`,
        actual,
        p3: ref.p3 ?? null,
        p50: ref.p50 ?? null,
        p97: ref.p97 ?? null,
        range: ref.p3 !== undefined && ref.p97 !== undefined ? [ref.p3, ref.p97] : null,
        date: new Date(measurement.date_recorded).toLocaleDateString('fr-FR'),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.age_months - b.age_months);
  const visibleRiskScore = riskScoreData?.risk_score ?? recommendations?.find((rec) => rec.risk_score !== undefined)?.risk_score;
  const visibleRiskLevel = riskScoreData?.risk_level ?? recommendations?.[0]?.risk_level;
  const visibleRiskLabel = riskScoreData?.risk_label ?? recommendations?.[0]?.risk_label;
  const visibleFactors = riskScoreData?.factors ?? recommendations?.find((rec) => rec.factors_json)?.factors_json;

  return (
    <motion.div className="max-w-5xl mx-auto pb-10" variants={staggerContainer} initial="hidden" animate="show">
      <motion.button onClick={() => navigate('/doctor/patients')} className="flex items-center text-sm font-semibold text-gray-500 hover:text-gray-900 mb-6 transition-colors">
        <ArrowLeft size={16} className="mr-1.5" /> Retour aux patients
      </motion.button>

      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center gap-5 mb-8 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        {child.profile_picture_url ? (
          <img src={child.profile_picture_url} alt="Profile" className="w-20 h-20 rounded-full object-cover border-4 border-teal-50" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center text-teal-700 font-bold text-3xl shadow-sm">
            {getChildInitials()}
          </div>
        )}
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{child.first_name} {child.last_name}</h1>
              <p className="text-gray-500 mt-1 flex items-center gap-2">
                {calculateAge(child.date_of_birth)} &middot; {getSexLabel(child.sex)} &middot; Né(e) le {new Date(child.date_of_birth).toLocaleDateString()}
              </p>
            </div>
            {visibleRiskScore !== undefined && (
              <div className="bg-white px-4 py-2 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center min-w-[120px]">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Score IA</span>
                <div className="text-2xl font-black text-gray-900">{visibleRiskScore}</div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-md mt-1
                  ${visibleRiskLevel === 'high' ? 'bg-red-100 text-red-700' : 
                    visibleRiskLevel === 'elevated' ? 'bg-orange-100 text-orange-700' :
                    visibleRiskLevel === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'}
                `}>
                  {visibleRiskLabel}
                </span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={fadeUp} className="flex gap-2 mb-6 border-b border-gray-200 pb-px">
        {[
          { id: 'profile', label: 'Profil de base', icon: User },
          { id: 'measurements', label: 'Mesures', icon: Activity },
          { id: 'growth', label: 'Courbes', icon: TrendingUp },
          { id: 'alerts', label: 'Alertes', icon: ShieldAlert },
          { id: 'calendar', label: 'Calendrier', icon: CalendarDays },
          { id: 'ocr', label: 'Documents OCR', icon: ScanText },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id 
                ? 'border-teal-600 text-teal-700' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.id !== 'profile' && !hasPermission(tab.id) ? <Lock size={16} /> : <tab.icon size={18} />}
            {tab.label}
          </button>
        ))}
      </motion.div>

      {/* Tab Content */}
      <motion.div variants={fadeUp} className="min-h-[400px]">
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GlassCard className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-600" />
                Informations Médicales
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Groupe Sanguin</p>
                  <p className="text-gray-900 font-medium">{child.blood_group || 'Non renseigné'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Allergies</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {getAllergies().length > 0 ? getAllergies().map((a, i) => (
                      <span key={i} className="bg-red-50 text-red-700 px-3 py-1 rounded-lg text-sm font-medium border border-red-100">
                        {a}
                      </span>
                    )) : (
                      <span className="text-gray-500">Aucune connue</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Maladies chroniques</p>
                  <p className="text-gray-900 font-medium">{child.chronic_conditions || 'Aucune'}</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-6 bg-teal-50/50 border border-teal-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-teal-600" />
                Résumé des accès
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                En tant que médecin traitant, vous avez accès aux sections suivantes du dossier :
              </p>
              <div className="space-y-2">
                {Object.entries(share.permissions || {}).map(([key, val]) => {
                  const labels = {
                    profile: 'Profil et antécédents',
                    measurements: 'Carnet de mesures (Poids, Taille, PC)',
                    growth: 'Courbes de croissance OMS',
                    alerts: 'Alertes générées par le système',
                    calendar: 'Calendrier des vaccinations',
                    ocr: 'Analyses de sang importées'
                  };
                  return (
                    <div key={key} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                      <span className="text-sm font-medium text-gray-700">{labels[key] || key}</span>
                      {val ? (
                        <span className="text-xs font-bold uppercase tracking-wider text-green-600 bg-green-50 px-2 py-1 rounded">Autorisé</span>
                      ) : (
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-400 bg-gray-100 px-2 py-1 rounded">Refusé</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          </div>
        )}

        {activeTab === 'measurements' && (
          <div>
            {!hasPermission('measurements') ? (
              <GlassCard className="py-20 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Lock className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Accès restreint</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Le parent n'a pas autorisé l'accès aux mesures de cet enfant.
                </p>
              </GlassCard>
            ) : (
              <GlassCard className="p-0 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-teal-600" />
                    Historique des mesures
                  </h3>
                </div>
                {measurements && measurements.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Poids (kg)</th>
                          <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Taille (cm)</th>
                          <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">PC (cm)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {measurements.map((m) => (
                          <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4 font-medium text-gray-900">
                              {new Date(m.date_recorded).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 text-gray-600">{m.weight_kg || '—'}</td>
                            <td className="px-6 py-4 text-gray-600">{m.height_cm || '—'}</td>
                            <td className="px-6 py-4 text-gray-600">{m.head_circumference_cm || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-10 text-center text-gray-500">
                    Aucune mesure enregistrée.
                  </div>
                )}
              </GlassCard>
            )}
          </div>
        )}

        {activeTab === 'growth' && (
          <div>
            {!hasPermission('growth') ? (
              <GlassCard className="py-20 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Lock className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Accès restreint</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Le parent n'a pas autorisé l'accès aux courbes de croissance.
                </p>
              </GlassCard>
            ) : (
              <GlassCard className="p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-teal-600" />
                      Courbes de croissance
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Comparaison visuelle avec la zone OMS P3-P97 lorsque la référence existe.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(growthMetricConfig).map(([key, config]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setGrowthMetric(key)}
                        className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                          growthMetric === key
                            ? 'bg-teal-600 text-white'
                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <config.icon size={16} />
                        {config.label}
                      </button>
                    ))}
                  </div>
                </div>

                {growthChartData.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center text-gray-500">
                    Aucune donnée exploitable pour cette courbe.
                  </div>
                ) : (
                  <div className="h-[360px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={growthChartData} margin={{ top: 20, right: 20, left: 0, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="age_months" tickFormatter={(value) => `${value} m`} />
                        <YAxis unit={` ${metricConfig.unit}`} />
                        <Tooltip
                          formatter={(value, name) => {
                            const labels = {
                              actual: `${metricConfig.label} mesuré`,
                              p3: 'P3 OMS',
                              p50: 'P50 OMS',
                              p97: 'P97 OMS',
                            };
                            return [`${Number(value).toFixed(1)} ${metricConfig.unit}`, labels[name] || name];
                          }}
                          labelFormatter={(_, payload) => {
                            const point = payload?.[0]?.payload;
                            return point ? `${point.date} · âge ${point.age_months} mois` : '';
                          }}
                        />
                        {growthRef?.points && (
                          <Area
                            type="monotone"
                            dataKey="range"
                            stroke="none"
                            fill="#ccfbf1"
                            fillOpacity={0.6}
                            connectNulls
                          />
                        )}
                        <Line type="monotone" dataKey="p3" stroke="#f87171" strokeDasharray="5 5" dot={false} connectNulls />
                        <Line type="monotone" dataKey="p50" stroke="#22c55e" dot={false} connectNulls />
                        <Line type="monotone" dataKey="p97" stroke="#60a5fa" strokeDasharray="5 5" dot={false} connectNulls />
                        <Line type="monotone" dataKey="actual" stroke={metricConfig.color} strokeWidth={3} dot={{ r: 4 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <p className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
                  Ces courbes sont une aide de lecture. Elles ne constituent pas un diagnostic et doivent être interprétées par un professionnel de santé.
                </p>
              </GlassCard>
            )}
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="space-y-6">
            {!hasPermission('alerts') ? (
              <GlassCard className="py-20 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Lock className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Accès restreint</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Le parent n'a pas autorisé l'accès aux alertes et recommandations de cet enfant.
                </p>
              </GlassCard>
            ) : (
              <>
                {recommendations && recommendations.length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <ShieldAlert className="w-6 h-6 text-teal-600" />
                      Recommandations IA
                    </h3>
                    {visibleFactors && (
                      <FactorsBreakdown
                        factors={visibleFactors}
                        riskScore={visibleRiskScore}
                        riskLevel={visibleRiskLevel}
                      />
                    )}
                    <div className="space-y-4">
                      {recommendations.map(rec => (
                        <RecommendationCard 
                          key={rec.id} 
                          recommendation={rec} 
                          onRead={(id) => setRecommendations(prev => prev.map(r => String(r.id) === String(id) ? { ...r, is_read: true } : r))}
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                {alerts && alerts.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2 mt-8">
                      Historique des alertes simples
                    </h3>
                    <GlassCard className="p-0 overflow-hidden">
                      <div className="divide-y divide-gray-100">
                        {alerts.map((alert) => (
                          <div key={alert.id} className="p-5">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h4 className="font-bold text-gray-900">{alert.title}</h4>
                                <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                                {alert.recommendation && (
                                  <p className="text-sm text-teal-700 mt-2">{alert.recommendation}</p>
                                )}
                              </div>
                              <span className="text-xs text-gray-400 shrink-0">
                                {new Date(alert.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </GlassCard>
                  </div>
                )}

                {(!recommendations || recommendations.length === 0) && (!alerts || alerts.length === 0) && (
                  <GlassCard className="p-10 text-center">
                    <p className="text-gray-500">Aucune alerte ou recommandation enregistrée.</p>
                  </GlassCard>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'calendar' && (
          <div>
            {!hasPermission('calendar') ? (
              <GlassCard className="py-20 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Lock className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Acces restreint</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Le parent n'a pas autorise l'acces au calendrier medical.
                </p>
              </GlassCard>
            ) : (
              <GlassCard className="p-0 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-teal-600" />
                    Calendrier medical
                  </h3>
                </div>
                {events && events.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {events.map((event) => (
                      <div key={event.id} className="p-5 flex items-start justify-between gap-4">
                        <div>
                          <h4 className="font-bold text-gray-900">{event.title}</h4>
                          <p className="text-sm text-gray-500 mt-1">
                            {event.event_type} - {new Date(event.scheduled_date).toLocaleDateString()}
                          </p>
                          {event.description && (
                            <p className="text-sm text-gray-600 mt-2">{event.description}</p>
                          )}
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-1 rounded">
                          {event.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-10 text-center text-gray-500">
                    Aucun evenement medical partage pour le moment.
                  </div>
                )}
              </GlassCard>
            )}
          </div>
        )}

        {activeTab === 'ocr' && (
          <div>
            {!hasPermission('ocr') ? (
              <GlassCard className="py-20 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Lock className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Acces restreint</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Le parent n'a pas autorise l'acces aux documents OCR.
                </p>
              </GlassCard>
            ) : (
              <GlassCard className="p-0 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <ScanText className="w-5 h-5 text-teal-600" />
                    Documents OCR partages
                  </h3>
                </div>
                {ocrImports && ocrImports.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {ocrImports.map((item) => (
                      <div key={item.id} className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h4 className="font-bold text-gray-900">{item.original_filename}</h4>
                            <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                              {new Date(item.created_at).toLocaleDateString()} 
                              &middot; 
                              {item.confirmation_status === 'confirmed' ? (
                                <span className="text-success-600 bg-success-50 px-2 py-0.5 rounded text-xs font-semibold">Confirmé</span>
                              ) : (
                                <span className="text-warning-600 bg-warning-50 px-2 py-0.5 rounded text-xs font-semibold">En attente / Brut</span>
                              )}
                            </p>
                            
                            {((item.confirmation_status === 'confirmed' && item.confirmed_data) || item.extracted_data) && (
                              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                                {(() => {
                                  const data = item.confirmation_status === 'confirmed' ? item.confirmed_data : item.extracted_data;
                                  return (
                                    <>
                                      {data.weight_kg && (
                                        <span className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">Poids: {typeof data.weight_kg === 'object' ? data.weight_kg.best_guess : data.weight_kg} kg</span>
                                      )}
                                      {data.height_cm && (
                                        <span className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">Taille: {typeof data.height_cm === 'object' ? data.height_cm.best_guess : data.height_cm} cm</span>
                                      )}
                                      {data.head_circumference_cm && (
                                        <span className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">PC: {typeof data.head_circumference_cm === 'object' ? data.head_circumference_cm.best_guess : data.head_circumference_cm} cm</span>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            )}
                            
                            {item.raw_text && (
                              <div className="mt-4">
                                <p className="text-xs font-semibold text-gray-400 mb-1">Texte brut extrait :</p>
                                <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-100 line-clamp-4 whitespace-pre-line">
                                  {item.raw_text}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-10 text-center text-gray-500">
                    Aucun document OCR partage pour le moment.
                  </div>
                )}
              </GlassCard>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
