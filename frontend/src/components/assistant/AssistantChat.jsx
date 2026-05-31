import { useEffect, useRef, useState } from 'react';
import { Info, Loader2, Send, Trash2, X } from 'lucide-react';
import { assistantAPI } from '../../api/assistant';

const initialMessage = {
  role: 'assistant',
  content: "Bonjour. Je peux expliquer les interprétations de croissance déjà calculées pour votre enfant, en langage simple.",
};

export default function AssistantChat({ childId, childName, onClose }) {
  const [messages, setMessages] = useState([initialMessage]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [mode, setMode] = useState(null);
  const endRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const loadConversation = async () => {
      if (!childId) {
        setMessages([initialMessage]);
        setConversationId(null);
        setMode(null);
        return;
      }

      setLoadingHistory(true);
      try {
        const { data } = await assistantAPI.getConversations(childId);
        const conversations = Array.isArray(data) ? data : [];
        const latest = conversations
          .slice()
          .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))[0];

        if (cancelled) return;

        if (latest) {
          setConversationId(latest.id);
          const savedMessages = Array.isArray(latest.messages) ? latest.messages : [];
          setMessages(savedMessages.length > 0 ? savedMessages : [initialMessage]);
          const lastAssistant = savedMessages.slice().reverse().find((message) => message.role === 'assistant');
          setMode(lastAssistant?.safety_escalation ? 'urgent' : lastAssistant?.fallback_used ? 'deterministic' : savedMessages.length > 0 ? 'ai' : null);
        } else {
          setMessages([initialMessage]);
          setConversationId(null);
          setMode(null);
        }
      } catch (error) {
        if (!cancelled) {
          setMessages([initialMessage]);
          setConversationId(null);
          setMode(null);
        }
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    };

    loadConversation();
    return () => {
      cancelled = true;
    };
  }, [childId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (messageText = input) => {
    if (!messageText.trim() || !childId || loading) return;
    setInput('');
    setMessages((current) => [...current, { role: 'user', content: messageText }]);
    setLoading(true);
    try {
      const { data } = await assistantAPI.sendMessage({
        child_id: childId,
        message: messageText,
        conversation_id: conversationId,
      });
      setConversationId(data.conversation_id);
      setMode(data.safety_escalation ? 'urgent' : data.fallback_used ? 'deterministic' : 'ai');
      setMessages((current) => [...current, data.assistant_message]);
    } catch (error) {
      setMessages((current) => [...current, {
        role: 'assistant',
        content: "Impossible de charger une explication pour le moment. Consultez les interprétations affichées ou votre pédiatre en cas d'inquiétude.",
      }]);
    } finally {
      setLoading(false);
    }
  };

  const deleteConversation = async () => {
    if (!conversationId || !window.confirm('Supprimer cette discussion ?')) return;
    await assistantAPI.deleteConversation(conversationId);
    setConversationId(null);
    setMode(null);
    setMessages([initialMessage]);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div>
          <h3 className="font-semibold text-gray-900">Assistant santé</h3>
          <p className="text-xs text-gray-500">Contexte local : {childName || 'enfant sélectionné'}</p>
        </div>
        <div className="flex items-center gap-1">
          {conversationId && (
            <button type="button" title="Supprimer la discussion" onClick={deleteConversation} className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-danger-500">
              <Trash2 size={17} />
            </button>
          )}
          {onClose && (
            <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-50">
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="border-b border-amber-100 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
        <strong>Assistant IA de démonstration :</strong> utilisez uniquement des données fictives. Les messages peuvent être transmis à un fournisseur externe d'IA.
      </div>

      {mode && (
        <div className={`px-4 py-2 text-xs font-medium ${mode === 'urgent' ? 'bg-danger-50 text-danger-700' : mode === 'deterministic' ? 'bg-primary-50 text-primary-700' : 'bg-success-50 text-success-700'}`}>
          {mode === 'urgent' ? 'Orientation urgente automatique' : mode === 'deterministic' ? 'Explication déterministe fondée sur les constats OMS' : 'Explication IA fondée sur les constats OMS validés'}
        </div>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-4">
        {loadingHistory && (
          <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white p-3 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
            Chargement de la discussion...
          </div>
        )}
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={`max-w-[88%] rounded-2xl p-3 text-sm leading-relaxed ${message.role === 'user' ? 'ml-auto bg-primary-500 text-white' : 'border border-gray-100 bg-white text-gray-800'}`}>
            <p className="whitespace-pre-line">{message.content}</p>
          </div>
        ))}
        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2">
            {["Que signifie l'interprétation actuelle ?", "Que dois-je vérifier dans les mesures ?", "Quand demander un avis pédiatrique ?"].map((question) => (
              <button key={question} type="button" onClick={() => send(question)} className="rounded-xl border border-primary-100 bg-white px-3 py-2 text-xs text-primary-700 hover:bg-primary-50">
                {question}
              </button>
            ))}
          </div>
        )}
        {loading && <Loader2 className="h-5 w-5 animate-spin text-primary-500" />}
        <div ref={endRef} />
      </div>

      <p className="flex items-start gap-2 border-t border-gray-100 bg-white px-4 py-2 text-xs text-gray-500">
        <Info size={14} className="mt-0.5 shrink-0" />
        Cet assistant ne pose pas de diagnostic et ne remplace pas un professionnel de santé. En cas d'urgence, appelez le 15 ou le 112.
      </p>
      <div className="flex gap-2 border-t border-gray-100 bg-white p-3">
        <input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(); }
        }} disabled={loading} placeholder="Posez votre question..." className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-400" />
        <button type="button" title="Envoyer" onClick={() => send()} disabled={loading || !input.trim()} className="rounded-xl bg-primary-500 p-2.5 text-white disabled:opacity-50">
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
