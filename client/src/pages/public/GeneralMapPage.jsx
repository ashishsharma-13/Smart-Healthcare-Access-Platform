import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { LeafletMap, openGoogleMapsNavigation } from '../../components/common/LeafletMap';
import {
  Search,
  MapPin,
  Building2,
  ShieldCheck,
  ShieldAlert,
  Phone,
  BedDouble,
  Navigation,
  Crosshair,
  Filter,
  CheckCircle2,
  Calendar,
  ExternalLink,
  ChevronRight,
  Activity,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export const GeneralMapPage = () => {
  const navigate = useNavigate();
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'verified' | 'emergency' | 'clinic'
  const [userLocation, setUserLocation] = useState([28.6139, 77.2090]); // [lat, lng]
  const [mapCenter, setMapCenter] = useState([28.6139, 77.2090]);
  const [mapZoom, setMapZoom] = useState(13);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    fetchFacilities();
    detectUserGPS();
  }, []);

  const detectUserGPS = () => {
    if ('geolocation' in navigator) {
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation(coords);
          setMapCenter(coords);
          setMapZoom(13);
          setLocating(false);
        },
        () => {
          setLocating(false);
        }
      );
    }
  };

  const fetchFacilities = async () => {
    try {
      setLoading(true);
      const res = await api.get('/organizations');
      if (res.data.success) {
        const rawOrgs = res.data.data || [];
        // Map with fallbacks and distance computation from user location
        const mapped = rawOrgs.map((org) => {
          const coords = org.location?.coordinates || [77.2090, 28.6139];
          const lat = coords[1];
          const lng = coords[0];
          const dist = calculateDistanceKm(userLocation[0], userLocation[1], lat, lng);
          return {
            ...org,
            coordinates: coords,
            distanceKm: parseFloat(dist.toFixed(1)),
            isPartner: org.verificationStatus === 'verified',
            isEmergency: Boolean(org.emergencyCapable),
          };
        });
        setFacilities(mapped);
        if (mapped.length > 0) {
          setSelectedFacility(mapped[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching facilities for map', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Filter facilities
  const filteredFacilities = facilities.filter((f) => {
    const matchesSearch =
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.operatingAddress?.city || f.address?.city || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.operatingAddress?.streetName || f.address?.street || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (activeFilter === 'verified') return f.verificationStatus === 'verified';
    if (activeFilter === 'emergency') return f.emergencyCapable;
    if (activeFilter === 'clinic') return f.orgType === 'clinic';
    return true;
  });

  const handleSelectFacility = (facility) => {
    setSelectedFacility(facility);
    const coords = facility.location?.coordinates || facility.coordinates;
    if (coords && coords.length === 2) {
      setMapCenter([coords[1], coords[0]]);
      setMapZoom(15);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col bg-slate-50">
      
      {/* Top Filter Bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 sm:px-6 z-10 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-[#0B4F9C] text-white flex items-center justify-center font-bold shadow-xs">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-none">
                Healthcare Facility Discovery Map
              </h1>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Explore verified hospitals, 24/7 emergency departments, and outpatient clinics
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Locate Me Button */}
            <button
              onClick={detectUserGPS}
              disabled={locating}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
            >
              <Crosshair className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
              <span>{locating ? 'Locating...' : 'Locate Me'}</span>
            </button>

            {/* Quick Emergency Beep Shortcut */}
            <Link to="/emergency/activate">
              <button className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider bg-red-600 hover:bg-red-700 text-white shadow-xs transition-colors cursor-pointer">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Emergency Beep Match</span>
              </button>
            </Link>
          </div>
        </div>

        {/* Filter Chips & Search Bar */}
        <div className="max-w-7xl mx-auto mt-3 flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by facility name, locality, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          {/* Filter Chips */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: 'all', label: `All Facilities (${facilities.length})` },
              { id: 'verified', label: 'Verified Partners' },
              { id: 'emergency', label: '24/7 ER Capable' },
              { id: 'clinic', label: 'Outpatient Clinics' },
            ].map((chip) => (
              <button
                key={chip.id}
                onClick={() => setActiveFilter(chip.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  activeFilter === chip.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Split View: 40% Directory List / 60% Interactive Leaflet Map */}
      <div className="flex-1 flex flex-col-reverse lg:flex-row h-full">
        
        {/* Left-Hand Directory (40% width on desktop) */}
        <div className="w-full lg:w-[40%] bg-white border-r border-slate-200 overflow-y-auto max-h-[calc(100vh-10rem)] p-4 space-y-3.5">
          <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100">
            <span className="font-bold text-slate-800">
              Showing {filteredFacilities.length} Facility Candidate{filteredFacilities.length === 1 ? '' : 's'}
            </span>
            <span className="text-[11px]">Click card to center on map</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading facility map network...</div>
          ) : filteredFacilities.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <Building2 className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-700">No matching facilities found</p>
              <p className="text-[11px] text-slate-400">Try modifying your search or clearing active filters</p>
            </div>
          ) : (
            filteredFacilities.map((fac) => {
              const isSelected = selectedFacility?._id === fac._id;
              const street = fac.operatingAddress?.streetName || fac.address?.street || 'Healthcare Facility Site';
              const city = fac.operatingAddress?.city || fac.address?.city || 'Local Area';
              const rawCoords = fac.location?.coordinates || fac.coordinates || [77.2090, 28.6139];
              const lat = rawCoords[1];
              const lng = rawCoords[0];

              return (
                <div
                  key={fac._id || fac.id}
                  onClick={() => handleSelectFacility(fac)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-3 ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-400/20 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <h3 className="text-sm font-extrabold text-slate-900 leading-snug">
                          {fac.name}
                        </h3>
                        {fac.verificationStatus === 'verified' && (
                          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" title="Verified SHAP Partner" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center">
                        <MapPin className="w-3 h-3 mr-1 text-slate-400 shrink-0" />
                        <span>{street}, {city}</span>
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-black text-blue-700 block">{fac.distanceKm} km</span>
                      <span className="text-[10px] text-slate-400">from you</span>
                    </div>
                  </div>

                  {/* Badges: Capabilities */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                    {fac.emergencyCapable && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 font-black uppercase rounded-full">
                        24/7 ER ACTIVE
                      </span>
                    )}
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold uppercase rounded-full">
                      {fac.orgType || 'Hospital'}
                    </span>
                    {fac.resources && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold rounded-full">
                        ICU & ER Ready
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openGoogleMapsNavigation(lat, lng);
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center space-x-1 transition-colors cursor-pointer"
                    >
                      <Navigation className="w-3.5 h-3.5 text-blue-600" />
                      <span>Google Maps ↗</span>
                    </button>

                    <div className="flex items-center space-x-2">
                      <Link
                        to={`/doctors?hospital=${fac._id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                      >
                        Book
                      </Link>

                      {fac.emergencyCapable && (
                        <Link
                          to={`/emergency/match?target=${fac._id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase rounded-xl transition-colors shadow-xs"
                        >
                          Beep
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right-Hand Map (60% width on desktop) */}
        <div className="w-full lg:w-[60%] h-[350px] lg:h-[calc(100vh-10rem)] relative">
          <LeafletMap
            center={mapCenter}
            zoom={mapZoom}
            userLocation={userLocation}
            hospitals={filteredFacilities}
            selectedHospitalId={selectedFacility?._id}
            onMarkerClick={(fac) => setSelectedFacility(fac)}
            className="h-full w-full rounded-none"
          />

          {/* Floating Selected Facility Summary Pill on Map */}
          {selectedFacility && (
            <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-xl z-[1000] space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-blue-700 block">Selected Facility</span>
                  <h4 className="font-extrabold text-sm text-slate-900 leading-snug">{selectedFacility.name}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {selectedFacility.operatingAddress?.city || selectedFacility.address?.city} &bull; {selectedFacility.distanceKm} km away
                  </p>
                </div>
                <button
                  onClick={() => setSelectedFacility(null)}
                  className="text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const c = selectedFacility.location?.coordinates || selectedFacility.coordinates;
                    openGoogleMapsNavigation(c[1], c[0]);
                  }}
                  className="flex-1 py-2 bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs flex items-center justify-center space-x-1 cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Navigate with Google Maps</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default GeneralMapPage;
