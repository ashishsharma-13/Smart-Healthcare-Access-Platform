import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { Sidebar } from '../components/common/Sidebar';
import { EmergencyIncomingModal } from '../components/emergency/EmergencyIncomingModal';

export const DashboardLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/50 to-slate-100 relative overflow-x-hidden">
      {/* 2 subtle blurred floating ambient blobs behind the dashboard layout */}
      <div className="fixed top-10 left-1/4 w-96 h-96 bg-blue-300/20 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed bottom-10 right-1/4 w-96 h-96 bg-sky-200/20 rounded-full blur-3xl pointer-events-none -z-10" />

      <Navbar />
      <div className="flex-1 flex max-w-7xl w-full mx-auto relative z-10">
        <Sidebar />
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <EmergencyIncomingModal />
    </div>
  );
};
