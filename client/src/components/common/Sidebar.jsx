import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import {
  LayoutGrid,
  Search,
  Stethoscope,
  Building2,
  Calendar,
  Siren,
  ClipboardList,
  ChevronDown,
  LayoutDashboard,
  Clock,
  QrCode,
  Users,
  BedDouble,
  FileCheck,
  Activity,
  X,
  MapPin,
  UserCheck,
  History,
  ShieldCheck,
  MessageCircle,
} from 'lucide-react';
import { HelpCenterModal } from './HelpCenterModal';

export const Sidebar = () => {
  const { user } = useAuth();
  const { mobileSidebarOpen, closeMobileSidebar } = useUI();
  const location = useLocation();
  const [helpOpen, setHelpOpen] = useState(false);

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

  // Active & inactive link helper classes
  const getNavLinkClass = ({ isActive }) =>
    `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs transition-colors ${
      isActive
        ? 'bg-[#2F2FE4] text-white font-semibold shadow-xs'
        : 'text-[#CBD5E1] hover:text-white hover:bg-[#262569]/60 font-medium'
    }`;

  const getEmergencyLinkClass = ({ isActive }) =>
    `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs transition-colors ${
      isActive
        ? 'bg-[#DC2626] text-white font-bold shadow-xs'
        : 'text-[#FCA5A5] hover:text-white hover:bg-[#DC2626]/20 font-semibold'
    }`;

  // 1. Patient Portal Sidebar
  const patientNavContent = (
    <div className="flex flex-col h-full justify-between p-4 space-y-6 select-none">
      <div className="space-y-5">
        {/* Workspace Dropdown */}
        <div>
          <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block mb-1.5 px-1">
            WORKSPACE
          </span>
          <div className="flex items-center justify-between p-2.5 rounded-lg border border-[#262569] bg-[#13123E] text-white font-semibold text-xs">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
              Patient Portal
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8]" />
          </div>
        </div>

        {/* Primary Patient Links */}
        <div className="space-y-0.5">
          <NavLink to="/patient/dashboard" className={getNavLinkClass}>
            <LayoutGrid className="w-4 h-4 shrink-0" />
            <span>Overview</span>
          </NavLink>

          <NavLink to="/search" className={getNavLinkClass}>
            <Search className="w-4 h-4 shrink-0" />
            <span>Search & Discover</span>
          </NavLink>

          <NavLink to="/doctors" className={getNavLinkClass}>
            <Stethoscope className="w-4 h-4 shrink-0" />
            <span>Find Doctors</span>
          </NavLink>

          <NavLink to="/hospitals" className={getNavLinkClass}>
            <Building2 className="w-4 h-4 shrink-0" />
            <span>Find Hospitals</span>
          </NavLink>

          <NavLink to="/map" className={getNavLinkClass}>
            <MapPin className="w-4 h-4 shrink-0" />
            <span>Healthcare Map</span>
          </NavLink>

          <NavLink to="/patient/appointments" className={getNavLinkClass}>
            <Calendar className="w-4 h-4 shrink-0" />
            <span>Appointments</span>
          </NavLink>

          <NavLink to="/emergency/activate" className={getEmergencyLinkClass}>
            <Siren className="w-4 h-4 text-white shrink-0 animate-pulse" />
            <span>Emergency Beep</span>
          </NavLink>

          <NavLink to="/emergency/history" className={getNavLinkClass}>
            <History className="w-4 h-4 shrink-0" />
            <span>Emergency History</span>
          </NavLink>

          <NavLink to="/patient/care-activity" className={getNavLinkClass}>
            <ClipboardList className="w-4 h-4 shrink-0" />
            <span>Care Activity</span>
          </NavLink>

          <NavLink to="/patient/profile" className={getNavLinkClass}>
            <UserCheck className="w-4 h-4 shrink-0" />
            <span>My Profile & Records</span>
          </NavLink>
        </div>
      </div>

      {/* Support Callout Box */}
      <div className="space-y-3">
        <div className="p-3.5 rounded-xl bg-[#13123E] border border-[#262569] space-y-1.5">
          <div className="flex items-center space-x-2">
            <MessageCircle className="w-4 h-4 text-[#818CF8]" />
            <h4 className="text-xs font-bold text-white">Here to Help</h4>
          </div>
          <p className="text-[11px] text-[#94A3B8] leading-relaxed">
            Find answers, clinical protocols, and platform support 24/7.
          </p>
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="text-[11px] font-bold text-[#818CF8] hover:text-white flex items-center space-x-1 cursor-pointer pt-0.5 transition-colors"
          >
            <span>Visit help center</span>
            <span>&rarr;</span>
          </button>
        </div>
      </div>
    </div>
  );

  // 2. Doctor Portal Sidebar
  const doctorNavContent = (
    <div className="flex flex-col h-full justify-between p-4 space-y-6 select-none">
      <div className="space-y-5">
        {/* Workspace Dropdown */}
        <div>
          <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block mb-1.5 px-1">
            WORKSPACE
          </span>
          <div className="flex items-center justify-between p-2.5 rounded-lg border border-[#262569] bg-[#13123E] text-white font-semibold text-xs">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#2F2FE4]" />
              Doctor Portal
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8]" />
          </div>
        </div>

        {/* Primary Doctor Links */}
        <div className="space-y-0.5">
          <NavLink to="/doctor/dashboard" className={getNavLinkClass}>
            <LayoutGrid className="w-4 h-4 shrink-0" />
            <span>Overview</span>
          </NavLink>

          <NavLink to="/doctor/schedule" className={getNavLinkClass}>
            <Calendar className="w-4 h-4 shrink-0" />
            <span>Schedule</span>
          </NavLink>

          <NavLink to="/doctor/appointments" className={getNavLinkClass}>
            <ClipboardList className="w-4 h-4 shrink-0" />
            <span>Appointments</span>
          </NavLink>

          <NavLink to="/doctor/availability" className={getNavLinkClass}>
            <Clock className="w-4 h-4 shrink-0" />
            <span>Availability</span>
          </NavLink>

          <NavLink to="/doctor/profile" className={getNavLinkClass}>
            <UserCheck className="w-4 h-4 shrink-0" />
            <span>Doctor Profile</span>
          </NavLink>
        </div>

        {/* Facility & Affiliations */}
        <div className="pt-3 border-t border-[#262569] space-y-0.5">
          <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block mb-1 px-3">
            FACILITY & AFFILIATIONS
          </span>
          <NavLink to="/doctor/affiliations" className={getNavLinkClass}>
            <Building2 className="w-4 h-4 shrink-0" />
            <span>Manage Affiliations</span>
          </NavLink>

          <NavLink to="/doctor/presence" className={getNavLinkClass}>
            <QrCode className="w-4 h-4 shrink-0" />
            <span>QR Presence & Badge</span>
          </NavLink>
        </div>
      </div>

      {/* Support Callout Box */}
      <div className="space-y-3">
        <div className="p-3.5 rounded-xl bg-[#13123E] border border-[#262569] space-y-1.5">
          <div className="flex items-center space-x-2">
            <MessageCircle className="w-4 h-4 text-[#818CF8]" />
            <h4 className="text-xs font-bold text-white">Practitioner Support</h4>
          </div>
          <p className="text-[11px] text-[#94A3B8] leading-relaxed">
            Duty desk, on-call protocol & clinical desk support.
          </p>
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="text-[11px] font-bold text-[#818CF8] hover:text-white flex items-center space-x-1 cursor-pointer pt-0.5 transition-colors"
          >
            <span>Visit help center</span>
            <span>&rarr;</span>
          </button>
        </div>
      </div>
    </div>
  );

  // 3. Organization / Admin Nav Content
  const orgSections = [
    {
      title: 'Hospital Command',
      links: [
        { to: '/organization/dashboard', label: 'Emergency Reception', icon: Siren },
        { to: '/organization/resources', label: 'Bed & ICU Capacity', icon: BedDouble },
      ],
    },
    {
      title: 'Facility Management',
      links: [
        { to: '/organization/doctors', label: 'Manage Doctors', icon: Users },
        { to: '/organization/qr-code', label: 'Facility QR Code', icon: QrCode },
        { to: '/organization/profile', label: 'Facility Profile', icon: Building2 },
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
        { to: '/admin/doctors', label: 'Doctor Verification', icon: FileCheck },
        { to: '/admin/organizations', label: 'Hospital Verification', icon: Building2 },
      ],
    },
  ];

  let otherSections = orgSections;
  let workspaceTitle = 'Hospital Command';
  let workspaceDot = 'bg-[#162E93]';

  if (user.role === 'admin' || user.role === 'web_admin') {
    otherSections = adminSections;
    workspaceTitle = 'Admin Governance';
    workspaceDot = 'bg-[#818CF8]';
  }

  const defaultNavContent = (
    <div className="flex flex-col h-full justify-between p-4 space-y-6 select-none">
      <div className="space-y-5">
        {/* Workspace Dropdown */}
        <div>
          <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block mb-1.5 px-1">
            WORKSPACE
          </span>
          <div className="flex items-center justify-between p-2.5 rounded-lg border border-[#262569] bg-[#13123E] text-white font-semibold text-xs">
            <span className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${workspaceDot}`} />
              {workspaceTitle}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8]" />
          </div>
        </div>

        {/* User Card */}
        <div className="p-3 bg-[#13123E] border border-[#262569] rounded-xl space-y-1">
          <h4 className="text-xs font-semibold text-white truncate">{user.name}</h4>
          <p className="text-[11px] text-[#94A3B8] truncate">{user.email || user.phone}</p>
        </div>

        <div className="space-y-5">
          {otherSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.links.map((link) => {
                  const Icon = link.icon;
                  return (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      className={getNavLinkClass}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{link.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Support Callout Box */}
      <div className="space-y-3">
        <div className="p-3.5 rounded-xl bg-[#13123E] border border-[#262569] space-y-1.5">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-[#818CF8]" />
            <h4 className="text-xs font-bold text-white">Platform Operations</h4>
          </div>
          <p className="text-[11px] text-[#94A3B8] leading-relaxed">
            Audit logging, SLA tracking, and regulatory governance.
          </p>
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="text-[11px] font-bold text-[#818CF8] hover:text-white flex items-center space-x-1 cursor-pointer pt-0.5 transition-colors"
          >
            <span>Documentation & Support</span>
            <span>&rarr;</span>
          </button>
        </div>
      </div>
    </div>
  );

  let activeContent = defaultNavContent;
  if (user.role === 'patient') activeContent = patientNavContent;
  else if (user.role === 'doctor') activeContent = doctorNavContent;

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex w-64 bg-[#1A1953] border-r border-[#262569] flex-col flex-shrink-0 min-h-[calc(100vh-4rem)]">
        {activeContent}
      </aside>

      {/* Mobile Slide-over Drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-fade-in"
            onClick={closeMobileSidebar}
            aria-hidden="true"
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-[#1A1953] border-r border-[#262569] shadow-2xl z-10 animate-slide-right">
            <div className="p-3.5 border-b border-[#262569] flex items-center justify-between bg-[#13123E]">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Navigation</span>
              <button
                type="button"
                onClick={closeMobileSidebar}
                className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#262569] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{activeContent}</div>
          </div>
        </div>
      )}

      {/* Help Center Modal */}
      <HelpCenterModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
};

export default Sidebar;
