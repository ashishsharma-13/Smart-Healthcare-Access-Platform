import React from 'react';

export const Input = React.forwardRef(({
  label,
  error,
  helperText,
  icon: Icon,
  className = '',
  required = false,
  id,
  type = 'text',
  ...props
}, ref) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-[#111827]">
          {label} {required && <span className="text-[#DC2626] font-bold">*</span>}
        </label>
      )}
      <div className="relative rounded-lg shadow-2xs">
        {Icon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#64748B]">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          required={required}
          className={`block w-full rounded-lg border bg-white py-2 text-xs sm:text-sm text-[#111827] placeholder-[#64748B] transition-colors focus:outline-none focus:ring-2 focus:ring-[#2F2FE4] focus:border-[#2F2FE4] disabled:cursor-not-allowed disabled:bg-[#F1F5F9] disabled:text-[#64748B] ${
            Icon ? 'pl-9 pr-3' : 'px-3'
          } ${
            error
              ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]'
              : 'border-[#E2E8F0] hover:border-[#CBD5E1]'
          } ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-[11px] font-medium text-[#DC2626]">{error}</p>}
      {!error && helperText && <p className="text-[11px] text-[#64748B]">{helperText}</p>}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
