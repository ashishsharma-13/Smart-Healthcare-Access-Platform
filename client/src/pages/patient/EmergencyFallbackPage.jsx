import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { LeafletMap } from '../../components/common/LeafletMap';
import {
  getUserCurrentLocation,
  formatFacilityAddress,
} from '../../utils/geoUtils';
import {
  ShieldAlert,
  AlertOctagon,
  PhoneCall,
  Phone,
  Navigation,
  MapPin,
  Building2,
  ExternalLink,
  Clock,
  Compass,
  ArrowLeft,
  Ambulance,
  HeartHandshake,
  Activity,
  AlertTriangle,
  LocateFixed,
  RefreshCw,
  Search,
  CheckCircle2,
  Sparkles,
  Info,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

// Baseline Public Trauma Centers for offline/initial state
const BASELINE_FACILITIES = [
  {
    _id: 'ext_aiims_trauma',
    externalFacilityId: 'EXT-FAC-AIIMS-TRAUMA',
    facilityName: 'AIIMS Apex Trauma Center (JPNATC)',
    name: 'AIIMS Apex Trauma Center (JPNATC)',
    facilityType: 'Apex Level-1 Public Trauma Center',
    specialties: ['Level-1 Polytrauma', 'Neurosurgery', 'Orthopedic Surgery', 'Emergency Resuscitation'],
    coordinates: [77.1950, 28.5672],
    latitude: 28.5672,
    longitude: 77.1950,
    address: 'Ring Road, Raj Nagar, Safdarjung Enclave, New Delhi 110029',
    operatingAddress: {
      buildingNumber: 'JPNATC Complex',
      streetName: 'Ring Road, Raj Nagar, Safdarjung Enclave',
      area: 'South Delhi',
      city: 'New Delhi',
      pinCode: '110029',
      location: { type: 'Point', coordinates: [77.1950, 28.5672] },
    },
    emergencyContactPhone: '01126731000',
    displayPhone: '011-26731000',
    distanceKm: 2.4,
    estimatedTravelMinutes: 7,
    isPartner: false,
    liveAvailabilityConfirmed: false,
    availabilityConfirmation: 'UNCONFIRMED_EXTERNAL',
  },
  {
    _id: 'ext_safdarjung',
    externalFacilityId: 'EXT-FAC-SAFDARJUNG',
    facilityName: 'Safdarjung Hospital Emergency & Burn Block',
    name: 'Safdarjung Hospital Emergency & Burn Block',
    facilityType: 'Central Government Multi-Speciality Trauma Block',
    specialties: ['24/7 Burn ICU', 'Emergency Surgery', 'Cardiac Resuscitation', 'Toxicology'],
    coordinates: [77.2075, 28.5705],
    latitude: 28.5705,
    longitude: 77.2075,
    address: 'Ansari Nagar West, Ring Road, New Delhi 110029',
    operatingAddress: {
      buildingNumber: 'Emergency Block',
      streetName: 'Ansari Nagar West, Ring Road',
      area: 'South Delhi',
      city: 'New Delhi',
      pinCode: '110029',
      location: { type: 'Point', coordinates: [77.2075, 28.5705] },
    },
    emergencyContactPhone: '01126707444',
    displayPhone: '011-26707444',
    distanceKm: 3.1,
    estimatedTravelMinutes: 9,
    isPartner: false,
    liveAvailabilityConfirmed: false,
    availabilityConfirmation: 'UNCONFIRMED_EXTERNAL',
  },
  {
    _id: 'ext_rml',
    externalFacilityId: 'EXT-FAC-RML',
    facilityName: 'Dr. Ram Manohar Lohia (RML) Hospital Emergency',
    name: 'Dr. Ram Manohar Lohia (RML) Hospital Emergency',
    facilityType: 'Central Govt Tertiary Trauma & Cardiac Center',
    specialties: ['Acute Cardiac Care', 'Trauma Bay', 'Stroke Unit', 'Toxicology'],
    coordinates: [77.2014, 28.6253],
    latitude: 28.6253,
    longitude: 77.2014,
    address: 'Baba Kharak Singh Marg, Connaught Place, New Delhi 110001',
    operatingAddress: {
      buildingNumber: 'Casualty & Trauma Dept',
      streetName: 'Baba Kharak Singh Marg',
      area: 'Connaught Place',
      city: 'New Delhi',
      pinCode: '110001',
      location: { type: 'Point', coordinates: [77.2014, 28.6253] },
    },
    emergencyContactPhone: '01123365525',
    displayPhone: '011-23365525',
    distanceKm: 4.8,
    estimatedTravelMinutes: 12,
    isPartner: false,
    liveAvailabilityConfirmed: false,
    availabilityConfirmation: 'UNCONFIRMED_EXTERNAL',
  },
];

export const EmergencyFallbackPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get('requestId') || searchParams.get('id');

  // Location state
  const [userLocation, setUserLocation] = useState({ lat: 28.6139, lng: 77.2090 });
  const [userAddress, setUserAddress] = useState('Detecting current location...');
  const [locating, setLocating] = useState(false);

  // Backend Fallback & Recovery State
  const [loading, setLoading] = useState(false);
  const [expanding, setExpanding] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [fallbackData, setFallbackData] = useState(null);
  const [recoveryData, setRecoveryData] = useState(null);
  const [externalFacilities, setExternalFacilities] = useState(BASELINE_FACILITIES);
  const [acceptedParticipating, setAcceptedParticipating] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState(BASELINE_FACILITIES[0]);

  // Confirmation Disclaimer Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [facilityToConfirm, setFacilityToConfirm] = useState(null);
  const [confirmingSelection, setConfirmingSelection] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    initUserLocation();
    if (requestId) {
      loadFallbackData();
    }
  }, [requestId]);

  const initUserLocation = async (refresh = false) => {
    try {
      setLocating(true);
      const loc = await getUserCurrentLocation(refresh);
      setUserLocation({ lat: loc.lat, lng: loc.lng });
      setUserAddress(loc.address);
    } catch (err) {
      console.warn('Location detection note:', err);
    } finally {
      setLocating(false);
    }
  };

  const loadFallbackData = async () => {
    if (!requestId) return;
    try {
      setLoading(true);
      // Fetch fallback options
      const optRes = await api.get(`/emergency/requests/${requestId}/fallback-options`);
      if (optRes.data.success) {
        setFallbackData(optRes.data);
        const options = optRes.data.options || [];
        const accepted = options.filter((o) => o.optionType === 'PARTICIPATING_ORGANIZATION');
        const ext = options.filter((o) => o.optionType === 'EXTERNAL_FACILITY');

        setAcceptedParticipating(accepted);
        if (ext.length > 0) {
          setExternalFacilities(ext);
          setSelectedFacility(ext[0]);
        }
      }

      // Fetch recovery status
      const recRes = await api.get(`/emergency/requests/${requestId}/recovery-status`);
      if (recRes.data.success) {
        setRecoveryData(recRes.data);
      }
    } catch (err) {
      console.warn('Fallback data loading notice:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExpandSearch = async () => {
    if (!requestId) return;
    try {
      setExpanding(true);
      setFeedback(null);
      const res = await api.post(`/internal/emergency-fallback/${requestId}/expand-search`);
      if (res.data.success) {
        setFeedback({
          type: 'success',
          message: res.data.message || 'Search radius successfully expanded.',
        });
        await loadFallbackData();
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to expand search radius',
      });
    } finally {
      setExpanding(false);
    }
  };

  const handleRetryMatching = async () => {
    if (!requestId) return;
    try {
      setRetrying(true);
      setFeedback(null);
      const res = await api.post(`/emergency/requests/${requestId}/retry-matching`);
      if (res.data.success) {
        setFeedback({
          type: 'success',
          message: 'Matching restarted. Discovering nearby emergency centers.',
        });
        await loadFallbackData();
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to restart matching',
      });
    } finally {
      setRetrying(false);
    }
  };

  const handleSelectExternalFacility = (fac) => {
    setFacilityToConfirm(fac);
    setShowConfirmModal(true);
  };

  const confirmExternalSelection = async () => {
    if (!facilityToConfirm || !requestId) {
      setShowConfirmModal(false);
      handleOpenGoogleMaps(facilityToConfirm || selectedFacility);
      return;
    }
    try {
      setConfirmingSelection(true);
      const targetId = facilityToConfirm.externalFacilityId || facilityToConfirm._id;
      const res = await api.post(`/emergency/requests/${requestId}/select-external-facility`, {
        externalFacilityId: targetId,
      });

      setShowConfirmModal(false);
      if (res.data.success) {
        setFeedback({
          type: 'success',
          message: `Destination confirmed: ${facilityToConfirm.name || facilityToConfirm.facilityName}. Opening turn-by-turn navigation.`,
        });
        handleOpenGoogleMaps(facilityToConfirm);
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Selection error',
      });
      setShowConfirmModal(false);
      handleOpenGoogleMaps(facilityToConfirm);
    } finally {
      setConfirmingSelection(false);
    }
  };

  const handleSwitchToParticipating = async (org) => {
    if (!requestId) return;
    try {
      setLoading(true);
      const res = await api.post(`/emergency/requests/${requestId}/change-destination`, {
        newOrganizationId: org.id || org._id,
        reason: 'Patient recovered to alternative accepted hospital',
      });
      if (res.data.success) {
        navigate(`/emergency/tracking/${requestId}`);
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to switch hospital',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenGoogleMaps = (facility) => {
    const destCoords =
      facility.coordinates ||
      facility.location?.coordinates ||
      facility.operatingAddress?.location?.coordinates;
    const destLat = destCoords ? destCoords[1] : facility.latitude;
    const destLng = destCoords ? destCoords[0] : facility.longitude;

    const originParam =
      userLocation?.lat && userLocation?.lng
        ? `&origin=${userLocation.lat},${userLocation.lng}`
        : '';

    const destination =
      destLat && destLng
        ? `${destLat},${destLng}`
        : encodeURIComponent(facility.operatingAddress?.streetName || facility.address || facility.name);

    const url = `https://www.google.com/maps/dir/?api=1${originParam}&destination=${destination}&travelmode=driving`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const searchLevel = fallbackData?.currentSearchLevel || fallbackData?.fallbackSession?.currentSearchLevel || 1;
  const radiusKm = fallbackData?.fallbackSession?.currentSearchRadiusKm || (searchLevel === 1 ? 5 : searchLevel === 2 ? 10 : searchLevel === 3 ? 20 : searchLevel === 4 ? 40 : 80);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 font-sans">
      
      {/* Top Navigation Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors self-start cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          <span>Back to Emergency Triage</span>
        </button>

        {/* Live Detected User Location Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100/90 border border-slate-200/80 text-xs text-slate-700 shadow-xs">
          <LocateFixed className={`w-3.5 h-3.5 text-blue-600 ${locating ? 'animate-spin' : ''}`} />
          <span className="font-semibold text-slate-500">Your Location:</span>
          <span className="font-bold text-slate-900 truncate max-w-[240px] sm:max-w-xs">{userAddress}</span>
          <button
            onClick={() => initUserLocation(true)}
            className="text-[10px] uppercase font-bold text-blue-600 hover:text-blue-800 ml-1 underline cursor-pointer"
          >
            Update
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-slate-500 hover:text-slate-800 ml-3">✕</button>
        </div>
      )}

      {/* Destination Recovery Alert (If recovery session active) */}
      {recoveryData?.hasActiveRecovery && (
        <div className="bg-amber-500/15 border-2 border-amber-500/30 rounded-2xl p-5 text-amber-950 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-amber-800 font-bold uppercase text-xs tracking-wider">
            <AlertOctagon className="w-4 h-4 animate-pulse text-amber-600" />
            <span>Destination Recovery Mode Active</span>
          </div>
          <h2 className="text-base font-bold tracking-tight text-amber-950">
            Hospital Confirmation or Capacity Hold Could Not Be Completed
          </h2>
          <p className="text-xs text-amber-800 font-medium">
            Reason: {recoveryData.session?.recoveryNotes || recoveryData.session?.triggerReason || 'Selected hospital could not reserve immediate capacity'}.
            Alternative accepted partner hospitals or major public trauma centers are available below.
          </p>
        </div>
      )}

      {/* 1. Redesigned Emergency Alert Banner: Frosted Glass Container */}
      <div className="bg-red-500/10 border border-red-500/20 backdrop-blur-md rounded-2xl p-6 text-slate-800 dark:text-red-100 shadow-sm relative overflow-hidden">
        <div className="relative z-10 space-y-2.5 max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="bg-red-600 text-white rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-1.5 shadow-xs">
              <AlertOctagon className="w-3.5 h-3.5 text-white animate-pulse" />
              <span>Emergency Fallback & Search Expansion</span>
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white leading-snug">
            {acceptedParticipating.length > 0
              ? 'Alternative Emergency Facilities Available'
              : 'No Verified SHAP Partners In Immediate Range. Showing External Public / Government Centers.'}
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-red-200 leading-relaxed font-medium">
            Immediate patient safety takes priority over private platform reservation. Direct turn-by-turn navigation and direct phone helplines for major tertiary government trauma institutions are provided below.
          </p>
        </div>

        {/* Decorative graphic backdrop */}
        <div className="absolute -right-6 -bottom-8 opacity-10 pointer-events-none">
          <ShieldAlert className="w-56 h-56 text-red-600" />
        </div>
      </div>

      {/* Search Expansion Controls Card */}
      {requestId && (
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Geographic Search Expansion Tiers</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                  Level {searchLevel} of 5 ({radiusKm} km)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Expand radius to query verified participating hospitals across wider regional boundaries.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <Button
                size="sm"
                variant="outline"
                onClick={handleRetryMatching}
                disabled={retrying}
                icon={RefreshCw}
                className={retrying ? 'animate-spin' : ''}
              >
                Restart Matching
              </Button>
              {searchLevel < 5 && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleExpandSearch}
                  disabled={expanding}
                  icon={Search}
                >
                  {expanding ? 'Expanding Search...' : `Expand to Level ${searchLevel + 1}`}
                </Button>
              )}
            </div>
          </div>

          {/* Tier Step Indicators */}
          <div className="grid grid-cols-5 gap-2 pt-1">
            {[
              { lvl: 1, dist: '5 km' },
              { lvl: 2, dist: '10 km' },
              { lvl: 3, dist: '20 km' },
              { lvl: 4, dist: '40 km' },
              { lvl: 5, dist: '80 km' },
            ].map((tier) => {
              const isPast = tier.lvl < searchLevel;
              const isCurrent = tier.lvl === searchLevel;
              return (
                <div
                  key={tier.lvl}
                  className={`p-2 rounded-xl text-center border text-[11px] font-bold transition-all ${
                    isCurrent
                      ? 'bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-500/20'
                      : isPast
                      ? 'bg-slate-100 border-slate-200 text-slate-600'
                      : 'bg-white border-slate-100 text-slate-400'
                  }`}
                >
                  <span className="block text-[10px] uppercase font-semibold">Tier {tier.lvl}</span>
                  <span>{tier.dist}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Alternative Accepted Participating Hospitals (if any exist) */}
      {acceptedParticipating.length > 0 && (
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-emerald-800">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold">Alternative Accepted Participating Hospitals</h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-900">
              Live Bed Hold Supported
            </span>
          </div>
          <p className="text-xs text-emerald-700">
            These participating facilities responded ACCEPT to your Emergency Beep and are ready to secure a bed reservation immediately:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {acceptedParticipating.map((org) => (
              <div
                key={org.id || org._id}
                className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 truncate">{org.name}</h4>
                  <p className="text-[11px] text-slate-500 truncate">{org.address?.streetName || org.address || 'Address on file'}</p>
                  <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">
                    {org.distanceKm} km (~{org.estimatedTravelMinutes} mins)
                  </span>
                </div>
                <button
                  onClick={() => handleSwitchToParticipating(org)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex-shrink-0 shadow-xs transition-colors cursor-pointer"
                >
                  Switch & Reserve
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Redesigned Clinical Safety Notice: Soft Amber Glass Callout */}
      <div className="bg-amber-500/10 border border-amber-500/20 backdrop-blur-md rounded-xl p-4 text-amber-900 dark:text-amber-200 flex items-start gap-3.5 shadow-xs">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-amber-950 dark:text-amber-100">
            Mandatory Emergency Care Disclaimer
          </h2>
          <p className="text-xs sm:text-sm font-bold text-amber-950 dark:text-amber-100 leading-relaxed">
            Live bed/specialist availability cannot be verified for external facilities. Dispatching call to Emergency Services (112/108).
          </p>
          <p className="text-xs text-amber-800 dark:text-amber-300/90 leading-relaxed">
            Public trauma centers accept emergency cases under statutory mandates. However, pre-arrival bed holds and specialist reservation locks are not supported for non-partner hospitals.
          </p>
        </div>
      </div>

      {/* 3. Helpline Action Cards (108, 112, 102) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: 108 Ambulance */}
        <a
          href="tel:108"
          className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group flex items-center justify-between"
        >
          <div className="space-y-1">
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200/60 dark:border-red-900/50">
              Trauma Ambulance
            </span>
            <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white group-hover:text-red-600 transition-colors">
              108
            </p>
            <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">
              National Emergency Medical Services
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/40 flex items-center justify-center flex-shrink-0 group-hover:bg-red-600 group-hover:text-white transition-all">
            <Ambulance className="w-6 h-6" />
          </div>
        </a>

        {/* Card 2: 112 Unified Emergency */}
        <a
          href="tel:112"
          className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group flex items-center justify-between"
        >
          <div className="space-y-1">
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              Unified Disaster Desk
            </span>
            <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
              112
            </p>
            <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">
              Police, Fire & Disaster Helpline
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center flex-shrink-0 group-hover:bg-slate-900 group-hover:text-white transition-all">
            <PhoneCall className="w-6 h-6" />
          </div>
        </a>

        {/* Card 3: 102 Maternity & Infant */}
        <a
          href="tel:102"
          className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group flex items-center justify-between"
        >
          <div className="space-y-1">
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-900/50">
              Maternal / Infant
            </span>
            <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
              102
            </p>
            <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">
              Obstetric & Neonatal Rapid Transport
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all">
            <HeartHandshake className="w-6 h-6" />
          </div>
        </a>
      </div>

      {/* 4. Directory & Map Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Directory Cards (Col 6) */}
        <div className="lg:col-span-6 space-y-3.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Major Public Trauma Centers ({externalFacilities.length})
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-medium">Ranked by Proximity</span>
          </div>

          <div className="space-y-3">
            {externalFacilities.map((facility) => {
              const facId = facility.externalFacilityId || facility._id;
              const isSelected = (selectedFacility?.externalFacilityId || selectedFacility?._id) === facId;
              const formattedAddress = facility.address || formatFacilityAddress(facility);

              return (
                <div
                  key={facId}
                  onClick={() => setSelectedFacility(facility)}
                  className={`bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl p-5 border transition-all cursor-pointer space-y-3.5 shadow-sm hover:shadow-md ${
                    isSelected
                      ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-md'
                      : 'border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          External Public Facility
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          Unconfirmed Live Bed Hold
                        </span>
                      </div>
                      <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white leading-snug">
                        {facility.name || facility.facilityName}
                      </h3>
                      <p className="text-xs text-slate-500 flex items-start">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 mr-1 flex-shrink-0 mt-0.5" />
                        <span className="truncate">{formattedAddress}</span>
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0 pl-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{facility.distanceKm} km</span>
                      <span className="block text-[10px] text-slate-500 font-medium">~{facility.estimatedTravelMinutes || facility.etaMins || 10} mins</span>
                    </div>
                  </div>

                  {/* Specialties Pills */}
                  {facility.specialties && facility.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {facility.specialties.map((spec, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] bg-slate-50 text-slate-600 px-2.5 py-0.5 rounded-full border border-slate-200/70 font-medium"
                        >
                          {spec}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Action Buttons: Call & Select as Destination / Navigate */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                    <a
                      href={`tel:${facility.emergencyContactPhone || facility.contactNumber || '108'}`}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full"
                    >
                      <button className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer">
                        <Phone className="w-3.5 h-3.5 text-slate-600" />
                        <span>Call {facility.emergencyContactPhone || '108'}</span>
                      </button>
                    </a>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectExternalFacility(facility);
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                    >
                      <Navigation className="w-3.5 h-3.5 fill-current" />
                      <span>Select & Navigate</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Interactive Leaflet Map (Col 6) */}
        <div className="lg:col-span-6 sticky top-20 space-y-3">
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  External Public Trauma Centers Map
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                Gray Markers = Public Centers
              </span>
            </div>

            <LeafletMap
              center={[selectedFacility?.latitude || 28.5672, selectedFacility?.longitude || 77.1950]}
              zoom={12}
              userLocation={[userLocation.lat, userLocation.lng]}
              destinationLocation={[selectedFacility?.latitude || 28.5672, selectedFacility?.longitude || 77.1950]}
              hospitals={externalFacilities.map((f) => ({
                _id: f._id || f.externalFacilityId,
                name: f.name || f.facilityName,
                coordinates: f.coordinates || [f.longitude, f.latitude],
                operatingAddress: f.operatingAddress,
                isPartner: false,
                isVerified: false,
                isDestination: (f.externalFacilityId || f._id) === (selectedFacility?.externalFacilityId || selectedFacility?._id),
              }))}
              onMarkerClick={(fac) => {
                const match = externalFacilities.find((p) => (p._id || p.externalFacilityId) === (fac._id || fac.externalFacilityId));
                if (match) setSelectedFacility(match);
              }}
              polylineColor="#64748B"
              className="h-[460px] w-full rounded-xl"
            />

            {/* Selected Facility Quick Bar with Direct Navigation */}
            {selectedFacility && (
              <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <p className="font-bold tracking-tight text-slate-900 truncate">{selectedFacility.name || selectedFacility.facilityName}</p>
                  <p className="text-[11px] text-slate-500 truncate">{selectedFacility.address || formatFacilityAddress(selectedFacility)}</p>
                </div>
                <button
                  onClick={() => handleSelectExternalFacility(selectedFacility)}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow flex-shrink-0 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5 fill-current" />
                  <span>Select Destination</span>
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Confirmation & Disclaimer Modal */}
      {showConfirmModal && facilityToConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Confirm External Destination
                </h3>
                <span className="text-xs text-slate-500">
                  {facilityToConfirm.name || facilityToConfirm.facilityName}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200 space-y-2">
              <p className="font-bold">
                Mandatory Emergency Care Notice:
              </p>
              <p>
                Live bed and specialist availability <strong>cannot be confirmed</strong> for external healthcare centers. A managed reservation hold will <strong>not</strong> be created.
              </p>
              <p className="text-[11px] text-amber-800 dark:text-amber-300">
                Direct turn-by-turn navigation will open immediately. For severe emergencies, dial 108 or 112 for ambulance transit.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConfirmModal(false)}
                disabled={confirmingSelection}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={confirmExternalSelection}
                disabled={confirmingSelection}
                icon={Navigation}
              >
                {confirmingSelection ? 'Confirming...' : 'Acknowledge & Navigate'}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default EmergencyFallbackPage;
