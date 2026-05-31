import { Menu, Bell, Hand } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { notificationService } from '../../api/notifications';

export default function TopBar({ onMenuClick }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const notifs = await notificationService.getNotifications();
        const unread = notifs.filter(n => !n.is_read).length;
        setUnreadCount(unread);
      } catch (err) {
        console.error('Error fetching notifications:', err);
      }
    };

    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 60000); // 60s
      return () => clearInterval(interval);
    }
  }, [user]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';

  const firstName = user?.first_name || user?.firstName || 'Utilisateur';
  const initial = firstName.charAt(0).toUpperCase();

  return (
    <header className="bg-white/70 backdrop-blur-2xl border-b border-gray-100 h-16 flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-2 -ml-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-xl md:hidden transition-all"
        >
          <Menu size={22} />
        </button>
        <h1 className="text-lg font-bold text-gray-900 md:hidden tracking-tight">ChildCare+</h1>

        <span className="hidden md:block text-sm text-gray-500 font-medium">
          {greeting}, <span className="text-gray-900">{firstName}</span>{' '}
          <Hand className="inline h-4 w-4 text-primary-400" />
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate('/notifications')}
          className="relative p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-danger-500 text-[9px] font-bold text-white ring-2 ring-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => navigate('/settings')}
          className="h-9 w-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-bold shadow-sm cursor-pointer hover:shadow-md hover:scale-105 transition-all"
        >
          {initial}
        </button>
      </div>
    </header>
  );
}
