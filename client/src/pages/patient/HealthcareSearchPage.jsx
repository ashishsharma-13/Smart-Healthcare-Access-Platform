import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { LeafletMap, openGoogleMapsNavigation } from '../../components/common/LeafletMap';
import {
  Search,
  MapPin,
  Stethoscope,
  Building2,
  Bookmark,
  BookmarkCheck,
  Star,
  CheckCircle2,
  Clock,
  Calendar,
  Filter,
  X,
  ChevronRight,
  Crosshair,
  List,
  Map,
  ShieldCheck,
  Phone,
  BedDouble,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  Info,
  Loader2,
  Check,
  HeartHandshake,
} from 'lucide-react';

const PRESET_LOCATIONS = [
  { name: 'Hyderabad (UoH / Gachibowli)', coords: [17.4568, 78.3264] },
  { name: 'Hyderabad (Hitec City)', coords: [17.4474, 78.3762] },
  { name: 'New Delhi (Central)', coords: [28.6139, 77.2090] },
  { name: 'Noida (Sector 62)', coords: [28.6280, 77.3649] },
  { name: 'Gurugram (Cyber Hub)', coords: [28.4950, 77.0895] },
  { name: 'Mumbai (South)', coords: [18.9256, 72.8242] },
  { name: 'Bengaluru (MG Road)', coords: [12.9716, 77.5946] },
  { name: 'Chennai (Central)', coords: [13.0827, 80.2707] },
];

