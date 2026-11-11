import React from 'react';

export const EmergencyRadarIllustration = ({ hospitalCount = 4, statusText = "Broadcasting..." }) => {
  return (
    <div className="relative w-44 h-44 mx-auto flex items-center justify-center my-2">
      {/* Outer pulsing ring 1 */}
      <div className="absolute inset-0 rounded-full border border-red-500/25 animate-ping opacity-75"></div>
      
      {/* Outer pulsing ring 2 */}
      <div className="absolute inset-2 rounded-full border border-red-500/35 animate-pulse"></div>

      {/* Grid concentric rings */}
      <div className="absolute inset-3 rounded-full border border-red-500/20 bg-red-950/20 backdrop-blur-xs flex items-center justify-center">
        <div className="w-28 h-28 rounded-full border border-red-500/30 flex items-center justify-center">
          <div className="w-18 h-18 rounded-full border border-red-500/40 flex items-center justify-center">
            {/* Center Emergency Pulse Core (w-10 h-10) */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center text-white shadow-md shadow-red-500/50 animate-pulse">
              <svg className="w-5 h-5 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Rotating Radar Scanner Sweep */}
      <div className="absolute inset-3 rounded-full overflow-hidden pointer-events-none">
        <div className="w-full h-full bg-gradient-to-tr from-transparent via-red-500/10 to-red-500/25 origin-center animate-[spin_4s_linear_infinite] rounded-full"></div>
      </div>

      {/* Responding Hospital Ping Markers on Radar */}
      <div className="absolute top-4 left-6 flex items-center space-x-1 bg-slate-900/90 backdrop-blur-xs px-1.5 py-0.5 rounded-full border border-red-500/30 shadow-xs animate-pulse">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
        <span className="text-[9px] font-bold text-slate-200">Apex Metro</span>
      </div>

      <div className="absolute bottom-5 right-4 flex items-center space-x-1 bg-slate-900/90 backdrop-blur-xs px-1.5 py-0.5 rounded-full border border-red-500/30 shadow-xs animate-pulse">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
        <span className="text-[9px] font-bold text-slate-200">Trauma Ready</span>
      </div>
    </div>
  );
};
export default EmergencyRadarIllustration;

