import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info } from 'lucide-react';
import { APP_TOAST_EVENT } from '../../utils/toastBus';

export default function ToastHost() {
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    const handleToast = (event) => {
      const nextMessage = event?.detail?.message || 'Not Implemented';
      setMessage(nextMessage);
      setVisible(true);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        setVisible(false);
      }, 2200);
    };

    window.addEventListener(APP_TOAST_EVENT, handleToast);

    return () => {
      window.removeEventListener(APP_TOAST_EVENT, handleToast);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed left-1/2 bottom-6 z-[120]"
          initial={{ opacity: 0, y: 16, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 8, x: '-50%' }}
          transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-2.5 rounded-full bg-gray-900 text-white px-5 py-2.5 text-sm font-medium shadow-xl border border-gray-700/30 backdrop-blur-sm">
            <Info size={16} className="text-gray-400 flex-shrink-0" />
            {message}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
