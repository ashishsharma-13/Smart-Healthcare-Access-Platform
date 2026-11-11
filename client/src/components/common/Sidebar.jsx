import React, { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
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
  X,
  Stethoscope,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { Badge } from '../ui/Badge';

export const Sidebar = () => {
  const { user, profile } = useAuth();
  const { mobileSidebarOpen, closeMobileSidebar } = useUI();
  const location = useLocation();

  // Close mobile sidebar on route change
  useEffect(() => {
    closeMobileSidebar();
  }, [location.pathname]);

  // Handle ESC key to close mobile drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') closeMobileSidebar();
    };
    if (mobileSidebarOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileSidebarOpen]);

  if (!user) return null;

  const patientSections = [
    {
      title: 'Clinical Services',
      links: [
        { to: '/patient/dashboard', label: 'Patient Overview', icon: LayoutDashboard },
        { to: '/doctors', label: 'Find Verified Doctors', icon: Search },
        { to: '/patient/appointments', label: 'My Appointments', icon: Calendar },
      ],
    },
    {
      title: 'Emergency Protocol',
      links: [
        { to: '/emergency/activate', label: 'Emergency Beep', icon: ShieldAlert, emergency: true },
        { to: '/emergency/history', label: 'Emergency Logs', icon: History },
      ],
    },
  ];

  const doctorSections = [
    {
      title: 'Practitioner Desk',
      links: [
        { to: '/doctor/dashboard', label: 'Doctor Portal', icon: LayoutDashboard },
        { to: '/doctor/schedule', label: 'Schedule & Slots', icon: Clock },
        { to: '/doctor/appointments', label: 'Appointments Queue', icon: Calendar },
      ],
    },
    {
      title: 'Facility & Affiliations',
      links: [
        { to: '/doctor/affiliations', label: 'Manage Affiliations', icon: Building2 },
        { to: '/doctor/presence', label: 'QR Presence & Badge', icon: QrCode },
      ],
    },
  ];

  const orgSections = [
    {
      title: 'Hospital Command',
      links: [
        { to: '/organization/dashboard', label: 'Emergency Reception', icon: ShieldAlert, emergency: true },
        { to: '/organization/resources', label: 'Bed & ICU Capacity', icon: BedDouble },
      ],
    },
    {
      title: 'Facility Management',
      links: [
        { to: '/organization/doctors', label: 'Manage Doctors', icon: Users },
        { to: '/organization/qr-code', label: 'Facility QR Code', icon: QrCode },
      ],
    },
  ];

  const adminSections = [
    {
      title: 'Governance Oversight',
      links: [
        { to: '/admin/dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
        { to: '/admin/emergencies', label: 'Emergency Audit Stream', icon: Activity },
      ],
    },
    {
      title: 'Verification Queues',
      links: [
        { to: '/admin/doctors', label: 'Doctor License Verification', icon: FileCheck },
        { to: '/admin/organizations', label: 'Hospital Verification', icon: Building2 },
      ],
    },
  ];

  let sections = patientSections;
  if (user.role === 'doctor') sections = doctorSections;
  else if (user.role === 'organization') sections = orgSections;
  else if (user.role === 'admin') sections = adminSections;

  const roleMeta = {
    patient: { label: 'Patient Access', color: 'info' },
    doctor: { label: 'NMC Practitioner', color: 'presence' },
    organization: { label: 'Trauma Center', color: 'info' },
    admin: { label: 'System Admin', color: 'neutral' },
  };

  const navContent = (
    <div className="flex flex-col h-full justify-between p-4 space-y-6">
      <div className="space-y-6">
        
        {/* User Identity Card */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-950 text-white font-bold text-sm flex items-center justify-center flex-shrink-0 shadow-xs">
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="overflow-hidden flex-1">
              <h4 className="text-xs font-semibold text-slate-900 truncate">
                {user.name}
              </h4>
              <p className="text-[11px] text-slate-500 truncate">
                {user.email || user.phone}
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
            <Badge size="xs" variant={roleMeta[user.role]?.color || 'neutral'} dot>
              {roleMeta[user.role]?.label || user.role}
            </Badge>

            {user.role === 'doctor' && profile?.currentPresence?.isPresent && (
              <span className="text-[10px] font-semibold text-presence-700 bg-presence-50 px-1.5 py-0.5 rounded border border-presence-200">
                On-Site
              </span>
            )}
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="space-y-5">
          {sections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.links.map((link) => {
                  const Icon = link.icon;
                  return (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      className={({ isActive }) =>
                        `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          isActive
                            ? link.emergency
                              ? 'bg-urgent-600 text-white font-semibold shadow-xs'
                              : 'bg-brand-50 text-brand-800 font-semibold border border-brand-200/60'
                            : link.emergency
                            ? 'text-urgent-700 hover:bg-urgent-50 font-medium'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`
                      }
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{link.label}</span>
                      </div>
                      {link.emergency && (
                        <span className="w-1.5 h-1.5 rounded-full bg-urgent-500 animate-pulse" />
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer System Status / Platform Notice */}
      <div className="pt-4 border-t border-slate-200/60 space-y-2">
        <div className="p-2.5 rounded-lg bg-brand-50/60 border border-brand-100 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 text-brand-900 font-medium">
            <span className="w-2 h-2 rounded-full bg-presence-500 animate-pulse" />
            <span>SHAP Live Network</span>
          </div>
          <span className="text-[10px] text-brand-700 font-mono">v2.4</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200 flex-col flex-shrink-0 min-h-[calc(100vh-4rem)]">
        {navContent}
      </aside>

      {/* Mobile Slide-over Drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-fade-in"
            onClick={closeMobileSidebar}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-elevated z-10 animate-slide-right">
            {/* Drawer Close Button Header */}
            <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Navigation Menu</span>
              <button
                type="button"
                onClick={closeMobileSidebar}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors"
                aria-label="Close navigation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nav content inside scrollable view */}
            <div className="flex-1 overflow-y-auto">
              {navContent}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
