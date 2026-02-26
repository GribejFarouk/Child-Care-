import { useState } from 'react';
import { motion } from 'framer-motion';
import { Baby, Calendar, Heart, TrendingUp, Lightbulb, Plus, Scale, Stethoscope, Smile, Meh, Frown } from 'lucide-react';
import { pageTransition, staggerContainer, fadeUp, scaleUp } from '../../utils/motionPresets';
import { pregnancyData } from '../../data/mockData';

const moodIcons = { happy: Smile, neutral: Meh, sad: Frown };

export default function PregnancyTrackerPage() {
  const [data] = useState(pregnancyData);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ date: new Date().toISOString().split('T')[0], weight: '', bloodPressure: '', notes: '', mood: 'happy' });
  const [entries, setEntries] = useState(data.entries);

  const progress = (data.currentWeek / 40) * 100;
  const trimester = data.currentWeek <= 12 ? '1er' : data.currentWeek <= 27 ? '2e' : '3e';

  const handleSubmit = (e) => {
    e.preventDefault();
    const newEntry = { ...formData, id: Date.now() };
    setEntries([newEntry, ...entries]);
    setFormData({ date: new Date().toISOString().split('T')[0], weight: '', bloodPressure: '', notes: '', mood: 'happy' });
    setShowForm(false);
  };

  const stats = [
    { icon: Calendar, label: 'Semaine', value: data.currentWeek, suffix: '/ 40' },
    { icon: Scale, label: 'Poids actuel', value: data.entries[0]?.weight || '-', suffix: 'kg' },
    { icon: Stethoscope, label: 'Tension', value: data.entries[0]?.bloodPressure || '-', suffix: '' },
    { icon: Baby, label: 'Trimestre', value: trimester, suffix: '' },
  ];

  return (
    <motion.div {...pageTransition} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suivi de Grossesse</h1>
          <p className="text-gray-500 mt-1">Semaine {data.currentWeek} - {trimester} trimestre</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => setShowForm(!showForm)}
          className="self-start sm:self-auto flex items-center gap-2 bg-pink-500 text-white px-4 py-2.5 rounded-xl font-medium shadow-lg shadow-pink-500/25 hover:bg-pink-600 transition-colors"
        >
          <Plus size={20} /> Nouvelle entree
        </motion.button>
      </div>

      {/* Progress bar */}
      <motion.div {...fadeUp} className="bg-white rounded-2xl p-6 shadow-apple-sm border border-gray-100">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Progression</span>
          <span className="font-semibold text-pink-600">{Math.round(progress)}%</span>
        </div>
        <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }} animate={{ width: `${progress}%` }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-pink-400 to-pink-600 rounded-full"
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-2">
          <span>Semaine 1</span><span>Semaine 40</span>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div key={i} variants={fadeUp} className="bg-white rounded-2xl p-4 shadow-apple-sm border border-gray-100 text-center">
            <stat.icon className="mx-auto mb-2 text-pink-500" size={24} />
            <p className="text-xs text-gray-500">{stat.label}</p>
            <p className="text-xl font-bold text-gray-900">{stat.value} <span className="text-sm font-normal text-gray-400">{stat.suffix}</span></p>
          </motion.div>
        ))}
      </motion.div>

      {/* Tips */}
      {data.tips && data.tips.length > 0 && (
        <motion.div {...fadeUp} className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-100">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="text-amber-500" size={20} />
            <h3 className="font-semibold text-amber-900">Conseils de la semaine</h3>
          </div>
          <ul className="space-y-2">
            {data.tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-amber-800">
                <Heart size={14} className="mt-0.5 text-pink-400 flex-shrink-0" />
                {tip}
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Add Entry Form */}
      {showForm && (
        <motion.form
          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl p-6 shadow-apple-sm border border-gray-100 space-y-4"
        >
          <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Plus size={18} /> Nouvelle entree</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Date</label>
              <input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Poids (kg)</label>
              <input type="number" step="0.1" placeholder="62.5" value={formData.weight} onChange={e => setFormData({ ...formData, weight: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Tension</label>
              <input type="text" placeholder="12/8" value={formData.bloodPressure} onChange={e => setFormData({ ...formData, bloodPressure: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Humeur</label>
            <div className="flex gap-3">
              {Object.entries(moodIcons).map(([mood, Icon]) => (
                <button type="button" key={mood} onClick={() => setFormData({ ...formData, mood })}
                  className={`p-3 rounded-xl border-2 transition-all ${formData.mood === mood ? 'border-pink-500 bg-pink-50 scale-110' : 'border-gray-200 hover:border-pink-200'}`}>
                  <Icon size={24} className={formData.mood === mood ? 'text-pink-500' : 'text-gray-400'} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Notes</label>
            <textarea rows={2} placeholder="Comment vous sentez-vous ?" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none resize-none" />
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors">Annuler</button>
            <button type="submit" className="px-6 py-2.5 bg-pink-500 text-white rounded-xl font-medium hover:bg-pink-600 transition-colors shadow-lg shadow-pink-500/25">Enregistrer</button>
          </div>
        </motion.form>
      )}

      {/* Timeline */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <TrendingUp size={18} /> Historique des entrees
        </h3>
        {entries.map((entry, i) => {
          const MoodIcon = moodIcons[entry.mood] || Smile;
          return (
            <motion.div key={entry.id || i} variants={fadeUp} initial="hidden" animate="show"
              className="bg-white rounded-2xl p-5 shadow-apple-sm border border-gray-100 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-pink-50 flex items-center justify-center flex-shrink-0">
                <MoodIcon size={20} className="text-pink-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-gray-900">{new Date(entry.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
                <div className="flex gap-4 text-sm text-gray-600">
                  {entry.weight && <span><Scale size={14} className="inline mr-1" />{entry.weight} kg</span>}
                  {entry.bloodPressure && <span><Stethoscope size={14} className="inline mr-1" />{entry.bloodPressure}</span>}
                </div>
                {entry.notes && <p className="text-sm text-gray-500 mt-1">{entry.notes}</p>}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Next Appointment */}
      {data.nextAppointment && (
        <motion.div {...scaleUp} className="bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Calendar size={22} />
            <h3 className="font-semibold text-lg">Prochain rendez-vous</h3>
          </div>
          <p className="text-pink-100">{new Date(data.nextAppointment.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <p className="font-medium mt-1">{data.nextAppointment.type}</p>
          {data.nextAppointment.doctor && <p className="text-pink-200 text-sm mt-1">Dr. {data.nextAppointment.doctor}</p>}
        </motion.div>
      )}
    </motion.div>
  );
}
