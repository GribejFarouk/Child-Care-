import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Clock, Calendar as CalendarIcon, AlertTriangle, ArrowRight, X } from 'lucide-react';
import { notificationService } from '../../api/notifications';
import { useAuth } from '../../contexts/AuthContext';
import SectionHeader from '../../components/ui/SectionHeader';
import { confirmEvent } from '../../api/calendar';
import { motion, AnimatePresence } from 'framer-motion';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  const isDoctor = user?.role === 'doctor';
  const theme = isDoctor
    ? {
        icon: 'text-teal-500',
        softButton: 'bg-teal-50 text-teal-600 hover:text-teal-700',
        link: 'text-teal-600',
        unread: 'bg-teal-50/30 border-teal-100 shadow-sm hover:bg-teal-50/50',
      }
    : {
        icon: 'text-primary-500',
        softButton: 'bg-primary-50 text-primary-600 hover:text-primary-700',
        link: 'text-primary-600',
        unread: 'bg-primary-50/30 border-primary-100 shadow-sm hover:bg-primary-50/50',
      };

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [activeNotif, setActiveNotif] = useState(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationService.getNotifications();
      setNotifications(data);
    } catch (err) {
      setError('Erreur lors du chargement des notifications.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await notificationService.markAsRead(id);
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmAction = async (action) => {
    if (!activeNotif || !activeNotif.source_object_id) return;
    try {
      setConfirming(true);
      await confirmEvent(activeNotif.source_object_id, action);
      setShowConfirmModal(false);
      setActiveNotif(null);
      fetchNotifications();
    } catch (err) {
      console.error('Failed to confirm event', err);
    } finally {
      setConfirming(false);
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.is_read) {
      await handleMarkAsRead(notif.id);
    }
    
    // Only 'overdue_event' type should open the confirmation modal (parent only)
    if (!isDoctor && notif.notification_type === 'overdue_event' && notif.source_object_id) {
      setActiveNotif(notif);
      setShowConfirmModal(true);
      return;
    }

    if (notif.action_url) {
      // For doctors, map parent routes to doctor equivalents
      if (isDoctor) {
        // If notification has a child_id, route to that patient's page
        if (notif.child_id) {
          navigate(`/doctor/patients/${notif.child_id}`);
        } else if (notif.action_url.startsWith('/children/')) {
          // Fallback: rewrite /children/{id}/... → /doctor/patients/{id}/...
          const docUrl = notif.action_url.replace('/children/', '/doctor/patients/');
          navigate(docUrl);
        } else {
          // Generic fallback for routes with no child context
          navigate('/doctor/dashboard');
        }
      } else {
        navigate(notif.action_url);
      }
    }
  };

  const getIcon = (type) => {
    switch(type) {
      case 'vaccination_reminder':
      case 'appointment_reminder':
        return <CalendarIcon className={`h-5 w-5 ${theme.icon}`} />;
      case 'overdue_event':
        return <Clock className="h-5 w-5 text-warning-500" />;
      case 'analytics_alert':
        return <AlertTriangle className="h-5 w-5 text-danger-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <SectionHeader
          title="Notifications"
          subtitle={`Vous avez ${unreadCount} notification${unreadCount !== 1 ? 's' : ''} non lue${unreadCount !== 1 ? 's' : ''}`}
          icon={Bell}
          color={isDoctor ? "teal" : "primary"}
        />
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className={`text-sm font-medium ${theme.softButton} flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors`}
          >
            <Check size={16} />
            Tout marquer comme lu
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Chargement...</div>
      ) : error ? (
        <div className="text-center py-12 text-danger-500">{error}</div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Aucune notification pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                notif.is_read 
                  ? 'bg-white border-gray-100 shadow-sm hover:border-gray-200 hover:shadow-md' 
                  : theme.unread
              }`}
            >
              <div className={`p-2 rounded-lg shrink-0 ${notif.is_read ? 'bg-gray-50' : 'bg-white shadow-sm'}`}>
                {getIcon(notif.notification_type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className={`text-sm font-semibold truncate ${notif.is_read ? 'text-gray-900' : 'text-gray-900'}`}>
                    {notif.title}
                  </h3>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {new Date(notif.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className={`text-sm mt-1 line-clamp-2 ${notif.is_read ? 'text-gray-500' : 'text-gray-600 font-medium'}`}>
                  {notif.message}
                </p>
                {notif.action_url && (
                  <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${theme.link}`}>
                    Voir les détails
                    <ArrowRight size={14} />
                  </div>
                )}
              </div>
              {!notif.is_read && (
                <button
                  onClick={(e) => handleMarkAsRead(notif.id, e)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors shrink-0"
                  title="Marquer comme lu"
                >
                  <Check size={18} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm"
              onClick={() => {
                setShowConfirmModal(false);
                setActiveNotif(null);
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-md p-6 relative z-10"
            >
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setActiveNotif(null);
                }}
                className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
              
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                  <Clock size={20} />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Confirmation requise</h3>
              </div>
              
              <p className="text-sm text-gray-600 mb-6">
                L'événement <strong>{activeNotif?.title || 'médical'}</strong> a-t-il eu lieu ?
              </p>
              
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  disabled={confirming}
                  onClick={() => handleConfirmAction('cancel')}
                  className="px-4 py-2 rounded-xl font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors text-sm disabled:opacity-60"
                >
                  Non effectué
                </button>
                <button
                  type="button"
                  disabled={confirming}
                  onClick={() => handleConfirmAction('confirm')}
                  className="px-4 py-2 rounded-xl font-medium text-white bg-primary-600 hover:bg-primary-700 transition-colors shadow-apple text-sm disabled:opacity-60"
                >
                  Effectué
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
