import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Stethoscope, Plus, X, Share2, Shield, Search, Check, AlertCircle, RefreshCw } from 'lucide-react';
import SectionHeader from '../../components/ui/SectionHeader';
import GlassCard from '../../components/ui/GlassCard';
import MessagesModal from '../../components/collaboration/MessagesModal';
import { staggerContainer, fadeUp } from '../../utils/motionPresets';
import { listChildren } from '../../api/children';
import { listShares, createShare, updateShare } from '../../api/collaboration';
import { getDoctorProfile } from '../../api/profiles';

export default function DoctorCollaborationPage() {
  const [children, setChildren] = useState([]);
  const [shares, setShares] = useState([]);
  const [doctors, setDoctors] = useState({}); // Cache for doctor profiles
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShare, setEditingShare] = useState(null);
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
  const [selectedShareForMessages, setSelectedShareForMessages] = useState(null);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [permissions, setPermissions] = useState({
    profile: true,
    measurements: true,
    alerts: true,
    calendar: false,
    ocr: false,
    growth: false,
    consultation: false
  });
  const [editPermissions, setEditPermissions] = useState({
    profile: true,
    measurements: true,
    alerts: true,
    calendar: false,
    ocr: false,
    growth: false,
    consultation: false
  });
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [childrenData, sharesData] = await Promise.all([
        listChildren(),
        listShares()
      ]);
      setChildren(childrenData);
      setShares(sharesData);

      // Fetch doctor profiles for active shares
      const activeShares = sharesData.filter(s => s.status === 'active' && s.doctor_id);
      const newDoctors = { ...doctors };
      for (const share of activeShares) {
        if (!newDoctors[share.doctor_id]) {
          try {
            const doc = await getDoctorProfile(share.doctor_id);
            newDoctors[share.doctor_id] = doc;
          } catch (e) {
            console.error("Failed to fetch doctor profile", e);
          }
        }
      }
      setDoctors(newDoctors);

    } catch (err) {
      console.error(err);
      setError('Erreur lors du chargement des données. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShare = async () => {
    if (!selectedChildId) return;
    try {
      setCreating(true);
      await createShare(selectedChildId, permissions);
      setIsModalOpen(false);
      setSelectedChildId('');
      fetchData(); // Refresh list to get the new share code
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la création du partage.");
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeShare = async (shareId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir révoquer cet accès ?")) return;
    try {
      await updateShare(shareId, { status: 'revoked' });
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la révocation.");
    }
  };

  const handleOpenEditPermissions = (share) => {
    setEditingShare(share);
    setEditPermissions({
      profile: true,
      measurements: Boolean(share.permissions?.measurements),
      alerts: Boolean(share.permissions?.alerts),
      calendar: Boolean(share.permissions?.calendar),
      ocr: Boolean(share.permissions?.ocr),
      growth: Boolean(share.permissions?.growth),
      consultation: Boolean(share.permissions?.consultation)
    });
  };

  const handleUpdatePermissions = async () => {
    if (!editingShare) return;
    try {
      setUpdating(true);
      await updateShare(editingShare.id, {
        permissions: {
          ...editPermissions,
          profile: true
        }
      });
      setEditingShare(null);
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la mise à jour des accès.");
    } finally {
      setUpdating(false);
    }
  };

  const getChildName = (id) => {
    const child = children.find(c => c.id === id);
    return child ? `${child.first_name} ${child.last_name}` : 'Enfant inconnu';
  };

  const handleOpenMessages = (share) => {
    setSelectedShareForMessages(share);
    setIsMessagesOpen(true);
  };

  return (
    <motion.div
      className="max-w-4xl mx-auto font-sans pb-10"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      <SectionHeader
        title="Équipe Médicale"
        subtitle="Partage de dossiers et gestion des accès avec vos pédiatres"
        icon={Stethoscope}
      />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-center">
          <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Accès partagés ({shares.filter(s => s.status !== 'revoked').length})</h2>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nouveau Partage
            </button>
          </div>

          <motion.div variants={fadeUp} className="space-y-4">
            {shares.length === 0 ? (
              <GlassCard className="py-20 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mb-5 border border-teal-100 shadow-sm">
                  <Stethoscope className="w-8 h-8 text-teal-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Aucun médecin lié</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Vous n'avez pas encore partagé le dossier de vos enfants avec un pédiatre.
                </p>
              </GlassCard>
            ) : (
              shares.map((share) => (
                <GlassCard key={share.id} className={`p-6 ${share.status === 'revoked' ? 'opacity-60' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-bold text-gray-900">{getChildName(share.child_id)}</h3>
                        {share.status === 'active' && (
                          <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                            <Check className="w-3 h-3" /> Actif
                          </span>
                        )}
                        {share.status === 'pending' && (
                          <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-medium">
                            En attente
                          </span>
                        )}
                        {share.status === 'revoked' && (
                          <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-medium">
                            Révoqué
                          </span>
                        )}
                      </div>
                      
                      {share.status === 'active' && share.doctor_id ? (
                        <p className="text-sm text-gray-600 flex items-center gap-2 mt-2">
                          <Stethoscope className="w-4 h-4 text-teal-500" />
                          {share.doctor_display_name ? (
                            share.doctor_display_name.includes('@') ? `Médecin lié : ${share.doctor_display_name}` : `Dr. ${share.doctor_display_name}`
                          ) : (
                            share.doctor_email ? `Médecin lié : ${share.doctor_email}` : 'Médecin lié'
                          )}
                        </p>
                      ) : share.status === 'pending' ? (
                        <div className="mt-3 bg-gray-50 p-3 rounded-lg border border-gray-100 inline-block">
                          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Code de partage</p>
                          <p className="text-xl font-mono font-bold tracking-widest text-gray-900">{share.sharing_code}</p>
                        </div>
                      ) : null}

                      <div className="mt-4 flex flex-wrap gap-2">
                        {Object.entries(share.permissions || {}).map(([key, value]) => {
                          if (!value) return null;
                          const labels = {
                            profile: 'Profil',
                            measurements: 'Mesures',
                            alerts: 'Alertes',
                            calendar: 'Calendrier',
                            ocr: 'Analyses',
                            growth: 'Courbes',
                            consultation: 'Consultation'
                          };
                          return (
                            <span key={key} className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-md">
                              {labels[key] || key}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      {share.status !== 'revoked' && (
                        <button
                          onClick={() => handleOpenEditPermissions(share)}
                          className="bg-white border border-gray-200 text-gray-700 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 text-sm font-medium px-4 py-2 rounded-xl transition-colors"
                        >
                          Modifier les accès
                        </button>
                      )}
                      {share.status !== 'revoked' && (
                        <button
                          onClick={() => handleRevokeShare(share.id)}
                          className="text-red-500 hover:text-red-700 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          Révoquer l'accès
                        </button>
                      )}
                      
                      {share.status === 'active' && (
                        <button
                          onClick={() => handleOpenMessages(share)}
                          className="bg-teal-50 text-teal-700 hover:bg-teal-100 text-sm font-medium px-4 py-2 rounded-xl transition-colors"
                        >
                          Messages
                        </button>
                      )}
                    </div>
                  </div>
                </GlassCard>
              ))
            )}
          </motion.div>
        </>
      )}

      {/* Create Share Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Nouveau Partage</h3>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Enfant
                    </label>
                    <select
                      value={selectedChildId}
                      onChange={(e) => setSelectedChildId(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                    >
                      <option value="">Sélectionnez un enfant...</option>
                      {children.map(child => (
                        <option key={child.id} value={child.id}>
                          {child.first_name} {child.last_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Autorisations
                    </label>
                    <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                      {[
                        { key: 'profile', label: 'Profil de base', desc: 'Informations générales (Fixe)' },
                        { key: 'measurements', label: 'Mesures & Croissance', desc: 'Poids, taille, et courbes' },
                        { key: 'alerts', label: 'Alertes de santé', desc: 'Anomalies détectées' },
                        { key: 'calendar', label: 'Calendrier', desc: 'Vaccins et événements' },
                        { key: 'growth', label: 'Courbes de croissance', desc: 'Graphiques OMS pour faciliter l’analyse' },
                        { key: 'ocr', label: 'Analyses médicales', desc: 'Résultats sanguins etc.' },
                        { key: 'consultation', label: 'Consultation Vidéo/Audio', desc: 'Autoriser les appels à distance' }
                      ].map(({ key, label, desc }) => (
                        <label key={key} className="flex items-start gap-3 cursor-pointer group">
                          <div className="pt-0.5">
                            <input
                              type="checkbox"
                              checked={permissions[key]}
                              disabled={key === 'profile'} // Always true for basic info
                              onChange={(e) => setPermissions({ ...permissions, [key]: e.target.checked })}
                              className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                            />
                          </div>
                          <div>
                            <p className={`text-sm font-medium ${key === 'profile' ? 'text-gray-500' : 'text-gray-900 group-hover:text-teal-700'}`}>
                              {label}
                            </p>
                            <p className="text-xs text-gray-500">{desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleCreateShare}
                    disabled={!selectedChildId || creating}
                    className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-colors flex justify-center items-center"
                  >
                    {creating ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      "Générer le code de partage"
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Permissions Modal */}
      <AnimatePresence>
        {editingShare && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setEditingShare(null)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Modifier les accès</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {getChildName(editingShare.child_id)}
                    </p>
                  </div>
                  <button
                    onClick={() => setEditingShare(null)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    {[
                      { key: 'profile', label: 'Profil de base', desc: 'Informations générales, toujours partagées' },
                      { key: 'measurements', label: 'Mesures & Croissance', desc: 'Poids, taille, périmètre crânien' },
                      { key: 'alerts', label: 'Alertes de santé', desc: 'Alertes préliminaires générées' },
                      { key: 'calendar', label: 'Calendrier', desc: 'Vaccins et rendez-vous médicaux' },
                      { key: 'growth', label: 'Courbes de croissance', desc: 'Graphiques OMS pour aider l’analyse' },
                      { key: 'ocr', label: 'Analyses médicales', desc: 'Documents importés par OCR' },
                      { key: 'consultation', label: 'Consultation Vidéo/Audio', desc: 'Autoriser les appels à distance' }
                    ].map(({ key, label, desc }) => (
                      <label key={key} className="flex items-start gap-3 cursor-pointer group">
                        <div className="pt-0.5">
                          <input
                            type="checkbox"
                            checked={editPermissions[key]}
                            disabled={key === 'profile'}
                            onChange={(e) => setEditPermissions({ ...editPermissions, [key]: e.target.checked })}
                            className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                          />
                        </div>
                        <div>
                          <p className={`text-sm font-medium ${key === 'profile' ? 'text-gray-500' : 'text-gray-900 group-hover:text-teal-700'}`}>
                            {label}
                          </p>
                          <p className="text-xs text-gray-500">{desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setEditingShare(null)}
                      className="flex-1 border border-gray-200 text-gray-700 font-medium py-3 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleUpdatePermissions}
                      disabled={updating}
                      className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-colors flex justify-center items-center"
                    >
                      {updating ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      ) : (
                        "Enregistrer"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <MessagesModal
        isOpen={isMessagesOpen}
        onClose={() => {
          setIsMessagesOpen(false);
          setSelectedShareForMessages(null);
        }}
        share={selectedShareForMessages}
        doctor={selectedShareForMessages ? doctors[selectedShareForMessages.doctor_id] : null}
        child={selectedShareForMessages ? children.find(c => c.id === selectedShareForMessages.child_id) : null}
      />
    </motion.div>
  );
}
