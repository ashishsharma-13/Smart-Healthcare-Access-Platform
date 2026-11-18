import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  getUserCurrentLocation,
  reverseGeocode,
  forwardGeocode,
  calculateDistanceKm,
  estimateTravelTimeMinutes,
} from '../utils/geoUtils';

const LocationContext = createContext(null);

export const LocationProvider = ({ children }) => {
  // Concept 1: deviceLocation = Actual hardware/browser GPS location
  const [deviceLocation, setDeviceLocation] = useState({
    latitude: null,
    longitude: null,
    accuracyMeters: null,
    capturedAt: null,
    source: 'DEVICE_GEOLOCATION',
    address: '',
    hasLocation: false,
  });

  // Concept 2: selectedSearchLocation = Location selected for healthcare discovery (Doctor Search, Hospital Search, Healthcare Map)
  const [selectedSearchLocation, setSelectedSearchLocation] = useState({
    latitude: null,
    longitude: null,
    address: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    source: 'DEVICE_GEOLOCATION', // 'DEVICE_GEOLOCATION' | 'MANUAL' | 'MAP_SELECTED'
    accuracyMeters: null,
    capturedAt: null,
    confirmed: false,
    hasLocation: false,
  });

  // Concept 3: emergencyRequestLocation = Confirmed location snapshot attached to an emergency request
  const [emergencyRequestLocation, setEmergencyRequestLocation] = useState(null);

  const [permissionStatus, setPermissionStatus] = useState('CHECKING'); // 'GRANTED' | 'DENIED' | 'PROMPT' | 'UNSUPPORTED' | 'CHECKING'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null); // { code: string, message: string }
  const [isTracking, setIsTracking] = useState(false);

  const watchIdRef = useRef(null);
  const liveCallbackRef = useRef(null);

  // 1. Initial Permission Check and Restore from Session Storage on Mount
  useEffect(() => {
    let permissionObj = null;

    const checkPermissionAndRestore = async () => {
      if (!('geolocation' in navigator)) {
        setPermissionStatus('UNSUPPORTED');
      } else if (navigator.permissions && navigator.permissions.query) {
        try {
          permissionObj = await navigator.permissions.query({ name: 'geolocation' });
          const mapState = (state) => {
            if (state === 'granted') return 'GRANTED';
            if (state === 'denied') return 'DENIED';
            return 'PROMPT';
          };

          setPermissionStatus(mapState(permissionObj.state));

          permissionObj.onchange = () => {
            const newState = mapState(permissionObj.state);
            setPermissionStatus(newState);
            if (newState === 'GRANTED') {
              setError(null);
            } else if (newState === 'DENIED') {
              setError({
                code: 'PERMISSION_DENIED',
                message: 'Location permission was denied in your browser settings.',
              });
            }
          };
        } catch (err) {
          setPermissionStatus('PROMPT');
        }
      } else {
        setPermissionStatus('PROMPT');
      }

      // Check for cached manual search location
      try {
        const cachedSearch = sessionStorage.getItem('shap_selected_search_location');
        if (cachedSearch) {
          const parsed = JSON.parse(cachedSearch);
          if (parsed && parsed.latitude != null && parsed.longitude != null) {
            setSelectedSearchLocation({
              ...parsed,
              hasLocation: true,
              confirmed: true,
            });
          }
        }

        // Check for cached device coordinates
        const cachedDevice = sessionStorage.getItem('shap_device_coords');
        if (cachedDevice) {
          const parsed = JSON.parse(cachedDevice);
          if (parsed && parsed.latitude != null && parsed.longitude != null) {
            setDeviceLocation({
              latitude: parsed.latitude,
              longitude: parsed.longitude,
              accuracyMeters: parsed.accuracyMeters || null,
              capturedAt: parsed.capturedAt || new Date().toISOString(),
              source: 'DEVICE_GEOLOCATION',
              address: parsed.address || '',
              hasLocation: true,
            });

            // If no manual search location was explicitly set, default search location to device
            if (!cachedSearch) {
              setSelectedSearchLocation({
                latitude: parsed.latitude,
                longitude: parsed.longitude,
                address: parsed.address || '',
                city: parsed.city || '',
                state: parsed.state || '',
                country: parsed.country || 'India',
                postalCode: parsed.postalCode || '',
                source: 'DEVICE_GEOLOCATION',
                accuracyMeters: parsed.accuracyMeters || null,
                capturedAt: parsed.capturedAt || new Date().toISOString(),
                confirmed: true,
                hasLocation: true,
              });
            }
          }
        }
      } catch (e) {
        console.warn('Session location restore error:', e);
      }
    };

    checkPermissionAndRestore();

    return () => {
      if (permissionObj) {
        permissionObj.onchange = null;
      }
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  /**
   * Action 1: Request and obtain live device GPS location.
   * Updates deviceLocation WITHOUT destroying any user-specified manual search location unless requested.
   */
  const detectCurrentLocation = useCallback(async (options = { forceRefresh: false, applyToSearch: true }) => {
    setLoading(true);
    setError(null);

    const result = await getUserCurrentLocation(options.forceRefresh);

    if (result.isSuccess) {
      const devLoc = {
        latitude: result.latitude,
        longitude: result.longitude,
        accuracyMeters: result.accuracy,
        capturedAt: result.capturedAt || new Date().toISOString(),
        source: 'DEVICE_GEOLOCATION',
        address: result.address || '',
        hasLocation: true,
      };

      setDeviceLocation(devLoc);
      sessionStorage.setItem('shap_device_coords', JSON.stringify(devLoc));
      setPermissionStatus('GRANTED');
      setError(null);

      // If requested or if the search location was not locked manually, sync search location
      if (options.applyToSearch || selectedSearchLocation.source === 'DEVICE_GEOLOCATION' || !selectedSearchLocation.hasLocation) {
        const searchLoc = {
          latitude: result.latitude,
          longitude: result.longitude,
          address: result.address || '',
          city: '',
          state: '',
          country: 'India',
          postalCode: '',
          source: 'DEVICE_GEOLOCATION',
          accuracyMeters: result.accuracy,
          capturedAt: devLoc.capturedAt,
          confirmed: true,
          hasLocation: true,
        };
        setSelectedSearchLocation(searchLoc);
        sessionStorage.setItem('shap_selected_search_location', JSON.stringify(searchLoc));
      }

      setLoading(false);
      return { success: true, location: devLoc };
    } else {
      const err = result.error || {
        code: 'UNKNOWN',
        message: 'Unable to determine your current device location.',
      };
      if (err.code === 'PERMISSION_DENIED') {
        setPermissionStatus('DENIED');
      }
      setError(err);
      setLoading(false);
      return { success: false, error: err };
    }
  }, [selectedSearchLocation.source, selectedSearchLocation.hasLocation]);

  /**
   * Action 2: Set manually selected search location (or map selected location).
   * Crucial rule: Updates selectedSearchLocation WITHOUT altering deviceLocation.
   */
  const setManualSearchLocation = useCallback(async (manualData) => {
    setLoading(true);
    setError(null);

    try {
      let lat = manualData.latitude != null ? Number(manualData.latitude) : null;
      let lng = manualData.longitude != null ? Number(manualData.longitude) : null;
      let addr = manualData.address || manualData.resolvedAddress || manualData.displayName || '';
      let city = manualData.city || '';
      let state = manualData.state || '';
      let country = manualData.country || 'India';
      let postalCode = manualData.postalCode || '';
      const src = manualData.source === 'MAP_SELECTED' ? 'MAP_SELECTED' : 'MANUAL';

      // If coordinates are missing but text address is provided, resolve via geocoding
      if ((lat == null || lng == null) && addr.trim()) {
        const matches = await forwardGeocode(addr);
        if (matches && matches.length > 0) {
          const match = matches[0];
          lat = match.latitude;
          lng = match.longitude;
          addr = match.resolvedAddress || match.displayName || addr;
          city = match.city || city;
          state = match.state || state;
          country = match.country || country;
          postalCode = match.postalCode || postalCode;
        }
      }

      // If coordinates are present but address is missing, resolve via reverse geocoding
      if (lat != null && lng != null && !addr.trim()) {
        addr = await reverseGeocode(lat, lng);
      }

      if (lat == null || lng == null || isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        const err = {
          code: 'INVALID_COORDINATES',
          message: 'Please provide valid coordinates or a recognized address.',
        };
        setError(err);
        setLoading(false);
        return { success: false, error: err };
      }

      const updatedSearch = {
        latitude: lat,
        longitude: lng,
        address: addr || `Coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        city,
        state,
        country,
        postalCode,
        source: src,
        accuracyMeters: null,
        capturedAt: new Date().toISOString(),
        confirmed: true,
        hasLocation: true,
      };

      setSelectedSearchLocation(updatedSearch);
      sessionStorage.setItem('shap_selected_search_location', JSON.stringify(updatedSearch));

      setError(null);
      setLoading(false);
      return { success: true, location: updatedSearch };
    } catch (e) {
      const err = { code: 'MANUAL_ERROR', message: e.message || 'Error saving manual location' };
      setError(err);
      setLoading(false);
      return { success: false, error: err };
    }
  }, []);

  /**
   * Action 3: Switch search location back to device GPS location.
   */
  const resetSearchLocationToDevice = useCallback(async () => {
    sessionStorage.removeItem('shap_selected_search_location');
    if (deviceLocation.hasLocation) {
      const resetSearch = {
        latitude: deviceLocation.latitude,
        longitude: deviceLocation.longitude,
        address: deviceLocation.address,
        city: '',
        state: '',
        country: 'India',
        postalCode: '',
        source: 'DEVICE_GEOLOCATION',
        accuracyMeters: deviceLocation.accuracyMeters,
        capturedAt: deviceLocation.capturedAt,
        confirmed: true,
        hasLocation: true,
      };
      setSelectedSearchLocation(resetSearch);
      sessionStorage.setItem('shap_selected_search_location', JSON.stringify(resetSearch));
      return { success: true, location: resetSearch };
    } else {
      return detectCurrentLocation({ forceRefresh: true, applyToSearch: true });
    }
  }, [deviceLocation, detectCurrentLocation]);

  /**
   * Action 4: Save confirmed emergency request location snapshot.
   */
  const setEmergencyLocationSnapshot = useCallback((emergencyLoc) => {
    if (!emergencyLoc) return;
    const snap = {
      latitude: emergencyLoc.latitude,
      longitude: emergencyLoc.longitude,
      address: emergencyLoc.address || '',
      source: emergencyLoc.source || 'DEVICE_GEOLOCATION',
      accuracyMeters: emergencyLoc.accuracyMeters || null,
      capturedAt: emergencyLoc.capturedAt || new Date().toISOString(),
      confirmed: true,
      hasLocation: true,
    };
    setEmergencyRequestLocation(snap);
    sessionStorage.setItem('shap_emergency_location', JSON.stringify(snap));
  }, []);

  /**
   * Action 5: Continuous Live Location Tracking (En-route transit).
   * Sends updates to server without mutating original emergency request snapshot.
   */
  const startLiveTracking = useCallback((callback = null) => {
    if (!('geolocation' in navigator)) {
      setError({ code: 'UNSUPPORTED', message: 'Geolocation is not supported.' });
      return;
    }

    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    liveCallbackRef.current = callback;
    setIsTracking(true);

    let lastSentTime = 0;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy, speed, heading } = pos.coords;
        const now = Date.now();

        if (now - lastSentTime >= 3000) {
          lastSentTime = now;
          const liveData = {
            latitude,
            longitude,
            accuracyMeters: Math.round(accuracy || 10),
            speed: speed != null ? Math.round(speed * 3.6) : null,
            heading: heading != null ? Math.round(heading) : null,
            capturedAt: new Date().toISOString(),
            source: 'DEVICE_GEOLOCATION',
          };

          setDeviceLocation((prev) => ({
            ...prev,
            latitude,
            longitude,
            accuracyMeters: liveData.accuracyMeters,
            capturedAt: liveData.capturedAt,
          }));

          if (liveCallbackRef.current) {
            liveCallbackRef.current(liveData);
          }
        }
      },
      (err) => {
        console.warn('[LocationContext] watchPosition error:', err.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 2000,
        timeout: 12000,
      }
    );
  }, []);

  const stopLiveTracking = useCallback(() => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    liveCallbackRef.current = null;
    setIsTracking(false);
  }, []);

  const clearLocation = useCallback(() => {
    sessionStorage.removeItem('shap_selected_search_location');
    sessionStorage.removeItem('shap_device_coords');
    sessionStorage.removeItem('shap_emergency_location');
    setSelectedSearchLocation({
      latitude: null,
      longitude: null,
      address: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
      source: 'DEVICE_GEOLOCATION',
      accuracyMeters: null,
      capturedAt: null,
      confirmed: false,
      hasLocation: false,
    });
    setDeviceLocation({
      latitude: null,
      longitude: null,
      accuracyMeters: null,
      capturedAt: null,
      source: 'DEVICE_GEOLOCATION',
      address: '',
      hasLocation: false,
    });
    setEmergencyRequestLocation(null);
    setError(null);
  }, []);

  // Backward compatibility alias: `location` maps to `selectedSearchLocation`
  const location = selectedSearchLocation;
  const hasLocation = Boolean(selectedSearchLocation.latitude != null && selectedSearchLocation.longitude != null);

  const value = {
    // Concept 1: device-detected GPS location
    deviceLocation,
    // Concept 2: selected location for healthcare search & discovery
    selectedSearchLocation,
    // Concept 3: confirmed emergency location snapshot
    emergencyRequestLocation,

    // Backward compatibility
    location,
    hasLocation,

    permissionStatus,
    loading,
    error,
    isTracking,

    // Primary Actions
    detectCurrentLocation,
    setManualSearchLocation,
    setManualLocation: setManualSearchLocation,
    resetSearchLocationToDevice,
    setEmergencyLocationSnapshot,
    refreshLocation: () => detectCurrentLocation({ forceRefresh: true }),
    startLiveTracking,
    stopLiveTracking,
    clearLocation,

    // Distance utilities relative to selectedSearchLocation
    calculateDistanceTo: (targetLat, targetLng) =>
      hasLocation
        ? calculateDistanceKm(selectedSearchLocation.latitude, selectedSearchLocation.longitude, targetLat, targetLng)
        : null,
    estimateTravelTimeTo: (targetLat, targetLng) => {
      if (!hasLocation) return null;
      const d = calculateDistanceKm(
        selectedSearchLocation.latitude,
        selectedSearchLocation.longitude,
        targetLat,
        targetLng
      );
      return estimateTravelTimeMinutes(d);
    },
  };

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
};

export const useUserLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useUserLocation must be used within a LocationProvider');
  }
  return context;
};

export const useLocationService = useUserLocation;
export default LocationContext;
