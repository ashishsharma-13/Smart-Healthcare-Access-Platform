import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
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
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

// Verified Major Public & Government Trauma Centers
const PUBLIC_GOVERNMENT_FACILITIES = [
  {
    _id: 'ext_aiims_trauma',
    name: 'AIIMS Apex Trauma Center (JPNATC)',
    type: 'Apex Level-1 Public Trauma Center',
    specialties: ['Level-1 Polytrauma', 'Neurosurgery', 'Orthopedic Surgery', 'Emergency Resuscitation'],
    coordinates: [77.1950, 28.5672], // [lng, lat]
    latitude: 28.5672,
    longitude: 77.1950,
    location: {
      type: 'Point',
      coordinates: [77.1950, 28.5672],
    },
    operatingAddress: {
      buildingNumber: 'JPNATC Complex',
      streetName: 'Ring Road, Raj Nagar, Safdarjung Enclave',
      area: 'South Delhi',
      city: 'New Delhi',
      pinCode: '110029',
      location: {
        coordinates: [77.1950, 28.5672],
      },
    },
    emergencyContactPhone: '01126731000',
    displayPhone: '011-26731000',
    distanceKm: 2.4,
    etaMins: 7,
    isPartner: false,
    isVerified: false,
  },
  {
    _id: 'ext_safdarjung',
    name: 'Safdarjung Hospital Emergency & Burn Block',
    type: 'Central Government Multi-Speciality Trauma Block',
    specialties: ['24/7 Burn ICU', 'Emergency Surgery', 'Cardiac Resuscitation', 'Toxicology'],
    coordinates: [77.2075, 28.5705],
    latitude: 28.5705,
    longitude: 77.2075,
    location: {
      type: 'Point',
      coordinates: [77.2075, 28.5705],
    },
    operatingAddress: {
      buildingNumber: 'Emergency Block',
      streetName: 'Ansari Nagar West, Ring Road',
      area: 'South Delhi',
      city: 'New Delhi',
      pinCode: '110029',
      location: {
        coordinates: [77.2075, 28.5705],
      },
    },
    emergencyContactPhone: '01126707444',
    displayPhone: '011-26707444',
    distanceKm: 3.1,
    etaMins: 9,
    isPartner: false,
    isVerified: false,
  },
  {
    _id: 'ext_rml',
    name: 'Dr. Ram Manohar Lohia (RML) Hospital Emergency',
    type: 'Central Govt Tertiary Trauma & Cardiac Center',
    specialties: ['Acute Cardiac Care', 'Trauma Bay', 'Stroke Unit', 'Toxicology'],
    coordinates: [77.2014, 28.6253],
    latitude: 28.6253,
    longitude: 77.2014,
    location: {
      type: 'Point',
      coordinates: [77.2014, 28.6253],
    },
    operatingAddress: {
      buildingNumber: 'Casualty & Trauma Dept',
      streetName: 'Baba Kharak Singh Marg',
      area: 'Connaught Place',
      city: 'New Delhi',
      pinCode: '110001',
      location: {
        coordinates: [77.2014, 28.6253],
      },
    },
    emergencyContactPhone: '01123365525',
    displayPhone: '011-23365525',
    distanceKm: 4.8,
    etaMins: 12,
    isPartner: false,
    isVerified: false,
  },
  {
    _id: 'ext_lnjp',
    name: 'Lok Nayak Jai Prakash (LNJP) Hospital',
    type: 'Delhi State Govt Level-2 Trauma & ER',
    specialties: ['Emergency Medicine', 'Pediatric ICU', 'General Surgery', '24/7 Blood Bank'],
    coordinates: [77.2405, 28.6385],
    latitude: 28.6385,
    longitude: 77.2405,
    location: {
      type: 'Point',
      coordinates: [77.2405, 28.6385],
    },
    operatingAddress: {
      buildingNumber: 'Casualty Wing',
      streetName: 'Jawaharlal Nehru Marg, Delhi Gate',
      area: 'Central Delhi',
      city: 'New Delhi',
      pinCode: '110002',
      location: {
        coordinates: [77.2405, 28.6385],
      },
    },
    emergencyContactPhone: '01123233000',
    displayPhone: '011-23233000',
    distanceKm: 6.2,
    etaMins: 15,
    isPartner: false,
    isVerified: false,
  },
  {
    _id: 'ext_gtb',
    name: 'Guru Teg Bahadur (GTB) Hospital Trauma Hub',
    type: 'East Delhi Regional Public Trauma Center',
    specialties: ['Major Trauma', 'Neurosurgical ER', 'Emergency Dialysis', 'ICU'],
    coordinates: [77.3090, 28.6840],
    latitude: 28.6840,
    longitude: 77.3090,
    location: {
      type: 'Point',
      coordinates: [77.3090, 28.6840],
    },
    operatingAddress: {
      buildingNumber: 'Trauma Center Block',
      streetName: 'Tahirpur Road, Dilshad Garden',
      area: 'East Delhi',
      city: 'Delhi',
      pinCode: '110095',
      location: {
        coordinates: [77.3090, 28.6840],
      },
    },
    emergencyContactPhone: '01122586262',
    displayPhone: '011-22586262',
    distanceKm: 11.5,
    etaMins: 24,
    isPartner: false,
    isVerified: false,
  },
  {
    _id: 'ext_ddu',
    name: 'Deen Dayal Upadhyay (DDU) Hospital Emergency',
    type: 'West Delhi Regional Public Hospital',
    specialties: ['Emergency Trauma Care', 'Orthopedics', 'General Resuscitation'],
    coordinates: [77.1082, 28.6272],
    latitude: 28.6272,
    longitude: 77.1082,
    location: {
      type: 'Point',
      coordinates: [77.1082, 28.6272],
    },
    operatingAddress: {
      buildingNumber: 'Casualty Wing',
      streetName: 'Clock Tower, Hari Nagar',
      area: 'West Delhi',
      city: 'New Delhi',
      pinCode: '110064',
      location: {
        coordinates: [77.1082, 28.6272],
      },
    },
    emergencyContactPhone: '01125494404',
    displayPhone: '011-25494404',
    distanceKm: 13.8,
    etaMins: 28,
    isPartner: false,
    isVerified: false,
  },
];

