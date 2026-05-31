import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare, Send, Clock, Loader, Video, PhoneCall } from 'lucide-react';
import { listMessages, sendMessage, listConsultations, createConsultation, joinConsultation, completeConsultation, cancelConsultation } from '../../api/collaboration';

export default function MessagesModal({ isOpen, onClose, share, doctor, child }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [consultations, setConsultations] = useState([]);
  const [consultationLoading, setConsultationLoading] = useState(false);
  const [pendingJoinUrl, setPendingJoinUrl] = useState(null);
  const messagesEndRef = useRef(null);
  const pollInterval = useRef(null);

  useEffect(() => {
    if (isOpen && share) {
      setPendingJoinUrl(null);
      fetchMessages();
      pollInterval.current = setInterval(() => {
        fetchMessages(true);
      }, 5000);
    } else {
      setMessages([]);
      clearInterval(pollInterval.current);
    }

    return () => clearInterval(pollInterval.current);
  }, [isOpen, share]);

  const fetchMessages = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await listMessages(share.id);
      setMessages(data);
      if (!silent) scrollToBottom();
      
      const sessionData = await listConsultations(share.id);
      setConsultations(sessionData);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleCreateConsultation = async (type) => {
    if (!share) return;
    try {
      setConsultationLoading(true);
      await createConsultation(share.id, type);
      fetchMessages(true);
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
        fetchMessages(true);
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
      fetchMessages(true);
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
      fetchMessages(true);
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
    if (!newMessage.trim()) return;

    const content = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      await sendMessage(share.id, content);
      fetchMessages();
      scrollToBottom();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'envoi.");
      setNewMessage(content);
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[80vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 bg-white flex justify-between items-center shrink-0">
            <div className="ml-3">
              <h2 className="text-lg font-bold text-gray-900">
                Dr. {doctor?.last_name}
              </h2>
              <p className="text-sm text-gray-500">
                Dossier de {child?.first_name}
              </p>
            </div>
            <div className="flex gap-2 items-center mr-2 ml-4">
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
              {share?.permissions?.consultation && (
                consultations.find(s => s.status === 'scheduled' || s.status === 'active') ? (() => {
                  const openSession = consultations.find(s => s.status === 'scheduled' || s.status === 'active');
                  return (
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
                  );
                })() : (
                  <>
                    <button 
                      onClick={() => handleCreateConsultation('video')}
                      disabled={consultationLoading}
                      className="p-2 text-teal-600 hover:bg-teal-50 bg-white rounded-lg transition-colors border border-teal-100 flex items-center justify-center"
                      title="Lancer un appel vidéo"
                    >
                      <Video className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleCreateConsultation('audio')}
                      disabled={consultationLoading}
                      className="p-2 text-teal-600 hover:bg-teal-50 bg-white rounded-lg transition-colors border border-teal-100 flex items-center justify-center"
                      title="Lancer un appel audio"
                    >
                      <PhoneCall className="w-5 h-5" />
                    </button>
                  </>
                )
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 bg-[#f8fafc]">
            {loading ? (
              <div className="flex justify-center items-center h-full">
                <Loader className="w-8 h-8 animate-spin text-teal-600" />
              </div>
            ) : messages.length === 0 && consultations.filter(s => s.status === 'completed' || s.status === 'cancelled').length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <MessageSquare className="w-12 h-12 text-gray-300 mb-3" />
                <p>Aucun message. Commencez à discuter.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((msg, idx) => {
                  const isMe = msg.sender_role === 'parent';
                  const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  
                  return (
                    <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] ${isMe ? 'order-2' : 'order-1'}`}>
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
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
            
            {consultations.filter(s => s.status === 'completed' || s.status === 'cancelled').length > 0 && (
              <div className="mt-8 border-t border-gray-200 pt-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Historique des consultations</h4>
                <div className="space-y-2">
                  {consultations.filter(s => s.status === 'completed' || s.status === 'cancelled').map((session, i) => (
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

          {/* Input */}
          <div className="p-4 bg-white border-t border-gray-100 shrink-0">
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
                className="bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white p-3 rounded-xl transition-colors flex items-center justify-center shadow-sm"
              >
                {sending ? <Loader className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
