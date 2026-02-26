import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, ChevronRight, Sparkles, Search, Filter } from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import SectionHeader from '../../components/ui/SectionHeader';
import AnimatedMetric from '../../components/ui/AnimatedMetric';
import { staggerContainer, fadeUp } from '../../utils/motionPresets';
import { children } from '../../data/mockData';

export default function ChildrenListPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSex, setFilterSex] = useState('all');

  const filtered = children.filter((child) => {
    const matchesSearch = child.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSex = filterSex === 'all' || child.sex === filterSex;
    return matchesSearch && matchesSex;
  });

  return (
    <motion.div className="max-w-6xl mx-auto" variants={staggerContainer} initial="hidden" animate="show">
      <motion.div variants={fadeUp} className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Profils des Enfants</h1>
        <p className="text-base text-gray-400 mt-1">Gerez les profils et suivez la croissance de vos enfants.</p>
      </motion.div>

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
                <p className="text-sm font-medium text-gray-400 mt-0.5">{child.age} &middot; {child.sex === 'M' ? 'Garcon' : 'Fille'}</p>
              </div>
              <div className={`h-11 w-11 rounded-full flex items-center justify-center text-white font-bold text-base shadow-sm ${
                child.sex === 'M'
                  ? 'bg-gradient-to-br from-primary-400 to-primary-600'
                  : 'bg-gradient-to-br from-pink-400 to-pink-600'
              }`}>
                {child.name.charAt(0)}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-5">
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Poids</p>
                <div className="flex items-baseline space-x-0.5">
                  <AnimatedMetric value={child.weight} />
                  <span className="text-[10px] text-gray-400">kg</span>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Taille</p>
                <div className="flex items-baseline space-x-0.5">
                  <AnimatedMetric value={child.height} />
                  <span className="text-[10px] text-gray-400">cm</span>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">PC</p>
                <div className="flex items-baseline space-x-0.5">
                  <AnimatedMetric value={child.headCircumference} />
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
              <span className="text-xs text-gray-400">Mis a jour : {child.lastUpdate}</span>
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
    </motion.div>
  );
}
