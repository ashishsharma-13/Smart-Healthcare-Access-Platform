import React from 'react';
import { X, HelpCircle, PhoneCall, ShieldAlert, Calendar, QrCode, FileText, CheckCircle2 } from 'lucide-react';

export const HelpCenterModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const faqs = [
    {
      q: 'How does the Emergency Beep system work?',
      a: 'When you activate an Emergency Beep, your GPS location and emergency details are broadcast simultaneously to all participating hospitals within a 15 km radius. Hospitals review your case and respond with bed availability. Once you select a hospital, an automated 15-minute temporary bed reservation is held for you.',
    },
    {
      q: 'How do I check in for my appointment?',
      a: 'Each booked consultation generates a digital token pass with a secure QR code. Present this QR code or token pass at the hospital reception or doctor desk for instant check-in.',
    },
    {
      q: 'Can I reschedule or cancel an appointment?',
      a: 'Yes, navigate to Appointments in your sidebar. Click "Reschedule" to pick a new available slot, or "Cancel" if you can no longer attend.',
    },
    {
      q: 'How is my medical data protected?',
      a: 'SHAP uses encrypted end-to-end transmissions and role-based access control. Only authorized healthcare providers attending to your care or emergency can access your clinical record.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">SHAP Help Center</h3>
              <p className="text-xs text-slate-500">Frequently Asked Questions & Care Guidance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Emergency Hotlines Banner */}
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <PhoneCall className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <h4 className="text-xs font-black text-rose-950">Immediate Life Threat?</h4>
              <p className="text-[11px] text-rose-800/80">Call national emergency services: 112 / 911 / 108</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-rose-600 text-white">
            24/7 Helpline
          </span>
        </div>

        {/* FAQ List */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Common Questions</h4>
          <div className="space-y-3">
            {faqs.map((item, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                <h5 className="text-xs font-bold text-slate-900 flex items-start space-x-2">
                  <span className="text-blue-600 font-black">Q.</span>
                  <span>{item.q}</span>
                </h5>
                <p className="text-xs text-slate-600 pl-4 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
          >
            Close Help Center
          </button>
        </div>
      </div>
    </div>
  );
};

