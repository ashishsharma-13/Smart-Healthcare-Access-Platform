import React from 'react';

export const Badge = ({
  children,
  variant = 'neutral',
  size = 'sm',
  dot = false,
  pulseDot = false,
  icon: Icon,
  className = '',
}) => {
  const sizeStyles = {
    xs: 'text-[10px] px-2 py-0.5 font-semibold tracking-wide',
    sm: 'text-[11px] px-2.5 py-0.5 font-semibold tracking-normal',
    md: 'text-xs px-3 py-1 font-semibold tracking-normal',
  };

  const variantStyles = {
    presence: 'bg-presence-50 text-presence-800 border border-presence-200/80',
    presenceSolid: 'bg-presence-600 text-white',
    emergency: 'bg-urgent-50 text-urgent-800 border border-urgent-200/80 font-bold',
    emergencySolid: 'bg-urgent-600 text-white font-bold',
    hold: 'bg-hold-50 text-hold-700 border border-hold-200 font-semibold',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200 font-semibold',
    info: 'bg-brand-50 text-brand-700 border border-brand-200/80',
    success: 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-semibold',
    danger: 'bg-rose-50 text-rose-800 border border-rose-200/80 font-semibold',
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200/80',
    outline: 'bg-transparent text-slate-600 border border-slate-300',
  };

  const dotColors = {
    presence: 'bg-presence-500',
    presenceSolid: 'bg-white',
    emergency: 'bg-urgent-500',
    emergencySolid: 'bg-white',
    hold: 'bg-hold-500',
    warning: 'bg-amber-500',
    info: 'bg-brand-500',
    success: 'bg-emerald-500',
    danger: 'bg-rose-500',
    neutral: 'bg-slate-400',
    outline: 'bg-slate-400',
  };

  const activeVariant = variantStyles[variant] || variantStyles.neutral;
  const activeDotColor = dotColors[variant] || dotColors.neutral;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md ${sizeStyles[size] || sizeStyles.sm} ${activeVariant} ${className}`}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5">
          {pulseDot && (
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${activeDotColor}`}
            />
          )}
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${activeDotColor}`} />
        </span>
      )}
      {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0" />}
      <span>{children}</span>
    </span>
  );
};

export default Badge;
