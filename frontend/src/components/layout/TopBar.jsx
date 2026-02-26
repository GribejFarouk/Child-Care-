import { Menu, Bell, Search, Hand } from 'lucide-react';
import { currentUser } from '../../data/mockData';

export default function TopBar({ onMenuClick, onNotImplemented }) {
  /* Context-aware greeting */
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';

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

        {/* Desktop greeting */}
        <span className="hidden md:block text-sm text-gray-500 font-medium">
          {greeting}, <span className="text-gray-900">{currentUser.firstName}</span> <Hand className="inline h-4 w-4 text-primary-400" />
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Search button */}
        <button
          type="button"
          onClick={() => onNotImplemented?.('Recherche - Not Implemented')}
          className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm text-gray-400 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200/60 hover:border-gray-300 transition-all"
        >
          <Search size={16} />
          <span>Rechercher...</span>
          <kbd className="ml-4 text-xs bg-white px-1.5 py-0.5 rounded border border-gray-200 text-gray-400 font-mono">⌘K</kbd>
        </button>

        {/* Notification bell */}
        <button
          type="button"
          onClick={() => onNotImplemented?.('Notifications - Not Implemented')}
          className="relative p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
        >
          <Bell size={20} />
          <span className="absolute top-2 right-2 block h-2 w-2 rounded-full bg-danger-500 ring-2 ring-white">
            <span className="absolute inset-0 rounded-full bg-danger-500 animate-pulse-ring" />
          </span>
        </button>

        {/* User Avatar */}
        <button
          type="button"
          onClick={() => onNotImplemented?.('Profil utilisateur - Not Implemented')}
          className="h-9 w-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-bold shadow-sm cursor-pointer hover:shadow-md hover:scale-105 transition-all"
        >
          {currentUser.firstName.charAt(0)}
        </button>
      </div>
    </header>
  );
}
