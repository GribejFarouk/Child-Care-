import { Plus } from 'lucide-react';

export default function FAB({ onNotImplemented }) {
  return (
    <button
      type="button"
      onClick={() => onNotImplemented?.('Ajouter une mesure - Not Implemented')}
      className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-50 bg-primary-500 text-white p-4 rounded-full shadow-apple hover:bg-primary-600 hover:shadow-apple-hover hover:-translate-y-1 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
      aria-label="Ajouter une mesure"
    >
      <Plus size={24} />
    </button>
  );
}
