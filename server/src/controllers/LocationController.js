// Use globalThis.fetch (Node.js 18+ built-in)
const fetch = (...args) => globalThis.fetch(...args);

// In-memory cache with 15-minute TTL
const geocodeCache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000;

const getCached = (key) => {
  const item = geocodeCache.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > CACHE_TTL_MS) {
    geocodeCache.delete(key);
    return null;
  }
  return item.data;
};

const setCached = (key, data) => {
  if (geocodeCache.size > 2000) {
    // Evict oldest entries
    const firstKey = geocodeCache.keys().next().value;
    geocodeCache.delete(firstKey);
  }
  geocodeCache.set(key, { data, timestamp: Date.now() });
};

export class LocationController {
  /**
   * GET /api/location/reverse-geocode?lat=...&lng=...
   */
  async reverseGeocode(req, res, next) {
    try {
      const lat = parseFloat(req.query.lat);
      const lng = parseFloat(req.query.lng);

      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return res.status(400).json({
          success: false,
          message: 'Valid latitude (-90 to 90) and longitude (-180 to 180) are required.',
        });
      }

      const cacheKey = `rev_${lat.toFixed(4)}_${lng.toFixed(4)}`;
      const cached = getCached(cacheKey);
      if (cached) {
        return res.json({ success: true, fromCache: true, data: cached });
      }

      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=17&addressdetails=1`;
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'SHAP-Smart-Healthcare-Access-Platform/1.0 (+http://localhost:5000; support@shap.org)',
        },
        timeout: 4000,
      });

      if (!response.ok) {
        throw new Error(`Reverse geocoding upstream error: ${response.status}`);
      }

      const json = await response.json();
      const addr = json.address || {};

      const parts = [
        addr.road || addr.pedestrian || addr.suburb || addr.neighbourhood,
        addr.city_district || addr.suburb,
        addr.city || addr.town || addr.village || addr.municipality || addr.county,
        addr.state,
        addr.postcode ? `PIN: ${addr.postcode}` : '',
      ].filter(Boolean);

      const formattedAddress =
        parts.length > 0
          ? parts.join(', ')
          : json.display_name?.split(',').slice(0, 4).join(', ') || `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;

      const resultData = {
        latitude: lat,
        longitude: lng,
        address: formattedAddress,
        rawAddress: addr,
        displayName: json.display_name || formattedAddress,
      };

      setCached(cacheKey, resultData);
      return res.json({ success: true, data: resultData });
    } catch (err) {
      console.warn('[LocationController] Reverse geocoding fallback:', err.message);
      const lat = parseFloat(req.query.lat);
      const lng = parseFloat(req.query.lng);
      return res.json({
        success: true,
        fallback: true,
        data: {
          latitude: lat,
          longitude: lng,
          address: `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
          displayName: `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        },
      });
    }
  }

  /**
   * GET /api/location/geocode?q=...
   */
  async geocode(req, res, next) {
    try {
      const q = (req.query.q || req.query.query || '').trim();
      if (!q || q.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Search query must be at least 2 characters long.',
        });
      }

      const cacheKey = `geo_${q.toLowerCase()}`;
      const cached = getCached(cacheKey);
      if (cached) {
        return res.json({ success: true, fromCache: true, data: cached });
      }

      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        q
      )}&addressdetails=1&countrycodes=in&limit=8`;

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'SHAP-Smart-Healthcare-Access-Platform/1.0 (+http://localhost:5000; support@shap.org)',
        },
        timeout: 4000,
      });

      if (!response.ok) {
        throw new Error(`Geocoding upstream error: ${response.status}`);
      }

      const json = await response.json();
      const results = (json || []).map((item) => {
        const addr = item.address || {};
        const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || addr.city_district || '';
        const state = addr.state || '';
        const country = addr.country || 'India';
        const postalCode = addr.postcode || '';
        const locality = addr.suburb || addr.neighbourhood || addr.road || addr.pedestrian || '';
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

      setCached(cacheKey, results);
      return res.json({ success: true, count: results.length, data: results });
    } catch (err) {
      console.warn('[LocationController] Geocoding fallback error:', err.message);
      return res.json({
        success: true,
        count: 0,
        data: [],
        message: 'Could not fetch remote suggestions. You can adjust your location on the map.',
      });
    }
  }
}

export const locationController = new LocationController();
