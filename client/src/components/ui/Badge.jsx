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
    presence: 'bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]',
    presenceSolid: 'bg-[#16A34A] text-white',
    emergency: 'bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA] font-bold',
    emergencySolid: 'bg-[#DC2626] text-white font-bold',
    hold: 'bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] font-semibold',
    warning: 'bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] font-semibold',
    info: 'bg-[#F0F2FD] text-[#2F2FE4] border border-[#C5CAF7]',
    primary: 'bg-[#2F2FE4] text-white font-semibold',
    secondary: 'bg-[#162E93] text-white font-semibold',
    navy: 'bg-[#1A1953] text-white font-semibold',
    success: 'bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0] font-semibold',
    danger: 'bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA] font-semibold',
    neutral: 'bg-[#F1F5F9] text-[#111827] border border-[#E2E8F0]',
    outline: 'bg-transparent text-[#64748B] border border-[#CBD5E1]',
  };

  const dotColors = {
    presence: 'bg-[#16A34A]',
    presenceSolid: 'bg-white',
    emergency: 'bg-[#DC2626]',
    emergencySolid: 'bg-white',
    hold: 'bg-[#D97706]',
    warning: 'bg-[#D97706]',
    info: 'bg-[#2F2FE4]',
    primary: 'bg-white',
    secondary: 'bg-white',
    navy: 'bg-white',
    success: 'bg-[#16A34A]',
    danger: 'bg-[#DC2626]',
    neutral: 'bg-[#64748B]',
    outline: 'bg-[#64748B]',
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
