import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export const Toast = ({
  type = 'info', // 'success' | 'warning' | 'error' | 'emergency' | 'info'
  title,
  message,
  onClose,
  className = '',
}) => {
  const configs = {
    success: {
      icon: CheckCircle2,
      container: 'bg-[#F0FDF4] border-[#BBF7D0] text-[#15803D]',
      iconColor: 'text-[#16A34A]',
    },
    warning: {
      icon: AlertTriangle,
      container: 'bg-[#FFFBEB] border-[#FDE68A] text-[#B45309]',
      iconColor: 'text-[#D97706]',
    },
    error: {
      icon: AlertCircle,
      container: 'bg-[#FEF2F2] border-[#FECACA] text-[#B91C1C]',
      iconColor: 'text-[#DC2626]',
    },
    emergency: {
      icon: AlertCircle,
      container: 'bg-[#FEF2F2] border-[#DC2626] text-[#B91C1C]',
      iconColor: 'text-[#DC2626]',
    },
    info: {
      icon: Info,
      container: 'bg-[#F0F2FD] border-[#C5CAF7] text-[#111827]',
      iconColor: 'text-[#2F2FE4]',
    },
  };

  const current = configs[type] || configs.info;
  const Icon = current.icon;

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 p-3.5 border rounded-lg text-xs transition-all shadow-xs ${current.container} ${className}`}
    >
      <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${current.iconColor}`} />
      <div className="flex-1 space-y-0.5">
        {title && <p className="font-semibold text-slate-900">{title}</p>}
        {message && <p className="text-slate-700 leading-relaxed">{message}</p>}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors"
          aria-label="Dismiss alert"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default Toast;

