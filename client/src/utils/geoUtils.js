/**
 * Dynamic Geolocation & Coordinate Utilities for SHAP
 */

import api from '../services/api';

/**
 * Calculates straight-line distance between two geographic coordinates using the Haversine formula.
 * @param {number} lat1 Latitude of origin
 * @param {number} lon1 Longitude of origin
 * @param {number} lat2 Latitude of destination
 * @param {number} lon2 Longitude of destination
 * @returns {number|null} Distance in kilometers rounded to 1 decimal place, or null if invalid.
 */
export const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const numLat1 = Number(lat1);
  const numLon1 = Number(lon1);
  const numLat2 = Number(lat2);
  const numLon2 = Number(lon2);
  if (isNaN(numLat1) || isNaN(numLon1) || isNaN(numLat2) || isNaN(numLon2)) return null;

  const R = 6371; // Earth radius in km
  const dLat = ((numLat2 - numLat1) * Math.PI) / 180;
  const dLon = ((numLon2 - numLon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((numLat1 * Math.PI) / 180) *
      Math.cos((numLat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

/**
 * Estimates driving travel time in minutes based on distance and average urban transit speed (30 km/h).
 * @param {number} distanceKm Distance in kilometers
 * @returns {number} Estimated minutes (minimum 3 minutes)
 */
export const estimateTravelTimeMinutes = (distanceKm) => {
  if (distanceKm == null || isNaN(distanceKm)) return null;
  const avgSpeedKmH = 30; // standard urban ambulance / car transit speed
  const minutes = (distanceKm / avgSpeedKmH) * 60;
  return Math.max(3, Math.round(minutes));
};

/**
 * Extracts accurate physical latitude and longitude from any facility entity.
 */
export const getFacilityCoordinates = (facility) => {
  if (!facility) return null;

  const destCoords =
    facility.location?.coordinates ||
    facility.operatingAddress?.location?.coordinates ||
    facility.operatingAddress?.coordinates ||
    (Array.isArray(facility.coordinates) ? facility.coordinates : null);

  if (destCoords && Array.isArray(destCoords) && destCoords.length >= 2) {
    const lng = parseFloat(destCoords[0]);
    const lat = parseFloat(destCoords[1]);
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
  }

  const lat = parseFloat(facility.latitude ?? facility.lat);
  const lng = parseFloat(facility.longitude ?? facility.lng);
  if (!isNaN(lat) && !isNaN(lng)) {
    return { lat, lng };
  }

  return null;
};

/**
 * Formats a verified readable address string for a healthcare facility.
 */
export const formatFacilityAddress = (facility) => {
  if (!facility) return 'Clinical Facility Site';

  const op = facility.operatingAddress;
  if (op && (op.streetName || op.locality || op.city)) {
    const parts = [
      op.buildingNumber,
      op.streetName,
      op.locality || op.area,
      op.city,
      op.pinCode ? `PIN: ${op.pinCode}` : '',
    ].filter(Boolean);
    if (parts.length > 0) return parts.join(', ');
  }

  const reg = facility.registeredAddress || facility.address;
  if (reg && (reg.streetName || reg.street || reg.city)) {
    const parts = [
      reg.buildingNumber,
      reg.streetName || reg.street,
      reg.locality || reg.area,
      reg.city,
      reg.pinCode || reg.postalCode,
    ].filter(Boolean);
    if (parts.length > 0) return parts.join(', ');
  }

  return facility.name || 'Healthcare Facility Site';
};

/**
 * Formats coordinates for clean UI display.
 */
export const formatCoordinates = (lat, lng, decimals = 4) => {
  if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) return 'N/A';
  return `${Number(lat).toFixed(decimals)}°, ${Number(lng).toFixed(decimals)}°`;
};

/**
 * Reverse-geocodes latitude and longitude into a readable address string.
 * First tries backend proxy `/api/location/reverse-geocode`, with graceful fallback
 * to OpenStreetMap Nominatim or formatted coordinate string.
 */
export const reverseGeocode = async (lat, lng) => {
  if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) return '';

  const cacheKey = `shap_revgeo_${Number(lat).toFixed(4)}_${Number(lng).toFixed(4)}`;
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) return cached;

  // 1. Try our dedicated backend geocoding proxy
  try {
    const res = await api.get(`/location/reverse-geocode?lat=${lat}&lng=${lng}`, { timeout: 3500 });
    if (res.data?.success && res.data.data?.address) {
      const addr = res.data.data.address;
      sessionStorage.setItem(cacheKey, addr);
      return addr;
    }
  } catch (err) {
    // Proceed to direct OSM fallback
  }

  // 2. Direct OpenStreetMap Nominatim fallback
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=17&addressdetails=1`,
      {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'SHAP-Smart-Healthcare-Access-Platform/1.0',
        },
      }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const parts = [
        addr.road || addr.pedestrian || addr.suburb || addr.neighbourhood,
        addr.city || addr.town || addr.village || addr.county,
        addr.state,
      ].filter(Boolean);

      const resolved = parts.length > 0 ? parts.join(', ') : data.display_name?.split(',').slice(0, 3).join(', ');
      if (resolved) {
        sessionStorage.setItem(cacheKey, resolved);
        return resolved;
      }
    }
  } catch (err) {
    // Graceful fallback
  }

  const fallback = `Coordinates (${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)})`;
  return fallback;
};

/**
 * Forward-geocodes an address or landmark text into coordinates and location details.
 */
export const forwardGeocode = async (queryText) => {
  const query = (queryText || '').trim();
  if (!query || query.length < 2) return [];

  const cacheKey = `shap_fwdgeo_${query.toLowerCase()}`;
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {}
  }

  // 1. Try our dedicated backend geocoding proxy
  try {
    const res = await api.get(`/location/geocode?q=${encodeURIComponent(query)}`, { timeout: 3500 });
    if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
      sessionStorage.setItem(cacheKey, JSON.stringify(res.data.data));
      return res.data.data;
    }
  } catch (err) {
    // Proceed to direct OSM fallback
  }

  // 2. Direct OpenStreetMap Nominatim fallback
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5`,
      {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'SHAP-Smart-Healthcare-Access-Platform/1.0',
        },
      }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const mapped = (data || []).map((item) => {
        const addr = item.address || {};
        const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || addr.city_district || '';
        const state = addr.state || '';
        const country = addr.country || 'India';
        const postalCode = addr.postcode || '';
        const locality = addr.suburb || addr.neighbourhood || addr.road || '';
        const parts = [locality, city, state, postalCode ? `PIN: ${postalCode}` : '', country].filter(Boolean);
        const resolvedAddress = parts.length > 0 ? parts.join(', ') : item.display_name;

        return {
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
          displayName: item.display_name,
          resolvedAddress,
          city,
          state,
          country,
          postalCode,
          type: item.type || item.class || 'location',
          rawAddress: addr,
        };
      });
      sessionStorage.setItem(cacheKey, JSON.stringify(mapped));
      return mapped;
    }
  } catch (err) {
    console.warn('[forwardGeocode] error:', err.message);
  }

  return [];
};

