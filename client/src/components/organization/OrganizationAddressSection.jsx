import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import {
  MapPin,
  Building2,
  Navigation,
  Compass,
  CheckCircle2,
  AlertCircle,
  Search,
  Crosshair,
  Sparkles,
  Info,
} from 'lucide-react';

// Custom hospital pin icon with zero external asset dependencies
const hospitalPinIcon = L.divIcon({
  html: `<div style="background-color: #DC2626; width: 32px; height: 32px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 4px 12px rgba(220,38,38,0.5); display: flex; align-items: center; justify-content: center;">
          <span style="transform: rotate(45deg); color: white; font-weight: 900; font-size: 14px; line-height: 1;">H</span>
        </div>`,
  className: 'custom-hospital-pin',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

// Helper component to handle clicks on the Leaflet map
function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      if (e.latlng) {
        onLocationSelect(parseFloat(e.latlng.lat.toFixed(6)), parseFloat(e.latlng.lng.toFixed(6)));
      }
    },
  });
  return null;
}

// Helper component to smoothly pan/center the map when coordinates change
function MapCenterUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center.length === 2 && !isNaN(center[0]) && !isNaN(center[1])) {
      map.setView(center, map.getZoom(), { animate: true });
    }
  }, [center, map]);
  return null;
}

export const OrganizationAddressSection = ({
  registeredAddress,
  setRegisteredAddress,
  operatingAddress,
  setOperatingAddress,
  isSameAsRegistered,
  setIsSameAsRegistered,
  latitude,
  setLatitude,
  longitude,
  setLongitude,
  validationErrors = {},
}) => {
  const [geocoding, setGeocoding] = useState(false);
  const [geoStatus, setGeoStatus] = useState({ type: '', message: '' });
  const [locatingUser, setLocatingUser] = useState(false);
  const markerRef = useRef(null);

  // Handle Registered Address Field Change
  const handleRegisteredChange = (field, value) => {
    const updated = { ...registeredAddress, [field]: value };
    setRegisteredAddress(updated);
    if (isSameAsRegistered) {
      setOperatingAddress({ ...updated, isSameAsRegistered: true });
    }
  };

  // Handle Operating Address Field Change
  const handleOperatingChange = (field, value) => {
    setOperatingAddress((prev) => ({
      ...prev,
      [field]: value,
      isSameAsRegistered: false,
    }));
  };

  // Toggle "Operating is same as Registered"
  const handleToggleSameAddress = (checked) => {
    setIsSameAsRegistered(checked);
    if (checked) {
      setOperatingAddress({
        ...registeredAddress,
        isSameAsRegistered: true,
      });
    } else {
      setOperatingAddress((prev) => ({
        ...prev,
        isSameAsRegistered: false,
      }));
    }
  };

  // Handle Marker Drag End
  const handleMarkerDragEnd = () => {
    const marker = markerRef.current;
    if (marker != null) {
      const latLng = marker.getLatLng();
      const newLat = parseFloat(latLng.lat.toFixed(6));
      const newLng = parseFloat(latLng.lng.toFixed(6));
      setLatitude(newLat);
      setLongitude(newLng);
      setGeoStatus({
        type: 'success',
        message: `Physical operating pin updated: ${newLat}, ${newLng}`,
      });
    }
  };

  // Handle Map Click Selection
  const handleMapLocationSelect = (newLat, newLng) => {
    setLatitude(newLat);
    setLongitude(newLng);
    setGeoStatus({
      type: 'success',
      message: `Physical operating pin placed: ${newLat}, ${newLng}`,
    });
  };

  // Browser GPS Locate
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus({ type: 'error', message: 'Geolocation is not supported by your browser.' });
      return;
    }
    setLocatingUser(true);
    setGeoStatus({ type: 'info', message: 'Acquiring GPS fix...' });

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLat = parseFloat(pos.coords.latitude.toFixed(6));
        const newLng = parseFloat(pos.coords.longitude.toFixed(6));
        setLatitude(newLat);
        setLongitude(newLng);
        setLocatingUser(false);
        setGeoStatus({
          type: 'success',
          message: `GPS location locked (${pos.coords.accuracy ? Math.round(pos.coords.accuracy) + 'm accuracy' : 'high accuracy'})`,
        });
      },
      (err) => {
        setLocatingUser(false);
        setGeoStatus({
          type: 'error',
          message: `GPS error: ${err.message || 'Permission denied or timed out'}.`,
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Geocode address via OpenStreetMap Nominatim
  const handleGeocodeAddress = async () => {
    const targetAddr = isSameAsRegistered ? registeredAddress : operatingAddress;
    const parts = [
      targetAddr.locality,
      targetAddr.city,
      targetAddr.district,
      targetAddr.state,
      targetAddr.pinCode,
      targetAddr.country || 'India',
    ].filter(Boolean);

    if (parts.length < 2) {
      setGeoStatus({
        type: 'error',
        message: 'Please fill in city/town and state or PIN code to locate on map.',
      });
      return;
    }

    const query = parts.join(', ');
    setGeocoding(true);
    setGeoStatus({ type: 'info', message: `Geocoding '${query}'...` });

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const foundLat = parseFloat(parseFloat(data[0].lat).toFixed(6));
        const foundLng = parseFloat(parseFloat(data[0].lon).toFixed(6));
        setLatitude(foundLat);
        setLongitude(foundLng);
        setGeoStatus({
          type: 'success',
          message: `Located: ${data[0].display_name.split(',').slice(0, 3).join(', ')}`,
        });
      } else {
        setGeoStatus({
          type: 'error',
          message: 'Location not found. Please click directly on the interactive map below to drop your pin.',
        });
      }
    } catch (err) {
      setGeoStatus({
        type: 'error',
        message: 'Geocoding service unavailable. You can click or drag the map pin directly.',
      });
    } finally {
      setGeocoding(false);
    }
  };

  const currentCenter = useMemo(() => {
    const lat = typeof latitude === 'number' && !isNaN(latitude) ? latitude : 28.6139;
    const lng = typeof longitude === 'number' && !isNaN(longitude) ? longitude : 77.2090;
    return [lat, lng];
  }, [latitude, longitude]);

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Section Header */}
      <div className="border-t border-slate-200/80 pt-6">
        <div className="flex items-center space-x-2.5 mb-1.5">
          <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
              Organization Address & Physical GPS Location
            </h3>
            <p className="text-[11px] text-slate-500">
              Official legal registration address & physical operating healthcare facility coordinates
            </p>
          </div>
        </div>
      </div>

      {/* A. Registered Address Section */}
      <div className="p-4 sm:p-5 bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              1. Registered Address (Official / Legal)
            </h4>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">As on registration certificate</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {/* Building / House Number */}
          <div>
            <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Building / Plot # <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={registeredAddress.buildingNumber || ''}
              onChange={(e) => handleRegisteredChange('buildingNumber', e.target.value)}
              placeholder="e.g. Plot 100, Block A"
              className="w-full py-2.5 px-3 bg-white/90 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Street Name */}
          <div>
            <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Street Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={registeredAddress.streetName || ''}
              onChange={(e) => handleRegisteredChange('streetName', e.target.value)}
              placeholder="e.g. Medical Enclave Road"
              className="w-full py-2.5 px-3 bg-white/90 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Area / Locality */}
          <div>
            <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Area / Locality <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={registeredAddress.locality || ''}
              onChange={(e) => handleRegisteredChange('locality', e.target.value)}
              placeholder="e.g. Connaught Place"
              className="w-full py-2.5 px-3 bg-white/90 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Landmark */}
          <div>
            <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Landmark <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={registeredAddress.landmark || ''}
              onChange={(e) => handleRegisteredChange('landmark', e.target.value)}
              placeholder="e.g. Near Metro Station Gate 4"
              className="w-full py-2.5 px-3 bg-white/90 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Village / Town / City */}
          <div>
            <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Village / Town / City <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={registeredAddress.city || ''}
              onChange={(e) => handleRegisteredChange('city', e.target.value)}
              placeholder="e.g. Central City / New Delhi"
              className="w-full py-2.5 px-3 bg-white/90 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* District */}
          <div>
            <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              District <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={registeredAddress.district || ''}
              onChange={(e) => handleRegisteredChange('district', e.target.value)}
              placeholder="e.g. Central District"
              className="w-full py-2.5 px-3 bg-white/90 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* State */}
          <div>
            <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              State <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={registeredAddress.state || ''}
              onChange={(e) => handleRegisteredChange('state', e.target.value)}
              placeholder="e.g. Delhi / Maharashtra"
              className="w-full py-2.5 px-3 bg-white/90 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* PIN Code (6 Digits Validation) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                PIN Code <span className="text-red-500">*</span>
              </label>
              {registeredAddress.pinCode && (
                <span
                  className={`text-[10px] font-bold ${
                    /^\d{6}$/.test(registeredAddress.pinCode)
                      ? 'text-emerald-600'
                      : 'text-amber-600'
                  }`}
                >
                  {/^\d{6}$/.test(registeredAddress.pinCode) ? '✓ 6-digits valid' : '6 digits required'}
                </span>
              )}
            </div>
            <input
              type="text"
              required
              maxLength={6}
              value={registeredAddress.pinCode || ''}
              onChange={(e) => handleRegisteredChange('pinCode', e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="e.g. 110001"
              className={`w-full py-2.5 px-3 bg-white/90 border rounded-xl text-xs font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                registeredAddress.pinCode && !/^\d{6}$/.test(registeredAddress.pinCode)
                  ? 'border-amber-400 focus:ring-amber-400'
                  : 'border-slate-200 focus:ring-blue-500'
              }`}
            />
          </div>

          {/* Country */}
          <div>
            <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Country
            </label>
            <input
              type="text"
              readOnly
              value={registeredAddress.country || 'India'}
              className="w-full py-2.5 px-3 bg-slate-100/80 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* B. Operating Address Checkbox & Section */}
      <div className="p-4 sm:p-5 bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              2. Operating Address (Physical Healthcare Facility)
            </h4>
          </div>
          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
            Patient Service Location
          </span>
        </div>

        {/* Operating Address Checkbox */}
        <label className="flex items-start space-x-3 p-3 bg-blue-50/60 hover:bg-blue-50 border border-blue-200/80 rounded-xl cursor-pointer transition-colors">
          <input
            type="checkbox"
            checked={isSameAsRegistered}
            onChange={(e) => handleToggleSameAddress(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-slate-800 block">
              Operating address is the same as registered address
            </span>
            <p className="text-[11px] text-slate-500 leading-tight">
              Check this if patient treatment, emergency reception, and hospital beds are at the registered legal address.
            </p>
          </div>
        </label>

        {/* Separate Operating Address Form (Visible when checkbox is unchecked) */}
        {!isSameAsRegistered && (
          <div className="space-y-3.5 pt-2 border-t border-slate-200/60 animate-fade-in">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
              <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>
                Enter the physical address of the clinic or hospital branch where patients visit:
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Building / Unit # <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={operatingAddress.buildingNumber || ''}
                  onChange={(e) => handleOperatingChange('buildingNumber', e.target.value)}
                  placeholder="e.g. Hospital Wing 2, Bay 1"
                  className="w-full py-2.5 px-3 bg-white/90 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Street Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={operatingAddress.streetName || ''}
                  onChange={(e) => handleOperatingChange('streetName', e.target.value)}
                  placeholder="e.g. Ring Road Branch"
                  className="w-full py-2.5 px-3 bg-white/90 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Area / Locality <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={operatingAddress.locality || ''}
                  onChange={(e) => handleOperatingChange('locality', e.target.value)}
                  placeholder="e.g. Sector 12"
                  className="w-full py-2.5 px-3 bg-white/90 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Landmark <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={operatingAddress.landmark || ''}
                  onChange={(e) => handleOperatingChange('landmark', e.target.value)}
                  placeholder="e.g. Opposite Trauma Center"
                  className="w-full py-2.5 px-3 bg-white/90 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  City / Town <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={operatingAddress.city || ''}
                  onChange={(e) => handleOperatingChange('city', e.target.value)}
                  placeholder="e.g. Noida / Gurgaon"
                  className="w-full py-2.5 px-3 bg-white/90 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  District <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={operatingAddress.district || ''}
                  onChange={(e) => handleOperatingChange('district', e.target.value)}
                  placeholder="e.g. Gautam Buddha Nagar"
                  className="w-full py-2.5 px-3 bg-white/90 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  State <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={operatingAddress.state || ''}
                  onChange={(e) => handleOperatingChange('state', e.target.value)}
                  placeholder="e.g. Uttar Pradesh"
                  className="w-full py-2.5 px-3 bg-white/90 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    PIN Code <span className="text-red-500">*</span>
                  </label>
                  {operatingAddress.pinCode && (
                    <span
                      className={`text-[10px] font-bold ${
                        /^\d{6}$/.test(operatingAddress.pinCode)
                          ? 'text-emerald-600'
                          : 'text-amber-600'
                      }`}
                    >
                      {/^\d{6}$/.test(operatingAddress.pinCode) ? '✓ Valid' : '6 digits required'}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={operatingAddress.pinCode || ''}
                  onChange={(e) => handleOperatingChange('pinCode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="e.g. 201301"
                  className="w-full py-2.5 px-3 bg-white/90 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Country
                </label>
                <input
                  type="text"
                  readOnly
                  value={operatingAddress.country || 'India'}
                  className="w-full py-2.5 px-3 bg-slate-100/80 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* C. Interactive GPS Map Picker for Operating Physical Location */}
      <div className="p-4 sm:p-5 bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                3. GPS Location (Operating Physical Facility)
              </h4>
              <p className="text-[11px] text-slate-500">
                Used for Emergency Beep matching, patient transit ETA, and ambulance dispatch
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={locatingUser}
              className="py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 transition-colors flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Crosshair className={`w-3.5 h-3.5 ${locatingUser ? 'animate-spin' : ''}`} />
              <span>{locatingUser ? 'Fixing GPS...' : 'My Current GPS'}</span>
            </button>

            <button
              type="button"
              onClick={handleGeocodeAddress}
              disabled={geocoding}
              className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Search className={`w-3.5 h-3.5 ${geocoding ? 'animate-spin' : ''}`} />
              <span>{geocoding ? 'Locating...' : 'Pin from Address'}</span>
            </button>
          </div>
        </div>

        {/* GPS Status Message */}
        {geoStatus.message && (
          <div
            className={`p-2.5 rounded-xl text-xs font-medium flex items-center space-x-2 ${
              geoStatus.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : geoStatus.type === 'error'
                ? 'bg-red-50 text-red-800 border border-red-200'
                : 'bg-blue-50 text-blue-800 border border-blue-200'
            }`}
          >
            {geoStatus.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : geoStatus.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            ) : (
              <Compass className="w-4 h-4 text-blue-600 flex-shrink-0 animate-spin" />
            )}
            <span>{geoStatus.message}</span>
          </div>
        )}

        {/* Coordinate Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Latitude (-90 to 90) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.000001"
                required
                value={latitude !== undefined ? latitude : ''}
                onChange={(e) => setLatitude(parseFloat(e.target.value))}
                placeholder="e.g. 28.613900"
                className="w-full py-2 px-3 bg-white/90 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                LAT
              </span>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Longitude (-180 to 180) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.000001"
                required
                value={longitude !== undefined ? longitude : ''}
                onChange={(e) => setLongitude(parseFloat(e.target.value))}
                placeholder="e.g. 77.209000"
                className="w-full py-2 px-3 bg-white/90 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                LNG
              </span>
            </div>
          </div>
        </div>

        {/* Map Telemetry Banner */}
        <div className="flex items-center justify-between px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-medium">
          <div className="flex items-center space-x-2">
            <MapPin className="w-3.5 h-3.5 text-red-400 flex-shrink-0 animate-bounce" />
            <span className="text-[11px] text-slate-300">
              Interactive Leaflet Map: Drag red pin or click anywhere on map to set physical location.
            </span>
          </div>
          <span className="font-mono text-[11px] font-bold text-emerald-400 hidden sm:inline-block">
            {latitude?.toFixed(4)}, {longitude?.toFixed(4)}
          </span>
        </div>

        {/* Interactive Leaflet Map View */}
        <div className="h-64 sm:h-72 w-full rounded-2xl overflow-hidden border border-slate-200 shadow-inner relative z-0">
          <MapContainer
            center={currentCenter}
            zoom={13}
            scrollWheelZoom={false}
            className="h-full w-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapCenterUpdater center={currentCenter} />
            <MapClickHandler onLocationSelect={handleMapLocationSelect} />

            <Marker
              position={currentCenter}
              draggable={true}
              eventHandlers={{
                dragend: handleMarkerDragEnd,
              }}
              ref={markerRef}
              icon={hospitalPinIcon}
            >
              <Popup>
                <div className="text-xs space-y-1">
                  <p className="font-bold text-slate-900">Hospital Operating Physical Site</p>
                  <p className="text-[10px] font-mono text-slate-600">
                    {latitude?.toFixed(6)}, {longitude?.toFixed(6)}
                  </p>
                  <p className="text-[10px] text-blue-600 font-medium">
                    (Drag pin to fine-tune exact gate or trauma entrance)
                  </p>
                </div>
              </Popup>
            </Marker>
          </MapContainer>
        </div>

        <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 pt-1">
          <Navigation className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
          <span>
            Ambulances and incoming emergency patients will be routed strictly to these operating coordinates.
          </span>
        </div>
      </div>

    </div>
  );
};
export default OrganizationAddressSection;
