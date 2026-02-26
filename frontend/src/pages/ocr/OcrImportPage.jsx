import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, Camera, Check, Edit3, Save, Trash2, Eye, RefreshCw, AlertTriangle, CheckCircle2, Image, X } from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';
import SectionHeader from '../../components/ui/SectionHeader';
import { staggerContainer, fadeUp } from '../../utils/motionPresets';
import { ocrHistory, children } from '../../data/mockData';

const mockOcrResult = {
  date: '2025-01-15',
  weight: '10.8',
  height: '80.5',
  headCircumference: '47.3',
  notes: 'Visite de routine - pediatre Dr. Karim',
};

export default function OcrImportPage() {
  const fileInputRef = useRef(null);
  const [step, setStep] = useState('upload'); // upload, processing, review, saved
  const [fileName, setFileName] = useState('');
  const [extractedData, setExtractedData] = useState(null);
  const [editData, setEditData] = useState({});
  const [selectedChild, setSelectedChild] = useState(children[0]?.id);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setStep('processing');
      // Simulate OCR processing
      setTimeout(() => {
        setExtractedData(mockOcrResult);
        setEditData(mockOcrResult);
        setStep('review');
      }, 2000);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setFileName(file.name);
      setStep('processing');
      setTimeout(() => {
        setExtractedData(mockOcrResult);
        setEditData(mockOcrResult);
        setStep('review');
      }, 2000);
    }
  };

  const handleConfirm = () => {
    setStep('saved');
  };

  const handleReset = () => {
    setStep('upload');
    setFileName('');
    setExtractedData(null);
    setEditData({});
  };

  const editField = (key, value) => {
    setEditData((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <motion.div className="max-w-4xl mx-auto" variants={staggerContainer} initial="hidden" animate="show">
      <motion.div variants={fadeUp} className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Camera className="h-5 w-5 text-primary-500" />
          <p className="text-sm font-medium text-primary-500 tracking-wide uppercase">Import OCR</p>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Numeriser un document</h1>
        <p className="text-base text-gray-400 mt-1">Importez un carnet de sante ou resultat medical et extrayez les donnees automatiquement.</p>
      </motion.div>

      {/* Step: Upload */}
      {step === 'upload' && (
        <motion.div variants={fadeUp}>
          {/* Child Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Enfant concerne</label>
            <div className="flex gap-2 flex-wrap">
              {children.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedChild(c.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    selectedChild === c.id ? 'bg-primary-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Dropzone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="glass-panel rounded-3xl p-12 text-center cursor-pointer border-2 border-dashed border-gray-200 hover:border-primary-300 transition-all group"
          >
            <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleFileSelect} className="hidden" />
            <div className="h-16 w-16 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <Upload className="h-8 w-8 text-primary-500" />
            </div>
            <p className="text-lg font-semibold text-gray-700 mb-1">Deposez un fichier ici</p>
            <p className="text-sm text-gray-400 mb-4">ou cliquez pour parcourir</p>
            <p className="text-xs text-gray-300">Formats acceptes : JPG, PNG, PDF | Max 10 MB</p>
          </div>
        </motion.div>
      )}

      {/* Step: Processing */}
      {step === 'processing' && (
        <motion.div variants={fadeUp} className="glass-panel rounded-3xl p-12 text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            className="h-16 w-16 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-4"
          >
            <RefreshCw className="h-8 w-8 text-primary-500" />
          </motion.div>
          <p className="text-lg font-semibold text-gray-700 mb-1">Analyse en cours...</p>
          <p className="text-sm text-gray-400">{fileName}</p>
          <div className="w-48 h-1.5 bg-gray-100 rounded-full mx-auto mt-6 overflow-hidden">
            <motion.div
              className="h-full bg-primary-500 rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 2, ease: 'easeInOut' }}
            />
          </div>
        </motion.div>
      )}

      {/* Step: Review */}
      {step === 'review' && (
        <motion.div variants={fadeUp} className="space-y-6">
          <div className="glass-panel rounded-2xl p-4 flex items-center gap-3 bg-primary-50/50">
            <Image className="h-5 w-5 text-primary-500" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">{fileName}</p>
              <p className="text-xs text-gray-400">Extraction terminee &middot; Verifiez et corrigez si necessaire</p>
            </div>
            <button onClick={handleReset} className="p-1.5 rounded-lg hover:bg-white/50 text-gray-400 hover:text-gray-600 transition-all">
              <X size={16} />
            </button>
          </div>

          <div className="glass-panel rounded-3xl p-6 space-y-5">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
              <Edit3 size={14} /> Donnees extraites
            </h3>
            {[
              { key: 'date', label: 'Date', type: 'date' },
              { key: 'weight', label: 'Poids (kg)', type: 'number' },
              { key: 'height', label: 'Taille (cm)', type: 'number' },
              { key: 'headCircumference', label: 'Perimetre cranien (cm)', type: 'number' },
              { key: 'notes', label: 'Notes', type: 'text' },
            ].map((field) => (
              <div key={field.key} className="flex flex-col sm:flex-row sm:items-center gap-2">
                <label className="text-sm font-medium text-gray-500 w-40 flex-shrink-0">{field.label}</label>
                <input
                  type={field.type}
                  value={editData[field.key] || ''}
                  onChange={(e) => editField(field.key, e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all"
                />
                {editData[field.key] !== extractedData[field.key] && (
                  <span className="text-[10px] text-warning-500 font-medium">modifie</span>
                )}
              </div>
            ))}

            <div className="flex gap-3 pt-2">
              <button onClick={handleConfirm} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 transition-all hover:shadow-lg">
                <Save size={16} /> Enregistrer la mesure
              </button>
              <button onClick={handleReset} className="px-6 py-3 rounded-xl text-sm font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all">
                Annuler
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Step: Saved */}
      {step === 'saved' && (
        <motion.div variants={fadeUp} className="glass-panel rounded-3xl p-12 text-center">
          <div className="h-16 w-16 rounded-2xl bg-success-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-success-500" />
          </div>
          <p className="text-lg font-semibold text-gray-700 mb-1">Mesure enregistree !</p>
          <p className="text-sm text-gray-400 mb-6">Les donnees ont ete ajoutees au profil de l'enfant.</p>
          <button onClick={handleReset} className="px-6 py-3 rounded-xl text-sm font-semibold text-primary-500 bg-primary-50 hover:bg-primary-100 transition-all">
            Scanner un autre document
          </button>
        </motion.div>
      )}

      {/* History */}
      {ocrHistory.length > 0 && (
        <>
          <SectionHeader title="Historique OCR" subtitle={`${ocrHistory.length} import(s)`} />
          <div className="space-y-3 mb-8">
            {ocrHistory.map((entry) => {
              const child = children.find((c) => c.id === entry.childId);
              return (
                <motion.div key={entry.id} variants={fadeUp} className="glass-panel rounded-2xl p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                    <FileText size={18} className="text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{entry.fileName}</p>
                    <p className="text-xs text-gray-400">{new Date(entry.date).toLocaleDateString('fr-FR')} &middot; {child?.name || 'Inconnu'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {entry.extractedData && <span className="text-xs text-success-500 font-medium">{entry.extractedData.weight} kg</span>}
                    <CheckCircle2 size={14} className="text-success-400" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </>
      )}
    </motion.div>
  );
}
