import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { LeafletMap, openGoogleMapsNavigation } from '../../components/common/LeafletMap';
import {
  getUserCurrentLocation,
  formatFacilityAddress,
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
  Radio,
  Share2,
  EyeOff,
  History,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Toast } from '../../components/ui/Toast';

export const EmergencyEnRoutePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { socket } = useSocket();

  const [emergency, setEmergency] = useState(null);
  const [journey, setJourney] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(15 * 60);
  const [toast, setToast] = useState({ type: '', message: '' });
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Live Location Sharing state (Module 12)
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [sharingStatusText, setSharingStatusText] = useState('Location sharing is off');
  const [liveAccuracy, setLiveAccuracy] = useState(null);
  const [lastTelemetryTime, setLastTelemetryTime] = useState(null);
  const [gpsError, setGpsError] = useState('');
  const locationWatchIdRef = useRef(null);
  const lastUpdateSentTimeRef = useRef(0);

  useEffect(() => {
    fetchEmergencyAndJourney();

    if (socket) {
      socket.emit('emergency:subscribe', { emergencyRequestId: id });
      socket.on('emergency:status_change', () => fetchEmergencyAndJourney(false));
      socket.on('emergency:arrival_verified', () => fetchEmergencyAndJourney(false));
      socket.on('emergency:journey_started', () => fetchEmergencyAndJourney(false));
    }

    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      clearInterval(timer);
      stopLocationSharingWatcher();
      if (socket) {
        socket.emit('emergency:unsubscribe', { emergencyRequestId: id });
        socket.off('emergency:status_change');
        socket.off('emergency:arrival_verified');
        socket.off('emergency:journey_started');
      }
    };
  }, [id, socket]);

  const fetchEmergencyAndJourney = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);

      const res = await api.get(`/emergency/${id}`);
      if (res.data.success) {
        const em = res.data.data.emergency;
        setEmergency(em);

        if (em.temporaryReservationExpiresAt) {
          const diffSec = Math.max(0, Math.floor((new Date(em.temporaryReservationExpiresAt) - new Date()) / 1000));
          setTimeLeftSeconds(diffSec);
        }
      }

      // Fetch journey
      try {
        const jRes = await api.get(`/emergency/requests/${id}/journey`);
        if (jRes.data.success) {
          setJourney(jRes.data.data);
          setIsSharingLocation(!!jRes.data.data.isSharingLocation);
        }
      } catch (err) {
        // Journey may not have started yet
      }
    } catch (err) {
      console.error('Error fetching emergency details', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // 1. Explicit Journey Start
  const handleStartJourney = async () => {
    try {
      setActionLoading(true);
      const res = await api.post(`/emergency/requests/${id}/journey/start`, {
        initialLocation: emergency?.location?.coordinates
          ? {
              latitude: emergency.location.coordinates[1],
              longitude: emergency.location.coordinates[0],
              address: emergency.address,
            }
          : null,
      });

      if (res.data.success) {
        setJourney(res.data.data.journey);
        fetchEmergencyAndJourney(false);
      }
    } catch (err) {
      setToast({ type: 'error', message: 'Unable to start journey: ' + (err.response?.data?.message || err.message) });
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Permission-Based Live GPS Sharing Toggle
  const handleToggleLocationSharing = async () => {
    if (isSharingLocation) {
      // User requested to stop sharing
      try {
        stopLocationSharingWatcher();
        await api.post(`/emergency/requests/${id}/journey/stop-sharing`);
        setIsSharingLocation(false);
        setSharingStatusText('Location sharing stopped');
      } catch (err) {
        console.warn('Error stopping location sharing:', err.message);
      }
    } else {
      // User requested to enable sharing
      if (!navigator.geolocation) {
        setGpsError('Geolocation is not supported by your browser.');
        return;
      }

      setGpsError('');
      setSharingStatusText('Requesting GPS permission...');

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy, speed, heading } = position.coords;
          setIsSharingLocation(true);
          setLiveAccuracy(Math.round(accuracy));
          setLastTelemetryTime(new Date().toLocaleTimeString());
          setSharingStatusText(`Sharing live telemetry (±${Math.round(accuracy)}m)`);

          try {
            await api.post(`/emergency/requests/${id}/journey/location`, {
              latitude,
              longitude,
              accuracyMeters: accuracy,
              speed,
              heading,
              isSharingLocation: true,
            });
            lastUpdateSentTimeRef.current = Date.now();
          } catch (err) {
            console.warn('Error sending initial location update:', err.message);
          }

          // Begin background interval update (throttled to 4 seconds)
          startLocationSharingWatcher();
        },
        (error) => {
          let msg = 'Failed to obtain GPS location.';
          if (error.code === 1) msg = 'Location permission was denied. You can continue navigation without live tracking.';
          if (error.code === 2) msg = 'Location unavailable. GPS signal could not be established.';
          if (error.code === 3) msg = 'Location request timed out.';
          setGpsError(msg);
          setIsSharingLocation(false);
          setSharingStatusText('Location sharing is off');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 }
      );
    }
  };

  const startLocationSharingWatcher = () => {
    if (locationWatchIdRef.current) return;

    locationWatchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const now = Date.now();
        // Rate limit: send at most once every 3.5 seconds
        if (now - lastUpdateSentTimeRef.current < 3500) return;

        const { latitude, longitude, accuracy, speed, heading } = pos.coords;
        setLiveAccuracy(Math.round(accuracy));
        setLastTelemetryTime(new Date().toLocaleTimeString());

        try {
          lastUpdateSentTimeRef.current = now;
          await api.post(`/emergency/requests/${id}/journey/location`, {
            latitude,
            longitude,
            accuracyMeters: accuracy,
            speed,
            heading,
            isSharingLocation: true,
          });
        } catch (e) {
          // Throttled or offline
        }
      },
      (err) => console.warn('Watch position error:', err.message),
      { enableHighAccuracy: true, maximumAge: 2000 }
    );
  };

  const stopLocationSharingWatcher = () => {
    if (locationWatchIdRef.current) {
      navigator.geolocation.clearWatch(locationWatchIdRef.current);
      locationWatchIdRef.current = null;
    }
  };

  // 3. Google Maps Deep-link Launch
  const handleLaunchGoogleMaps = () => {
    const destination = emergency?.selectedOrganizationId;
    const destCoords = destination?.location?.coordinates || destination?.operatingAddress?.coordinates;
    const destLat = destCoords ? destCoords[1] : 28.62;
    const destLng = destCoords ? destCoords[0] : 77.215;

    // Mandated URL format
    const mapsUrl = journey?.googleMapsUrl || `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`;
    window.open(mapsUrl, '_blank', 'noopener,noreferrer');
  };

  // 4. Patient Arrival Confirmation
  const handleConfirmArrival = async () => {
    const confirmPrompt = window.confirm(
      'Are you at the hospital reception/emergency intake desk? This will confirm your verified arrival.'
    );
    if (!confirmPrompt) return;

    try {
      setActionLoading(true);
      const res = await api.post(`/emergency/requests/${id}/journey/confirm-arrival`, {
        notes: 'Patient confirmed arrival at emergency desk.',
      });
      if (res.data.success) {
        stopLocationSharingWatcher();
        setIsSharingLocation(false);
        fetchEmergencyAndJourney(false);
      }
    } catch (err) {
      setToast({ type: 'error', message: 'Error confirming arrival: ' + (err.response?.data?.message || err.message) });
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenCancelModal = () => {
    setCancelReason('');
    setCancelModalOpen(true);
  };

  const handleConfirmCancelEmergency = async (e) => {
    if (e) e.preventDefault();
    try {
      setActionLoading(true);
      await api.post(`/emergency/${id}/cancel`, { reason: cancelReason || 'Cancelled by user en route' });
      setCancelModalOpen(false);
      setToast({ type: 'info', message: 'Emergency request has been cancelled.' });
      fetchEmergencyAndJourney(false);
    } catch (err) {
      setToast({ type: 'error', message: 'Error cancelling emergency: ' + (err.response?.data?.message || err.message) });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-4 p-12 text-center text-xs text-slate-400">
        <Clock className="w-8 h-8 text-brand-500 animate-spin mx-auto mb-2" />
        <p>Loading destination telemetry, active bed reservation, and journey status...</p>
      </div>
    );
  }

  const destination = emergency?.selectedOrganizationId;
  const userCoords = emergency?.location?.coordinates
    ? [emergency.location.coordinates[1], emergency.location.coordinates[0]]
    : [28.6139, 77.209];

  const destRawCoords = destination?.operatingAddress?.coordinates || destination?.location?.coordinates;
  const destCoords = destRawCoords
    ? [destRawCoords[1], destRawCoords[0]]
    : [28.62, 77.215];

  const minutes = Math.floor(timeLeftSeconds / 60);
  const seconds = timeLeftSeconds % 60;

  const statusSteps = [
    { key: 'CREATED', label: 'Beep Created' },
    { key: 'DESTINATION_SELECTED', label: 'Destination Selected' },
    { key: 'RESOURCES_RESERVED', label: 'Bed Reserved' },
    { key: 'PATIENT_EN_ROUTE', label: 'Patient En Route' },
    { key: 'ARRIVED', label: 'Arrived at ER' },
    { key: 'COMPLETED', label: 'Coordination Complete' },
  ];

  const currentStatus = emergency?.status || 'PATIENT_EN_ROUTE';
  const currentStepIdx = statusSteps.findIndex((s) => s.key === currentStatus);
  const activeStepIdx = currentStepIdx >= 0 ? currentStepIdx : 3;

  const fullAddress = formatFacilityAddress(destination);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* 1. Mandated Floating External Navigation Banner */}
      <div className="bg-[#0A1628] text-white rounded-xl p-4 sm:p-5 shadow-card border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center flex-shrink-0 text-blue-300">
            <Compass className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-400/20 text-blue-200 text-[10px] font-bold uppercase tracking-wider mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping"></span>
              Google Maps Turn-by-Turn Architecture
            </div>
            <p className="text-xs sm:text-sm font-semibold text-blue-100">
              Turn-by-turn driving navigation opens in Google Maps. Your hospital bed reservation stays active in this tab.
            </p>
          </div>
        </div>

        <button
          onClick={handleLaunchGoogleMaps}
          className="px-5 py-2.5 bg-white text-blue-950 font-black text-xs sm:text-sm rounded-lg shadow-xs hover:bg-blue-50 transition-all flex items-center justify-center space-x-2 flex-shrink-0 cursor-pointer"
        >
          <Navigation className="w-4 h-4 text-[#0B4F9C] fill-current" />
          <span>Launch Google Maps</span>
          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>

      {/* 2. Top Header & 15-Minute Reservation Countdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-white rounded-xl p-5 border border-slate-200 shadow-card flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="emergency" size="xs" dot pulseDot>
                {currentStatus.replace('_', ' ')}
              </Badge>
              <span className="text-[11px] font-mono font-bold text-slate-400">
                PASS: #{emergency?.requestCode || 'SHAP-ER'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {destination?.name || 'Selected Trauma Center'}
            </h1>
            <p className="text-xs text-slate-500">
              Patient: <strong>{emergency?.patientName}</strong> • Condition: <strong>{emergency?.emergencyType?.toUpperCase()}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {emergency?.status !== 'ARRIVED' && emergency?.status !== 'COMPLETED' && emergency?.status !== 'CANCELLED' && (
              <Button
                size="xs"
                variant="outline"
                className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                onClick={handleOpenCancelModal}
              >
                Cancel Alert
              </Button>
            )}
            <Link to={`/emergency/history`}>
              <Button size="xs" variant="ghost" icon={History}>
                History
              </Button>
            </Link>
          </div>
        </div>

        {/* 15-Minute Hold Timer */}
        <div className="bg-hold-600 rounded-xl p-5 text-white shadow-card flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-amber-100 text-[10px] font-bold uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5" />
              <span>Temporary Bed Hold</span>
            </div>
            <p className="text-xs text-amber-100 leading-tight">
              Hold expires in:
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
        <div className="flex items-center justify-between min-w-[620px]">
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

      {/* 4. Journey Controls & Location Sharing Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Journey Starter / Status Card */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Journey Status & Actions
            </span>
            <Badge variant={currentStatus === 'PATIENT_EN_ROUTE' ? 'primary' : 'neutral'} size="xs">
              {journey?.status || currentStatus}
            </Badge>
          </div>

          {currentStatus === 'RESOURCES_RESERVED' && (
            <Button
              variant="primary"
              size="md"
              className="w-full font-bold"
              onClick={handleStartJourney}
              loading={actionLoading}
              icon={ArrowRight}
            >
              Start Emergency Journey Now
            </Button>
          )}

          {currentStatus === 'PATIENT_EN_ROUTE' && (
            <div className="space-y-2">
              <Button
                variant="primary"
                size="md"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                onClick={handleConfirmArrival}
                loading={actionLoading}
                icon={CheckCircle2}
              >
                Confirm Arrival at Hospital Reception
              </Button>
              <p className="text-[11px] text-slate-500 text-center">
                Click upon arrival at hospital emergency desk to verify intake.
              </p>
            </div>
          )}

          {currentStatus === 'ARRIVED' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center space-y-1">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto" />
              <p className="text-xs font-bold text-emerald-900">Patient Verified Arrived</p>
              <p className="text-[11px] text-emerald-700">
                Staff is preparing the allocated trauma bay. Present code <strong>#{emergency?.requestCode}</strong>.
              </p>
            </div>
          )}

          {currentStatus === 'COMPLETED' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center space-y-1">
              <ShieldCheck className="w-5 h-5 text-blue-600 mx-auto" />
              <p className="text-xs font-bold text-blue-900">Coordination Completed</p>
              <p className="text-[11px] text-blue-700">
                Emergency platform coordination is complete. All timeline and allocation records are archived.
              </p>
            </div>
          )}
        </div>

        {/* Permission-Based Location Sharing Card */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Radio className={`w-3.5 h-3.5 ${isSharingLocation ? 'text-emerald-600 animate-pulse' : 'text-slate-400'}`} />
              Live Hospital Telemetry
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isSharingLocation ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
              {isSharingLocation ? 'SHARING LIVE' : 'DISABLED'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-slate-800">
                {isSharingLocation ? 'Transmitting GPS to receiving desk' : 'Optional live location sharing'}
              </p>
              <p className="text-[11px] text-slate-500">
                {sharingStatusText} {lastTelemetryTime ? `(${lastTelemetryTime})` : ''}
              </p>
            </div>

            <Button
              size="xs"
              variant={isSharingLocation ? 'outline' : 'secondary'}
              onClick={handleToggleLocationSharing}
              icon={isSharingLocation ? EyeOff : Share2}
            >
              {isSharingLocation ? 'Stop Sharing' : 'Share GPS'}
            </Button>
          </div>

          {gpsError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-[11px] text-rose-700 flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{gpsError}</span>
            </div>
          )}
        </div>
      </div>

      {/* 5. Map & Facility Dossier Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Leaflet Map Preview with Polyline (Col 7) */}
        <div className="lg:col-span-7 bg-white p-4 rounded-2xl border border-slate-200 shadow-card space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Route Preview & Distance
              </span>
            </div>
            {journey?.estimatedDistanceKm && (
              <span className="text-[11px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                ~{journey.estimatedDistanceKm} km • ~{journey.estimatedDurationMin} mins
              </span>
            )}
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
              Leaflet OSM Route
            </span>
          </div>
        </div>

        {/* Hospital Dossier & Primary Launch Card (Col 5) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Prominent High-Contrast Navigation Button */}
          <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-xl border border-slate-800 space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block">
              PRIMARY TURN-BY-TURN NAVIGATION
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
                  Confirmed Trauma Center
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
            {destination?.emergencyContactPhone || destination?.contactNumber || destination?.phone ? (
              <a
                href={`tel:${destination.emergencyContactPhone || destination.contactNumber || destination.phone}`}
                className="block"
              >
                <Button
                  variant="presence"
                  size="md"
                  className="w-full font-bold"
                  icon={Phone}
                >
                  Call Trauma Desk: {destination.emergencyContactPhone || destination.contactNumber || destination.phone}
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
          </div>
        </div>
      </div>

      {/* Cancellation Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-modal max-w-md w-full p-6 space-y-4 animate-scale-up">
            <h3 className="text-sm font-bold text-slate-900">Cancel Emergency Alert</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to cancel this emergency request? The destination hospital will release their reserved bed and physician standby.
            </p>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-700 block">Reason for cancellation</label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Condition stabilized, reached private clinic"
                className="w-full p-2.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCancelModalOpen(false)}
                disabled={actionLoading}
              >
                Keep Active
              </Button>
              <Button
                variant="emergency"
                size="sm"
                onClick={handleConfirmCancelEmergency}
                disabled={actionLoading}
              >
                Confirm Cancellation
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.message && (
        <Toast type={toast.type || 'info'} message={toast.message} onClose={() => setToast({ type: '', message: '' })} />
      )}
    </div>
  );
};

export default EmergencyEnRoutePage;
