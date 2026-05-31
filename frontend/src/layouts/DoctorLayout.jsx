import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { LayoutDashboard, Users, MessageSquare, Settings, LogOut, Heart, Bell } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { notificationService } from '../api/notifications';

export default function DoctorLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
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

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Tableau de bord', path: '/doctor/dashboard', icon: LayoutDashboard },
    { name: 'Mes Patients', path: '/doctor/patients', icon: Users },
    { name: 'Messagerie', path: '/doctor/messages', icon: MessageSquare },
  ];

  const firstName = user?.first_name || user?.firstName || 'Médecin';
  const lastName = user?.last_name || user?.lastName || '';
  const specialty = user?.specialty || 'Pédiatre';
  const initial = firstName.charAt(0).toUpperCase();

  return (
    <div className="flex h-screen bg-[#f8fafc] font-sans">
      {/* ── Sidebar ── */}
      <aside className="w-64 bg-white border-r border-teal-100 flex flex-col shadow-sm z-10 relative">
        <div className="h-16 flex items-center px-6 border-b border-teal-50">
          <div className="h-8 w-8 rounded-lg bg-teal-500 flex items-center justify-center shadow-sm">
            <Heart className="h-4 w-4 text-white" fill="currentColor" />
          </div>
          <span className="ml-2.5 text-lg font-bold text-gray-900 tracking-tight">ChildCare<span className="text-teal-500">+</span> Pro</span>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');

            return (
              <Link
                key={item.name}
                to={item.path}
                className={`relative flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-teal-50 text-teal-700'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="doctor-sidebar-active"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-teal-500 rounded-r-full"
                    transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                  />
                )}
                <Icon className={`mr-3 h-[18px] w-[18px] transition-colors ${isActive ? 'text-teal-600' : 'text-gray-400'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-teal-50">
          <div className="flex items-center p-3 rounded-xl hover:bg-gray-50 transition-colors group cursor-pointer border border-transparent hover:border-gray-100">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-sm font-bold shadow-sm flex-shrink-0">
              {initial}
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">Dr. {firstName} {lastName}</p>
              <p className="text-xs text-teal-600 font-medium truncate">{specialty}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleLogout();
              }}
              className="p-2 ml-1 rounded-lg text-gray-400 hover:bg-danger-50 hover:text-danger-500 transition-colors flex-shrink-0"
              title="Se déconnecter"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-6 shrink-0 z-20">
          <h2 className="text-lg font-bold text-gray-800">
            {navItems.find(item => location.pathname.includes(item.path))?.name || 'Espace Médecin'}
          </h2>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/doctor/notifications')}
              className="relative p-2 text-gray-400 hover:text-teal-600 bg-gray-50 hover:bg-teal-50 rounded-full transition-colors"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-danger-500 text-[9px] font-bold text-white ring-2 ring-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate('/doctor/settings')}
              title="Paramètres médecin"
              className="p-2 text-gray-400 hover:text-teal-600 bg-gray-50 hover:bg-teal-50 rounded-full transition-colors"
            >
              <Settings size={20} />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#f8fafc]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
