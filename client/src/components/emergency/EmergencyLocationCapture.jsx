import React, { useState, useEffect, useRef } from 'react';
import {
  Navigation,
  MapPin,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Search,
  Crosshair,
  Edit3,
  Compass,
  Info,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { LeafletMap } from '../common/LeafletMap';
import { useLocationService } from '../../context/LocationContext';
import { forwardGeocode, reverseGeocode, formatCoordinates } from '../../utils/geoUtils';

export const EmergencyLocationCapture = ({
  onLocationConfirmed,
  initialCoordinates = null,
  initialAddress = '',
}) => {
  const {
    location,
    permissionStatus,
    loading: gpsLoading,
    error: gpsError,
    detectCurrentLocation,
    setManualLocation,
    refreshLocation,
  } = useLocationService();

  const [activeTab, setActiveTab] = useState(
    location.source === 'MANUAL' || location.source === 'MAP_SELECTED' ? 'manual' : 'gps'
  );

  // Manual inputs state
  const [manualAddress, setManualAddress] = useState(initialAddress || location.address || '');
  const [manualLat, setManualLat] = useState(
    initialCoordinates ? initialCoordinates[1] : (location.latitude ?? 28.6139)
  );
  const [manualLng, setManualLng] = useState(
    initialCoordinates ? initialCoordinates[0] : (location.longitude ?? 77.2090)
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [manualSaved, setManualSaved] = useState(Boolean(initialCoordinates || location.latitude));
  const searchTimeoutRef = useRef(null);

  // Sync state if context location changes from GPS detection
  useEffect(() => {
    if (location.latitude != null && location.longitude != null) {
      if (location.source === 'DEVICE_GEOLOCATION') {
        setActiveTab('gps');
      }
      setManualLat(location.latitude);
      setManualLng(location.longitude);
      if (location.address) {
        setManualAddress(location.address);
      }
      if (onLocationConfirmed) {
        onLocationConfirmed({
          latitude: location.latitude,
          longitude: location.longitude,
          coordinates: [location.longitude, location.latitude],
          address: location.address,
          accuracyMeters: location.accuracyMeters,
          source: location.source,
          capturedAt: location.capturedAt,
          confirmationStatus: location.confirmationStatus,
        });
      }
    }
  }, [location, onLocationConfirmed]);

  // Handle GPS trigger
  const handleDetectGPS = async () => {
    setActiveTab('gps');
    const res = await detectCurrentLocation({ forceRefresh: true });
    if (res.success && onLocationConfirmed) {
      onLocationConfirmed({
        latitude: res.location.latitude,
        longitude: res.location.longitude,
        coordinates: [res.location.longitude, res.location.latitude],
        address: res.location.address,
        accuracyMeters: res.location.accuracyMeters,
        source: res.location.source,
        capturedAt: res.location.capturedAt,
        confirmationStatus: res.location.confirmationStatus,
      });
    }
  };

  // Autocomplete search debounce for manual location
  const handleSearchChange = (text) => {
    setSearchQuery(text);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (text.trim().length >= 3) {
      searchTimeoutRef.current = setTimeout(async () => {
        setIsSearching(true);
        const matches = await forwardGeocode(text);
        setSuggestions(matches || []);
        setIsSearching(false);
      }, 400);
    } else {
      setSuggestions([]);
    }
  };

  // Selecting a suggestion
  const handleSelectSuggestion = (item) => {
    const lat = item.latitude;
    const lng = item.longitude;
    const addr = item.displayName;

    setManualLat(lat);
    setManualLng(lng);
    setManualAddress(addr);
    setSearchQuery(addr);
    setSuggestions([]);
    setManualSaved(true);

    setManualLocation({
      latitude: lat,
      longitude: lng,
      address: addr,
      source: 'MANUAL',
    });
  };

  // Map Click handler for manual / map tab
  const handleMapClick = async ({ lat, lng }) => {
    setManualLat(lat);
    setManualLng(lng);
    setManualSaved(true);

    const addr = await reverseGeocode(lat, lng);
    setManualAddress(addr);

    setManualLocation({
      latitude: lat,
      longitude: lng,
      address: addr,
      source: 'MAP_SELECTED',
    });
  };

  // Explicit confirmation button for manual edits
  const handleSaveManual = async (e) => {
    e?.preventDefault();
    const res = await setManualLocation({
      latitude: parseFloat(manualLat),
      longitude: parseFloat(manualLng),
      address: manualAddress,
      source: 'MANUAL',
    });
    if (res.success) {
      setManualSaved(true);
      if (onLocationConfirmed) {
        onLocationConfirmed({
          latitude: res.location.latitude,
          longitude: res.location.longitude,
          coordinates: [res.location.longitude, res.location.latitude],
          address: res.location.address,
          accuracyMeters: null,
          source: res.location.source,
          capturedAt: res.location.capturedAt,
          confirmationStatus: 'CONFIRMED',
        });
      }
    }
  };

  // Determine current active map coordinates
  const currentMapLat =
    activeTab === 'gps' && location.latitude != null ? location.latitude : Number(manualLat);
  const currentMapLng =
    activeTab === 'gps' && location.longitude != null ? location.longitude : Number(manualLng);
  const isGPSActive = activeTab === 'gps' && location.source === 'DEVICE_GEOLOCATION' && location.latitude != null;

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-card space-y-5">
      {/* 1. Header with Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#2F2FE4]" />
            <span>Emergency Location Verification</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real coordinates determine hospital matching, straight-line distance, and emergency transit
          </p>
        </div>

        {/* Segmented Mode Selector */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
          <button
            type="button"
            onClick={handleDetectGPS}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'gps'
                ? 'bg-white text-[#2F2FE4] shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Use Device GPS</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'manual'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Enter Manually / Map</span>
          </button>
        </div>
      </div>

      {/* 2. Specific GPS Failure / Permission Banner */}
      {activeTab === 'gps' && gpsError && (
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/80 text-amber-900 space-y-2 animate-fade-in">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs flex-1">
              <p className="font-bold">
                {gpsError.code === 'PERMISSION_DENIED'
                  ? 'Location Access Was Blocked'
                  : gpsError.code === 'POSITION_UNAVAILABLE'
                  ? 'GPS Hardware / Location Signal Unavailable'
                  : gpsError.code === 'TIMEOUT'
                  ? 'GPS Acquisition Timed Out'
                  : 'Unable to Detect Location'}
              </p>
              <p className="text-amber-800 mt-0.5 leading-relaxed">{gpsError.message}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleDetectGPS}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
            >
              Retry GPS
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('manual')}
              className="px-3 py-1 bg-white hover:bg-amber-100/60 text-amber-900 border border-amber-300 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
            >
              Switch to Manual Address Selection
            </button>
          </div>
        </div>
      )}

      {/* 3. Primary Mode: Device Geolocation Active Details */}
      {activeTab === 'gps' && isGPSActive && !gpsError && (
        <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-3 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-emerald-200/60">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
              <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                Live Device Geolocation Confirmed
              </span>
              <span className="text-[10px] bg-emerald-200/80 text-emerald-900 font-bold px-2 py-0.5 rounded-full">
                DEVICE_GEOLOCATION
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => refreshLocation()}
                disabled={gpsLoading}
                className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${gpsLoading ? 'animate-spin' : ''}`} />
                <span>{gpsLoading ? 'Refreshing...' : 'Refresh GPS'}</span>
              </button>
              <span className="text-emerald-300">|</span>
              <button
                type="button"
                onClick={() => setActiveTab('manual')}
                className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 cursor-pointer"
              >
                Adjust Location
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                Detected Street Address
              </span>
              <p className="font-semibold text-slate-900 mt-0.5 truncate" title={location.address}>
                {location.address || 'Address resolution pending...'}
              </p>
            </div>

            <div>
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                Physical Coordinates
              </span>
              <p className="font-mono font-bold text-slate-900 mt-0.5">
                {formatCoordinates(location.latitude, location.longitude, 5)}
              </p>
            </div>

            <div>
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                Accuracy & Timestamp
              </span>
              <p className="font-medium text-slate-800 mt-0.5">
                {location.accuracyMeters ? `±${location.accuracyMeters} meters` : 'High precision'} &bull;{' '}
                {location.capturedAt
                  ? new Date(location.capturedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                  : 'Just now'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4. Secondary Mode: Manual Entry & Map Selection Form */}
      {activeTab === 'manual' && (
        <div className="space-y-4 animate-fade-in">
          {/* Status Badge */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-xs font-bold text-slate-900">
                Source: {location.source === 'MAP_SELECTED' ? 'MAP_SELECTED' : 'MANUAL'}
              </span>
              <span className="text-[10px] bg-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded">
                User Confirmed
              </span>
            </div>
            <button
              type="button"
              onClick={handleDetectGPS}
              className="text-xs font-bold text-[#2F2FE4] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Switch Back to GPS</span>
            </button>
          </div>

          {/* Autocomplete Search Input */}
          <div className="relative">
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Search Street, Hospital, or Landmark
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="e.g. Apollo Hospital, Connaught Place, Gachibowli..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2F2FE4] focus:bg-white"
              />
              {isSearching && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
                  Searching...
                </span>
              )}
            </div>

            {/* Suggestions Dropdown */}
            {suggestions.length > 0 && (
              <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                {suggestions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSuggestion(item)}
                    className="w-full text-left p-2.5 hover:bg-slate-50 text-xs text-slate-800 flex items-start gap-2"
                  >
                    <MapPin className="w-3.5 h-3.5 text-[#2F2FE4] shrink-0 mt-0.5" />
                    <span className="truncate">{item.displayName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Detailed Street Address Text Input */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">
              Confirmed Street Address / Emergency Landmark
            </label>
            <input
              type="text"
              required
              value={manualAddress}
              onChange={(e) => {
                setManualAddress(e.target.value);
                setManualSaved(false);
              }}
              placeholder="e.g., Gate 2, Hyderabad Central University, Gachibowli, Hyderabad"
              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2F2FE4]"
            />
          </div>

          {/* Manual Latitude and Longitude Coordinates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-0.5">Latitude</label>
              <input
                type="number"
                step="0.00001"
                min="-90"
                max="90"
                value={manualLat}
                onChange={(e) => {
                  setManualLat(e.target.value);
                  setManualSaved(false);
                }}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-0.5">Longitude</label>
              <input
                type="number"
                step="0.00001"
                min="-180"
                max="180"
                value={manualLng}
                onChange={(e) => {
                  setManualLng(e.target.value);
                  setManualSaved(false);
                }}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveManual}
            className="w-full py-2 bg-[#2F2FE4] hover:bg-[#162E93] text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Confirm & Save Selected Location
          </button>
        </div>
      )}

      {/* 5. Interactive Map & Pin Alignment */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-800 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#2F2FE4]" />
            <span>Interactive Map Location Pin</span>
          </span>
          <span className="text-[11px] text-slate-400">
            {activeTab === 'manual' ? 'Click anywhere on map to reposition' : 'Live patient position'}
          </span>
        </div>

        <div className="h-64 w-full rounded-xl overflow-hidden border border-slate-200 shadow-inner relative">
          <LeafletMap
            center={[currentMapLat, currentMapLng]}
            zoom={14}
            userLocation={[currentMapLat, currentMapLng]}
            userLocationTitle={isGPSActive ? 'Device GPS' : 'Manual Point'}
            userLocationSource={isGPSActive ? 'DEVICE_GEOLOCATION' : 'MANUAL'}
            onMapClick={activeTab === 'manual' ? handleMapClick : null}
            onUserMarkerDragEnd={activeTab === 'manual' ? handleMapClick : null}
            className="h-full w-full"
          />
        </div>
      </div>
    </div>
  );
};

export default EmergencyLocationCapture;
