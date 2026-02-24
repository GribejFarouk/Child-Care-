import { Link, useLocation } from 'react-router-dom';
import { Home, Users, Activity, Bell, Settings, X, Heart } from 'lucide-react';

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
      {isOpen && (
        <div 
          className="fixed inset-0 bg-primary-900/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white/80 backdrop-blur-2xl border-r border-gray-200/50 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200/50">
          <div className="flex items-center">
            <Heart className="h-6 w-6 text-primary-500" fill="currentColor" />
            <span className="ml-2 text-xl font-bold text-primary-900 tracking-tight">ChildCare+</span>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="md:hidden text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            const isImplemented = implementedPaths.includes(item.path);
            const sharedClassName = `flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all ${
              isActive
                ? 'bg-primary-50 text-primary-700 shadow-sm'
                : 'text-gray-600 hover:bg-gray-50 hover:text-primary-900'
            }`;
            
            if (isImplemented) {
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={sharedClassName}
                >
                  <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-primary-500' : 'text-gray-400'}`} />
                  {item.name}
                </Link>
              );
            }

            return (
              <button
                key={item.name}
                type="button"
                onClick={() => onNotImplemented?.(`${item.name} - Not Implemented`) }
                className={`${sharedClassName} w-full text-left`}
              >
                <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-primary-500' : 'text-gray-400'}`} />
                {item.name}
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
