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
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none rounded-lg';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 min-h-[36px] gap-1.5',
    md: 'text-sm px-4 py-2 min-h-[42px] gap-2',
    lg: 'text-base px-5 py-2.5 min-h-[46px] gap-2.5 font-semibold',
  };

  const variantStyles = {
    primary: 'bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white shadow-xs',
    secondary: 'bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800',
    outline: 'border border-slate-300 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 shadow-xs',
    ghost: 'hover:bg-slate-100 text-slate-700 active:bg-slate-200',
    emergency: 'bg-urgent-600 hover:bg-urgent-700 active:bg-urgent-800 text-white shadow-xs font-semibold tracking-wide',
    emergencyOutline: 'border border-urgent-300 bg-urgent-50/60 hover:bg-urgent-100/80 text-urgent-700 font-semibold',
    presence: 'bg-presence-600 hover:bg-presence-700 active:bg-presence-800 text-white shadow-xs font-semibold',
    danger: 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-xs',
  };

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : Icon && iconPosition === 'left' ? (
        <Icon className="w-4 h-4 flex-shrink-0" />
      ) : null}

      <span>{children}</span>

      {!loading && Icon && iconPosition === 'right' && (
        <Icon className="w-4 h-4 flex-shrink-0" />
      )}
    </button>
  );
});

Button.displayName = 'Button';
export default Button;