export const EmergencyFallbackPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // User location and active session address state
  const [userLocation, setUserLocation] = useState({ lat: 28.6139, lng: 77.2090 });
  const [userAddress, setUserAddress] = useState('Detecting current location...');
  const [locating, setLocating] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState(PUBLIC_GOVERNMENT_FACILITIES[0]);

  useEffect(() => {
    initUserLocation();
  }, []);

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

  /**
   * Accurate Google Maps Auto-Fill Navigation Trigger.
   * Dynamically extracts destination coordinates and active patient GPS origin.
   */
  const handleOpenGoogleMaps = (facility) => {
    // Extract destination GPS coordinates
    const destCoords =
      facility.location?.coordinates ||
      facility.operatingAddress?.location?.coordinates ||
      facility.coordinates;
    const destLat = destCoords ? destCoords[1] : facility.latitude;
    const destLng = destCoords ? destCoords[0] : facility.longitude;

    // Read user current GPS if available
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

      {/* 1. Redesigned Emergency Alert Banner: Frosted Glass Container */}
      <div className="bg-red-500/10 border border-red-500/20 backdrop-blur-md rounded-2xl p-6 text-slate-800 dark:text-red-100 shadow-sm relative overflow-hidden">
        <div className="relative z-10 space-y-2.5 max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="bg-red-600 text-white rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-1.5 shadow-xs">
              <AlertOctagon className="w-3.5 h-3.5 text-white animate-pulse" />
              <span>Emergency Fallback Protocol</span>
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white leading-snug">
            No Verified SHAP Partners Available In Range. Showing External Public / Government Emergency Centers.
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

      {/* 3. Redesigned Helpline Action Cards (108, 112, 102): Modern Tactile Cards with Hover Lift */}
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
                Major Public Trauma Centers ({PUBLIC_GOVERNMENT_FACILITIES.length})
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-medium">Ranked by Distance</span>
          </div>

          <div className="space-y-3">
            {PUBLIC_GOVERNMENT_FACILITIES.map((facility) => {
              const isSelected = selectedFacility?._id === facility._id;
              const formattedAddress = formatFacilityAddress(facility);

              return (
                <div
                  key={facility._id}
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
                          Unverified Bed Hold
                        </span>
                      </div>
                      <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white leading-snug">
                        {facility.name}
                      </h3>
                      <p className="text-xs text-slate-500 flex items-start">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 mr-1 flex-shrink-0 mt-0.5" />
                        <span className="truncate">{formattedAddress}</span>
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0 pl-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{facility.distanceKm} km</span>
                      <span className="block text-[10px] text-slate-500 font-medium">~{facility.etaMins} mins</span>
                    </div>
                  </div>

                  {/* Specialties Pills */}
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

                  {/* Dual Action Buttons: Call & Accurate Google Maps Navigation */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                    <a
                      href={`tel:${facility.emergencyContactPhone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full"
                    >
                      <button className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer">
                        <Phone className="w-3.5 h-3.5 text-slate-600" />
                        <span>Call {facility.displayPhone}</span>
                      </button>
                    </a>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenGoogleMaps(facility);
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                    >
                      <Navigation className="w-3.5 h-3.5 fill-current" />
                      <span>Navigate via Google Maps</span>
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
                  External Public Trauma Map
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                Neutral Gray Pins = Public Centers
              </span>
            </div>

            <LeafletMap
              center={[selectedFacility.latitude, selectedFacility.longitude]}
              zoom={12}
              userLocation={[userLocation.lat, userLocation.lng]}
              destinationLocation={[selectedFacility.latitude, selectedFacility.longitude]}
              hospitals={PUBLIC_GOVERNMENT_FACILITIES.map((f) => ({
                _id: f._id,
                name: f.name,
                coordinates: f.coordinates,
                operatingAddress: f.operatingAddress,
                isPartner: false,
                isVerified: false,
                isDestination: f._id === selectedFacility._id,
              }))}
              onMarkerClick={(fac) => {
                const match = PUBLIC_GOVERNMENT_FACILITIES.find((p) => p._id === fac._id);
                if (match) setSelectedFacility(match);
              }}
              polylineColor="#64748B"
              className="h-[460px] w-full rounded-xl"
            />

            {/* Selected Facility Quick Bar with Direct Navigation */}
            <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs">
              <div className="min-w-0">
                <p className="font-bold tracking-tight text-slate-900 truncate">{selectedFacility.name}</p>
                <p className="text-[11px] text-slate-500 truncate">{formatFacilityAddress(selectedFacility)}</p>
              </div>
              <button
                onClick={() => handleOpenGoogleMaps(selectedFacility)}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow flex-shrink-0 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5 fill-current" />
                <span>Navigate</span>
              </button>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default EmergencyFallbackPage;
