import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { handleOpenGoogleMaps } from '../../utils/geoUtils';

/**
 * Architectural Mandate helper:
 * Deep-link launch to external Google Maps for turn-by-turn navigation.
 * Dynamically supports (facility, null, userLocation) or (lat, lng, userLocation).
 */
export const openGoogleMapsNavigation = (facilityOrLat, lng = null, userLocation = null) => {
  handleOpenGoogleMaps(facilityOrLat, lng, userLocation);
};

// 1. Patient Location Marker: Pulsing blue beacon pin
const patientBeaconIcon = L.divIcon({
  html: `<div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background: rgba(37,99,235,0.35); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; width: 18px; height: 18px; border-radius: 50%; background: #2563EB; border: 3px solid #ffffff; box-shadow: 0 0 10px rgba(37,99,235,0.7); display: flex; align-items: center; justify-content: center;">
            <div style="width: 5px; height: 5px; border-radius: 50%; background: #ffffff;"></div>
          </div>
        </div>`,
  className: 'patient-beacon-marker',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

// 2. Verified Partner Hospital Marker: Solid deep-blue pin with medical cross
const verifiedPartnerIcon = L.divIcon({
  html: `<div style="background-color: #1E40AF; width: 32px; height: 32px; border-radius: 10px; border: 2.5px solid #ffffff; box-shadow: 0 4px 10px rgba(30,64,175,0.45); display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 900; font-size: 15px;">
          ✚
        </div>`,
  className: 'verified-partner-marker',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

// 3. External / Non-Partner Clinic Marker: Neutral gray pin
const externalClinicIcon = L.divIcon({
  html: `<div style="background-color: #64748B; width: 28px; height: 28px; border-radius: 8px; border: 2px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 700; font-size: 12px;">
          H
        </div>`,
  className: 'external-clinic-marker',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14],
});

// 4. Emergency Destination Marker: Crimson pin with alert star
const emergencyDestinationIcon = L.divIcon({
  html: `<div style="background-color: #DC2626; width: 36px; height: 36px; border-radius: 12px; border: 3px solid #ffffff; box-shadow: 0 6px 14px rgba(220,38,38,0.55); display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 900; font-size: 17px; animation: bounce 1s infinite;">
          ★
        </div>`,
  className: 'emergency-dest-marker',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -18],
});

function MapPanUpdater({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && Array.isArray(center) && center.length === 2 && !isNaN(center[0]) && !isNaN(center[1])) {
      map.setView(center, zoom || map.getZoom());
    }
  }, [center, zoom, map]);
  return null;
}

export const LeafletMap = ({
  center = [28.6139, 77.2090], // [lat, lng]
  zoom = 13,
  userLocation = null, // [lat, lng]
  hospitals = [], // array of { _id, name, coordinates: [lng, lat], address, operatingAddress, distanceKm, isVerified, isPartner, isEmergency, isDestination, ... }
  destinationLocation = null, // [lat, lng]
  selectedHospitalId = null,
  onMarkerClick = null,
  polylineColor = '#2563EB',
  showPolyline = true,
  className = 'h-80 w-full rounded-xl shadow-inner border border-slate-200',
}) => {
  const polylineCoords =
    showPolyline && userLocation && destinationLocation
      ? [userLocation, destinationLocation]
      : [];

  return (
    <div className={`relative ${className}`}>
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={true} className="h-full w-full rounded-xl">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapPanUpdater center={center} zoom={zoom} />

        {/* 1. Patient Location Marker */}
        {userLocation && (
          <Marker position={userLocation} icon={patientBeaconIcon}>
            <Popup>
              <div className="p-1 text-xs">
                <p className="font-black text-blue-900 flex items-center gap-1">
                  <span>📍 Your GPS Location</span>
                </p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                  {userLocation[0].toFixed(4)}, {userLocation[1].toFixed(4)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* 2. Facility Markers */}
        {hospitals.map((h, idx) => {
          const rawCoords = h.location?.coordinates || h.coordinates;
          if (!rawCoords || rawCoords.length < 2) return null;
          const lat = parseFloat(rawCoords[1]);
          const lng = parseFloat(rawCoords[0]);
          if (isNaN(lat) || isNaN(lng)) return null;

          const isDest = h.isDestination || (destinationLocation && Math.abs(destinationLocation[0] - lat) < 0.0001 && Math.abs(destinationLocation[1] - lng) < 0.0001);
          const isVerifiedPartner = h.isPartner !== false && (h.verificationStatus === 'verified' || h.isVerified !== false);
          
          let markerIcon = verifiedPartnerIcon;
          if (isDest) {
            markerIcon = emergencyDestinationIcon;
          } else if (!isVerifiedPartner) {
            markerIcon = externalClinicIcon;
          }

          const street = h.operatingAddress?.streetName || h.address?.street || 'Healthcare Facility Site';
          const city = h.operatingAddress?.city || h.address?.city || '';

          return (
            <Marker
              key={h._id || h.id || idx}
              position={[lat, lng]}
              icon={markerIcon}
              eventHandlers={{
                click: () => {
                  if (onMarkerClick) onMarkerClick(h);
                },
              }}
            >
              <Popup>
                <div className="p-1 max-w-[220px] text-xs space-y-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                      isDest
                        ? 'bg-red-600 text-white'
                        : isVerifiedPartner
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {isDest ? 'EMERGENCY DESTINATION' : isVerifiedPartner ? 'SHAP PARTNER' : 'EXTERNAL CLINIC'}
                    </span>
                    {h.distanceKm && (
                      <span className="font-bold text-slate-700 text-[10px]">{h.distanceKm} km</span>
                    )}
                  </div>

                  <h4 className="font-black text-slate-900 leading-snug text-xs">{h.name}</h4>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    {street}{city ? `, ${city}` : ''}
                  </p>

                  {/* Capabilities snippet */}
                  {h.availableResources && (
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100 text-[10px]">
                      <span className="text-emerald-700 font-bold">
                        {h.availableResources.erBays ?? 0} ER Bays
                      </span>
                      <span>&bull;</span>
                      <span className="text-blue-700 font-bold">
                        {h.availableResources.icuBeds ?? 0} ICU Beds
                      </span>
                    </div>
                  )}

                  {/* Google Maps External Deep Link Button */}
                  <div className="pt-1.5">
                    <button
                      type="button"
                      onClick={() => openGoogleMapsNavigation(h, null, userLocation)}
                      className="w-full py-1.5 px-2 bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white font-bold text-[10px] uppercase rounded-md shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>Navigate via Google Maps ↗</span>
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* 3. Route Polyline Preview */}
        {polylineCoords.length === 2 && (
          <Polyline
            positions={polylineCoords}
            color={polylineColor}
            weight={4}
            opacity={0.85}
            dashArray="8, 8"
          />
        )}
      </MapContainer>
    </div>
  );
};

export default LeafletMap;