export const HealthcareSearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Mode: 'doctors' | 'organizations' | 'saved'
  const initialMode = searchParams.get('mode') || (searchParams.get('type') === 'hospital' ? 'organizations' : 'doctors');
  const [activeMode, setActiveMode] = useState(initialMode);

  // Search input & history
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || searchParams.get('search') || '');
  const [searchHistory, setSearchHistory] = useState([]);

  // Location & Radius - Default to Current User Location (Hyderabad / UoH Campus)
  const [selectedLocationName, setSelectedLocationName] = useState('Hyderabad (UoH / Gachibowli)');
  const [currentCoords, setCurrentCoords] = useState([17.4568, 78.3264]); // [lat, lng]
  const [radiusKm, setRadiusKm] = useState(20);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState(null);

  // View state: 'list' | 'map'
  const [viewMode, setViewMode] = useState('list');

  // Filters State - Doctors
  const [specialization, setSpecialization] = useState(searchParams.get('specialization') || 'All');
  const [minExperience, setMinExperience] = useState('Any');
  const [qualification, setQualification] = useState('All');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [doctorSortBy, setDoctorSortBy] = useState('rating');

  // Filters State - Organizations
  const [orgType, setOrgType] = useState('all');
  const [selectedCapability, setSelectedCapability] = useState('All');
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [orgSortBy, setOrgSortBy] = useState('distance');

  // Discovery metadata options
  const [specializationsList, setSpecializationsList] = useState([
    'All',
    'Cardiology',
    'Neurology',
    'Pediatrics',
    'Orthopedics',
    'Ophthalmology',
    'General Medicine',
    'Emergency Medicine',
    'Dermatology',
    'Oncology',
  ]);
  const [capabilitiesList, setCapabilitiesList] = useState([
    'All',
    'Adult ICU',
    'Emergency Department',
    'Cardiac Cath Lab',
    '24/7 Trauma',
    'Neonatal ICU (NICU)',
    'MRI & CT Diagnostics',
    'Advanced Operation Theaters',
  ]);

  // Data State
  const [doctors, setDoctors] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [savedProviders, setSavedProviders] = useState([]);
  const [savedIdSet, setSavedIdSet] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [doctorAvailability, setDoctorAvailability] = useState(null);
  const [availLoading, setAvailLoading] = useState(false);

  // Attempt detecting live GPS coordinates on mount if available
  useEffect(() => {
    const cachedCoords = sessionStorage.getItem('shap_user_coords');
    if (cachedCoords) {
      try {
        const parsed = JSON.parse(cachedCoords);
        if (parsed.lat && parsed.lng) {
          setCurrentCoords([parsed.lat, parsed.lng]);
          setSelectedLocationName(sessionStorage.getItem('shap_user_address') || 'Current GPS Location');
        }
      } catch (e) {}
    } else if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = [pos.coords.latitude, pos.coords.longitude];
          setCurrentCoords(coords);
          setSelectedLocationName('Current GPS Location');
          sessionStorage.setItem('shap_user_coords', JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }));
        },
        () => {},
        { timeout: 5000, enableHighAccuracy: true }
      );
    }
  }, []);

  // Load Metadata & Search History once
  useEffect(() => {
    fetchMetadata();
    if (user) {
      fetchSearchHistory();
      fetchSavedProviders();
    }
  }, [user]);

  // Execute Search whenever activeMode or filters change
  useEffect(() => {
    if (activeMode === 'doctors') {
      fetchDoctors();
    } else if (activeMode === 'organizations') {
      fetchOrganizations();
    } else if (activeMode === 'saved') {
      fetchSavedProviders();
    }
  }, [
    activeMode,
    specialization,
    minExperience,
    qualification,
    availableOnly,
    verifiedOnly,
    doctorSortBy,
    orgType,
    selectedCapability,
    emergencyOnly,
    orgSortBy,
    currentCoords,
    radiusKm,
  ]);

  const fetchMetadata = async () => {
    try {
      const res = await api.get('/search/metadata');
      if (res.data?.success && res.data?.data) {
        if (res.data.data.specializations?.length) {
          setSpecializationsList(['All', ...res.data.data.specializations]);
        }
        if (res.data.data.capabilities?.length) {
          setCapabilitiesList(['All', ...res.data.data.capabilities]);
        }
      }
    } catch (err) {
      console.warn('Failed to load search metadata', err);
    }
  };

  const fetchSearchHistory = async () => {
    try {
      const res = await api.get('/search/history');
      if (res.data?.success && Array.isArray(res.data?.data)) {
        setSearchHistory(res.data.data.slice(0, 5));
      }
    } catch (err) {
      console.warn('Failed to load search history', err);
    }
  };

  const fetchSavedProviders = async () => {
    if (!user) return;
    try {
      const res = await api.get('/search/saved');
      if (res.data?.success && Array.isArray(res.data?.data)) {
        setSavedProviders(res.data.data);
        const ids = new Set(res.data.data.map((p) => String(p.providerId)));
        setSavedIdSet(ids);
      }
    } catch (err) {
      console.warn('Failed to load saved providers', err);
    }
  };

  const fetchDoctors = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        q: searchQuery,
        specialization: specialization === 'All' ? undefined : specialization,
        qualification: qualification === 'All' ? undefined : qualification,
        minExperience: minExperience === 'Any' ? undefined : parseInt(minExperience, 10),
        availableOnly: availableOnly || undefined,
        verifiedOnly: verifiedOnly,
        lat: currentCoords[0],
        lng: currentCoords[1],
        radiusKm: radiusKm,
        sortBy: doctorSortBy,
      };

      const res = await api.get('/search/doctors', { params });
      if (res.data?.success) {
        setDoctors(res.data.data || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to search doctors. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizations = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        q: searchQuery,
        orgType: orgType === 'all' ? undefined : orgType,
        specialization: specialization === 'All' ? undefined : specialization,
        capability: selectedCapability === 'All' ? undefined : selectedCapability,
        emergencyOnly: emergencyOnly || undefined,
        verifiedOnly: verifiedOnly,
        lat: currentCoords[0],
        lng: currentCoords[1],
        radiusKm: radiusKm,
        sortBy: orgSortBy,
      };

      const res = await api.get('/search/organizations', { params });
      if (res.data?.success) {
        setOrganizations(res.data.data || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to search organizations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    if (activeMode === 'doctors') {
      fetchDoctors();
    } else if (activeMode === 'organizations') {
      fetchOrganizations();
    }
  };

  // GPS Geolocation Detector
  const handleDetectGPS = () => {
    if (!('geolocation' in navigator)) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }
    setGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = [pos.coords.latitude, pos.coords.longitude];
        setCurrentCoords(coords);
        setSelectedLocationName('Current GPS Location');
        setGpsLoading(false);
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === 1) {
          setGpsError('Location permission was denied. You can select a preset city or enter custom location.');
        } else {
          setGpsError('Unable to retrieve device GPS location. Using preset location.');
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSelectPresetLocation = (preset) => {
    setSelectedLocationName(preset.name);
    setCurrentCoords(preset.coords);
    setGpsError(null);
  };

  // Bookmark Provider Handler
  const handleToggleBookmark = async (providerType, providerId, e) => {
    e?.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }

    const idStr = String(providerId);
    const isSaved = savedIdSet.has(idStr);

    try {
      if (isSaved) {
        await api.delete(`/search/saved/${providerId}`);
        setSavedIdSet((prev) => {
          const next = new Set(prev);
          next.delete(idStr);
          return next;
        });
        setSavedProviders((prev) => prev.filter((p) => String(p.providerId) !== idStr));
      } else {
        await api.post('/search/saved', { providerType, providerId });
        setSavedIdSet((prev) => new Set([...prev, idStr]));
        fetchSavedProviders();
      }
    } catch (err) {
      console.warn('Failed to update bookmark', err);
    }
  };

  // Open Doctor Modal and load availability
  const handleOpenDoctorModal = async (doctor) => {
    setSelectedDoctor(doctor);
    setAvailLoading(true);
    setDoctorAvailability(null);
    try {
      const res = await api.get(`/search/doctors/${doctor._id}/availability`);
      if (res.data?.success && res.data?.data) {
        setDoctorAvailability(res.data.data);
      }
    } catch (err) {
      console.warn('Failed to load doctor availability slots', err);
    } finally {
      setAvailLoading(false);
    }
  };

  // Open Organization Modal
  const handleOpenOrgModal = async (org) => {
    setSelectedOrg(org);
  };

  // Prepare Hospital Markers for Map View
  const mapHospitals =
    activeMode === 'doctors'
      ? doctors.flatMap((d) =>
          (d.activeAffiliations || []).map((aff) => ({
            _id: `${d._id}-${aff.organizationId}`,
            name: `${d.name} (${aff.organizationName})`,
            coordinates: aff.coordinates || [77.2090, 28.6139],
            address: aff.address,
            distanceKm: aff.distanceKm,
            isVerified: true,
            isPartner: true,
          }))
        )
      : organizations.map((o) => ({
          _id: o._id,
          name: o.name,
          coordinates: o.location?.coordinates || [77.2090, 28.6139],
          address: o.operatingAddress?.city || o.address?.city || '',
          distanceKm: o.distanceKm,
          isVerified: o.verificationStatus === 'verified',
          isPartner: true,
          isEmergency: Boolean(o.emergencyCapable),
        }));

  return (
    <div className="space-y-6 w-full pb-12 select-none">
      {/* 1. Header & Navigation Hub */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center">
                <Search className="w-4 h-4" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Healthcare Search & Discovery
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Find NMC-verified medical specialists, accredited hospitals, and outpatient clinics nearby.
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 self-start md:self-auto">
            <button
              onClick={() => setActiveMode('doctors')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeMode === 'doctors'
                  ? 'bg-white text-brand-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>Find Doctors</span>
            </button>
            <button
              onClick={() => setActiveMode('organizations')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeMode === 'organizations'
                  ? 'bg-white text-brand-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Hospitals & Clinics</span>
            </button>
            {user && (
              <button
                onClick={() => setActiveMode('saved')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeMode === 'saved'
                    ? 'bg-white text-brand-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>Saved ({savedProviders.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. Top Search & Location Bar */}
        <div className="pt-5 space-y-4">
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Query Input */}
            <div className="relative md:col-span-6">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  activeMode === 'doctors'
                    ? 'Search doctor by name, specialty, or condition (e.g., Priya, Cardiology)...'
                    : 'Search hospital by name, facility type, or clinical capability (e.g., Metro City, Adult ICU)...'
                }
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200/90 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    if (activeMode === 'doctors') fetchDoctors();
                    else fetchOrganizations();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Location Selector Dropdown */}
            <div className="relative md:col-span-4">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-600" />
              <select
                value={selectedLocationName}
                onChange={(e) => {
                  const preset = PRESET_LOCATIONS.find((p) => p.name === e.target.value);
                  if (preset) handleSelectPresetLocation(preset);
                }}
                className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200/90 rounded-xl text-xs text-slate-900 font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              >
                {selectedLocationName === 'Current GPS Location' && (
                  <option value="Current GPS Location">📍 Current GPS Location</option>
                )}
                {PRESET_LOCATIONS.map((loc) => (
                  <option key={loc.name} value={loc.name}>
                    {loc.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Search Button + GPS Trigger */}
            <div className="md:col-span-2 flex items-center gap-2">
              <button
                type="button"
                onClick={handleDetectGPS}
                disabled={gpsLoading}
                title="Detect current GPS location"
                className="p-2.5 border border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors disabled:opacity-50 shrink-0"
              >
                {gpsLoading ? <Loader2 className="w-4 h-4 animate-spin text-brand-600" /> : <Crosshair className="w-4 h-4 text-brand-600" />}
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs rounded-xl shadow-2xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search</span>
              </button>
            </div>
          </form>

          {/* GPS Notice / Error Banner */}
          {gpsError && (
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200/80">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>{gpsError}</span>
            </div>
          )}

          {/* Recent Searches Pills */}
          {searchHistory.length > 0 && (
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Recent:</span>
              {searchHistory.map((h, i) => (
                <button
                  key={h.searchHistoryId || i}
                  type="button"
                  onClick={() => {
                    setSearchQuery(h.queryText);
                    if (h.searchType === 'ORGANIZATION') setActiveMode('organizations');
                    else setActiveMode('doctors');
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-[11px] font-medium text-slate-700 transition-colors"
                >
                  <Clock className="w-2.5 h-2.5 text-slate-400" />
                  <span>{h.queryText || h.filters?.specialization || 'Healthcare Search'}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. Main Workspace: Filter Sidebar + Results View */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Filter Sidebar */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-brand-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">Filters</h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setSpecialization('All');
                setMinExperience('Any');
                setQualification('All');
                setAvailableOnly(false);
                setOrgType('all');
                setSelectedCapability('All');
                setEmergencyOnly(false);
                setRadiusKm(20);
              }}
              className="text-[11px] font-semibold text-brand-600 hover:text-brand-800 transition-colors"
            >
              Reset
            </button>
          </div>

          {/* Search Radius Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
              <span>Max Distance Radius</span>
              <span className="text-brand-600 font-bold">{radiusKm} km</span>
            </div>
            <input
              type="range"
              min="5"
              max="100"
              step="5"
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="w-full accent-brand-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-medium">
              <span>5 km</span>
              <span>25 km</span>
              <span>50 km</span>
              <span>100 km</span>
            </div>
          </div>

          {/* Mode Specific Filters */}
          {activeMode === 'doctors' ? (
            <div className="space-y-4">
              {/* Specialization */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">Medical Specialty</label>
                <select
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  {specializationsList.map((spec) => (
                    <option key={spec} value={spec}>
                      {spec}
                    </option>
                  ))}
                </select>
              </div>

              {/* Clinical Experience */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">Min. Experience</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {['Any', '5+', '10+', '15+'].map((exp) => (
                    <button
                      key={exp}
                      type="button"
                      onClick={() => setMinExperience(exp === 'Any' ? 'Any' : exp.replace('+', ''))}
                      className={`py-1.5 text-[11px] font-semibold rounded-lg border transition-all ${
                        (minExperience === 'Any' && exp === 'Any') || minExperience === exp.replace('+', '')
                          ? 'bg-brand-50 border-brand-300 text-brand-700'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {exp}
                    </button>
                  ))}
                </div>
              </div>

              {/* Qualification Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">Qualification</label>
                <select
                  value={qualification}
                  onChange={(e) => setQualification(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="All">All Qualifications</option>
                  <option value="DM">DM (Super-Specialist)</option>
                  <option value="MD">MD / MS (Specialist)</option>
                  <option value="MBBS">MBBS (Graduate)</option>
                </select>
              </div>

              {/* Toggles */}
              <div className="pt-2 space-y-2.5">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={availableOnly}
                    onChange={(e) => setAvailableOnly(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300"
                  />
                  <span>Available for appointments today</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={verifiedOnly}
                    onChange={(e) => setVerifiedOnly(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300"
                  />
                  <span>NMC Verified doctors only</span>
                </label>
              </div>
            </div>
          ) : activeMode === 'organizations' ? (
            <div className="space-y-4">
              {/* Facility Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">Facility Type</label>
                <select
                  value={orgType}
                  onChange={(e) => setOrgType(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="all">All Healthcare Facilities</option>
                  <option value="hospital">Hospitals & Medical Centers</option>
                  <option value="clinic">Outpatient Specialty Clinics</option>
                  <option value="specialty_center">Super-Specialty Centers</option>
                </select>
              </div>

              {/* Clinical Capabilities */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">Registered Capability</label>
                <select
                  value={selectedCapability}
                  onChange={(e) => setSelectedCapability(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  {capabilitiesList.map((cap) => (
                    <option key={cap} value={cap}>
                      {cap}
                    </option>
                  ))}
                </select>
              </div>

              {/* Toggles */}
              <div className="pt-2 space-y-2.5">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={emergencyOnly}
                    onChange={(e) => setEmergencyOnly(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300"
                  />
                  <span>24/7 Emergency Beep capable</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={verifiedOnly}
                    onChange={(e) => setVerifiedOnly(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300"
                  />
                  <span>State Accredited / Verified only</span>
                </label>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500">
              Manage your bookmarked healthcare specialists and hospitals for one-click access.
            </div>
          )}
        </div>

        {/* Right Results Column */}
        <div className="lg:col-span-3 space-y-4">
          {/* Top Results Bar */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">
                {activeMode === 'doctors'
                  ? `${doctors.length} Doctor${doctors.length === 1 ? '' : 's'} Found`
                  : activeMode === 'organizations'
                  ? `${organizations.length} Healthcare Facilit${organizations.length === 1 ? 'y' : 'ies'} Found`
                  : `${savedProviders.length} Saved Provider${savedProviders.length === 1 ? '' : 's'}`}
              </span>
              <span className="text-xs text-slate-400">· within {radiusKm} km of {selectedLocationName}</span>
            </div>

            {/* View Mode Toggle & Sorting */}
            <div className="flex items-center gap-3">
              {activeMode !== 'saved' && (
                <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200/60">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded text-xs font-semibold flex items-center gap-1 transition-all ${
                      viewMode === 'list' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                    }`}
                    title="List View"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode('map')}
                    className={`p-1.5 rounded text-xs font-semibold flex items-center gap-1 transition-all ${
                      viewMode === 'map' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                    }`}
                    title="Interactive Map View"
                  >
                    <Map className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Sorting selector */}
              {activeMode === 'doctors' ? (
                <select
                  value={doctorSortBy}
                  onChange={(e) => setDoctorSortBy(e.target.value)}
                  className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="rating">Highest Rating</option>
                  <option value="distance">Nearest Distance</option>
                  <option value="experience">Most Experienced</option>
                  <option value="next_available">Available First</option>
                  <option value="name">Doctor Name (A–Z)</option>
                </select>
              ) : activeMode === 'organizations' ? (
                <select
                  value={orgSortBy}
                  onChange={(e) => setOrgSortBy(e.target.value)}
                  className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="distance">Nearest Distance</option>
                  <option value="rating">Highest Rating</option>
                  <option value="name">Facility Name (A–Z)</option>
                </select>
              ) : null}
            </div>
          </div>

          {/* Map View Toggle Container */}
          {viewMode === 'map' && activeMode !== 'saved' && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-sm overflow-hidden">
              <LeafletMap
                center={currentCoords}
                zoom={12}
                userLocation={currentCoords}
                hospitals={mapHospitals}
                className="h-96 w-full rounded-xl"
              />
              <p className="text-[11px] text-slate-500 mt-2 text-center">
                📍 Blue beacon marks your selected location. Pins represent accredited facilities within {radiusKm} km.
              </p>
            </div>
          )}

          {/* Loading & Error Indicators */}
          {loading ? (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-16 text-center shadow-sm">
              <Loader2 className="w-8 h-8 animate-spin text-brand-600 mx-auto mb-3" />
              <p className="text-xs font-semibold text-slate-700">Searching accredited healthcare providers...</p>
              <p className="text-[11px] text-slate-400 mt-1">Applying real-time geolocation and capability verification</p>
            </div>
          ) : error ? (
            <div className="bg-white border border-red-200 rounded-2xl p-8 text-center shadow-sm text-red-600">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
              <p className="text-xs font-semibold">{error}</p>
            </div>
          ) : null}

          {/* DOCTORS LIST VIEW */}
          {!loading && !error && activeMode === 'doctors' && (
            doctors.length === 0 ? (
              <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center shadow-sm space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">No Verified Doctors Found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  We could not find doctors matching your current filters within {radiusKm} km. Try expanding your search radius or selecting All Specialties.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSpecialization('All');
                    setRadiusKm(50);
                    setMinExperience('Any');
                    setAvailableOnly(false);
                  }}
                  className="px-4 py-2 bg-brand-50 text-brand-700 text-xs font-semibold rounded-xl border border-brand-200 hover:bg-brand-100 transition-colors"
                >
                  Widen Search to 50 km
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {doctors.map((doctor) => {
                  const isSaved = savedIdSet.has(String(doctor._id));
                  const isPresent = Boolean(doctor.currentPresence?.isPresent);

                  return (
                    <div
                      key={doctor._id}
                      onClick={() => handleOpenDoctorModal(doctor)}
                      className="group bg-white border border-slate-200/90 hover:border-brand-300 rounded-2xl p-5 shadow-2xs hover:shadow-card transition-all flex flex-col justify-between cursor-pointer"
                    >
                      <div>
                        {/* Card Top: Avatar, Name, Verified Stamp, Bookmark */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-brand-50 border border-brand-200 text-brand-700 flex items-center justify-center font-bold text-sm shrink-0">
                              {doctor.avatar ? (
                                <img src={doctor.avatar} alt={doctor.name} className="w-full h-full object-cover" />
                              ) : (
                                <span>{(doctor.name || 'DR').replace('Dr. ', '').slice(0, 2).toUpperCase()}</span>
                              )}
                              {doctor.verificationStatus === 'verified' && (
                                <div className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full p-0.5">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-presence-600 fill-presence-100" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-xs font-bold text-slate-900 truncate group-hover:text-brand-600 transition-colors">
                                {doctor.name}
                              </h3>
                              <p className="text-[11px] font-semibold text-brand-600 truncate">
                                {doctor.specialization}
                              </p>
                              <p className="text-[10px] text-slate-500 truncate">
                                {(doctor.qualifications || []).join(', ') || 'MBBS'} · {doctor.experienceYears} yrs exp
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleToggleBookmark('DOCTOR', doctor._id, e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-slate-50 transition-colors"
                            title={isSaved ? 'Remove from saved' : 'Bookmark doctor'}
                          >
                            {isSaved ? <BookmarkCheck className="w-4 h-4 text-brand-600 fill-brand-100" /> : <Bookmark className="w-4 h-4" />}
                          </button>
                        </div>

                        {/* Affiliated Facilities */}
                        <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Active Hospital Affiliations:
                          </span>
                          {(doctor.activeAffiliations || []).length > 0 ? (
                            doctor.activeAffiliations.map((aff, i) => (
                              <div key={i} className="flex items-center justify-between text-[11px] text-slate-700">
                                <div className="flex items-center gap-1.5 truncate">
                                  <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span className="truncate font-medium">{aff.organizationName}</span>
                                </div>
                                {aff.distanceKm != null && (
                                  <span className="text-[10px] font-semibold text-slate-500 shrink-0">
                                    {aff.distanceKm} km
                                  </span>
                                )}
                              </div>
                            ))
                          ) : (
                            <span className="text-[11px] text-slate-400">Independent Outpatient Practice</span>
                          )}
                        </div>
                      </div>

                      {/* Card Footer: Presence Badge & Availability */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          {isPresent ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-presence-700 bg-presence-50 px-2 py-0.5 rounded-md border border-presence-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-presence-600 animate-pulse" />
                              On-Site (QR Verified)
                            </span>
                          ) : doctor.isAvailableForAppointments ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-200">
                              <Calendar className="w-3 h-3" />
                              Available for Booking
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Schedule By Appointment</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">₹{doctor.consultationFee}</span>
                          <span className="text-[10px] text-slate-400">/ consult</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* ORGANIZATIONS LIST VIEW */}
          {!loading && !error && activeMode === 'organizations' && (
            organizations.length === 0 ? (
              <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center shadow-sm space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <Building2 className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">No Facilities Found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  No verified healthcare facilities matched your filters within {radiusKm} km. Try expanding the distance radius.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setOrgType('all');
                    setRadiusKm(50);
                    setSelectedCapability('All');
                  }}
                  className="px-4 py-2 bg-brand-50 text-brand-700 text-xs font-semibold rounded-xl border border-brand-200 hover:bg-brand-100 transition-colors"
                >
                  Expand Search Radius to 50 km
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {organizations.map((org) => {
                  const isSaved = savedIdSet.has(String(org._id));
                  const addressText = org.operatingAddress?.streetName
                    ? `${org.operatingAddress.buildingNumber ? org.operatingAddress.buildingNumber + ', ' : ''}${org.operatingAddress.streetName}, ${org.operatingAddress.city}`
                    : org.address?.street || 'Facility Address';

                  return (
                    <div
                      key={org._id}
                      onClick={() => handleOpenOrgModal(org)}
                      className="group bg-white border border-slate-200/90 hover:border-brand-300 rounded-2xl p-5 shadow-2xs hover:shadow-card transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-2 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-slate-900 group-hover:text-brand-600 transition-colors">
                            {org.name}
                          </h3>
                          {org.verificationStatus === 'verified' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-presence-700 bg-presence-50 px-2 py-0.5 rounded-full border border-presence-200">
                              <ShieldCheck className="w-3 h-3 text-presence-600" />
                              Accredited Partner
                            </span>
                          )}
                          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-md">
                            {org.orgType === 'hospital' ? 'Hospital' : org.orgType === 'clinic' ? 'Outpatient Clinic' : 'Specialty Center'}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{addressText}</span>
                          {org.distanceKm != null && (
                            <span className="font-bold text-brand-600 shrink-0">· {org.distanceKm} km away</span>
                          )}
                        </p>

                        {/* Registered Capabilities Badges */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          {(org.healthcareCapabilities || []).slice(0, 4).map((cap, i) => (
                            <span
                              key={i}
                              className="text-[10px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md"
                            >
                              {cap}
                            </span>
                          ))}
                          {(org.healthcareCapabilities || []).length > 4 && (
                            <span className="text-[10px] font-semibold text-slate-400">
                              +{(org.healthcareCapabilities || []).length - 4} more
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right Meta & Actions */}
                      <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                        {org.emergencyCapable && (
                          <div className="text-right">
                            <span className="text-[10px] font-bold text-emergency-600 bg-emergency-50 px-2 py-1 rounded-md border border-emergency-200 block">
                              24/7 Emergency
                            </span>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={(e) => handleToggleBookmark('ORGANIZATION', org._id, e)}
                          className="p-2 rounded-xl text-slate-400 hover:text-brand-600 hover:bg-slate-50 transition-colors border border-slate-200/60"
                          title={isSaved ? 'Remove bookmark' : 'Bookmark hospital'}
                        >
                          {isSaved ? <BookmarkCheck className="w-4 h-4 text-brand-600 fill-brand-100" /> : <Bookmark className="w-4 h-4" />}
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (org.location?.coordinates) {
                              openGoogleMapsNavigation(org.location.coordinates[1], org.location.coordinates[0], currentCoords);
                            }
                          }}
                          className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
                          title="Open navigation in Google Maps"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* SAVED PROVIDERS VIEW */}
          {!loading && activeMode === 'saved' && (
            savedProviders.length === 0 ? (
              <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center shadow-sm space-y-3">
                <Bookmark className="w-8 h-8 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800">No Saved Providers</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  You haven't bookmarked any doctors or hospitals yet. Click the bookmark icon on any provider card to save it for rapid access.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedProviders.map((item) => (
                  <div
                    key={item.savedId}
                    className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded uppercase">
                            {item.providerType}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleBookmark(item.providerType, item.providerId)}
                          className="text-xs text-red-500 hover:text-red-700 font-semibold"
                        >
                          Remove
                        </button>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mt-2">{item.name}</h4>
                      {item.specialization && (
                        <p className="text-xs text-brand-600 font-semibold">{item.specialization}</p>
                      )}
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">
                        Saved on {new Date(item.savedAt).toLocaleDateString()}
                      </span>
                      {item.providerType === 'DOCTOR' && (
                        <Link
                          to={`/doctors/${item.providerId}`}
                          className="text-xs font-bold text-brand-600 hover:underline flex items-center gap-1"
                        >
                          View Schedule <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {/* 4. DOCTOR QUICK-VIEW MODAL */}
      {selectedDoctor && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-6">
            {/* Top Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-brand-50 border border-brand-200 text-brand-700 flex items-center justify-center font-bold text-lg">
                  {selectedDoctor.avatar ? (
                    <img src={selectedDoctor.avatar} alt={selectedDoctor.name} className="w-full h-full object-cover rounded-2xl" />
                  ) : (
                    <span>{(selectedDoctor.name || 'DR').replace('Dr. ', '').slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">{selectedDoctor.name}</h3>
                    {selectedDoctor.verificationStatus === 'verified' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-presence-700 bg-presence-50 px-2 py-0.5 rounded-full border border-presence-200">
                        <CheckCircle2 className="w-3 h-3 text-presence-600" /> NMC Validated
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-brand-600">{selectedDoctor.specialization}</p>
                  <p className="text-[11px] text-slate-500">
                    {(selectedDoctor.qualifications || []).join(', ')} · {selectedDoctor.experienceYears} Years Clinical Experience
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDoctor(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Doctor Bio & Languages */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">About Practitioner</h4>
              <p className="text-xs text-slate-700 leading-relaxed">
                {selectedDoctor.bio || 'Qualified medical specialist offering outpatient clinical consultation and follow-ups.'}
              </p>
              <p className="text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700">Languages:</span> {(selectedDoctor.languages || ['English', 'Hindi']).join(', ')}
              </p>
            </div>

            {/* Affiliations List */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Accredited Affiliations</h4>
              <div className="space-y-2">
                {(selectedDoctor.activeAffiliations || []).map((aff, i) => (
                  <div key={i} className="p-3 rounded-xl border border-slate-200/90 bg-slate-50 flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-bold text-slate-900">{aff.organizationName}</h5>
                      <p className="text-[11px] text-slate-500">{aff.department} · {aff.designation}</p>
                    </div>
                    {aff.distanceKm != null && (
                      <span className="text-xs font-bold text-brand-600">{aff.distanceKm} km</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Availability Slots & Presence Rules */}
            <div className="space-y-3 bg-brand-50/50 p-4 rounded-2xl border border-brand-100">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-brand-600" />
                  <span>Consultation Appointment Availability</span>
                </h4>
                {availLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-600" />}
              </div>

              {doctorAvailability ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>Planned Clinic Hours:</span>
                    <span className="font-semibold text-slate-800">
                      {doctorAvailability.plannedHours?.startTime} – {doctorAvailability.plannedHours?.endTime}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-slate-500">Verified On-Site Status:</span>
                    {doctorAvailability.isCurrentlyOnSite ? (
                      <span className="text-presence-700 font-bold bg-presence-100/80 px-2 py-0.5 rounded">
                        ✓ Present On-Site (QR Checked-In)
                      </span>
                    ) : (
                      <span className="text-slate-500 font-medium">Not checked-in on-site currently</span>
                    )}
                  </div>
                  {/* Slots preview */}
                  <div className="pt-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                      Sample Open Booking Slots:
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(doctorAvailability.availableSlots || [])
                        .filter((s) => s.available)
                        .slice(0, 6)
                        .map((slot, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 bg-white border border-brand-200 text-brand-700 font-bold text-[11px] rounded-lg shadow-2xs"
                          >
                            {slot.time}
                          </span>
                        ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500">Loading consultation availability...</p>
              )}

              {/* Strict Regulatory Notice */}
              <div className="text-[10px] text-slate-500 border-t border-brand-100/80 pt-2 flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 text-brand-600 shrink-0 mt-0.5" />
                <span>
                  Doctor schedule represents planned clinic hours. Physical on-site presence is verified solely by secure QR check-in records.
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedDoctor(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  navigate(`/patient/appointments?doctorId=${selectedDoctor._id}`);
                }}
                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-2xs transition-colors flex items-center gap-1.5"
              >
                <span>Book Appointment (₹{selectedDoctor.consultationFee})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. ORGANIZATION QUICK-VIEW MODAL */}
      {selectedOrg && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">{selectedOrg.name}</h3>
                  {selectedOrg.verificationStatus === 'verified' && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-presence-700 bg-presence-50 px-2 py-0.5 rounded-full border border-presence-200">
                      <ShieldCheck className="w-3 h-3 text-presence-600" /> Accredited
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedOrg.orgType === 'hospital' ? 'Multi-Specialty Hospital' : 'Outpatient Healthcare Facility'} · Reg #{selectedOrg.registrationNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrg(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Address & Contact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/90 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Physical Address</span>
                <p className="text-slate-800 font-medium">
                  {selectedOrg.operatingAddress?.streetName
                    ? `${selectedOrg.operatingAddress.buildingNumber ? selectedOrg.operatingAddress.buildingNumber + ', ' : ''}${selectedOrg.operatingAddress.streetName}, ${selectedOrg.operatingAddress.city}, ${selectedOrg.operatingAddress.state} - ${selectedOrg.operatingAddress.pinCode}`
                    : selectedOrg.address?.street || 'Facility Address'}
                </p>
                {selectedOrg.distanceKm != null && (
                  <p className="text-brand-600 font-bold text-[11px] pt-1">
                    Straight-line distance: {selectedOrg.distanceKm} km
                  </p>
                )}
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/90 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Direct Contact</span>
                <p className="text-slate-800 font-semibold">{selectedOrg.contactNumber || '+91 Hospital Desk'}</p>
                <p className="text-slate-500 text-[11px]">{selectedOrg.officialEmail || 'info@facility.org'}</p>
                {selectedOrg.website && (
                  <a href={selectedOrg.website} target="_blank" rel="noreferrer" className="text-brand-600 underline text-[11px] block">
                    Visit Official Portal
                  </a>
                )}
              </div>
            </div>

            {/* Registered Capabilities */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Registered Capabilities</h4>
              <div className="flex items-center gap-2 flex-wrap">
                {(selectedOrg.healthcareCapabilities || []).map((cap, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 bg-brand-50 border border-brand-200 text-brand-700 font-medium text-xs rounded-lg"
                  >
                    {cap}
                  </span>
                ))}
              </div>

              {/* Mandatory Non-Guaranteed Resource Disclaimer */}
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-amber-900 text-[11px] space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-800">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Important Facility Notice</span>
                </div>
                <p>
                  Registered healthcare capabilities represent licensed departments and clinical equipment. They do not guarantee instantaneous vacancy of ICU beds or live resource availability upon walk-in.
                </p>
              </div>
            </div>

            {/* Offered Specializations */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Offered Specializations</h4>
              <div className="flex items-center gap-1.5 flex-wrap">
                {(selectedOrg.specializations || []).map((spec, i) => (
                  <span key={i} className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-medium">
                    {spec}
                  </span>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedOrg(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedOrg.location?.coordinates) {
                    openGoogleMapsNavigation(
                      selectedOrg.location.coordinates[1],
                      selectedOrg.location.coordinates[0],
                      currentCoords
                    );
                  }
                }}
                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-2xs transition-colors flex items-center gap-1.5"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Open Google Maps Directions</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthcareSearchPage;

