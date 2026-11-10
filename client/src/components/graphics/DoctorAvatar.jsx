import React from 'react';

export const DoctorAvatar = ({ name = 'Doctor', specialization = 'Specialist', className = 'w-14 h-14' }) => {
  // Deterministic seed based on doctor name
  const code = (name || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Color themes
  const themes = [
    { bg: '#EFF6FF', scrub: '#0284C7', coat: '#FFFFFF', hair: '#1E293B', skin: '#FBC899' },
    { bg: '#ECFDF5', scrub: '#0D9488', coat: '#FFFFFF', hair: '#4A3525', skin: '#FDDFBA' },
    { bg: '#FAF5FF', scrub: '#7C3AED', coat: '#FFFFFF', hair: '#18181B', skin: '#E8B888' },
    { bg: '#FFF1F2', scrub: '#E11D48', coat: '#FFFFFF', hair: '#292524', skin: '#F5D0A9' },
    { bg: '#F0F9FF', scrub: '#0369A1', coat: '#FFFFFF', hair: '#374151', skin: '#FBC899' },
  ];
  const t = themes[code % themes.length];
  const isFemale = code % 2 === 0;

  return (
    <div className={`relative rounded-2xl overflow-hidden shadow-xs border border-slate-100 flex-shrink-0 flex items-center justify-center ${className}`} style={{ backgroundColor: t.bg }}>
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Background glow circle */}
        <circle cx="50" cy="50" r="45" fill={t.bg} />

        {/* Shoulders / Lab coat */}
        <path d="M15 95 C15 72 30 65 50 65 C70 65 85 72 85 95 Z" fill={t.coat} />
        {/* Inner Scrub V */}
        <path d="M42 65 L50 80 L58 65 Z" fill={t.scrub} />
        {/* Coat Lapels */}
        <path d="M35 65 L44 95 L22 95 Z" fill="#F1F5F9" />
        <path d="M65 65 L56 95 L78 95 Z" fill="#F1F5F9" />

        {/* Stethoscope */}
        <path d="M38 68 C38 82 43 90 50 90 C57 90 62 82 62 68" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <circle cx="50" cy="92" r="3.5" fill="#94A3B8" stroke="#475569" strokeWidth="1" />

        {/* Neck */}
        <rect x="43" y="48" width="14" height="18" rx="6" fill={t.skin} />

        {/* Head */}
        <ellipse cx="50" cy="42" rx="19" ry="22" fill={t.skin} />

        {/* Hair */}
        {isFemale ? (
          <>
            <path d="M28 40 C27 25 36 15 50 15 C64 15 73 25 72 40 C68 25 58 23 50 23 C42 23 32 25 28 40 Z" fill={t.hair} />
            <path d="M29 40 C28 50 29 60 32 64 C35 55 35 45 35 40 Z" fill={t.hair} />
            <path d="M71 40 C72 50 71 60 68 64 C65 55 65 45 65 40 Z" fill={t.hair} />
          </>
        ) : (
          <path d="M30 38 C29 25 38 18 50 18 C62 18 71 25 70 38 C68 27 60 25 50 25 C40 25 32 27 30 38 Z" fill={t.hair} />
        )}

        {/* Eyes */}
        <ellipse cx="43" cy="42" rx="2" ry="2.2" fill="#1E293B" />
        <ellipse cx="57" cy="42" rx="2" ry="2.2" fill="#1E293B" />

        {/* Eyebrows */}
        <path d="M39 37 Q43 35 47 37" stroke={t.hair} strokeWidth="1.2" strokeLinecap="round" fill="none" />
        <path d="M53 37 Q57 35 61 37" stroke={t.hair} strokeWidth="1.2" strokeLinecap="round" fill="none" />

        {/* Smile */}
        <path d="M45 52 Q50 56 55 52" stroke="#9A3412" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      </svg>
    </div>
  );
};
export default DoctorAvatar;

