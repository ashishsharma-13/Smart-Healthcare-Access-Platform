import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, ShieldCheck, PhoneCall } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-[#080616] text-slate-300 pt-10 pb-6 border-t border-[#1A1953] select-none">
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Columns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-8 items-start">
          
          {/* Col 1: Brand & Regulatory Mission (5 cols) */}
          <div className="md:col-span-5 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center text-white shadow-2xs">
                <Activity className="w-4 h-4 stroke-[2.25]" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">SHAP</span>
              <span className="text-[10px] font-mono uppercase bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                Govt Standards NCR
              </span>
            </div>

            <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
              Smart Healthcare Access Platform. Centralized discovery for NMC-verified medical specialists and automated parallel emergency triage coordination across regional hospital networks.
            </p>

            <div className="flex items-center gap-2 text-xs text-presence-400 font-medium pt-0.5">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>National Medical Commission Compliant &bull; 100% Validated</span>
            </div>
          </div>

          {/* Col 2: Patient Directory (2 cols) */}
          <div className="md:col-span-2 space-y-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white">
              Patient Care
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <Link to="/doctors" className="hover:text-white transition-colors">
                  Find Doctors
                </Link>
              </li>
              <li>
                <Link to="/hospitals" className="hover:text-white transition-colors">
                  Trauma Hospitals
                </Link>
              </li>
              <li>
                <Link to="/emergency/activate" className="text-urgent-400 hover:text-urgent-300 font-medium transition-colors flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-urgent-500 animate-pulse" />
                  <span>Emergency Beep</span>
                </Link>
              </li>
              <li>
                <Link to="/patient/appointments" className="hover:text-white transition-colors">
                  Digital Passes
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Clinical Network (2 cols) */}
          <div className="md:col-span-2 space-y-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white">
              Clinical Network
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <Link to="/login" className="hover:text-white transition-colors">
                  Doctor Presence
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-white transition-colors">
                  Trauma Command
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-white transition-colors">
                  Provider Registration
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-white transition-colors">
                  Admin Governance
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: 24/7 Helpline Card (3 cols) */}
          <div className="md:col-span-3 space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white">
              Life-Critical Helpline
            </h4>
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
              <a
                href="tel:112"
                className="flex items-center gap-2 text-urgent-400 hover:text-urgent-300 font-bold text-sm transition-colors"
              >
                <PhoneCall className="w-4 h-4 shrink-0" />
                <span>112 / 108 (Disaster Desk)</span>
              </a>
              <p className="text-[11px] text-slate-400 leading-snug">
                For immediate life-threatening trauma or stroke resuscitation, dial emergency dispatch directly.
              </p>
            </div>
          </div>

        </div>

        {/* Bottom Bar: Compact & Balanced */}
        <div className="pt-5 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
          <p>© {new Date().getFullYear()} Smart Healthcare Access Platform (SHAP). All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="text-presence-400 font-mono text-[10px] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-presence-400" />
              SYSTEM OPERATIONAL
            </span>
            <span className="hover:text-slate-400 cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-slate-400 cursor-pointer transition-colors">Terms of Service</span>
            <span className="hover:text-slate-400 cursor-pointer transition-colors">NMC Protocol</span>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
