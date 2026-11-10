import React, { useState } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { ShieldAlert, CheckCircle2, XCircle, Clock, MapPin, User, Phone } from 'lucide-react';

export const EmergencyIncomingModal = () => {
  const { incomingEmergency, clearIncomingEmergency } = useSocket();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [offeredResources, setOfferedResources] = useState({
    icuBed: true,
    erBay: true,
    ventilator: false,
    specialistOnDuty: 'Emergency Attending Physician',
  });

  if (!incomingEmergency || user?.role !== 'organization') return null;

  const handleRespond = async (status) => {
    try {
      setSubmitting(true);
      await api.post(`/emergency/${incomingEmergency.emergencyRequestId}/respond`, {
        responseStatus: status,
        offeredResources: status === 'ACCEPTED' ? offeredResources : {},
        declineReason: status === 'DECLINED' ? 'Current hospital capacity constraints' : '',
      });
      clearIncomingEmergency();
    } catch (err) {
      console.error('Failed to respond to emergency beep', err);
      alert('Error recording response: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border-4 border-red-500 overflow-hidden animate-scale-up">
        
        {/* Pulsing Alert Banner */}
        <div className="bg-red-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-full animate-bounce">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-wide uppercase">INCOMING EMERGENCY BEEP</h3>
              <p className="text-xs text-red-100 font-medium">Parallel Broadcast Alert — Urgent Response Required</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded bg-white text-red-700 text-xs font-black uppercase">
            {incomingEmergency.severity || 'CRITICAL'}
          </span>
        </div>

        {/* Details Card */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3 bg-red-50/60 p-4 rounded-xl border border-red-100">
            <div>
              <span className="text-[11px] font-bold uppercase text-red-700">Emergency Type</span>
              <p className="text-sm font-extrabold text-slate-900 capitalize">{incomingEmergency.emergencyType} Emergency</p>
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase text-red-700">Estimated Travel</span>
              <p className="text-sm font-extrabold text-slate-900">{incomingEmergency.distanceKm} km (~{incomingEmergency.estimatedTravelMinutes} mins)</p>
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase text-slate-500">Patient</span>
              <p className="text-xs font-bold text-slate-800">{incomingEmergency.patientName}</p>
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase text-slate-500">Contact</span>
              <p className="text-xs font-bold text-slate-800">{incomingEmergency.patientPhone}</p>
            </div>
          </div>

          {incomingEmergency.description && (
            <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="font-bold text-slate-900">Notes: </span>
              {incomingEmergency.description}
            </div>
          )}

          {/* Resources Offered Selector */}
          <div className="border-t border-slate-200 pt-3">
            <h4 className="text-xs font-bold text-slate-800 mb-2">Confirm Readiness If Accepting:</h4>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <label className="flex items-center space-x-2 p-2 bg-slate-50 border rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={offeredResources.erBay}
                  onChange={(e) => setOfferedResources({ ...offeredResources, erBay: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="font-semibold text-slate-700">ER Bay</span>
              </label>

              <label className="flex items-center space-x-2 p-2 bg-slate-50 border rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={offeredResources.icuBed}
                  onChange={(e) => setOfferedResources({ ...offeredResources, icuBed: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="font-semibold text-slate-700">ICU Bed</span>
              </label>

              <label className="flex items-center space-x-2 p-2 bg-slate-50 border rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={offeredResources.ventilator}
                  onChange={(e) => setOfferedResources({ ...offeredResources, ventilator: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="font-semibold text-slate-700">Ventilator</span>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3 pt-3">
            <button
              onClick={() => handleRespond('ACCEPTED')}
              disabled={submitting}
              className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-50"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>ACCEPT & CAN RECEIVE</span>
            </button>

            <button
              onClick={() => handleRespond('DECLINED')}
              disabled={submitting}
              className="py-3 px-4 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 font-bold rounded-xl border border-slate-300 transition-all flex items-center space-x-1.5 active:scale-95 disabled:opacity-50"
            >
              <XCircle className="w-5 h-5 text-red-500" />
              <span>DECLINE</span>
            </button>
          </div>

          <p className="text-[11px] text-center text-slate-400">
            *Resources will only be temporarily reserved if the patient selects this hospital as final destination.
          </p>
        </div>

      </div>
    </div>
  );
};

