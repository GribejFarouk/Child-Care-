import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Loader2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { listChildren } from '../../api/children';
import AssistantChat from '../../components/assistant/AssistantChat';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const AssistantPage = () => {
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [searchParams] = useSearchParams();
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchChildren() {
      try {
        const data = await listChildren();
        if (data && data.length > 0) {
          setChildren(data);
          const requestedId = searchParams.get('childId');
          const requested = data.find((child) => String(child.id) === String(requestedId));
          setSelectedChildId((requested || data[0]).id);
        }
      } catch (err) {
        console.error("Failed to load children", err);
      } finally {
        setLoading(false);
      }
    }
    fetchChildren();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-primary-500 h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <motion.div variants={fadeUp} className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <MessageCircle className="h-8 w-8 text-primary-500" />
          Assistant santé
        </h1>
        <p className="text-gray-500 text-lg">
          Comprenez les interprétations de croissance de votre enfant avec des explications simples et prudentes.
        </p>
      </motion.div>

      {/* Child Selector */}
      <motion.div variants={fadeUp} className="mb-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pour quel enfant souhaitez-vous consulter l'assistant ?</h2>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {children.map(child => (
              <button
                key={child.id}
                onClick={() => setSelectedChildId(child.id)}
                className={`whitespace-nowrap px-5 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 ${
                  selectedChildId === child.id
                    ? 'bg-primary-500 text-white shadow-md'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${selectedChildId === child.id ? 'bg-white' : 'bg-primary-400'}`} />
                {child.first_name || child.name}
              </button>
            ))}
            {children.length === 0 && (
              <p className="text-sm text-gray-500">Aucun enfant trouvé.</p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Assistant Chat Area */}
      {selectedChildId ? (
        <motion.div variants={fadeUp} className="relative h-[600px] w-full max-w-lg mx-auto">
          <div className="absolute inset-0 z-10 [&>div]:static [&>div]:w-full [&>div]:h-full [&>div]:max-h-full">
              <AssistantChat
                childId={selectedChildId}
                childName={children.find((child) => child.id === selectedChildId)?.first_name || 'Enfant'}
              />
          </div>
        </motion.div>
      ) : (
        <motion.div variants={fadeUp} className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-100 border-dashed">
          <MessageCircle className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Veuillez ajouter un enfant pour démarrer la discussion.</p>
        </motion.div>
      )}
    </div>
  );
};

export default AssistantPage;
