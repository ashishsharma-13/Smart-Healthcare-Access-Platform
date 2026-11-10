import React from 'react';

export const EmergencyRadarIllustration = ({ hospitalCount = 4, statusText = "Broadcasting..." }) => {
  return (
    <div className="relative w-72 h-72 mx-auto flex items-center justify-center my-6">
      {/* Outer pulsing ring 1 */}
      <div className="absolute inset-0 rounded-full border border-red-500/30 animate-ping opacity-75"></div>
      
      {/* Outer pulsing ring 2 */}
      <div className="absolute inset-4 rounded-full border border-red-500/40 animate-pulse"></div>

      {/* Grid concentric rings */}
      <div className="absolute inset-8 rounded-full border border-red-200 bg-red-50/40 backdrop-blur-xs flex items-center justify-center">
        <div className="w-44 h-44 rounded-full border border-red-300/80 flex items-center justify-center">
          <div className="w-28 h-28 rounded-full border border-red-400/90 flex items-center justify-center">
            {/* Center Emergency Pulse Core */}
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-red-500/50 animate-bounce">
              <svg className="w-8 h-8 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Rotating Radar Scanner Sweep */}
      <div className="absolute inset-8 rounded-full overflow-hidden pointer-events-none">
        <div className="w-full h-full bg-gradient-to-tr from-transparent via-red-500/10 to-red-500/30 origin-center animate-[spin_4s_linear_infinite] rounded-full"></div>
      </div>

      {/* Responding Hospital Ping Markers on Radar */}
      <div className="absolute top-12 left-16 flex items-center space-x-1.5 bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded-full border border-red-200 shadow-xs animate-pulse">
        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
        <span className="text-[10px] font-bold text-slate-800">Apex Metro</span>
      </div>

      <div className="absolute bottom-14 right-10 flex items-center space-x-1.5 bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded-full border border-red-200 shadow-xs animate-pulse">
        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
        <span className="text-[10px] font-bold text-slate-800">St. Jude</span>
      </div>

      <div className="absolute top-20 right-14 flex items-center space-x-1.5 bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded-full border border-red-200 shadow-xs">
        <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
        <span className="text-[10px] font-bold text-slate-800">Fortis Emergency</span>
      </div>
    </div>
  );
};
export default EmergencyRadarIllustration;

