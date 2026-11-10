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
      
      {/* Success Confirmation Card matching Screen 10 */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-emerald-500 shadow-xl text-center space-y-5">
        
        <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
          <ShieldCheck className="w-10 h-10 stroke-[2.5]" />
        </div>

        <div>
          <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-wider rounded-full">
            TEMPORARY RESOURCE RESERVED
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
            Destination Confirmed & Bed Held
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Emergency Request Code: <strong>{emergency?.requestCode}</strong>
          </p>
        </div>

        {/* Expiration Timer Card */}
        <div className="p-6 bg-slate-900 rounded-3xl text-white space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
            <span className="flex items-center space-x-1.5">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Reservation Hold Expiry Timer</span>
            </span>
            <span className="text-amber-400 font-mono font-bold">15:00 Hold Window</span>
          </div>

          <div className="text-4xl sm:text-5xl font-black tracking-tight font-mono text-emerald-400">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>

          <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-2.5 rounded-full transition-all duration-1000"
              style={{ width: `${timeProgressPercent}%` }}
            ></div>
          </div>

          <p className="text-[11px] text-slate-400">
            Your emergency bay will remain locked and held while you travel. If you do not arrive before expiry, the resource will automatically release.
          </p>
        </div>

        {/* Hospital Destination Details */}
        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-3">
          <div className="flex items-start space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold flex-shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{destination?.name || 'Selected Hospital'}</h3>
              <p className="text-xs text-slate-500 flex items-center mt-0.5">
                <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
                {destination?.address?.street}, {destination?.address?.city}
              </p>
              {destination?.emergencyContactPhone && (
                <p className="text-xs font-bold text-blue-600 flex items-center mt-1">
                  <Phone className="w-3.5 h-3.5 mr-1" />
                  Direct ER Hotline: {destination.emergencyContactPhone}
                </p>
              )}
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200/80 text-xs text-slate-700">
            <strong className="text-slate-900">Arrival Instructions: </strong>
            Follow ER ambulance bay signs. Present your Emergency Request Code at triage reception for instant priority admission.
          </div>
        </div>

        {/* Navigation Action CTA */}
        <div className="pt-2">
          <button
            onClick={handleStartEnRoute}
            disabled={enRouteLoading}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center space-x-2 active:scale-95"
          >
            <Navigation className="w-5 h-5" />
            <span>I AM EN ROUTE — START NAVIGATION</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

      </div>

    </div>
  );
};

