import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Calendar,
  Search,
  ShieldAlert,
  Clock,
  QrCode,
  Users,
  Building2,
  BedDouble,
  FileCheck,
  Activity,
  History,
} from 'lucide-react';

export const Sidebar = () => {
  const { user } = useAuth();
  if (!user) return null;

  const patientLinks = [
    { to: '/patient/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/doctors', label: 'Find Doctors', icon: Search },
    { to: '/patient/appointments', label: 'My Appointments', icon: Calendar },
    { to: '/emergency/activate', label: 'Emergency Beep', icon: ShieldAlert, highlight: true },
    { to: '/emergency/history', label: 'Emergency History', icon: History },
  ];

  const doctorLinks = [
    { to: '/doctor/dashboard', label: 'Doctor Portal', icon: LayoutDashboard },
    { to: '/doctor/presence', label: 'QR Presence & Badge', icon: QrCode },
    { to: '/doctor/schedule', label: 'Schedule & Slots', icon: Clock },
    { to: '/doctor/appointments', label: 'Appointments Queue', icon: Calendar },
  ];

  const orgLinks = [
    { to: '/organization/dashboard', label: 'Emergency Reception', icon: ShieldAlert, highlight: true },
    { to: '/organization/resources', label: 'Resource Capacity', icon: BedDouble },
    { to: '/organization/doctors', label: 'Present Doctors', icon: Users },
    { to: '/organization/qr-code', label: 'Facility QR Code', icon: QrCode },
  ];

  const adminLinks = [
    { to: '/admin/dashboard', label: 'Admin Dashboard', icon: LayoutDashboard },
    { to: '/admin/doctors', label: 'Doctor Verifications', icon: FileCheck },
    { to: '/admin/organizations', label: 'Hospital Verifications', icon: Building2 },
    { to: '/admin/emergencies', label: 'Emergency Governance', icon: Activity },
  ];

  let links = patientLinks;
  if (user.role === 'doctor') links = doctorLinks;
  else if (user.role === 'organization') links = orgLinks;
  else if (user.role === 'admin') links = adminLinks;

  return (
    <aside className="w-64 bg-white/60 backdrop-blur-xl border-r border-white/60 min-h-[calc(100vh-4rem)] flex flex-col justify-between py-6 px-4">
      <div className="space-y-6">
        {/* User profile card */}
        <div className="p-3.5 bg-white/70 backdrop-blur-md border border-white/80 rounded-2xl flex items-center space-x-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
            {user.name.charAt(0)}
          </div>
          <div className="overflow-hidden">
            <h4 className="text-xs font-bold text-slate-900 truncate">{user.name}</h4>
            <span className="inline-block mt-0.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100/80 text-blue-700">
              {user.role}
            </span>
          </div>
        </div>

        {/* Navigation items */}
        <div className="space-y-1">
          <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Navigation
          </p>
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? link.highlight
                        ? 'bg-red-600 text-white shadow-sm shadow-red-500/20'
                        : 'bg-white/85 text-blue-700 shadow-xs border border-white/80 font-bold'
                      : link.highlight
                      ? 'text-red-600 hover:bg-red-50/70 hover:text-red-700'
                      : 'text-slate-600 hover:bg-white/50 hover:text-slate-900'
                  }`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{link.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
