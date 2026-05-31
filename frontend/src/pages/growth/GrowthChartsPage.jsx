import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  TrendingUp, Scale, Ruler, Brain, Plus, AlertCircle, HeartPulse,
  Loader2, Info, Calendar, Clock, MessageCircle
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
  ComposedChart, Area
} from 'recharts';

import GlassCard from '../../components/ui/GlassCard';
import SectionHeader from '../../components/ui/SectionHeader';
import { staggerContainer, fadeUp } from '../../utils/motionPresets';
import { listChildren } from '../../api/children';
import { listMeasurements } from '../../api/measurements';
import { getGrowthReferenceCurve } from '../../api/analytics';
import AssistantChat from '../../components/assistant/AssistantChat';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatAge(months) {
  if (months === null || months === undefined) return null;
  if (months === 0) return '< 1 mois';
  if (months < 1) return `${Math.round(months * 30)} j`;
  if (months < 2) {
    const weeks = Math.round(months * 4.3);
    return `${weeks} sem.`;
  }
  if (months < 12) return `${months} mois`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem > 0 ? `${years} an${years > 1 ? 's' : ''} ${rem} mois` : `${years} an${years > 1 ? 's' : ''}`;
}

function formatAgeDetailed(months) {
  if (months === null || months === undefined) return 'Âge inconnu';
  if (months === 0) return 'Nouveau-né (< 1 mois)';
  if (months < 2) {
    const days = Math.round(months * 30.4375);
    return `${days} jour${days > 1 ? 's' : ''} (${months.toFixed(1)} mois)`;
  }
  return `${months} mois (${(months / 12).toFixed(1)} ans)`;
}

function interpolateRefAtAge(refPoints, ageMonths) {
  if (!refPoints || refPoints.length === 0) return null;
  if (ageMonths <= refPoints[0].age_months) return refPoints[0];
  if (ageMonths >= refPoints[refPoints.length - 1].age_months) return refPoints[refPoints.length - 1];
  for (let i = 0; i < refPoints.length - 1; i++) {
    if (refPoints[i].age_months <= ageMonths && refPoints[i + 1].age_months >= ageMonths) {
      const lower = refPoints[i];
      const upper = refPoints[i + 1];
      if (lower.age_months === upper.age_months) return lower;
      const t = (ageMonths - lower.age_months) / (upper.age_months - lower.age_months);
      return {
        age_months: ageMonths,
        p3: lower.p3 + t * (upper.p3 - lower.p3),
        p50: lower.p50 + t * (upper.p50 - lower.p50),
        p97: lower.p97 + t * (upper.p97 - lower.p97),
      };
    }
  }
  return null;
}

// ─── Custom tooltip for Par âge mode ────────────────────────────────────────
const AgeTooltip = ({ active, payload, label, childName, metricUnit }) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  const actual = data.actual;
  const p3 = data.p3;
  const p50 = data.p50;
  const p97 = data.p97;

  let status = null;
  let statusColor = 'text-green-600';
  if (actual !== null && p3 !== null && p97 !== null) {
    if (actual < p3) {
      status = '⚠️ En dessous de la zone OMS (< P3)';
      statusColor = 'text-red-600';
    } else if (actual > p97) {
      status = '⚠️ Au-dessus de la zone OMS (> P97)';
      statusColor = 'text-red-600';
    } else {
      status = '✓ Dans la zone OMS (P3–P97)';
      statusColor = 'text-green-600';
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 max-w-xs text-sm">
      <p className="font-bold text-gray-800 mb-2">{data.fullDate || label}</p>
      <p className="text-gray-500 mb-1">Âge : {formatAgeDetailed(data.age_months)}</p>
      {actual !== null && (
        <p className="font-semibold text-blue-700 mb-2">
          {childName} : {actual} {metricUnit}
        </p>
      )}
      {p3 !== null && (
        <div className="border-t border-gray-100 pt-2 mt-2 space-y-0.5">
          <p className="text-xs text-gray-400">Références OMS :</p>
          <p className="text-xs text-red-400">P3 (seuil bas) : {typeof p3 === 'number' ? p3.toFixed(1) : p3} {metricUnit}</p>
          <p className="text-xs text-green-600">P50 (médiane) : {typeof p50 === 'number' ? p50.toFixed(1) : p50} {metricUnit}</p>
          <p className="text-xs text-blue-400">P97 (seuil haut) : {typeof p97 === 'number' ? p97.toFixed(1) : p97} {metricUnit}</p>
        </div>
      )}
      {status && (
        <p className={`mt-2 text-xs font-semibold ${statusColor}`}>{status}</p>
      )}
    </div>
  );
};

