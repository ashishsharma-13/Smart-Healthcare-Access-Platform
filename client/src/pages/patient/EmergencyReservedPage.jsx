import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
  ShieldCheck,
  Clock,
  Building2,
  MapPin,
  Phone,
  Navigation,
  AlertTriangle,
  ArrowRight,
  BedDouble,
  QrCode,
  CheckCircle2,
} from 'lucide-react';

export const EmergencyReservedPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [emergency, setEmergency] = useState(null);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(15 * 60); // 15 mins
  const [loading, setLoading] = useState(true);
  const [enRouteLoading, setEnRouteLoading] = useState(false);

  useEffect(() => {
    const fetchEmergency = async () => {
      try {
        const res = await api.get(`/emergency/${id}`);
        if (res.data.success) {
          setEmergency(res.data.data.emergency);
        }
      } catch (err) {
        console.error('Error fetching emergency', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEmergency();

    // 1-second countdown interval
    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [id]);

  const minutes = Math.floor(timeLeftSeconds / 60);
  const seconds = timeLeftSeconds % 60;
  const timeProgressPercent = ((timeLeftSeconds / (15 * 60)) * 100).toFixed(0);

  const handleStartEnRoute = async () => {
    try {
      setEnRouteLoading(true);
      await api.post(`/emergency/${id}/en-route`);
      navigate(`/emergency/tracking/${id}`);
    } catch (err) {
      console.error('Error marking en-route', err);
      navigate(`/emergency/tracking/${id}`);
    } finally {
      setEnRouteLoading(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading reservation status...</div>;
  }

  const destination = emergency?.selectedOrganizationId;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      
      {/* Top Amber Countdown Alert Banner (Screen 09 Montage) */}
      <div className="bg-amber-500 rounded-2xl p-4 text-white shadow-md flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <Clock className="w-5 h-5 animate-spin" />
          <div>
            <p className="text-xs font-black uppercase tracking-wider">Temporary Bed Hold Active</p>
            <p className="text-[11px] text-amber-100">Atomic hold automatically expires if arrival is not confirmed</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xl font-mono font-black">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </span>
          <span className="block text-[9px] uppercase font-bold text-amber-100">Remaining</span>
        </div>
      </div>

      {/* Main Reservation Digital Ticket Card (Screen 09 Montage) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl space-y-6 relative overflow-hidden">
        {/* Ticket Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-5">
          <div className="flex items-center space-x-3.5">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold shadow-xs">
              <ShieldCheck className="w-8 h-8 stroke-[2.5]" />
            </div>
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                Resource Temporarily Locked
              </span>
              <h1 className="text-xl font-black text-slate-900 mt-1">
                {destination?.name || 'Trauma Center'}
              </h1>
              <p className="text-xs text-slate-500 flex items-center mt-0.5">
                <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
                {destination?.address?.street}, {destination?.address?.city}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-bold text-slate-400 block uppercase">Token Code</span>
            <span className="text-base font-mono font-black text-blue-600">
              {emergency?.requestCode || 'SHAP-EMG-101'}
            </span>
          </div>
        </div>

        {/* Reserved Resource Details */}
        <div className="grid grid-cols-2 gap-3.5 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
          <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-xs">
            <p className="text-[10px] font-bold uppercase text-slate-400">Reserved Resource</p>
            <p className="text-xs font-black text-slate-900 mt-0.5 flex items-center text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              1x Emergency Bay (Held)
            </p>
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-xs">
            <p className="text-[10px] font-bold uppercase text-slate-400">Emergency Type</p>
            <p className="text-xs font-black text-red-600 uppercase mt-0.5">
              {emergency?.emergencyType || 'Cardiac'}
            </p>
          </div>
        </div>

        {/* Digital Pass QR & Gate Directions */}
        <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200/80 flex flex-col sm:flex-row items-center gap-5">
          {/* QR Code graphic */}
          <div className="w-28 h-28 bg-white p-2 rounded-2xl border border-blue-200 shadow-sm flex-shrink-0 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full text-slate-900 fill-current">
              {/* QR pattern representation */}
              <rect x="10" y="10" width="24" height="24" fill="#0F172A" />
              <rect x="14" y="14" width="16" height="16" fill="#FFFFFF" />
              <rect x="18" y="18" width="8" height="8" fill="#0F172A" />

              <rect x="66" y="10" width="24" height="24" fill="#0F172A" />
              <rect x="70" y="14" width="16" height="16" fill="#FFFFFF" />
              <rect x="74" y="18" width="8" height="8" fill="#0F172A" />

              <rect x="10" y="66" width="24" height="24" fill="#0F172A" />
              <rect x="14" y="70" width="16" height="16" fill="#FFFFFF" />
              <rect x="18" y="74" width="8" height="8" fill="#0F172A" />

              <rect x="42" y="15" width="8" height="8" fill="#2563EB" />
              <rect x="52" y="25" width="8" height="8" fill="#0F172A" />
              <rect x="42" y="38" width="16" height="8" fill="#0F172A" />
              <rect x="15" y="44" width="8" height="12" fill="#0F172A" />
              <rect x="42" y="55" width="10" height="10" fill="#2563EB" />
              <rect x="65" y="45" width="12" height="10" fill="#0F172A" />
              <rect x="58" y="68" width="10" height="10" fill="#0F172A" />
              <rect x="75" y="75" width="15" height="10" fill="#2563EB" />
            </svg>
          </div>

          <div className="space-y-1.5 text-center sm:text-left">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-white px-2 py-0.5 rounded-full border border-blue-200">
              Arrival Gate Instructions
            </span>
            <h4 className="text-sm font-bold text-slate-900">
              Proceed to Emergency Gate #2
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Show this QR pass to the ER triage nurse at the ambulance entrance for priority triage and immediate bay allocation.
            </p>
          </div>
        </div>

        {/* Contact and Start Navigation CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {destination?.emergencyContactPhone && (
            <a
              href={`tel:${destination.emergencyContactPhone}`}
              className="py-3.5 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors flex items-center justify-center space-x-2 border border-slate-200"
            >
              <Phone className="w-4 h-4 text-blue-600" />
              <span>Call ER Desk ({destination.emergencyContactPhone})</span>
            </a>
          )}

          <button
            onClick={handleStartEnRoute}
            disabled={enRouteLoading}
            className="flex-1 py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-md shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center space-x-2"
          >
            <Navigation className="w-4 h-4" />
            <span>{enRouteLoading ? 'Starting Navigation...' : 'Start En Route Navigation'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>

    </div>
  );
};
export default EmergencyReservedPage;
