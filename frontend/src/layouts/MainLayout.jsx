import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import Sidebar from '../components/layout/Sidebar';
import TopBar from '../components/layout/TopBar';
import FAB from '../components/ui/FAB';
import ToastHost from '../components/ui/ToastHost';
import { pageTransition } from '../utils/motionPresets';

export default function MainLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden relative font-sans">
      {/* Mesh Gradient Background */}
      <div className="absolute inset-0 bg-mesh-gradient opacity-40 pointer-events-none" />

      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col w-full relative z-10">
        <TopBar onMenuClick={() => setIsSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12">
          {/* Page transition wrapper */}
          <motion.div
            key="page-content"
            initial={pageTransition.initial}
            animate={pageTransition.animate}
            className="h-full"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>

      {/* Global Floating Action Button */}
      <FAB />
      <ToastHost />
    </div>
  );
}