// ─── Custom dot: red if out of zone ─────────────────────────────────────────
const OutOfZoneDot = (props) => {
  const { cx, cy, payload } = props;
  const actual = payload?.actual;
  const p3 = payload?.p3;
  const p97 = payload?.p97;
  if (actual === null || actual === undefined) return null;

  const outOfZone = (p3 !== null && actual < p3) || (p97 !== null && actual > p97);
  const fill = outOfZone ? '#ef4444' : '#0ea5e9';
  const stroke = outOfZone ? '#fca5a5' : '#fff';
  const r = outOfZone ? 7 : 4;

  return <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={2} />;
};

// ─── Main component ──────────────────────────────────────────────────────────
export default function GrowthChartsPage() {
  const { childId } = useParams();
  const navigate = useNavigate();

  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(childId || null);
  const [showAssistant, setShowAssistant] = useState(false);
  const [measurements, setMeasurements] = useState([]);
  const [activeTab, setActiveTab] = useState('weight');
  const [viewMode, setViewMode] = useState('age'); // 'age' | 'date'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refData, setRefData] = useState(null);         // backend reference curve
  const [refLoading, setRefLoading] = useState(false);
  const [refUnavailable, setRefUnavailable] = useState(false);

  useEffect(() => {
    async function loadChildren() {
      try {
        setLoading(true);
        const data = await listChildren();
        const childList = data || [];
        setChildren(childList);
        if (childList.length > 0 && !selectedChildId) {
          setSelectedChildId(childList[0].id);
        }
      } catch (err) {
        console.error(err);
        setError('Backend indisponible. Impossible de charger les données.');
      } finally {
        setLoading(false);
      }
    }
    loadChildren();
  }, [selectedChildId]);

  useEffect(() => {
    async function loadMeasurements() {
      if (!selectedChildId) return;
      try {
        setLoading(true);
        const data = await listMeasurements(selectedChildId);
        const sorted = (data || []).sort(
          (a, b) => new Date(a.date_recorded) - new Date(b.date_recorded)
        );
        setMeasurements(sorted);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadMeasurements();
  }, [selectedChildId]);

  const activeChild = children.find(c => c.id === selectedChildId);
  const childName = activeChild ? (activeChild.first_name || activeChild.name || 'Enfant') : '';
  const childSex = activeChild?.sex || activeChild?.gender || 'M';
  const refSex = (childSex === 'F' || childSex === 'female' || childSex === 'FEMALE') ? 'F' : 'M';

  const tabConfig = {
    weight: { label: 'Poids', icon: Scale, unit: 'kg', metricKey: 'weight', dataKey: 'weight_kg', strokeColor: '#0ea5e9' },
    height: { label: 'Taille', icon: Ruler, unit: 'cm', metricKey: 'height', dataKey: 'height_cm', strokeColor: '#8b5cf6' },
    bmi:    { label: 'IMC', icon: HeartPulse, unit: 'kg/m2', metricKey: 'bmi', dataKey: 'bmi', strokeColor: '#ef4444' },
    head:   { label: 'Périmètre crânien', icon: Brain, unit: 'cm', metricKey: 'head_circumference', dataKey: 'head_circumference_cm', strokeColor: '#f59e0b' },
  };

  const currentTab = tabConfig[activeTab];

  // ── Fetch reference curve from backend ──────────────────────────────────
  useEffect(() => {
    async function loadReference() {
      setRefLoading(true);
      setRefUnavailable(false);
      setRefData(null);
      try {
        const result = await getGrowthReferenceCurve({
          sex: refSex,
          metric: currentTab.metricKey,
          minAgeMonths: 0,
          maxAgeMonths: 228,
        });
        if (result.available && result.points && result.points.length > 0) {
          setRefData(result);
        } else {
          setRefUnavailable(true);
          setRefData(null);
        }
      } catch (err) {
        console.warn('Reference fetch failed', err);
        setRefUnavailable(true);
      } finally {
        setRefLoading(false);
      }
    }
    loadReference();
  }, [refSex, currentTab.metricKey]);

  // ── "Par âge" chart data ───────────────────────────────────────────────────
  const ageChartData = useMemo(() => {
    const refPoints = refData?.points || [];
    const points = measurements
      .filter(m => m[currentTab.dataKey] !== null && m[currentTab.dataKey] !== undefined)
      .map(m => {
        const d = new Date(m.date_recorded);
        const age = m.age_at_recording_months ?? null;
        let refs = { p3: null, p50: null, p97: null };
        if (age !== null && refPoints.length > 0) {
          const refAtAge = interpolateRefAtAge(refPoints, age);
          if (refAtAge) {
            refs = {
              p3: parseFloat(refAtAge.p3),
              p50: parseFloat(refAtAge.p50),
              p97: parseFloat(refAtAge.p97),
            };
          }
        }
        return {
          age_months: age,
          xLabel: age !== null ? formatAge(age) : d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
          fullDate: d.toLocaleDateString('fr-FR'),
          actual: parseFloat(m[currentTab.dataKey]),
          ...refs,
        };
      })
      .sort((a, b) => (a.age_months ?? 0) - (b.age_months ?? 0));
    return points;
  }, [measurements, currentTab, refData]);

  // ── "Par date" chart data ─────────────────────────────────────────────────
  const dateChartData = useMemo(() => {
    return measurements
      .filter(m => m[currentTab.dataKey] !== null && m[currentTab.dataKey] !== undefined)
      .map(m => {
        const d = new Date(m.date_recorded);
        return {
          date: d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
          fullDate: d.toLocaleDateString('fr-FR'),
          actual: parseFloat(m[currentTab.dataKey]),
        };
      });
  }, [measurements, currentTab]);

  // ── WHO reference curve points for "Par âge" mode ─────────────────────────
  const refPoints = useMemo(() => {
    if (!refData?.points) return [];
    return refData.points.map(r => ({
      age_months: r.age_months,
      xLabel: formatAge(r.age_months),
      p3: parseFloat(r.p3),
      p50: parseFloat(r.p50),
      p97: parseFloat(r.p97),
      actual: null,
    }));
  }, [refData]);

  // Merge: for "Par âge", combine ref points + child points on a unified age axis
  const mergedAgeData = useMemo(() => {
    const map = new Map();

    // Insert reference points first
    for (const r of refPoints) {
      map.set(r.age_months, { ...r });
    }

    // Overlay actual measurements
    for (const pt of ageChartData) {
      if (pt.age_months === null) continue;
      const existing = map.get(pt.age_months);
      if (existing) {
        existing.actual = pt.actual;
        if (pt.p3 !== null) { existing.p3 = pt.p3; existing.p50 = pt.p50; existing.p97 = pt.p97; }
      } else {
        map.set(pt.age_months, { ...pt });
      }
    }

    const result = Array.from(map.values()).sort((a, b) => a.age_months - b.age_months);
    return result;
  }, [refPoints, ageChartData]);

  // Determine if we have child data
  const hasActualAge = ageChartData.some(d => d.actual !== null);
  const hasActualDate = dateChartData.some(d => d.actual !== null);
  const hasRefCurve = refPoints.length > 0;

  // ─── Loading / error / empty states ──────────────────────────────────────
  if (loading && children.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Chargement des courbes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto font-sans pb-10">
        <GlassCard className="border-danger-200 bg-danger-50 text-center">
          <AlertCircle className="w-10 h-10 text-danger-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-danger-800 mb-2">Erreur de connexion</h2>
          <p className="text-danger-600">{error}</p>
        </GlassCard>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="max-w-4xl mx-auto font-sans pb-10">
        <SectionHeader title="Courbes de Croissance" icon={TrendingUp} />
        <GlassCard className="py-16 flex flex-col items-center justify-center text-center">
          <AlertCircle className="w-12 h-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">Aucun enfant ajouté</h3>
          <p className="text-gray-500 mb-6">Ajoutez d'abord un enfant pour voir ses courbes de croissance.</p>
          <button
            onClick={() => navigate('/children/add')}
            className="bg-primary-500 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-primary-600 transition-colors flex items-center gap-2"
          >
            <Plus size={18} /> Ajouter un profil
          </button>
        </GlassCard>
      </div>
    );
  }

  const currentChartData = viewMode === 'age' ? mergedAgeData : dateChartData;
  const hasData = viewMode === 'age' ? (hasActualAge || hasRefCurve) : hasActualDate;

  return (
    <motion.div
      className="max-w-5xl mx-auto font-sans pb-10"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      <SectionHeader
        title="Courbes de Croissance"
        subtitle="Suivi de l'évolution morphologique avec courbes de référence OMS"
        icon={TrendingUp}
      />

      {/* Child Selector */}
      <motion.div variants={fadeUp} className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
        {children.map(child => (
          <button
            key={child.id}
            onClick={() => setSelectedChildId(child.id)}
            className={`whitespace-nowrap px-5 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 ${
              selectedChildId === child.id
                ? 'bg-primary-500 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${selectedChildId === child.id ? 'bg-white' : 'bg-primary-400'}`} />
            {child.first_name || child.name}
          </button>
        ))}
      </motion.div>

      {/* Controls row: Metric tabs + View mode toggle */}
      <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-3 mb-6">
        {/* Metric tabs */}
        <div className="bg-white rounded-2xl p-1.5 flex gap-1 shadow-sm border border-gray-100/50">
          {Object.entries(tabConfig).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === key ? 'bg-primary-50 text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <cfg.icon size={15} /> {cfg.label}
            </button>
          ))}
        </div>

        {/* View mode toggle */}
        <div className="bg-white rounded-2xl p-1.5 flex gap-1 shadow-sm border border-gray-100/50 ml-auto">
          <button
            onClick={() => setViewMode('age')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              viewMode === 'age' ? 'bg-primary-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Clock size={14} /> Par âge
          </button>
          <button
            onClick={() => setViewMode('date')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              viewMode === 'date' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Calendar size={14} /> Par date
          </button>
        </div>
      </motion.div>

      {/* Assistant Toggle Button */}
      <motion.div variants={fadeUp} className="mb-6">
        <button
          onClick={() => setShowAssistant(!showAssistant)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            showAssistant ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600 border border-indigo-200'
          }`}
        >
          <MessageCircle size={16} /> 
          {showAssistant ? 'Fermer l\'assistant' : 'Besoin d\'aide ? Assistant IA'}
        </button>
      </motion.div>

      {showAssistant && (
        <motion.div variants={fadeUp} className="mb-6">
          <AssistantChat childId={selectedChildId} onClose={() => setShowAssistant(false)} />
        </motion.div>
      )}

      {/* "Par date" warning banner */}
      {viewMode === 'date' && (
        <motion.div
          variants={fadeUp}
          className="mb-4 flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3"
        >
          <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <p className="text-xs text-blue-700">
            Vue chronologique — utile pour visualiser des changements rapides. La comparaison OMS est disponible dans la vue <strong>Par âge</strong>.
          </p>
        </motion.div>
      )}

      {/* Reference unavailable notice (Par âge only) */}
      {viewMode === 'age' && refUnavailable && !refLoading && (
        <motion.div
          variants={fadeUp}
          className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3"
        >
          <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <p className="text-xs text-amber-700">
            Aucune courbe OMS disponible pour cet indicateur ou cet âge.
          </p>
        </motion.div>
      )}

      {/* Chart section */}
      <motion.div variants={fadeUp}>
        <GlassCard className="p-6 relative z-0">
          <div className="mb-4 flex items-start justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {activeTab === 'weight' ? 'Évolution du poids' : activeTab === 'height' ? 'Évolution de la taille' : activeTab === 'bmi' ? "Évolution de l'IMC" : 'Périmètre crânien (tour de tête)'}
              </h3>
              <p className="text-sm text-gray-500">Pour {childName} — {viewMode === 'age' ? 'vue par âge' : 'vue chronologique'}</p>
            </div>
            {viewMode === 'age' && hasRefCurve && (
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-5 h-0.5 border-t-2 border-dashed border-red-300" />
                  P3 (seuil bas)
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-5 h-0.5 bg-green-500" />
                  P50 (médiane OMS)
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-5 h-0.5 border-t-2 border-dashed border-blue-300" />
                  P97 (seuil haut)
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-full bg-red-500" />
                  Hors zone OMS
                </span>
              </div>
            )}
          </div>

          <div className="h-96 w-full">
            {(loading || refLoading) && currentChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
              </div>
            ) : !hasData ? (
              <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-2xl">
                <TrendingUp className="w-12 h-12 text-gray-200 mb-3" />
                <p className="text-gray-500 font-medium mb-4">Aucune mesure enregistrée</p>
                <button
                  onClick={() => navigate(`/children/${selectedChildId}/measurements/add`)}
                  className="bg-primary-50 text-primary-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-100 transition-colors flex items-center gap-2"
                >
                  <Plus size={16} /> Ajouter une mesure
                </button>
              </div>
            ) : viewMode === 'age' ? (
              // ── PAR ÂGE: ComposedChart with shaded reference zone ────────
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={mergedAgeData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="xLabel"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    dx={-10}
                    unit={` ${currentTab.unit}`}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip
                    content={
                      <AgeTooltip
                        childName={childName}
                        metricUnit={currentTab.unit}
                      />
                    }
                  />

                  {/* Shaded zone P3–P97 */}
                  {hasRefCurve && (
                    <>
                      <Area
                        type="monotone"
                        dataKey="p97"
                        stroke="none"
                        fill="#dcfce7"
                        fillOpacity={0.5}
                        connectNulls
                        legendType="none"
                        dot={false}
                        activeDot={false}
                        name="Zone OMS P3–P97"
                      />
                      <Area
                        type="monotone"
                        dataKey="p3"
                        stroke="none"
                        fill="#f0fdf4"
                        fillOpacity={1}
                        connectNulls
                        legendType="none"
                        dot={false}
                        activeDot={false}
                        name="  "
                        baseValue={0}
                      />
                    </>
                  )}

                  {/* P3 / P50 / P97 reference lines */}
                  {hasRefCurve && (
                    <>
                      <Line
                        type="monotone"
                        dataKey="p3"
                        name="Référence P3 (OMS)"
                        stroke="#fca5a5"
                        strokeWidth={1.5}
                        strokeDasharray="6 3"
                        dot={false}
                        activeDot={false}
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="p50"
                        name="Référence P50 — médiane (OMS)"
                        stroke="#22c55e"
                        strokeWidth={1.5}
                        dot={false}
                        activeDot={false}
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="p97"
                        name="Référence P97 (OMS)"
                        stroke="#93c5fd"
                        strokeWidth={1.5}
                        strokeDasharray="6 3"
                        dot={false}
                        activeDot={false}
                        connectNulls
                      />
                    </>
                  )}

                  {/* Child actual curve with out-of-zone dots */}
                  {hasActualAge && (
                    <Line
                      type="monotone"
                      dataKey="actual"
                      name={`${childName} (${currentTab.unit})`}
                      stroke={currentTab.strokeColor}
                      strokeWidth={3}
                      dot={hasRefCurve ? <OutOfZoneDot /> : { r: 4, fill: currentTab.strokeColor, stroke: '#fff', strokeWidth: 2 }}
                      activeDot={{ r: 7 }}
                      connectNulls
                    />
                  )}

                  <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              // ── PAR DATE: simple LineChart, child curve only ──────────────
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dateChartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    dx={-10}
                    unit={` ${currentTab.unit}`}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', padding: '12px' }}
                    labelStyle={{ color: '#64748b', fontWeight: 600, marginBottom: '4px' }}
                    labelFormatter={(label, payload) => payload[0]?.payload?.fullDate || label}
                    formatter={(value) => [`${value} ${currentTab.unit}`, childName]}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    name={`${childName} (${currentTab.unit})`}
                    stroke={currentTab.strokeColor}
                    strokeWidth={3}
                    dot={{ r: 5, strokeWidth: 2, fill: '#fff', stroke: currentTab.strokeColor }}
                    activeDot={{ r: 7 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Disclaimer */}
          <div className="mt-4 flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
            <Info className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 leading-relaxed">
              <strong>Comparaison indicative</strong> — ne constitue pas un diagnostic médical. Consultez un professionnel de santé.
              {refData?.source && ` Source : ${refData.source}.`}
              {viewMode === 'age' && hasRefCurve && ' Les points rouges indiquent des valeurs en dehors de la zone P3–P97.'}
            </p>
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}
