import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Send, User, Search, Loader, Clock, Video, PhoneCall } from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import { staggerContainer, fadeUp } from '../../utils/motionPresets';
import { listShares, listMessages, sendMessage, listConsultations, createConsultation, joinConsultation, completeConsultation, cancelConsultation } from '../../api/collaboration';
import { getChild } from '../../api/children';

export default function DoctorMessagesPage() {
  const [shares, setShares] = useState([]);
  const [patients, setPatients] = useState({});
  const [selectedShare, setSelectedShare] = useState(null);
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  
  const [consultations, setConsultations] = useState([]);
  const [consultationLoading, setConsultationLoading] = useState(false);
  const [pendingJoinUrl, setPendingJoinUrl] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const pollInterval = useRef(null);

  useEffect(() => {
    fetchShares();
    return () => clearInterval(pollInterval.current);
  }, []);

  const fetchShares = async () => {
    try {
      setLoading(true);
      const allShares = await listShares();
      const active = allShares.filter(s => s.status === 'active');
      setShares(active);
      
      const pData = {};
      for (const share of active) {
        try {
          const child = await getChild(share.child_id);
          pData[share.id] = child;
        } catch (e) {
          console.error(e);
          pData[share.id] = {
            id: share.child_id,
            first_name: 'Patient',
            last_name: String(share.child_id).slice(0, 8),
            profileUnavailable: true,
          };
        }
      }
      setPatients(pData);
      
      if (active.length > 0 && !selectedShare) {
        handleSelectShare(active[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectShare = (share) => {
    setSelectedShare(share);
    setPendingJoinUrl(null);
    setConsultations([]);
    fetchMessages(share.id);
    
    // Setup polling
    clearInterval(pollInterval.current);
    pollInterval.current = setInterval(() => {
      fetchMessages(share.id, true);
    }, 5000); // Poll every 5 seconds
  };

  const fetchMessages = async (shareId, silent = false) => {
    try {
      const data = await listMessages(shareId);
      setMessages(data);
      if (!silent) scrollToBottom();
      
      const sessionData = await listConsultations(shareId);
      setConsultations(sessionData);
    } catch (err) {
      console.error("Failed to fetch messages or consultations", err);
    }
  };

  const handleCreateConsultation = async (type) => {
    if (!selectedShare) return;
    try {
      setConsultationLoading(true);
      await createConsultation(selectedShare.id, type);
      fetchMessages(selectedShare.id, true);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Erreur lors de la création de la consultation.");
    } finally {
      setConsultationLoading(false);
    }
  };

  const handleJoinConsultation = async (session) => {
    const meetingWindow = window.open('', '_blank');
    if (meetingWindow) {
      meetingWindow.opener = null;
      meetingWindow.document.title = 'Consultation ChildCare+';
      meetingWindow.document.body.textContent = 'Ouverture de la consultation...';
    }
    try {
      setConsultationLoading(true);
      setPendingJoinUrl(null);
      const res = await joinConsultation(session.id);
      if (res.join_url && meetingWindow) {
        meetingWindow.location.replace(res.join_url);
        fetchMessages(selectedShare.id, true);
      } else if (res.join_url) {
        setPendingJoinUrl(res.join_url);
      }
    } catch (err) {
      console.error(err);
      meetingWindow?.close();
      alert("Erreur lors de la connexion à la consultation.");
    } finally {
      setConsultationLoading(false);
    }
  };

  const handleCompleteConsultation = async (session) => {
    if (!window.confirm("Êtes-vous sûr de vouloir terminer cette consultation ?")) return;
    try {
      setConsultationLoading(true);
      await completeConsultation(session.id);
      fetchMessages(selectedShare.id, true);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la clôture.");
    } finally {
      setConsultationLoading(false);
    }
  };

  const handleCancelConsultation = async (session) => {
    if (!window.confirm("Êtes-vous sûr de vouloir annuler cette consultation ?")) return;
    try {
      setConsultationLoading(true);
      await cancelConsultation(session.id);
      fetchMessages(selectedShare.id, true);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'annulation.");
    } finally {
      setConsultationLoading(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedShare) return;

    const content = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      await sendMessage(selectedShare.id, content);
      fetchMessages(selectedShare.id);
      scrollToBottom();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'envoi du message.");
      setNewMessage(content); // restore text
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div
      className="max-w-6xl mx-auto h-[calc(100vh-120px)] flex flex-col"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={fadeUp} className="mb-4">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Messagerie</h1>
        <p className="text-gray-500 mt-1">Échanges sécurisés avec les parents de vos patients</p>
      </motion.div>

      <motion.div variants={fadeUp} className="flex-1 min-h-0 flex gap-6">
        {/* Sidebar: Conversations List */}
        <div className="w-1/3 flex flex-col">
          <GlassCard className="flex-1 flex flex-col p-0 overflow-hidden border border-gray-100">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-8 flex justify-center">
                  <Loader className="w-6 h-6 animate-spin text-teal-600" />
                </div>
              ) : shares.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">
                  Aucun patient partagé.
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {shares.map(share => {
                    const child = patients[share.id];
                    const isSelected = selectedShare?.id === share.id;
                    return (
                      <button
                        key={share.id}
                        onClick={() => handleSelectShare(share)}
                        className={`w-full p-4 flex items-center gap-3 text-left transition-colors hover:bg-gray-50 ${isSelected ? 'bg-teal-50/50' : ''}`}
                      >
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center flex-shrink-0 border border-white shadow-sm">
                          {child ? <span className="font-bold text-teal-700">{child.first_name.charAt(0)}</span> : <User className="w-5 h-5 text-teal-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={`text-sm font-bold truncate ${isSelected ? 'text-teal-900' : 'text-gray-900'}`}>
                            {child ? `${child.first_name} ${child.last_name}` : `Patient ${String(share.child_id).slice(0, 8)}`}
                          </h3>
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            Dossier partagé
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </GlassCard>
        </div>

        {/* Chat Area */}
        {(() => {
          const openSession = consultations.find(s => s.status === 'scheduled' || s.status === 'active');
          const pastSessions = consultations.filter(s => s.status === 'completed' || s.status === 'cancelled');
          
          return (
            <div className="w-2/3 flex flex-col">
              <GlassCard className="flex-1 flex flex-col p-0 overflow-hidden border border-gray-100 relative">
            {!selectedShare ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50/50">
                <MessageSquare className="w-12 h-12 text-gray-300 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Sélectionnez une conversation</h3>
                <p className="text-gray-500 max-w-sm">
                  Choisissez un patient dans la liste de gauche pour consulter l'historique et envoyer un message.
                </p>
              </div>
            ) : (
              <>
                {/* Chat Header */}
                <div className="px-6 py-4 border-b border-gray-100 bg-white flex justify-between items-center shadow-sm z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center border border-white shadow-sm">
                      <span className="font-bold text-teal-700">
                        {patients[selectedShare.id]?.first_name?.charAt(0) || <User className="w-4 h-4" />}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">
                        {patients[selectedShare.id]
                          ? `${patients[selectedShare.id].first_name} ${patients[selectedShare.id].last_name}`
                          : `Patient ${String(selectedShare.child_id).slice(0, 8)}`}
                      </h3>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        Parent du patient
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 items-center">
                    {pendingJoinUrl && (
                      <a 
                        href={pendingJoinUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-amber-100 text-amber-700 text-sm font-medium rounded-lg hover:bg-amber-200 transition-colors"
                        onClick={() => setPendingJoinUrl(null)}
                      >
                        Ouvrir la consultation
                      </a>
                    )}
                    {openSession ? (
                      <div className="flex gap-2 items-center">
                        <button 
                          onClick={() => handleJoinConsultation(openSession)}
                          disabled={consultationLoading}
                          className="px-3 py-1.5 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors shadow-sm animate-pulse flex items-center gap-2"
                        >
                          {openSession.session_type === 'video' ? <Video className="w-4 h-4" /> : <PhoneCall className="w-4 h-4" />}
                          Rejoindre ({openSession.status === 'active' ? 'En cours' : 'Planifiée'})
                        </button>
                        {openSession.status === 'scheduled' && (
                          <button 
                            onClick={() => handleCancelConsultation(openSession)}
                            disabled={consultationLoading}
                            className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            Annuler
                          </button>
                        )}
                        {openSession.status === 'active' && (
                          <button 
                            onClick={() => handleCompleteConsultation(openSession)}
                            disabled={consultationLoading}
                            className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            Terminer
                          </button>
                        )}
                      </div>
                    ) : (
                      <>
                        <button 
                          onClick={() => handleCreateConsultation('video')}
                          disabled={!selectedShare.permissions?.consultation || consultationLoading}
                          className={`p-2 rounded-lg transition-colors flex items-center justify-center ${
                            selectedShare.permissions?.consultation 
                              ? 'text-teal-600 bg-teal-50 hover:bg-teal-100' 
                              : 'text-gray-400 bg-gray-50 cursor-not-allowed'
                          }`}
                          title={selectedShare.permissions?.consultation ? "Lancer un appel vidéo" : "Permission non accordée"}
                        >
                          <Video className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleCreateConsultation('audio')}
                          disabled={!selectedShare.permissions?.consultation || consultationLoading}
                          className={`p-2 rounded-lg transition-colors flex items-center justify-center ${
                            selectedShare.permissions?.consultation 
                              ? 'text-teal-600 bg-teal-50 hover:bg-teal-100' 
                              : 'text-gray-400 bg-gray-50 cursor-not-allowed'
                          }`}
                          title={selectedShare.permissions?.consultation ? "Lancer un appel audio" : "Permission non accordée"}
                        >
                          <PhoneCall className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Messages List */}
                <div className="flex-1 overflow-y-auto p-6 bg-[#f8fafc]">
                  <div className="space-y-6">
                    {messages.length === 0 ? (
                      <div className="text-center text-gray-500 py-10">
                        <MessageSquare className="w-8 h-8 mx-auto text-gray-300 mb-3" />
                        <p className="text-sm">Aucun message pour le moment.</p>
                        <p className="text-xs mt-1">Commencez la conversation avec le parent.</p>
                      </div>
                    ) : (
                      messages.map((msg, index) => {
                        const isMe = msg.sender_role === 'doctor';
                        const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        
                        return (
                          <div key={msg.id || index} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] ${isMe ? 'order-2' : 'order-1'}`}>
                              <div className={`px-4 py-3 rounded-2xl ${
                                isMe 
                                  ? 'bg-teal-600 text-white rounded-tr-sm' 
                                  : 'bg-white text-gray-800 rounded-tl-sm border border-gray-100 shadow-sm'
                              }`}>
                                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                              </div>
                              <div className={`flex items-center mt-1 text-[10px] text-gray-400 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <Clock className="w-3 h-3 mr-1" />
                                {time}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                  
                  {pastSessions.length > 0 && (
                    <div className="mt-8 border-t border-gray-200 pt-4">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Historique des consultations</h4>
                      <div className="space-y-2">
                        {pastSessions.map((session, i) => (
                          <div key={session.id || i} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                                {session.session_type === 'video' ? <Video className="w-4 h-4" /> : <PhoneCall className="w-4 h-4" />}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">Consultation {session.session_type}</p>
                                <p className="text-xs text-gray-500">{new Date(session.created_at).toLocaleDateString()} {new Date(session.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                              </div>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-md font-medium ${session.status === 'completed' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                              {session.status === 'completed' ? 'Terminée' : 'Annulée'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white border-t border-gray-100">
                  <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Écrivez votre message..."
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all"
                      disabled={sending}
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim() || sending}
                      className="bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white p-3 rounded-xl transition-colors flex-shrink-0 flex items-center justify-center shadow-sm"
                    >
                      {sending ? <Loader className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                  </form>
                </div>
              </>
            )}
              </GlassCard>
            </div>
          );
        })()}
      </motion.div>
    </motion.div>
  );
}
