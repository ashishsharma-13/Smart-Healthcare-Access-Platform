import React from 'react';
import { Loader2 } from 'lucide-react';

export const Button = React.forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  className = '',
  type = 'button',
  ariaLabel,
  ...props
}, ref) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F2FE4] focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none rounded-lg cursor-pointer';

  const sizeStyles = {
    xs: 'text-xs px-2.5 py-1 min-h-[30px] sm:min-h-[32px] gap-1.5',
    sm: 'text-xs px-3 py-1.5 min-h-[34px] sm:min-h-[36px] gap-1.5 font-semibold',
    md: 'text-xs sm:text-sm px-4 py-2 min-h-[38px] sm:min-h-[40px] gap-2 font-semibold',
    lg: 'text-sm sm:text-base px-5 py-2.5 min-h-[44px] gap-2.5 font-bold',
  };

  const variantStyles = {
    primary: 'bg-[#2F2FE4] hover:bg-[#162E93] active:bg-[#1A1953] text-white shadow-2xs border border-transparent',
    secondary: 'bg-[#162E93] hover:bg-[#112474] active:bg-[#0C1A55] text-white shadow-2xs border border-transparent',
    navy: 'bg-[#1A1953] hover:bg-[#13123E] active:bg-[#080616] text-white shadow-2xs border border-transparent',
    outline: 'border border-[#E2E8F0] bg-white hover:bg-[#F1F5F9] active:bg-[#E2E8F0] text-[#111827] shadow-2xs',
    ghost: 'hover:bg-[#F1F5F9] active:bg-[#E2E8F0] text-[#111827]',
    emergency: 'bg-[#DC2626] hover:bg-[#B91C1C] active:bg-[#991B1B] text-white shadow-2xs font-bold tracking-wide border border-transparent',
    emergencyOutline: 'border border-[#DC2626] bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#DC2626] font-semibold',
    presence: 'bg-[#16A34A] hover:bg-[#15803D] active:bg-[#166534] text-white shadow-2xs font-semibold border border-transparent',
    danger: 'bg-[#DC2626] hover:bg-[#B91C1C] active:bg-[#991B1B] text-white shadow-2xs border border-transparent',
  };

  return (
    <button
      ref={ref}
      type={type}
      aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
      disabled={disabled || loading}
      className={`${baseStyles} ${sizeStyles[size] || sizeStyles.md} ${variantStyles[variant] || variantStyles.primary} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current shrink-0" aria-hidden="true" />
      ) : Icon && iconPosition === 'left' ? (
        <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
      ) : null}

      {children && <span>{children}</span>}

      {!loading && Icon && iconPosition === 'right' && (
        <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
      )}
    </button>
  );
});

Button.displayName = 'Button';
export default Button;
