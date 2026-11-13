import React, { useState } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { ShieldAlert, CheckCircle2, XCircle, Clock, MapPin, User, Phone, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

export const EmergencyIncomingModal = () => {
  const { incomingEmergency, clearIncomingEmergency } = useSocket();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
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
      setErrorMessage('');
      const reqId = incomingEmergency.emergencyRequestId?._id || incomingEmergency.emergencyRequestId || incomingEmergency._id;
      await api.post(`/emergency/${reqId}/respond`, {
        responseStatus: status,
        offeredResources: status === 'ACCEPTED' ? offeredResources : {},
        declineReason: status === 'DECLINED' ? 'Current hospital capacity constraints' : '',
      });
      clearIncomingEmergency();
    } catch (err) {
      console.error('Failed to respond to emergency beep', err);
      setErrorMessage('Error recording response: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
    >
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-modal border border-urgent-300 overflow-hidden">
        
        {/* Pulsing Alert Banner */}
        <div className="bg-urgent-700 px-5 py-3.5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-white/20 rounded-md">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-wide uppercase">INCOMING EMERGENCY BEEP</h3>
              <p className="text-[11px] text-urgent-100">Parallel Broadcast Dispatch Alert — Immediate Hospital Response Requested</p>
            </div>
          </div>
          <Badge variant="emergencySolid" size="xs">
            {incomingEmergency.severity || 'CRITICAL'}
          </Badge>
        </div>

        {/* Details Card */}
        <div className="p-5 space-y-4">
          {errorMessage && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
              {errorMessage}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 bg-urgent-50/70 p-3.5 rounded-lg border border-urgent-200">
            <div>
              <span className="text-[10px] font-semibold uppercase text-urgent-700">Triage Type</span>
              <p className="text-xs font-bold text-slate-900 capitalize">{incomingEmergency.emergencyType} Emergency</p>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase text-urgent-700">Travel Distance</span>
              <p className="text-xs font-bold text-slate-900">{incomingEmergency.distanceKm} km (~{incomingEmergency.estimatedTravelMinutes} mins)</p>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase text-slate-500">Patient</span>
              <p className="text-xs font-semibold text-slate-800">{incomingEmergency.patientName}</p>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase text-slate-500">Phone</span>
              <p className="text-xs font-semibold text-slate-800">{incomingEmergency.patientPhone}</p>
            </div>
          </div>

          {incomingEmergency.description && (
            <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <strong className="text-slate-900">Clinical Symptoms: </strong>
              <span>{incomingEmergency.description}</span>
            </div>
          )}

          {/* Resources Readiness Confirmation */}
          <div className="border-t border-slate-100 pt-3">
            <h4 className="text-xs font-semibold text-slate-800 mb-2">Confirm Readiness If Accepting:</h4>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={offeredResources.erBay}
                  onChange={(e) => setOfferedResources({ ...offeredResources, erBay: e.target.checked })}
                  className="rounded text-brand-600 focus:ring-brand-500 accent-brand-600"
                />
                <span className="font-medium text-slate-700">ER Bay</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={offeredResources.icuBed}
                  onChange={(e) => setOfferedResources({ ...offeredResources, icuBed: e.target.checked })}
                  className="rounded text-brand-600 focus:ring-brand-500 accent-brand-600"
                />
                <span className="font-medium text-slate-700">ICU Bed</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={offeredResources.ventilator}
                  onChange={(e) => setOfferedResources({ ...offeredResources, ventilator: e.target.checked })}
                  className="rounded text-brand-600 focus:ring-brand-500 accent-brand-600"
                />
                <span className="font-medium text-slate-700">Ventilator</span>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 pt-2">
            <Button
              variant="presence"
              size="md"
              className="flex-1"
              icon={CheckCircle2}
              loading={submitting}
              onClick={() => handleRespond('ACCEPTED')}
            >
              ACCEPT & CAN RECEIVE
            </Button>

            <Button
              variant="outline"
              size="md"
              className="text-rose-600 hover:bg-rose-50"
              icon={XCircle}
              disabled={submitting}
              onClick={() => handleRespond('DECLINED')}
            >
              DECLINE
            </Button>
          </div>

          <p className="text-[10px] text-center text-slate-400">
            *Hospital bed reservation is only locked if the patient confirms this trauma center as final destination.
          </p>
        </div>

      </div>
    </div>
  );
};

export default EmergencyIncomingModal;
