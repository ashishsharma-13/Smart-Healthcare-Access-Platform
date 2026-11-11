import React, { useState } from 'react';
import { X, CheckSquare, Square, FileText, Pill, ShieldCheck, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const PreAppointmentChecklistModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const [checkedItems, setCheckedItems] = useState([0, 1]);

  const checklist = [
    {
      title: 'Current Medication List',
      desc: 'Bring names and dosages of all active prescriptions, supplements, and vitamins.',
    },
    {
      title: 'Valid Government or Health ID',
      desc: 'National ID, driver license, or health insurance card for identity verification.',
    },
    {
      title: 'Previous Diagnostic Reports',
      desc: 'Blood tests, imaging (X-rays, MRI scans), and pathology reports from recent months.',
    },
    {
      title: 'Digital Token Pass / QR Code',
      desc: 'Keep your SHAP appointment pass handy on your mobile device for reception check-in.',
    },
    {
      title: 'List of Symptoms & Questions',
      desc: 'Jot down questions or timeline of symptoms you want to discuss with your doctor.',
    },
  ];

  const toggleItem = (idx) => {
    setCheckedItems((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Pre-Visit Preparation Checklist</h3>
              <p className="text-xs text-slate-500">Ensure a seamless and thorough consultation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress summary */}
        <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/70 rounded-2xl flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-emerald-900">
              {checkedItems.length} of {checklist.length} items ready
            </span>
          </div>
          <span className="text-xs font-mono font-black text-emerald-700">
            {Math.round((checkedItems.length / checklist.length) * 100)}%
          </span>
        </div>

        {/* Checklist */}
        <div className="space-y-2.5">
          {checklist.map((item, idx) => {
            const isChecked = checkedItems.includes(idx);
            return (
              <div
                key={idx}
                onClick={() => toggleItem(idx)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start space-x-3 ${
                  isChecked
                    ? 'bg-emerald-50/40 border-emerald-200 text-slate-900'
                    : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100/60'
                }`}
              >
                <div className="mt-0.5 text-emerald-600 shrink-0">
                  {isChecked ? (
                    <CheckSquare className="w-4 h-4 fill-emerald-600 text-white" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                </div>
                <div>
                  <h4 className={`text-xs font-bold ${isChecked ? 'text-emerald-950 line-through' : 'text-slate-900'}`}>
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Navigation to Manage Profile */}
        <div className="pt-2 flex items-center justify-between">
          <Link
            to="/patient/profile"
            onClick={onClose}
            className="text-xs font-bold text-blue-600 hover:underline flex items-center space-x-1"
          >
            <span>Update Medications in Profile</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

