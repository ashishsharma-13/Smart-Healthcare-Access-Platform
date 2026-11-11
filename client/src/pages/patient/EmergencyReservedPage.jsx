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
import { openGoogleMapsNavigation } from '../../components/common/LeafletMap';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';

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

    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [id]);

  const minutes = Math.floor(timeLeftSeconds / 60);
  const seconds = timeLeftSeconds % 60;

  const handleStartEnRoute = async () => {
    try {
      setEnRouteLoading(true);
      await api.post(`/emergency/${id}/en-route`);
      navigate(`/emergency/en-route/${id}`);
    } catch (err) {
      console.error('Error marking en-route', err);
      navigate(`/emergency/en-route/${id}`);
    } finally {
      setEnRouteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 p-8 text-center text-xs text-slate-400">
        Loading emergency pass...
      </div>
    );
  }

  const destination = emergency?.selectedOrganizationId;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      
      {/* Top Countdown Alert Banner */}
      <div className="bg-hold-600 rounded-xl p-4 text-white shadow-card flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Clock className="w-5 h-5 animate-spin" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider">Temporary 15-Minute Bed Hold Active</p>
            <p className="text-[11px] text-hold-100">Automatic release occurs if arrival is not registered before expiry</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xl font-mono font-bold">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </span>
          <span className="block text-[10px] uppercase font-medium text-hold-100">Remaining</span>
        </div>
      </div>

      {/* Main Reservation Pass */}
      <div className="bg-white rounded-xl p-6 sm:p-7 border border-slate-200 shadow-card space-y-5">
        
        {/* Pass Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-lg bg-presence-50 text-presence-700 border border-presence-200 flex items-center justify-center font-bold flex-shrink-0">
              <ShieldCheck className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <Badge variant="presence" size="xs">
                Resource Temporarily Reserved
              </Badge>
              <h1 className="text-lg font-bold text-slate-900 mt-1 leading-snug">
                {destination?.name || 'Trauma Center'}
              </h1>
              <p className="text-xs text-slate-500 flex items-center mt-0.5">
                <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
                <span>
                  {destination?.operatingAddress?.streetName
                    ? `${destination.operatingAddress.buildingNumber ? destination.operatingAddress.buildingNumber + ', ' : ''}${destination.operatingAddress.streetName}, ${destination.operatingAddress.city}`
                    : `${destination?.address?.street || ''}, ${destination?.address?.city || ''}`}
                </span>
              </p>
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <span className="text-[10px] font-semibold text-slate-400 block uppercase">Pass Code</span>
            <span className="text-sm font-mono font-bold text-brand-700">
              {emergency?.requestCode || 'SHAP-EMG-101'}
            </span>
          </div>
        </div>

        {/* Reserved Resource Details */}
        <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-lg border border-slate-200">
          <div className="p-2.5 bg-white rounded-md border border-slate-100">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Locked Resource</p>
            <p className="text-xs font-bold text-presence-700 mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>1x Emergency Bay (Held)</span>
            </p>
          </div>
          <div className="p-2.5 bg-white rounded-md border border-slate-100">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Emergency Protocol</p>
            <p className="text-xs font-bold text-urgent-700 uppercase mt-0.5">
              {emergency?.emergencyType || 'Cardiac'}
            </p>
          </div>
        </div>

        {/* Digital Pass QR & Gate Directions */}
        <div className="p-4 bg-brand-50/60 rounded-lg border border-brand-200/80 flex flex-col sm:flex-row items-center gap-4">
          <div className="w-24 h-24 bg-white p-2 rounded-lg border border-brand-200 shadow-xs flex-shrink-0 flex items-center justify-center">
            <QrCode className="w-20 h-20 text-slate-900" />
          </div>

          <div className="space-y-1 text-xs text-slate-700 text-center sm:text-left">
            <h4 className="font-bold text-slate-900">Hospital Arrival Instructions</h4>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Proceed directly to <strong>Emergency Gate #2 / Trauma Bay Reception</strong>. Present this pass token to triage desk staff for immediate fast-track admission.
            </p>
            {destination?.emergencyContactPhone && (
              <p className="pt-1 text-slate-800 font-semibold flex items-center justify-center sm:justify-start gap-1">
                <Phone className="w-3.5 h-3.5 text-brand-600" />
                <span>Direct Hospital Hotline: {destination.emergencyContactPhone}</span>
              </p>
            )}
          </div>
        </div>

        {/* Primary Action: En-Route Navigation */}
        <Button
          variant="primary"
          size="lg"
          loading={enRouteLoading}
          className="w-full"
          icon={Navigation}
          onClick={handleStartEnRoute}
        >
          {enRouteLoading ? 'Updating Telemetry...' : 'MARK EN ROUTE & OPEN LIVE MAP NAVIGATION'}
        </Button>

      </div>

    </div>
  );
};

export default EmergencyReservedPage;
