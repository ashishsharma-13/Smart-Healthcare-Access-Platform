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
      container: 'bg-presence-50 border-presence-200 text-presence-900',
      iconColor: 'text-presence-600',
    },
    warning: {
      icon: AlertTriangle,
      container: 'bg-hold-50 border-hold-200 text-hold-900',
      iconColor: 'text-hold-600',
    },
    error: {
      icon: AlertCircle,
      container: 'bg-rose-50 border-rose-200 text-rose-900',
      iconColor: 'text-rose-600',
    },
    emergency: {
      icon: AlertCircle,
      container: 'bg-urgent-50 border-urgent-300 text-urgent-900',
      iconColor: 'text-urgent-600',
    },
    info: {
      icon: Info,
      container: 'bg-brand-50 border-brand-200 text-brand-900',
      iconColor: 'text-brand-600',
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

