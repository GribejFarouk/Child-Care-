import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, ChevronRight, Sparkles, Search, Filter } from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import SectionHeader from '../../components/ui/SectionHeader';
import AnimatedMetric from '../../components/ui/AnimatedMetric';
import { staggerContainer, fadeUp } from '../../utils/motionPresets';
import { listChildren } from '../../api/children';
import { listMeasurements } from '../../api/measurements';

export default function ChildrenListPage() {
  const navigate = useNavigate();
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSex, setFilterSex] = useState('all');

  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const data = await listChildren();
        // Fallback name mapping if the API returned first_name/last_name
        const mappedData = data.map(c => ({
          ...c,
          name: c.first_name ? `${c.first_name} ${c.last_name || ''}`.trim() : c.name,
        }));

        const withLatestMeasurements = await Promise.all(
          mappedData.map(async (child) => {
            try {
              const measurements = await listMeasurements(child.id);
              const latest = [...(measurements || [])].sort(
                (a, b) => new Date(b.date_recorded || b.date) - new Date(a.date_recorded || a.date)
              )[0];

              return {
                ...child,
                latestMeasurement: latest || null,
              };
            } catch (measurementError) {
              console.error('Erreur lors du chargement des mesures', measurementError);
              return { ...child, latestMeasurement: null };
            }
          })
        );

        setChildren(withLatestMeasurements);
      } catch (err) {
        setError('Erreur lors du chargement des enfants.');
      } finally {
        setLoading(false);
      }
    };
    fetchChildren();
  }, []);

  const filtered = children.filter((child) => {
    const matchesSearch = child.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSex = filterSex === 'all' || child.sex === filterSex;
    return matchesSearch && matchesSex;
  });

  const formatAge = (birthDate, fallbackAge) => {
    if (fallbackAge) return fallbackAge;
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

  const getMetricValue = (child, key) => {
    const measurement = child.latestMeasurement;
    if (!measurement) return null;
    const value = measurement[key];
    return value === null || value === undefined || value === '' ? null : Number(value);
  };

  return (
    <motion.div className="max-w-6xl mx-auto" variants={staggerContainer} initial="hidden" animate="show">
      <motion.div variants={fadeUp} className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Profils des Enfants</h1>
        <p className="text-base text-gray-400 mt-1">Gerez les profils et suivez la croissance de vos enfants.</p>
      </motion.div>

      {loading && <div className="text-center py-10 text-gray-500">Chargement...</div>}
      {error && <div className="text-center py-10 text-red-500">{error}</div>}

      {!loading && !error && (
        <>
          {/* Search & Filter Bar */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un enfant..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white/70 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          {['all', 'M', 'F'].map((val) => (
            <button
              key={val}
              onClick={() => setFilterSex(val)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                filterSex === val
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {val === 'all' ? 'Tous' : val === 'M' ? 'Garcons' : 'Filles'}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Children Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
        {filtered.map((child) => (
          <GlassCard key={child.id} onClick={() => navigate(`/children/${child.id}`)}>
            <div className="flex justify-between items-start mb-5">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{child.name}</h3>
                <p className="text-sm font-medium text-gray-400 mt-0.5">{formatAge(child.date_of_birth || child.birthDate, child.age)} &middot; {child.sex === 'M' ? 'Garcon' : 'Fille'}</p>
              </div>
              <div className={`h-11 w-11 rounded-full flex items-center justify-center text-white font-bold text-base shadow-sm ${
                child.sex === 'M'
                  ? 'bg-gradient-to-br from-primary-400 to-primary-600'
                  : 'bg-gradient-to-br from-pink-400 to-pink-600'
              }`}>
                {child.name.charAt(0)}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-5">
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Poids</p>
                <div className="flex items-baseline space-x-0.5">
                  <AnimatedMetric value={getMetricValue(child, 'weight_kg')} emptyLabel="-" />
                  <span className="text-[10px] text-gray-400">kg</span>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Taille</p>
                <div className="flex items-baseline space-x-0.5">
                  <AnimatedMetric value={getMetricValue(child, 'height_cm')} emptyLabel="-" />
                  <span className="text-[10px] text-gray-400">cm</span>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">IMC</p>
                <div className="flex items-baseline space-x-0.5">
                  <AnimatedMetric value={getMetricValue(child, 'bmi')} emptyLabel="-" />
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Tete</p>
                <div className="flex items-baseline space-x-0.5">
                  <AnimatedMetric value={getMetricValue(child, 'head_circumference_cm')} emptyLabel="-" />
                  <span className="text-[10px] text-gray-400">cm</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 mb-4">
              <Sparkles className={`h-3.5 w-3.5 ${child.trend === 'stable' ? 'text-success-500' : 'text-warning-500'}`} />
              <span className={`text-xs font-medium ${child.trend === 'stable' ? 'text-success-600' : 'text-warning-600'}`}>
                {child.trend === 'stable' ? 'Croissance normale' : 'A surveiller'}
              </span>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <span className="text-xs text-gray-400">
                Mis a jour : {child.latestMeasurement?.date_recorded ? new Date(child.latestMeasurement.date_recorded).toLocaleDateString('fr-FR') : 'Aucune mesure'}
              </span>
              <span className="text-primary-500 text-sm font-semibold flex items-center group-hover:text-primary-600 transition-colors">
                Voir <ChevronRight size={14} className="ml-0.5" />
              </span>
            </div>
          </GlassCard>
        ))}

        {/* Add Child Card */}
        <motion.div variants={fadeUp}>
          <Link
            to="/children/add"
            className="glass-panel rounded-3xl p-6 flex flex-col items-center justify-center text-gray-400 hover:text-primary-500 hover:bg-white/80 hover:shadow-card-hover transition-all duration-500 min-h-[280px] group border-dashed border-2 border-gray-200 w-full block"
          >
            <div className="h-14 w-14 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-primary-50 group-hover:border-primary-200 transition-all duration-300">
              <Plus size={24} strokeWidth={2} />
            </div>
            <p className="font-medium text-sm">Ajouter un profil</p>
          </Link>
        </motion.div>
      </div>

      {filtered.length === 0 && searchQuery && (
        <motion.div variants={fadeUp} className="text-center py-12">
          <p className="text-gray-400">Aucun enfant ne correspond a votre recherche.</p>
        </motion.div>
      )}
      </>
      )}
    </motion.div>
  );
}