/**
 * Obtains current user location using standard browser Geolocation API.
 * High-accuracy attempt with automatic fallback to standard accuracy and clear error tagging.
 */
export const getUserCurrentLocation = async (forceRefresh = false) => {
  if (!forceRefresh) {
    const cachedCoords = sessionStorage.getItem('shap_user_coords');
    const cachedAddress = sessionStorage.getItem('shap_user_address');
    const cachedSource = sessionStorage.getItem('shap_user_source');
    if (cachedCoords) {
      try {
        const parsed = JSON.parse(cachedCoords);
        if (parsed.lat != null && parsed.lng != null) {
          return {
            lat: parsed.lat,
            lng: parsed.lng,
            latitude: parsed.lat,
            longitude: parsed.lng,
            accuracy: parsed.accuracy || 10,
            address: cachedAddress || `Location (${parsed.lat.toFixed(4)}, ${parsed.lng.toFixed(4)})`,
            source: cachedSource || 'DEVICE_GEOLOCATION',
            isSuccess: true,
          };
        }
      } catch (e) {}
    }
  }

  if (!('geolocation' in navigator)) {
    return {
      isSuccess: false,
      error: { code: 'UNSUPPORTED', message: 'Geolocation is not supported by your browser.' },
    };
  }

  // Helper for single position query with timeout
  const queryPosition = (options) =>
    new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });

  try {
    // Attempt 1: High accuracy
    let pos;
    try {
      pos = await queryPosition({ enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
    } catch (highAccErr) {
      // If timed out or unavailable, try attempt 2: standard accuracy
      if (highAccErr.code === 3 || highAccErr.code === 2) {
        pos = await queryPosition({ enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 });
      } else {
        throw highAccErr;
      }
    }

    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const accuracy = Math.round(pos.coords.accuracy || 10);
    const coords = { lat, lng, accuracy };

    sessionStorage.setItem('shap_user_coords', JSON.stringify(coords));
    sessionStorage.setItem('shap_user_source', 'DEVICE_GEOLOCATION');

    const address = await reverseGeocode(lat, lng);
    sessionStorage.setItem('shap_user_address', address);

    return {
      lat,
      lng,
      latitude: lat,
      longitude: lng,
      accuracy,
      address,
      source: 'DEVICE_GEOLOCATION',
      capturedAt: new Date().toISOString(),
      isSuccess: true,
    };
  } catch (err) {
    let errorCode = 'UNKNOWN';
    let errorMessage = 'Unable to determine your current location.';

    if (err.code === 1) {
      errorCode = 'PERMISSION_DENIED';
      errorMessage =
        'Location permission was denied. Please check your browser location settings or address bar icon to allow access.';
    } else if (err.code === 2) {
      errorCode = 'POSITION_UNAVAILABLE';
      errorMessage = 'Location signal is unavailable. Please check that location services are enabled on your device.';
    } else if (err.code === 3) {
      errorCode = 'TIMEOUT';
      errorMessage = 'Location request timed out while acquiring GPS/Wi-Fi fix. Please tap retry.';
    }

    return {
      isSuccess: false,
      error: { code: errorCode, message: errorMessage },
    };
  }
};

/**
 * Master Google Maps Turn-by-Turn Navigation Trigger.
 */
export const handleOpenGoogleMaps = (facilityOrLat, lngOrNull = null, userLocation = null) => {
  let destLat;
  let destLng;
  let fallbackName = '';

  if (facilityOrLat && typeof facilityOrLat === 'object') {
    const facility = facilityOrLat;
    const coords = getFacilityCoordinates(facility);
    if (coords) {
      destLat = coords.lat;
      destLng = coords.lng;
    }
    fallbackName = formatFacilityAddress(facility);
  } else if (typeof facilityOrLat === 'number' && typeof lngOrNull === 'number') {
    destLat = facilityOrLat;
    destLng = lngOrNull;
  }

  let originParam = '';
  let uLat;
  let uLng;

  if (userLocation) {
    if (typeof userLocation.lat === 'number' && typeof userLocation.lng === 'number') {
      uLat = userLocation.lat;
      uLng = userLocation.lng;
    } else if (Array.isArray(userLocation) && userLocation.length === 2) {
      uLat = userLocation[0];
      uLng = userLocation[1];
    }
  }

  if (uLat == null || uLng == null) {
    try {
      const cached = sessionStorage.getItem('shap_user_coords');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.lat && parsed.lng) {
          uLat = parsed.lat;
          uLng = parsed.lng;
        }
      }
    } catch (e) {}
  }

  if (uLat != null && uLng != null) {
    originParam = `&origin=${uLat},${uLng}`;
  }

  const destination =
    destLat != null && destLng != null
      ? `${destLat},${destLng}`
      : encodeURIComponent(fallbackName || 'Destination Hospital');

  const url = `https://www.google.com/maps/dir/?api=1${originParam}&destination=${destination}&travelmode=driving`;
  window.open(url, '_blank', 'noopener,noreferrer');
};
