import { Link, useLocation } from 'react-router-dom';
import { Home, Users, Activity, Bell, Settings, X, Heart, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { currentUser } from '../../data/mockData';

export default function Sidebar({ isOpen, setIsOpen, onNotImplemented }) {
  const location = useLocation();
  const implementedPaths = ['/dashboard'];

  const navItems = [
    { name: 'Tableau de bord', path: '/dashboard', icon: Home },
    { name: 'Enfants', path: '/children', icon: Users },
    { name: 'Suivi Grossesse', path: '/pregnancy', icon: Activity },
    { name: 'Alertes', path: '/alerts', icon: Bell },
    { name: 'Paramètres', path: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setIsOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white/80 backdrop-blur-2xl border-r border-gray-200/50 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-100">
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-lg bg-primary-500 flex items-center justify-center">
              <Heart className="h-4 w-4 text-white" fill="currentColor" />
            </div>
            <span className="ml-2.5 text-lg font-bold text-gray-900 tracking-tight">ChildCare+</span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="md:hidden text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            const isImplemented = implementedPaths.includes(item.path);

            const sharedClassName = `relative flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${isActive
                ? 'bg-primary-50 text-primary-700'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`;

            const content = (
              <>
                {/* Active indicator bar */}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary-500 rounded-r-full"
                    transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                  />
                )}
                <Icon className={`mr-3 h-[18px] w-[18px] transition-colors ${isActive ? 'text-primary-500' : 'text-gray-400'}`} />
                {item.name}
              </>
            );

            if (isImplemented) {
              return (
                <Link key={item.name} to={item.path} className={sharedClassName}>
                  {content}
                </Link>
              );
            }

            return (
              <button
                key={item.name}
                type="button"
                onClick={() => onNotImplemented?.(`${item.name} - Not Implemented`)}
                className={`${sharedClassName} w-full text-left`}
              >
                {content}
              </button>
            );
          })}
        </nav>

        {/* ── User Section ── */}
        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group"
            onClick={() => onNotImplemented?.('Profil utilisateur - Not Implemented')}>
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-bold shadow-sm flex-shrink-0">
              {currentUser.firstName.charAt(0)}
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{currentUser.firstName} {currentUser.lastName}</p>
              <p className="text-xs text-gray-400 truncate">{currentUser.email}</p>
            </div>
            <LogOut className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
          </div>
        </div>
      </aside>
    </>
  );
}
