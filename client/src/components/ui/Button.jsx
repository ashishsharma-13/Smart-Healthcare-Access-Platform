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
  ...props
}, ref) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none rounded-lg active:scale-[0.98] cursor-pointer';

  const sizeStyles = {
    xs: 'text-xs px-2.5 py-1 min-h-[30px] gap-1.5',
    sm: 'text-xs px-3 py-1.5 min-h-[34px] gap-1.5 font-semibold',
    md: 'text-xs sm:text-sm px-4 py-2 min-h-[38px] gap-2 font-semibold',
    lg: 'text-sm sm:text-base px-5 py-2.5 min-h-[44px] gap-2.5 font-bold',
  };

  const variantStyles = {
    primary: 'bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white shadow-xs border border-transparent',
    secondary: 'bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 border border-slate-200/60',
    outline: 'border border-slate-300/90 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 shadow-2xs',
    ghost: 'hover:bg-slate-100 active:bg-slate-200 text-slate-700',
    emergency: 'bg-urgent-600 hover:bg-urgent-700 active:bg-urgent-800 text-white shadow-xs font-semibold tracking-wide border border-transparent',
    emergencyOutline: 'border border-urgent-300 bg-urgent-50/70 hover:bg-urgent-100 text-urgent-700 font-semibold',
    presence: 'bg-presence-600 hover:bg-presence-700 active:bg-presence-800 text-white shadow-xs font-semibold border border-transparent',
    danger: 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-xs border border-transparent',
  };

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={`${baseStyles} ${sizeStyles[size] || sizeStyles.md} ${variantStyles[variant] || variantStyles.primary} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-current shrink-0" />
      ) : Icon && iconPosition === 'left' ? (
        <Icon className="w-3.5 h-3.5 shrink-0" />
      ) : null}

      <span>{children}</span>

      {!loading && Icon && iconPosition === 'right' && (
        <Icon className="w-3.5 h-3.5 shrink-0" />
      )}
    </button>
  );
});

Button.displayName = 'Button';
export default Button;
