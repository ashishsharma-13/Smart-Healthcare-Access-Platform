import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, ShieldCheck, PhoneCall, AlertTriangle } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-12 pb-8 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Brand info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
                <Activity className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">SHAP</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Smart Healthcare Access Platform. Centralized discovery for verified healthcare professionals and parallel real-time emergency coordination.
            </p>
            <div className="flex items-center space-x-2 text-xs text-emerald-400 font-medium">
              <ShieldCheck className="w-4 h-4" />
              <span>100% Verified Medical Practitioners</span>
            </div>
          </div>

          {/* Patient Access */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-4">Patient Services</h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li><Link to="/doctors" className="hover:text-blue-400 transition-colors">Find Verified Doctors</Link></li>
              <li><Link to="/hospitals" className="hover:text-blue-400 transition-colors">Emergency Ready Hospitals</Link></li>
              <li><Link to="/emergency/activate" className="hover:text-red-400 font-semibold transition-colors">Emergency Beep Broadcast</Link></li>
              <li><Link to="/patient/appointments" className="hover:text-blue-400 transition-colors">Manage Appointments</Link></li>
            </ul>
          </div>

          {/* Providers */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-4">Healthcare Providers</h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li><Link to="/login" className="hover:text-blue-400 transition-colors">Doctor Portal Check-In</Link></li>
              <li><Link to="/login" className="hover:text-blue-400 transition-colors">Hospital Emergency Desk</Link></li>
              <li><Link to="/register" className="hover:text-blue-400 transition-colors">Register as Provider</Link></li>
              <li><Link to="/login" className="hover:text-blue-400 transition-colors">Admin Governance</Link></li>
            </ul>
          </div>

          {/* Urgent Hotline */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">24/7 Emergency Helpline</h4>
            <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
              <div className="flex items-center space-x-2.5 text-red-400 mb-1">
                <PhoneCall className="w-4 h-4 animate-bounce" />
                <span className="text-sm font-bold">112 / 911 / 108</span>
              </div>
              <p className="text-[11px] text-slate-400">
                National Medical Ambulance & Disaster Services
              </p>
            </div>
          </div>

        </div>

        {/* Medical disclaimer as strictly instructed in prompt */}
        <div className="py-4 border-t border-slate-800 text-[11px] text-slate-400 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>
              <strong>Medical Disclaimer:</strong> The platform supports healthcare access and emergency coordination. It must not independently diagnose patients. In immediate life-threatening situations, also contact local emergency services immediately.
            </span>
          </div>
          <span className="text-slate-500 whitespace-nowrap">
            &copy; {new Date().getFullYear()} SHAP. All rights reserved.
          </span>
        </div>

      </div>
    </footer>
  );
};

