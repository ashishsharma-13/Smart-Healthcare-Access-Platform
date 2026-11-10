import React from 'react';

export const MedicalHeroIllustration = () => {
  return (
    <div className="relative w-full max-w-lg mx-auto select-none">
      {/* Ambient background glow and blur circles */}
      <div className="absolute -top-10 -left-10 w-72 h-72 bg-blue-300/30 rounded-full blur-3xl -z-10 animate-pulse"></div>
      <div className="absolute -bottom-10 -right-10 w-80 h-80 bg-teal-300/25 rounded-full blur-3xl -z-10"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl -z-10"></div>

      {/* Main SVG Graphics Illustration */}
      <svg
        viewBox="0 0 520 480"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto drop-shadow-xl"
      >
        <defs>
          <linearGradient id="bgGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#EFF6FF" />
            <stop offset="100%" stopColor="#E0F2FE" />
          </linearGradient>
          <linearGradient id="circleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#0D9488" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="scrubBlue" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0284C7" />
            <stop offset="100%" stopColor="#0369A1" />
          </linearGradient>
          <linearGradient id="scrubTeal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0D9488" />
            <stop offset="100%" stopColor="#0F766E" />
          </linearGradient>
          <linearGradient id="labCoatGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#F1F5F9" />
          </linearGradient>
          <linearGradient id="skinTone1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDDFBA" />
            <stop offset="100%" stopColor="#FBC899" />
          </linearGradient>
          <linearGradient id="skinTone2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F5D0A9" />
            <stop offset="100%" stopColor="#E8B888" />
          </linearGradient>
          <linearGradient id="hairDark" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2A1B14" />
            <stop offset="100%" stopColor="#170E0B" />
          </linearGradient>
          <linearGradient id="hairBrown" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4A3525" />
            <stop offset="100%" stopColor="#2E1C11" />
          </linearGradient>
          <filter id="shadowFilter" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#0F172A" floodOpacity="0.08" />
          </filter>
        </defs>

        {/* Backdrop Graphic Aura Circle */}
        <circle cx="260" cy="240" r="210" fill="url(#circleGrad)" />
        <circle cx="260" cy="240" r="170" stroke="#BFDBFE" strokeWidth="2" strokeDasharray="6 6" fill="none" opacity="0.6" />

        {/* Medical Cross Graphic Badges in Background */}
        <g opacity="0.75" className="animate-pulse">
          <circle cx="90" cy="110" r="22" fill="#FFFFFF" filter="url(#shadowFilter)" />
          <path d="M85 110H95M90 105V115" stroke="#2563EB" strokeWidth="4" strokeLinecap="round" />
        </g>
        <g opacity="0.8">
          <circle cx="430" cy="130" r="26" fill="#FFFFFF" filter="url(#shadowFilter)" />
          <path d="M418 130H424L427 122L431 138L435 127L438 130H442" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <g opacity="0.7">
          <circle cx="450" cy="320" r="20" fill="#FFFFFF" filter="url(#shadowFilter)" />
          <path d="M444 320H456M450 314V326" stroke="#059669" strokeWidth="3" strokeLinecap="round" />
        </g>

        {/* ======================================================== */}
        {/* DOCTOR 1 (Left - Female Doctor in White Coat & Teal Top) */}
        {/* ======================================================== */}
        <g id="doctor-female" transform="translate(70, 70)">
          {/* Female Hair Back */}
          <path d="M70 120 C50 140 40 210 50 240 C55 250 65 240 70 230 C75 190 75 160 85 130 Z" fill="url(#hairDark)" />
          <path d="M120 120 C140 140 150 210 140 240 C135 250 125 240 120 230 C115 190 115 160 105 130 Z" fill="url(#hairDark)" />

          {/* Body / Coat Back */}
          <path d="M45 270 Q95 240 145 270 L160 380 L30 380 Z" fill="url(#labCoatGrad)" />

          {/* Inner Teal Scrub Top */}
          <path d="M75 220 L115 220 L120 300 L70 300 Z" fill="url(#scrubTeal)" />
          <path d="M95 220 L95 245 M85 245 L105 245" stroke="#0F766E" strokeWidth="1.5" />

          {/* Neck */}
          <rect x="83" y="170" width="24" height="35" rx="10" fill="url(#skinTone1)" />

          {/* Head & Face */}
          <ellipse cx="95" cy="130" rx="34" ry="42" fill="url(#skinTone1)" />

          {/* Ears */}
          <ellipse cx="61" cy="132" rx="5" ry="9" fill="url(#skinTone1)" />
          <ellipse cx="129" cy="132" rx="5" ry="9" fill="url(#skinTone1)" />

          {/* Hair Front */}
          <path
            d="M61 130 C60 85 80 65 95 65 C115 65 130 85 129 130 C125 105 110 85 95 85 C80 85 65 105 61 130 Z"
            fill="url(#hairDark)"
          />
          <path d="M68 95 C80 90 95 95 102 105 C95 100 80 95 72 105 Z" fill="#3D291F" />

          {/* Eyes & Eyebrows */}
          <ellipse cx="83" cy="125" rx="3" ry="3.5" fill="#1E293B" />
          <ellipse cx="107" cy="125" rx="3" ry="3.5" fill="#1E293B" />
          <path d="M78 116 Q83 113 88 116" stroke="#3D291F" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          <path d="M102 116 Q107 113 112 116" stroke="#3D291F" strokeWidth="1.8" strokeLinecap="round" fill="none" />

          {/* Nose & Friendly Smile */}
          <path d="M95 127 Q97 132 94 135" stroke="#E2A676" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <path d="M87 145 Q95 153 103 145" stroke="#C05621" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <ellipse cx="78" cy="137" rx="5" ry="3" fill="#F87171" opacity="0.35" />
          <ellipse cx="112" cy="137" rx="5" ry="3" fill="#F87171" opacity="0.35" />

          {/* White Lab Coat Front & Lapels */}
          <path d="M45 250 L75 220 L78 360 L35 360 Z" fill="#FFFFFF" filter="url(#shadowFilter)" />
          <path d="M145 250 L115 220 L112 360 L155 360 Z" fill="#FFFFFF" filter="url(#shadowFilter)" />
          {/* Coat Lapels */}
          <path d="M75 220 L90 270 L70 280 Z" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="1" />
          <path d="M115 220 L100 270 L120 280 Z" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="1" />

          {/* Stethoscope around neck */}
          <path
            d="M74 200 C74 250 82 285 95 285 C108 285 116 250 116 200"
            stroke="#334155"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
          <path d="M95 285 L95 305" stroke="#334155" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="95" cy="312" r="8" fill="#94A3B8" stroke="#475569" strokeWidth="2" />
          <circle cx="95" cy="312" r="3" fill="#0D9488" />

          {/* Holding Medical Tablet / Clipboard */}
          <g transform="translate(100, 260) rotate(-8)">
            <rect x="0" y="0" width="60" height="85" rx="8" fill="#1E293B" filter="url(#shadowFilter)" />
            <rect x="4" y="4" width="52" height="77" rx="6" fill="#F8FAFC" />
            {/* Tablet screen elements */}
            <rect x="10" y="12" width="26" height="4" rx="2" fill="#2563EB" />
            <rect x="10" y="20" width="40" height="3" rx="1.5" fill="#94A3B8" />
            <rect x="10" y="26" width="34" height="3" rx="1.5" fill="#94A3B8" />
            {/* Mini ECG chart on tablet */}
            <path d="M10 44 L16 44 L20 36 L24 50 L28 40 L32 44 L48 44" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            {/* Status pill on tablet */}
            <rect x="10" y="60" width="22" height="10" rx="5" fill="#DCFCE7" />
            <circle cx="15" cy="65" r="2" fill="#16A34A" />
            <rect x="20" y="63" width="8" height="4" rx="1" fill="#16A34A" />
          </g>
          {/* Hands holding tablet */}
          <ellipse cx="106" cy="310" rx="9" ry="7" fill="url(#skinTone1)" />
        </g>

        {/* ======================================================== */}
        {/* DOCTOR 2 (Right - Male Practitioner in Royal Blue Scrubs) */}
        {/* ======================================================== */}
        <g id="doctor-male" transform="translate(260, 60)">
          {/* Scrub Cap */}
          <path d="M50 100 C50 60 75 45 105 45 C135 45 160 60 160 100 C160 105 155 108 145 105 C130 100 80 100 65 105 C55 108 50 105 50 100 Z" fill="url(#scrubBlue)" />
          {/* Cap band */}
          <path d="M52 98 Q105 104 158 98 L158 108 Q105 114 52 108 Z" fill="#0369A1" />

          {/* Neck */}
          <rect x="93" y="170" width="26" height="35" rx="8" fill="url(#skinTone2)" />

          {/* Head & Face */}
          <ellipse cx="106" cy="135" rx="34" ry="40" fill="url(#skinTone2)" />

          {/* Ears */}
          <ellipse cx="71" cy="138" rx="5" ry="9" fill="url(#skinTone2)" />
          <ellipse cx="141" cy="138" rx="5" ry="9" fill="url(#skinTone2)" />

          {/* Hair Under Cap at Temples */}
          <path d="M72 125 C70 115 73 105 75 100" stroke="url(#hairBrown)" strokeWidth="4" strokeLinecap="round" />
          <path d="M140 125 C142 115 139 105 137 100" stroke="url(#hairBrown)" strokeWidth="4" strokeLinecap="round" />

          {/* Eyes & Eyebrows */}
          <ellipse cx="94" cy="130" rx="3" ry="3.5" fill="#0F172A" />
          <ellipse cx="118" cy="130" rx="3" ry="3.5" fill="#0F172A" />
          <path d="M88 122 Q94 119 100 122" stroke="#2E1C11" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <path d="M112 122 Q118 119 124 122" stroke="#2E1C11" strokeWidth="2.2" strokeLinecap="round" fill="none" />

          {/* Nose & Confident Smile */}
          <path d="M106 132 Q108 138 104 142" stroke="#C88E5A" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          <path d="M97 150 Q106 158 115 150" stroke="#9A3412" strokeWidth="2.2" strokeLinecap="round" fill="none" />

          {/* Blue Scrub Body */}
          <path d="M55 240 Q106 220 157 240 L175 390 L37 390 Z" fill="url(#scrubBlue)" filter="url(#shadowFilter)" />

          {/* V-Neck Collar */}
          <path d="M92 205 L106 240 L120 205" stroke="#38BDF8" strokeWidth="3" fill="#0369A1" strokeLinejoin="round" />

          {/* Staff Identification Badge */}
          <g transform="translate(68, 255)">
            <rect x="0" y="0" width="22" height="30" rx="3" fill="#FFFFFF" filter="url(#shadowFilter)" />
            <rect x="4" y="4" width="14" height="10" rx="2" fill="#0284C7" />
            <rect x="4" y="17" width="14" height="2" rx="1" fill="#94A3B8" />
            <rect x="4" y="21" width="10" height="2" rx="1" fill="#94A3B8" />
            <circle cx="11" cy="-4" r="2" fill="#64748B" />
            <line x1="11" y1="-4" x2="11" y2="0" stroke="#64748B" strokeWidth="1.5" />
          </g>

          {/* Stethoscope on Male Doctor */}
          <path
            d="M86 210 C86 260 94 290 106 290 C118 290 126 260 126 210"
            stroke="#1E293B"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
          <path d="M106 290 L106 315" stroke="#1E293B" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="106" cy="322" r="7" fill="#E2E8F0" stroke="#334155" strokeWidth="2" />
        </g>

        {/* ======================================================== */}
        {/* FLOATING STATUS PILL BADGES OVER ILLUSTRATION            */}
        {/* ======================================================== */}
        {/* Top Right Floating Pill: "24/7 Verified Emergency Network" */}
        <g transform="translate(320, 360)">
          <rect x="0" y="0" width="180" height="42" rx="21" fill="#FFFFFF" filter="url(#shadowFilter)" />
          <circle cx="21" cy="21" r="13" fill="#FEF2F2" />
          <path d="M17 21L20 24L26 17" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <text x="42" y="19" fill="#0F172A" fontSize="11" fontWeight="700" fontFamily="Inter, sans-serif">
            24/7 Trauma Ready
          </text>
          <text x="42" y="32" fill="#64748B" fontSize="9" fontWeight="500" fontFamily="Inter, sans-serif">
            Parallel Beep Enabled
          </text>
        </g>

        {/* Bottom Left Floating Pill: "100% Verified Practitioners" */}
        <g transform="translate(20, 350)">
          <rect x="0" y="0" width="185" height="42" rx="21" fill="#FFFFFF" filter="url(#shadowFilter)" />
          <circle cx="21" cy="21" r="13" fill="#ECFDF5" />
          <path d="M16 21L19 24L26 17" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <text x="42" y="19" fill="#0F172A" fontSize="11" fontWeight="700" fontFamily="Inter, sans-serif">
            Verified Doctors Only
          </text>
          <text x="42" y="32" fill="#64748B" fontSize="9" fontWeight="500" fontFamily="Inter, sans-serif">
            NMC Validated License
          </text>
        </g>
      </svg>
    </div>
  );
};
export default MedicalHeroIllustration;

