import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, TrendingUp, ShieldCheck } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, Legend } from 'recharts';
import { staggerContainer, fadeUp } from '../../utils/motionPresets';
import { children, growthData, whoReferenceBoys, whoReferenceGirls } from '../../data/mockData';

const metrics = [
  { key: 'weight', label: 'Poids', unit: 'kg', color: '#007AFF', gradientId: 'colorWeight' },
  { key: 'height', label: 'Taille', unit: 'cm', color: '#22C55E', gradientId: 'colorHeight' },
  { key: 'head', label: 'Perimetre cranien', unit: 'cm', color: '#F59E0B', gradientId: 'colorHead' },
];

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 backdrop-blur-xl rounded-xl p-3 shadow-lg border border-gray-100 text-xs">
        <p className="font-semibold text-gray-900 mb-1">{label} mois</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }} className="font-medium">{p.name}: {p.value}</p>
        ))}
      </div>
    );
  }
  return null;
}

export default function GrowthChartsPage() {
  const { childId } = useParams();
  const navigate = useNavigate();
  const child = childId ? children.find((c) => c.id === Number(childId)) : null;

  const [selectedChild, setSelectedChild] = useState(child?.id || children[0]?.id);
  const [selectedMetric, setSelectedMetric] = useState('weight');

  const activeChild = children.find((c) => c.id === selectedChild);
  const data = growthData[selectedChild];
  const metric = metrics.find((m) => m.key === selectedMetric);
  const whoRef = activeChild?.sex === 'F' ? whoReferenceGirls : whoReferenceBoys;
  const refKey = selectedMetric === 'head' ? null : selectedMetric;

  // Merge child data with WHO bands
  const chartData = data?.[selectedMetric]?.map((point) => {
    const ref = refKey ? whoRef[refKey]?.find((r) => r.age === point.age) : null;
    return {
      age: point.age,
      [activeChild?.name]: point.value,
      ...(ref ? { p3: ref.p3, p50: ref.p50, p97: ref.p97 } : {}),
    };
  }) || [];

  return (
    <motion.div className="max-w-6xl mx-auto" variants={staggerContainer} initial="hidden" animate="show">
      <motion.div variants={fadeUp} className="flex items-center gap-4 mb-8">
        {childId && (
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all">
            <ArrowLeft size={20} />
          </button>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-5 w-5 text-primary-500" />
            <p className="text-sm font-medium text-primary-500 tracking-wide uppercase">Courbes de Croissance</p>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            {activeChild ? `Croissance de ${activeChild.name}` : 'Courbes de Croissance'}
          </h1>
        </div>
      </motion.div>

      {/* Child Selector */}
      {!childId && (
        <motion.div variants={fadeUp} className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {children.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedChild(c.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                selectedChild === c.id
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                selectedChild === c.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
              }`}>{c.name.charAt(0)}</div>
              {c.name}
            </button>
          ))}
        </motion.div>
      )}

      {/* Metric Tabs */}
      <motion.div variants={fadeUp} className="flex flex-wrap gap-2 mb-6">
        {metrics.map((m) => (
          <button
            key={m.key}
            onClick={() => setSelectedMetric(m.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              selectedMetric === m.key
                ? 'text-white shadow-sm'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
            style={selectedMetric === m.key ? { backgroundColor: m.color } : {}}
          >
            {m.label} ({m.unit})
          </button>
        ))}
      </motion.div>

      {/* Chart */}
      <motion.div variants={fadeUp} className="glass-panel rounded-3xl p-4 sm:p-6 mb-8">
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={metric.gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={metric.color} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={metric.color} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorBand" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#94A3B8" stopOpacity={0.08} />
                  <stop offset="95%" stopColor="#94A3B8" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis
                dataKey="age"
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                tickLine={false}
                axisLine={{ stroke: '#E2E8F0' }}
                label={{ value: 'Age (mois)', position: 'insideBottom', offset: -5, fontSize: 11, fill: '#94A3B8' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                tickLine={false}
                axisLine={false}
                label={{ value: metric.unit, angle: -90, position: 'insideLeft', fontSize: 11, fill: '#94A3B8' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />

              {/* WHO bands */}
              {refKey && (
                <>
                  <Area type="monotone" dataKey="p97" stroke="#CBD5E1" strokeDasharray="4 4" strokeWidth={1} fill="url(#colorBand)" name="P97 (OMS)" dot={false} />
                  <Area type="monotone" dataKey="p50" stroke="#94A3B8" strokeDasharray="4 4" strokeWidth={1} fill="none" name="P50 (OMS)" dot={false} />
                  <Area type="monotone" dataKey="p3" stroke="#CBD5E1" strokeDasharray="4 4" strokeWidth={1} fill="none" name="P3 (OMS)" dot={false} />
                </>
              )}

              {/* Child's data */}
              <Area
                type="monotone"
                dataKey={activeChild?.name}
                stroke={metric.color}
                strokeWidth={2.5}
                fill={`url(#${metric.gradientId})`}
                dot={{ r: 4, fill: metric.color, stroke: '#fff', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: metric.color, stroke: '#fff', strokeWidth: 2 }}
                name={activeChild?.name}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Legend / Info */}
      <motion.div variants={fadeUp} className="glass-panel rounded-2xl p-5 mb-8">
        <p className="text-sm text-gray-500 leading-relaxed">
          <strong className="text-gray-700">Comment lire ce graphique :</strong> La courbe coloree montre les mesures de {activeChild?.name}.
          {refKey && ' Les lignes pointillees representent les percentiles OMS (P3, P50, P97). Si la courbe de votre enfant reste dans la zone P3-P97, la croissance est consideree normale.'}
          {!refKey && ' Les donnees de reference OMS ne sont pas disponibles pour le perimetre cranien dans cette vue simplifiee.'}
        </p>
      </motion.div>

      {/* Medical Disclaimer */}
      <motion.div variants={fadeUp} className="p-5 rounded-2xl bg-gradient-to-r from-primary-50/60 to-transparent border border-primary-100/40 flex items-start gap-3 relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary-400 to-primary-200 rounded-r-full" />
        <ShieldCheck className="text-primary-500 mt-0.5 flex-shrink-0 ml-2" size={20} strokeWidth={1.5} />
        <div>
          <p className="text-sm font-semibold text-gray-900">Avertissement medical</p>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            Les courbes de croissance OMS sont des references statistiques. Elles ne constituent pas un diagnostic. Consultez toujours votre pediatre pour toute interpretation des donnees de croissance de votre enfant.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
