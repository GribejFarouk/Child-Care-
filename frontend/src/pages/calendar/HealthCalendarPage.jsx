import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  Plus,
  MapPin,
  Syringe,
  User,
  Stethoscope,
  AlertTriangle,
  FileText,
  Check,
  X,
} from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import SectionHeader from '../../components/ui/SectionHeader';
import { staggerContainer, fadeUp } from '../../utils/motionPresets';
import { listChildren } from '../../api/children';
import { listEvents, createEvent, updateEvent, confirmEvent } from '../../api/calendar';

const EVENT_TYPES = {
  vaccination: { icon: Syringe, label: 'Vaccination', color: 'text-primary-500', bg: 'bg-primary-50' },
  appointment: { icon: Stethoscope, label: 'Rendez-vous', color: 'text-teal-500', bg: 'bg-teal-50' },
  checkup: { icon: User, label: 'Visite de controle', color: 'text-purple-500', bg: 'bg-purple-50' },
  other: { icon: FileText, label: 'Autre', color: 'text-gray-500', bg: 'bg-gray-50' },
};

const emptyForm = {
  event_type: 'vaccination',
  title: '',
  scheduled_date: '',
  doctor_name: '',
  location: '',
  vaccine_name: '',
  notes: '',
};

export default function HealthCalendarPage() {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [confirmingEventId, setConfirmingEventId] = useState(null);

  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const kids = await listChildren();
        setChildren(kids);
        if (kids.length > 0) setSelectedChild(kids[0].id);
      } catch (err) {
        console.error('Error fetching children', err);
      }
    };

    fetchChildren();
  }, []);

  useEffect(() => {
    if (selectedChild) loadEvents();
  }, [selectedChild]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const data = await listEvents({ child_id: selectedChild });
      setEvents(data || []);
    } catch (err) {
      console.error('Error fetching events', err);
    } finally {
      setLoading(false);
    }
  };

  const parseDate = (value) => {
    const [year, month, day] = String(value).split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const todayStart = () => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  };

  const daysFromToday = (value) => {
    const diff = parseDate(value).getTime() - todayStart().getTime();
    return Math.round(diff / (1000 * 60 * 60 * 24));
  };

  const formatDate = (value) => parseDate(value).toLocaleDateString('fr-FR');

  const isPendingConfirmation = (event) => (
    event.status === 'awaiting_confirmation' || (event.status === 'planned' && daysFromToday(event.scheduled_date) < 0)
  );

  const tomorrowEvents = events
    .filter((event) => event.status === 'planned' && daysFromToday(event.scheduled_date) === 1)
    .sort((a, b) => parseDate(a.scheduled_date) - parseDate(b.scheduled_date));

  const upcomingEvents = events
    .filter((event) => event.status === 'planned' && daysFromToday(event.scheduled_date) >= 0)
    .sort((a, b) => parseDate(a.scheduled_date) - parseDate(b.scheduled_date));

  const pendingEvents = events
    .filter((event) => isPendingConfirmation(event))
    .sort((a, b) => parseDate(a.scheduled_date) - parseDate(b.scheduled_date));

  const historyEvents = events
    .filter((event) => event.status === 'completed' || event.status === 'cancelled')
    .sort((a, b) => parseDate(b.scheduled_date) - parseDate(a.scheduled_date));

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createEvent({ ...formData, child_id: selectedChild });
      setShowModal(false);
      setFormData(emptyForm);
      loadEvents();
    } catch (err) {
      console.error('Failed to create event', err);
    }
  };

  const markCompleted = async (id) => {
    try {
      setConfirmingEventId(id);
      const updated = await confirmEvent(id, 'confirm');
      setEvents((current) => current.map((event) => event.id === id ? updated : event));
    } catch (err) {
      console.error('Failed to update event', err);
    } finally {
      setConfirmingEventId(null);
    }
  };

  const markCancelled = async (id) => {
    try {
      setConfirmingEventId(id);
      const updated = await confirmEvent(id, 'cancel');
      setEvents((current) => current.map((event) => event.id === id ? updated : event));
    } catch (err) {
      console.error('Failed to cancel event', err);
    } finally {
      setConfirmingEventId(null);
    }
  };

  const renderEventMeta = (event) => (
    <>
      {(event.doctor_name || event.location) && (
        <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
          {event.doctor_name && <span className="flex items-center gap-1"><Stethoscope size={14} /> {event.doctor_name}</span>}
          {event.location && <span className="flex items-center gap-1"><MapPin size={14} /> {event.location}</span>}
        </div>
      )}
      {event.event_type === 'vaccination' && event.vaccine_name && (
        <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold">
          <Syringe size={12} /> {event.vaccine_name}
        </div>
      )}
    </>
  );

  return (
    <motion.div className="max-w-5xl mx-auto pb-10" variants={staggerContainer} initial="hidden" animate="show">
      <SectionHeader
        title="Calendrier Medical"
        subtitle="Gerez les rendez-vous et le calendrier vaccinal de vos enfants."
        action={(
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            Nouveau rendez-vous
          </button>
        )}
      />

      {children.length > 0 && (
        <motion.div variants={fadeUp} className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
          {children.map((child) => (
            <button
              key={child.id}
              onClick={() => setSelectedChild(child.id)}
              className={`whitespace-nowrap px-6 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 ${
                selectedChild === child.id
                  ? 'bg-primary-500 text-white shadow-apple-float'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200/50'
              }`}
            >
              {child.first_name || child.name}
            </button>
          ))}
        </motion.div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Chargement du calendrier...</div>
      ) : children.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-3xl shadow-sm">
          <AlertTriangle className="mx-auto h-12 w-12 text-warning-400 mb-4" />
          <p>Aucun enfant enregistre.</p>
        </div>
      ) : (
        <>
          {tomorrowEvents.length > 0 && (
            <motion.div variants={fadeUp} className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 flex items-start gap-3">
              <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-sm font-bold text-amber-800">
                  Rappel : {tomorrowEvents.length} evenement(s) prevu(s) demain
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Pensez a preparer le carnet de sante. Apres la date prevue, l'evenement passera dans l'historique en attente de confirmation.
                </p>
              </div>
            </motion.div>
          )}

          {pendingEvents.length > 0 && (
            <motion.div variants={fadeUp} className="mb-6 space-y-3">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="text-amber-500" size={20} />
                À confirmer ({pendingEvents.length})
              </h3>
              {pendingEvents.map((event) => {
                const TypeIcon = EVENT_TYPES[event.event_type]?.icon || FileText;
                return (
                  <div
                    key={event.id}
                    className="rounded-2xl p-4 border shadow-sm flex items-start gap-4 bg-amber-50/70 border-amber-200"
                  >
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 bg-amber-100">
                      <TypeIcon className="text-amber-600" size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-gray-900 truncate">{event.title}</h4>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">À confirmer</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Date dépassée : {formatDate(event.scheduled_date)}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <button
                          type="button"
                          disabled={confirmingEventId === event.id}
                          onClick={(clickEvent) => {
                            clickEvent.preventDefault();
                            clickEvent.stopPropagation();
                            markCompleted(event.id);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-success-50 px-3 py-1.5 text-xs font-semibold text-success-700 hover:bg-success-100 transition-colors disabled:cursor-wait disabled:opacity-60"
                        >
                          <Check size={14} /> Effectué
                        </button>
                        <button
                          type="button"
                          disabled={confirmingEventId === event.id}
                          onClick={(clickEvent) => {
                            clickEvent.preventDefault();
                            clickEvent.stopPropagation();
                            markCancelled(event.id);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-200 transition-colors disabled:cursor-wait disabled:opacity-60"
                        >
                          <X size={14} /> Non effectué
                        </button>
                      </div>
                      {renderEventMeta(event)}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div variants={fadeUp} className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                <Clock className="text-primary-500" size={20} />
                A venir ({upcomingEvents.length})
              </h3>

              {upcomingEvents.length === 0 ? (
                <div className="glass-panel p-8 text-center rounded-3xl border border-dashed border-gray-300">
                  <CalendarIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">Aucun evenement a venir.</p>
                </div>
              ) : (
                upcomingEvents.map((event) => {
                  const TypeIcon = EVENT_TYPES[event.event_type]?.icon || FileText;
                  const typeStyle = EVENT_TYPES[event.event_type] || EVENT_TYPES.other;
                  const isTomorrow = daysFromToday(event.scheduled_date) === 1;

                  return (
                    <GlassCard key={event.id} className={`relative overflow-hidden group ${isTomorrow ? 'border-amber-200' : ''}`}>
                      <div className="flex items-start gap-4">
                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${typeStyle.bg} shrink-0`}>
                          <TypeIcon className={typeStyle.color} size={24} />
                        </div>
                        <div className="flex-1 min-w-0 pt-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-bold text-gray-900 truncate">{event.title}</h4>
                            {isTomorrow && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Demain</span>}
                          </div>
                          <p className="text-sm text-primary-600 font-medium mb-2">
                            Prevu le : {formatDate(event.scheduled_date)}
                          </p>
                          {renderEventMeta(event)}
                        </div>
                      </div>
                    </GlassCard>
                  );
                })
              )}
            </motion.div>

            <motion.div variants={fadeUp} className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                <CheckCircle2 className="text-success-500" size={20} />
                Historique médical
              </h3>

              {historyEvents.length === 0 ? (
                <div className="glass-panel p-8 text-center rounded-3xl border border-dashed border-gray-300">
                  <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">L'historique est vide.</p>
                </div>
              ) : (
                historyEvents.map((event) => {
                  const TypeIcon = EVENT_TYPES[event.event_type]?.icon || FileText;
                  const cancelled = event.status === 'cancelled';

                  return (
                    <div
                      key={event.id}
                      className="rounded-2xl p-4 border shadow-sm flex items-start gap-4 bg-white border-gray-100 opacity-80"
                    >
                      <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 bg-gray-50">
                        <TypeIcon className="text-gray-400" size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-gray-900 truncate">{event.title}</h4>
                        <p className="text-xs text-gray-500 mt-1">
                          {cancelled
                            ? `Non effectué le : ${formatDate(event.scheduled_date)}`
                            : `Terminé le : ${event.completed_date ? formatDate(event.completed_date) : formatDate(event.scheduled_date)}`}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </motion.div>
          </div>
        </>
      )}

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm"
              onClick={() => setShowModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-lg p-6 relative z-10"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4">Nouveau rendez-vous</h3>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      required
                      value={formData.event_type}
                      onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                      className="w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="vaccination">Vaccination</option>
                      <option value="appointment">Rendez-vous</option>
                      <option value="checkup">Visite de controle</option>
                      <option value="other">Autre</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date prevue</label>
                    <input
                      type="date"
                      required
                      value={formData.scheduled_date}
                      onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                      className="w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titre de l'evenement</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex: Vaccin ROR"
                    className="w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                {formData.event_type === 'vaccination' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom du vaccin</label>
                    <input
                      type="text"
                      value={formData.vaccine_name}
                      onChange={(e) => setFormData({ ...formData, vaccine_name: e.target.value })}
                      placeholder="Ex: DTP"
                      className="w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Medecin</label>
                    <input
                      type="text"
                      value={formData.doctor_name}
                      onChange={(e) => setFormData({ ...formData, doctor_name: e.target.value })}
                      placeholder="Dr. Karim"
                      className="w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Lieu</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Cabinet medical"
                      className="w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div className="flex gap-3 justify-end mt-6">
                  <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-xl font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">Annuler</button>
                  <button type="submit" className="px-5 py-2.5 rounded-xl font-medium text-white bg-primary-600 hover:bg-primary-700 transition-colors shadow-apple">Creer l'evenement</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
