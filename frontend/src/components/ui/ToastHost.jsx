import { useEffect, useRef, useState } from 'react';
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
    <div
      className={`fixed left-1/2 bottom-6 -translate-x-1/2 z-[120] transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="rounded-full bg-primary-900 text-white px-5 py-2.5 text-sm font-medium shadow-apple border border-primary-800/30">
        {message}
      </div>
    </div>
  );
}
