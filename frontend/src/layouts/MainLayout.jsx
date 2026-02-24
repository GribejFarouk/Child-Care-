import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import TopBar from '../components/layout/TopBar';
import FAB from '../components/ui/FAB';
import ToastHost from '../components/ui/ToastHost';
import { showNotImplementedToast } from '../utils/toastBus';

export default function MainLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleNotImplemented = (message = 'Not Implemented') => {
    showNotImplementedToast(message);
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden relative font-sans">
      {/* Apple-like Mesh Gradient Background */}
      <div className="absolute inset-0 bg-mesh-gradient opacity-60 pointer-events-none" />

      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} onNotImplemented={handleNotImplemented} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col w-full relative z-10">
        <TopBar onMenuClick={() => setIsSidebarOpen(true)} onNotImplemented={handleNotImplemented} />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12">
          <Outlet />
        </main>
      </div>

      {/* Global Floating Action Button */}
      <FAB onNotImplemented={handleNotImplemented} />
      <ToastHost />
    </div>
  );
}
