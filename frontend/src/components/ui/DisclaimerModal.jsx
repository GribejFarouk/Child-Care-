import { AlertCircle, Check } from 'lucide-react';

export default function DisclaimerModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-primary-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-apple max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 sm:p-8">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-2xl bg-amber-50 mb-6 border border-amber-100">
            <AlertCircle className="h-6 w-6 text-amber-500" aria-hidden="true" />
          </div>
          
          <div className="text-center">
            <h3 className="text-xl font-bold text-primary-900 mb-4">
              Avis Médical Important
            </h3>
            <div className="mt-2 text-sm text-gray-600 space-y-4 text-left">
              <p>
                <strong>ChildCare+</strong> est un outil d'assistance conçu pour vous aider à suivre la croissance et la santé de votre enfant.
              </p>
              <p className="font-medium text-primary-900 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                Cette application ne remplace en aucun cas l'avis, le diagnostic ou le traitement d'un professionnel de santé.
              </p>
              <p>
                En cas de doute sur la santé de votre enfant, ou si une alerte est déclenchée par l'application, veuillez <strong>toujours consulter un pédiatre ou un médecin</strong>.
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 px-6 py-4 sm:px-8 sm:flex sm:flex-row-reverse border-t border-gray-100">
          <button
            type="button"
            className="w-full inline-flex justify-center items-center rounded-xl border border-transparent px-4 py-3 bg-primary-500 text-base font-medium text-white shadow-sm hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm transition-all hover:shadow-md hover:-translate-y-0.5"
            onClick={onClose}
          >
            <Check className="mr-2 h-4 w-4" />
            J'ai compris et j'accepte
          </button>
        </div>
      </div>
    </div>
  );
}
