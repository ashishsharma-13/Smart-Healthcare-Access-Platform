import React from 'react';

export const BrandMark = ({ className = 'w-8 h-8', label = 'SHAP' }) => (
  <span
    className={`${className} inline-flex shrink-0 items-center justify-center rounded-[10px] bg-[#2F2FE4] text-white`}
    aria-label={label}
    role="img"
  >
    <svg viewBox="0 0 48 48" className="h-[72%] w-[72%]" aria-hidden="true">
      <path
        d="M7 25h7l3.2-8.5L23 32l4.1-14 3.1 7H41"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </span>
);

export default BrandMark;
