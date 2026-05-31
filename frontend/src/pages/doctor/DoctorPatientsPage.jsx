import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Search, Filter, Plus, Shield, CheckCircle, AlertCircle, X, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../../components/ui/GlassCard';
import { staggerContainer, fadeUp } from '../../utils/motionPresets';
import { listShares, acceptShare } from '../../api/collaboration';
import { getChild } from '../../api/children';

export default function DoctorPatientsPage() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add patient modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sharingCode, setSharingCode] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      setError('');
      
      const shares = await listShares();
      // Only active shares for doctors
      const activeShares = shares.filter(s => s.status === 'active');
      
      // Fetch child profiles for each share
      const patientsData = await Promise.all(
        activeShares.map(async (share) => {
          try {
            const child = await getChild(share.child_id);
            return {
              ...child,
              share
            };
          } catch (err) {
            console.error(`Failed to fetch child ${share.child_id}`, err);
            return {
              id: share.child_id,
              profileUnavailable: true,
              share
            };
          }
        })
      );
      
      setPatients(patientsData.filter(Boolean));
    } catch (err) {
      console.error(err);
      setError("Erreur lors du chargement des patients.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddPatient = async () => {
    if (!sharingCode || sharingCode.length < 6) {
      setAddError("Veuillez entrer un code valide.");
      return;
    }
    
    try {
      setAdding(true);
      setAddError('');
      await acceptShare(sharingCode);
      setIsModalOpen(false);
      setSharingCode('');
      fetchPatients();
    } catch (err) {
      console.error(err);
      if (err.response?.status === 400) {
        setAddError(err.response.data.detail || "Code invalide, expiré ou déjà utilisé.");
      } else {
        setAddError("Une erreur s'est produite.");
      }
    } finally {
      setAdding(false);
    }
  };

  const calculateAge = (dob) => {
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

  return (
    <motion.div
      className="max-w-6xl mx-auto pb-10"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Mes Patients</h1>
          <p className="text-gray-500 mt-1">Dossiers partagés par les parents</p>
        </div>
        
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un patient..."
              className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Ajouter un patient
          </button>
        </div>
      </motion.div>

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
        <motion.div variants={fadeUp}>
          {patients.length === 0 ? (
            <GlassCard className="py-24 flex flex-col items-center justify-center text-center border-dashed border-2 border-gray-200">
              <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mb-6">
                <Users className="w-10 h-10 text-teal-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Aucun patient partagé</h3>
              <p className="text-gray-500 max-w-md mx-auto text-lg leading-relaxed mb-6">
                Pour ajouter un patient, demandez au parent de générer un code de partage depuis son espace.
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Saisir un code de partage
              </button>
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {patients.map((patient) => (
                <GlassCard key={patient.id} className="p-0 overflow-hidden hover:shadow-lg transition-all cursor-pointer group" onClick={() => navigate(`/doctor/patients/${patient.id}`)}>
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        {patient.profile_picture_url && !patient.profileUnavailable ? (
                          <img src={patient.profile_picture_url} alt={`${patient.first_name}`} className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm" />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center text-teal-700 font-bold text-xl shadow-sm border-2 border-white">
                            {patient.profileUnavailable ? '?' : `${patient.first_name.charAt(0)}${patient.last_name.charAt(0)}`}
                          </div>
                        )}
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 group-hover:text-teal-600 transition-colors">
                            {patient.profileUnavailable ? "Profil indisponible" : `${patient.first_name} ${patient.last_name}`}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {patient.profileUnavailable ? `ID: ${String(patient.id).slice(0, 8)} - Vérifiez les permissions` : `${calculateAge(patient.date_of_birth)} • ${patient.sex === 'M' ? 'Garçon' : 'Fille'}`}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {Object.entries(patient.share.permissions || {}).map(([key, val]) => {
                        if (!val) return null;
                        const labels = {
                          profile: 'Profil',
                          measurements: 'Mesures',
                          alerts: 'Alertes',
                          calendar: 'Calendrier',
                          growth: 'Courbes',
                          ocr: 'Analyses'
                        };
                        return (
                          <span key={key} className="bg-gray-50 text-gray-600 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded border border-gray-100">
                            {labels[key] || key}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-gray-500 font-medium">Partagé le {new Date(patient.share.created_at).toLocaleDateString()}</span>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-teal-600 transition-colors" />
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Add Patient Modal */}
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
                  <h3 className="text-xl font-bold text-gray-900">Ajouter un patient</h3>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Saisissez le code de partage à 6 caractères généré par le parent dans son espace personnel.
                  </p>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Code de partage
                    </label>
                    <input
                      type="text"
                      value={sharingCode}
                      onChange={(e) => setSharingCode(e.target.value.toUpperCase())}
                      placeholder="EX: A1B2C3"
                      maxLength={8}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-center text-2xl font-mono font-bold tracking-[0.25em] focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all uppercase placeholder:font-sans placeholder:tracking-normal placeholder:text-base placeholder:text-gray-400"
                    />
                  </div>

                  {addError && (
                    <div className="text-red-500 text-sm font-medium flex items-center gap-1.5 bg-red-50 p-3 rounded-lg">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {addError}
                    </div>
                  )}

                  <button
                    onClick={handleAddPatient}
                    disabled={!sharingCode || adding}
                    className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-colors mt-2 flex justify-center items-center"
                  >
                    {adding ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      "Valider le code"
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
