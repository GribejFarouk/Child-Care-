import { Menu, Bell, User } from 'lucide-react';

export default function TopBar({ onMenuClick }) {
  return (
    <header className="bg-white/70 backdrop-blur-2xl border-b border-gray-200/50 h-16 flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
      <div className="flex items-center">
        <button 
          onClick={onMenuClick}
          className="p-2 -ml-2 mr-2 text-gray-500 hover:bg-gray-100 rounded-xl md:hidden transition-colors"
        >
          <Menu size={24} />
        </button>
        <h1 className="text-lg font-bold text-primary-900 md:hidden tracking-tight">ChildCare+</h1>
      </div>

      <div className="flex items-center space-x-4">
        <button className="p-2 text-gray-400 hover:text-gray-600 relative transition-colors">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
        </button>
        <div className="h-8 w-8 rounded-full bg-primary-50 flex items-center justify-center text-primary-600 border border-primary-100 shadow-sm cursor-pointer hover:shadow-md transition-all">
          <User size={18} />
        </div>
      </div>
    </header>
  );
}
