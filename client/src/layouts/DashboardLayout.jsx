import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { Sidebar } from '../components/common/Sidebar';
import { EmergencyIncomingModal } from '../components/emergency/EmergencyIncomingModal';

export const DashboardLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#111827]">
      <Navbar />
      <div className="flex-1 flex w-full min-w-0">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-7 overflow-y-auto min-w-0 w-full">
          <Outlet />
        </main>
      </div>
      <EmergencyIncomingModal />
    </div>
  );
};

export default DashboardLayout;
