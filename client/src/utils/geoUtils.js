/**
 * Dynamic Geolocation & Coordinate Utilities for SHAP
 */

/**
 * Extracts accurate physical latitude and longitude from any facility entity.
 * Checks GeoJSON location, operatingAddress coordinates, direct coordinates array, and lat/lng properties.
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
 * Prefers operating address fields, with fallbacks to legal registered address.
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
 * Reverse-geocodes latitude and longitude into a human-friendly address string
 * using OpenStreetMap Nominatim with fast timeout and caching.
 */
export const reverseGeocode = async (lat, lng) => {
  if (!lat || !lng) return '';

  const cacheKey = `shap_revgeo_${lat.toFixed(3)}_${lng.toFixed(3)}`;
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) return cached;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
      {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'SHAP-Smart-Healthcare-Access-Platform',
        },
      }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const parts = [
        addr.suburb || addr.neighbourhood || addr.road || addr.commercial,
        addr.city || addr.town || addr.village || addr.county,
        addr.state,
      ].filter(Boolean);

      const resolved = parts.length > 0 ? parts.join(', ') : data.display_name?.split(',').slice(0, 3).join(',');
      if (resolved) {
        sessionStorage.setItem(cacheKey, resolved);
        return resolved;
      }
    }
  } catch (err) {
    // Graceful fallback to formatted coordinates if offline or rate-limited
  }

  const fallback = `GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  return fallback;
};

/**
 * Obtains current user location from session cache or device GPS.
 */
export const getUserCurrentLocation = async (forceRefresh = false) => {
  if (!forceRefresh) {
    const cachedCoords = sessionStorage.getItem('shap_user_coords');
    const cachedAddress = sessionStorage.getItem('shap_user_address');
    if (cachedCoords) {
      try {
        const parsed = JSON.parse(cachedCoords);
        if (parsed.lat && parsed.lng) {
          return {
            lat: parsed.lat,
            lng: parsed.lng,
            address: cachedAddress || `GPS: ${parsed.lat.toFixed(4)}, ${parsed.lng.toFixed(4)}`,
          };
        }
      } catch (e) {}
    }
  }

  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      resolve({
        lat: 28.6139,
        lng: 77.2090,
        address: 'Current Location (Default Coords)',
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy || 10);
        const coords = { lat, lng };

        sessionStorage.setItem('shap_user_coords', JSON.stringify(coords));
        const address = await reverseGeocode(lat, lng);
        sessionStorage.setItem('shap_user_address', address);

        resolve({ lat, lng, address, accuracy, source: 'GPS' });
      },
      () => {
        // Fallback if permission denied
        const fallback = {
          lat: 28.6139,
          lng: 77.2090,
          address: 'Connaught Place, New Delhi',
          accuracy: null,
          source: 'MANUAL',
          permissionDenied: true,
        };
        resolve(fallback);
      },
      { timeout: 7000, enableHighAccuracy: true }
    );
  });
};

/**
 * Master Google Maps Turn-by-Turn Navigation Trigger.
 * Dynamically extracts hospital operating lat/lng and patient GPS origin.
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

  // Determine origin parameter from userLocation or session
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
