import React, { useState } from 'react';
import {
  ShieldCheck,
  Activity,
  Lock,
  Building2,
  Stethoscope,
  HeartPulse,
  Radio,
  CheckCircle2,
  Clock,
} from 'lucide-react';

export const HeroClinicalCommand = () => {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="relative w-full max-w-lg lg:max-w-none mx-auto select-none">
      {/* Precision Clinical Command Frame */}
      <div className="rounded-2xl bg-brand-950 border border-slate-700/80 shadow-2xl overflow-hidden relative">
        
        {/* Terminal Header Bar */}
        <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-presence-500/80" />
            <span className="ml-2 font-mono text-[10px] tracking-wider text-slate-400 font-semibold uppercase">
              SHAP Triage Gateway &bull; v2.4
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-presence-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-presence-400 animate-pulse" />
            <span>14 HOSPITALS LIVE</span>
          </div>
        </div>

        {/* Hero Visual Media Layer */}
        <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-slate-900">
          {!imgFailed ? (
            <img
              src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=1000&auto=format&fit=crop&q=80"
              alt="Clinical Healthcare Command & Telemetry"
              onError={() => setImgFailed(true)}
              className="w-full h-full object-cover object-center filter brightness-90 contrast-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-tr from-brand-950 to-slate-900 flex items-center justify-center">
              <Activity className="w-16 h-16 text-brand-600/40" />
            </div>
          )}

          {/* Clinical Vignette Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-brand-950 via-brand-950/30 to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-950/60 via-transparent to-brand-950/40 pointer-events-none" />

          {/* Real-time Integrated Status Chip on Image */}
          <div className="absolute top-3 left-3 bg-brand-950/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/80 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-presence-400 animate-pulse" />
            <span className="font-mono text-[11px] font-semibold text-slate-200">
              PARALLEL DISPATCH: READY
            </span>
          </div>

          <div className="absolute top-3 right-3 bg-brand-950/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-700/80 flex items-center gap-1.5 text-[11px] font-medium text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-presence-400" />
            <span>NMC Encrypted</span>
          </div>
        </div>

        {/* Structured Bottom Telemetry Deck (Directly integrated into the frame) */}
        <div className="p-4 sm:p-5 bg-brand-950 space-y-3 border-t border-slate-800/80">
          
          {/* Facility Telemetry Card */}
          <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-brand-900 text-brand-300 flex items-center justify-center shrink-0 border border-brand-800">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">Apex Metro Trauma Center</p>
                <p className="text-[10px] text-slate-400 font-medium">Level 1 Emergency Facility</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-right shrink-0">
              <div>
                <span className="text-[10px] text-slate-400 block font-mono">ICU Beds</span>
                <span className="text-xs font-bold text-presence-400 font-mono">14 Free</span>
              </div>
              <div className="border-l border-slate-800 pl-3">
                <span className="text-[10px] text-slate-400 block font-mono">ER Bays</span>
                <span className="text-xs font-bold text-brand-300 font-mono">11 Free</span>
              </div>
            </div>
          </div>

          {/* On-Duty Physician Verification Card */}
          <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-presence-950 text-presence-300 flex items-center justify-center shrink-0 border border-presence-800">
                <Stethoscope className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-semibold text-white truncate">Dr. Sneha Sen</p>
                  <CheckCircle2 className="w-3.5 h-3.5 text-presence-400 shrink-0" />
                </div>
                <p className="text-[10px] text-presence-300 font-medium truncate">Cardiology Lead &bull; On-Site Present</p>
              </div>
            </div>

            <div className="shrink-0 bg-presence-900/50 border border-presence-700/60 px-2 py-1 rounded text-[10px] font-mono text-presence-300 font-semibold">
              QR CHECKED-IN
            </div>
          </div>

          {/* Guaranteed Reservation Protocol Banner */}
          <div className="px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-800/80 flex items-center justify-between text-[11px] text-slate-300">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-hold-400 shrink-0" />
              <span className="font-medium">Emergency Hold Guarantee:</span>
            </div>
            <span className="font-semibold text-white font-mono">15:00 MIN LOCK</span>
          </div>

        </div>

      </div>
    </div>
  );
};

export default HeroClinicalCommand;

