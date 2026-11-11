import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { LeafletMap, openGoogleMapsNavigation } from '../../components/common/LeafletMap';
import {
  getUserCurrentLocation,
  formatFacilityAddress,
  getFacilityCoordinates,
} from '../../utils/geoUtils';
import {
  Navigation,
  MapPin,
  Building2,
  CheckCircle2,
  Phone,
  AlertTriangle,
  Clock,
  ShieldCheck,
  ExternalLink,
  Compass,
  ArrowRight,
  ShieldAlert,
  Ambulance,
  HeartPulse,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

export const EmergencyEnRoutePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { socket } = useSocket();

  const [emergency, setEmergency] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(15 * 60); // 15-minute temporary reservation
  const [enRouteTriggered, setEnRouteTriggered] = useState(false);

  useEffect(() => {
    fetchEmergency();

    if (socket) {
      socket.emit('emergency:subscribe', { emergencyRequestId: id });
      socket.on('emergency:status_change', () => fetchEmergency());
    }

    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      clearInterval(timer);
      if (socket) {
        socket.emit('emergency:unsubscribe', { emergencyRequestId: id });
        socket.off('emergency:status_change');
      }
    };
  }, [id, socket]);

  const fetchEmergency = async () => {
    try {
      const res = await api.get(`/emergency/${id}`);
      if (res.data.success) {
        const em = res.data.data.emergency;
        setEmergency(em);
        
        // Calculate remaining hold time if expiration is set
        if (em.temporaryReservationExpiresAt) {
          const diffSec = Math.max(0, Math.floor((new Date(em.temporaryReservationExpiresAt) - new Date()) / 1000));
          setTimeLeftSeconds(diffSec);
        }

        // If not yet marked en-route, mark it
        if (em.status === 'DESTINATION_SELECTED' || em.status === 'RESOURCES_RESERVED') {
          markEnRouteSilently();
        }
      }
    } catch (err) {
      console.error('Error fetching emergency details', err);
    } finally {
      setLoading(false);
    }
  };

  const markEnRouteSilently = async () => {
    if (enRouteTriggered) return;
    try {
      setEnRouteTriggered(true);
      await api.post(`/emergency/${id}/en-route`);
    } catch (err) {
      console.warn('Silently marking en-route note:', err.message);
    }
  };

  const handleLaunchGoogleMaps = () => {
    const destination = emergency?.selectedOrganizationId;
    
    // Ensure en-route status is saved on backend
    markEnRouteSilently();

    // Architectural Mandate: Deep-link launch to external Google Maps with accurate coordinates & GPS origin
    openGoogleMapsNavigation(destination, null, userCoords);
  };

  const handleCancelEmergency = async () => {
    const reason = prompt('Please specify cancellation reason:');
    if (!reason) return;

    try {
      await api.post(`/emergency/${id}/cancel`, { reason });
      fetchEmergency();
    } catch (err) {
      alert('Error cancelling emergency: ' + (err.response?.data?.message || err.message));
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-4 p-12 text-center text-xs text-slate-400">
        <Clock className="w-8 h-8 text-brand-500 animate-spin mx-auto mb-2" />
        <p>Loading destination telemetry and active reservation pass...</p>
      </div>
    );
  }

  const destination = emergency?.selectedOrganizationId;
  const userCoords = emergency?.location?.coordinates
    ? [emergency.location.coordinates[1], emergency.location.coordinates[0]]
    : [28.6139, 77.2090];

  const destRawCoords = destination?.operatingAddress?.coordinates || destination?.location?.coordinates;
  const destCoords = destRawCoords
    ? [destRawCoords[1], destRawCoords[0]]
    : [28.6200, 77.2150];

  const minutes = Math.floor(timeLeftSeconds / 60);
  const seconds = timeLeftSeconds % 60;

  const statusSteps = [
    { key: 'CREATED', label: 'Beep Created' },
    { key: 'DESTINATION_SELECTED', label: 'Destination Locked' },
    { key: 'RESOURCES_RESERVED', label: 'Bay Reserved' },
    { key: 'PATIENT_EN_ROUTE', label: 'Patient En Route' },
    { key: 'ARRIVED', label: 'Arrived at ER' },
  ];

  const currentStatus = emergency?.status || 'PATIENT_EN_ROUTE';
  const currentStepIdx = statusSteps.findIndex((s) => s.key === currentStatus);
  const activeStepIdx = currentStepIdx >= 0 ? currentStepIdx : 3;

  const fullAddress = formatFacilityAddress(destination);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      
      {/* 1. Mandatory Floating Banner Note */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl p-4 sm:p-5 shadow-xl border border-blue-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center flex-shrink-0 text-blue-300">
            <Compass className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-400/20 text-blue-200 text-[10px] font-bold uppercase tracking-wider mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping"></span>
              Google Maps Turn-by-Turn Architecture
            </div>
            <p className="text-xs sm:text-sm font-semibold text-blue-100">
              Turn-by-turn navigation will open in Google Maps. Your live hospital reservation stays active in this tab.
            </p>
          </div>
        </div>

        <button
          onClick={handleLaunchGoogleMaps}
          className="px-5 py-2.5 bg-white text-blue-950 font-black text-xs sm:text-sm rounded-xl shadow-lg hover:bg-blue-50 hover:scale-105 transition-all flex items-center justify-center space-x-2 flex-shrink-0 cursor-pointer"
        >
          <Navigation className="w-4 h-4 text-blue-600 fill-current" />
          <span>Launch Google Maps</span>
          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>

      {/* 2. Top Header & 15-Minute Reservation Countdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-white rounded-2xl p-5 border border-slate-200 shadow-card flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="emergency" size="xs" dot pulseDot>
                Live Destination Locked
              </Badge>
              <span className="text-[11px] font-mono font-bold text-slate-400">
                PASS: #{emergency?.requestCode || 'SHAP-ER'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              En Route to {destination?.name || 'Selected Trauma Center'}
            </h1>
            <p className="text-xs text-slate-500">
              {emergency?.patientName} • Condition: <strong>{emergency?.emergencyType?.toUpperCase()}</strong>
            </p>
          </div>

          {emergency?.status !== 'ARRIVED' && emergency?.status !== 'CANCELLED' && (
            <Button
              size="xs"
              variant="outline"
              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 flex-shrink-0"
              onClick={handleCancelEmergency}
            >
              Cancel Alert
            </Button>
          )}
        </div>

        {/* 15-Minute Hold Timer */}
        <div className="bg-amber-500 rounded-2xl p-5 text-white shadow-card flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-amber-100 text-[10px] font-bold uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5" />
              <span>Temporary Bed Hold</span>
            </div>
            <p className="text-xs text-amber-100 leading-tight">
              Arrive before hold expires to keep prioritized ER intake
            </p>
          </div>
          <div className="text-right flex-shrink-0 pl-3">
            <span className="text-2xl font-mono font-black tracking-tight">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
            <span className="block text-[9px] uppercase font-bold text-amber-200 tracking-wider">
              Time Left
            </span>
          </div>
        </div>
      </div>

      {/* 3. Progress Stepper */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-card overflow-x-auto">
        <div className="flex items-center justify-between min-w-[550px]">
          {statusSteps.map((step, idx) => {
            const isCompleted = activeStepIdx > idx;
            const isCurrent = activeStepIdx === idx;
            return (
              <div key={step.key} className="flex-1 flex items-center">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isCompleted
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : isCurrent
                        ? 'bg-blue-600 text-white ring-4 ring-blue-100 animate-pulse'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                  </div>
                  <span
                    className={`text-[10px] font-bold mt-1 text-center tracking-tight ${
                      isCompleted ? 'text-emerald-700' : isCurrent ? 'text-blue-700' : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < statusSteps.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 -mt-3.5 transition-all ${
                      activeStepIdx > idx ? 'bg-emerald-500' : 'bg-slate-200'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Map & Facility Dossier Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Leaflet Map Preview with Polyline (Col 7) */}
        <div className="lg:col-span-7 bg-white p-4 rounded-2xl border border-slate-200 shadow-card space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Direct Route Telemetry Preview
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Leaflet OSM In-App Preview
            </span>
          </div>

          <LeafletMap
            center={destCoords}
            zoom={13}
            userLocation={userCoords}
            destinationLocation={destCoords}
            hospitals={[
              {
                _id: destination?._id,
                name: destination?.name,
                coordinates: destRawCoords,
                operatingAddress: destination?.operatingAddress,
                address: destination?.address,
                isDestination: true,
                isVerified: true,
                isPartner: true,
              },
            ]}
            polylineColor="#DC2626"
            className="h-96 w-full rounded-xl"
          />

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              Your Location
              <span className="text-slate-400 mx-1">➔</span>
              <span className="w-2.5 h-2.5 rounded-sm bg-red-600"></span>
              {destination?.name}
            </span>
            <span className="font-bold text-slate-800">
              Direct In-App Polyline View
            </span>
          </div>
        </div>

        {/* Hospital Dossier & Primary Launch Card (Col 5) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Prominent High-Contrast Navigation Button */}
          <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-xl border border-slate-800 space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block">
              PRIMARY TURN-BY-TURN ACTION
            </span>
            <button
              onClick={handleLaunchGoogleMaps}
              className="w-full py-4 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-black text-sm tracking-wide shadow-lg shadow-blue-500/30 transition-all hover:scale-[1.02] flex items-center justify-center space-x-2.5 cursor-pointer"
            >
              <Navigation className="w-5 h-5 fill-current" />
              <span>Navigate with Google Maps</span>
              <ExternalLink className="w-4 h-4 opacity-80" />
            </button>
            <p className="text-[11px] text-slate-400 text-center leading-relaxed">
              Launches native Google Maps GPS driving navigation with live traffic and ETA.
            </p>
          </div>

          {/* Hospital Dossier Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-card space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Confirmed Facility Dossier
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-0.5">
                  {destination?.name}
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                Verified SHAP Partner
              </span>
            </div>

            {/* Operating Physical Address */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Physical Operating Address
              </span>
              <p className="text-xs text-slate-700 font-medium flex items-start">
                <MapPin className="w-4 h-4 text-red-600 mr-1.5 flex-shrink-0 mt-0.5" />
                <span>{fullAddress || 'Operating clinical premises'}</span>
              </p>
            </div>

            {/* Resource Standby Status */}
            <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200/80 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Trauma Bay & Critical Team Standby</span>
              </div>
              <p className="text-[11px] text-emerald-700">
                The receiving medical center has been notified of your inbound status.
              </p>
            </div>

            {/* Direct Hotline Call Button */}
            {destination?.emergencyContactPhone || destination?.phone ? (
              <a
                href={`tel:${destination.emergencyContactPhone || destination.phone}`}
                className="block"
              >
                <Button
                  variant="presence"
                  size="md"
                  className="w-full font-bold"
                  icon={Phone}
                >
                  Call Trauma Desk: {destination.emergencyContactPhone || destination.phone}
                </Button>
              </a>
            ) : null}

            {/* Patient Credentials */}
            <div className="pt-3 border-t border-slate-100 text-xs space-y-1 text-slate-500">
              <div className="flex justify-between">
                <span>Patient Name:</span>
                <span className="font-bold text-slate-800">{emergency?.patientName}</span>
              </div>
              <div className="flex justify-between">
                <span>Verification Pass Code:</span>
                <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                  {emergency?.requestCode}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Triage Category:</span>
                <span className="font-bold text-red-700 uppercase">{emergency?.emergencyType}</span>
              </div>
            </div>

            {/* Arrived Confirmation Indicator */}
            {emergency?.status === 'ARRIVED' && (
              <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-xl text-center space-y-1">
                <CheckCircle2 className="w-7 h-7 text-emerald-600 mx-auto" />
                <h4 className="text-xs font-bold text-emerald-900">Arrived at Reception</h4>
                <p className="text-[11px] text-emerald-700">
                  Welcome. Present pass code <strong>{emergency?.requestCode}</strong> at emergency intake.
                </p>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};

export default EmergencyEnRoutePage;
