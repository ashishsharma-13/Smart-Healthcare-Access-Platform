import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

// Custom icons using Leaflet DivIcon
const userIcon = L.divIcon({
  html: `<div style="background-color: #2563EB; width: 22px; height: 22px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(37,99,235,0.8); display: flex; align-items: center; justify-content: center;">
          <div style="background-color: white; width: 6px; height: 6px; border-radius: 50%;"></div>
        </div>`,
  className: 'user-pin-icon',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const hospitalIcon = (isSuitable = true) =>
  L.divIcon({
    html: `<div style="background-color: ${isSuitable ? '#DC2626' : '#64748B'}; width: 28px; height: 28px; border-radius: 8px; border: 2px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px;">
            H
          </div>`,
    className: 'hospital-pin-icon',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

function MapUpdater({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center.length === 2) {
      map.setView(center, zoom || 13);
    }
  }, [center, zoom, map]);
  return null;
}

export const LeafletMap = ({
  center = [28.6139, 77.2090], // [lat, lng]
  zoom = 13,
  userLocation = null, // [lat, lng]
  hospitals = [], // array of { name, coordinates: [lng, lat], address, isSuitable }
  destinationLocation = null, // [lat, lng]
  className = "h-80 w-full rounded-xl shadow-inner border border-slate-200",
}) => {
  const polylineCoords =
    userLocation && destinationLocation
      ? [userLocation, destinationLocation]
      : [];

  return (
    <div className={className}>
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={false} className="h-full w-full rounded-xl">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapUpdater center={center} zoom={zoom} />

        {/* User Location Marker */}
        {userLocation && (
          <Marker position={userLocation} icon={userIcon}>
            <Popup>
              <div className="text-xs font-bold text-slate-900">
                📍 Your Location
              </div>
            </Popup>
          </Marker>
        )}

        {/* Hospital Markers */}
        {hospitals.map((h, idx) => {
          if (!h.coordinates || h.coordinates.length < 2) return null;
          const pos = [h.coordinates[1], h.coordinates[0]]; // [lat, lng]
          return (
            <Marker key={idx} position={pos} icon={hospitalIcon(h.isSuitable)}>
              <Popup>
                <div className="text-xs">
                  <p className="font-bold text-slate-900">{h.name}</p>
                  <p className="text-slate-500 text-[10px]">{h.address?.street || ''}</p>
                  {h.distanceKm && (
                    <span className="inline-block mt-1 font-semibold text-blue-600">
                      {h.distanceKm} km away
                    </span>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Route Polyline */}
        {polylineCoords.length === 2 && (
          <Polyline
            positions={polylineCoords}
            color="#2563EB"
            weight={4}
            opacity={0.8}
            dashArray="8, 8"
          />
        )}
      </MapContainer>
    </div>
  );
};

