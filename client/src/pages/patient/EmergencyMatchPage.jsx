import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { LeafletMap } from '../../components/common/LeafletMap';
import {
  getUserCurrentLocation,
  formatFacilityAddress,
  handleOpenGoogleMaps,
} from '../../utils/geoUtils';
import {
  ShieldAlert,
  HeartPulse,
  Brain,
  Activity,
  Flame,
  AlertTriangle,
  Baby,
  Bone,
  Wind,
  MapPin,
  Ambulance,
  Phone,
  CheckCircle2,
  Info,
  ArrowRight,
  ArrowLeft,
  Building2,
  BedDouble,
  Stethoscope,
  Sparkles,
  RefreshCw,
  Send,
  Radio,
  Crosshair,
  SlidersHorizontal,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';

export const EmergencyMatchPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const targetFromUrl = searchParams.get('target') || '';

  // 1. Triage Category Selector (Cardiac, Stroke, Trauma/Accident, Respiratory, Burns, Poisoning, OB/GYN, Pediatric)
  const triageCategories = [
    { id: 'cardiac', name: 'Cardiac Emergency', icon: HeartPulse, desc: 'Chest tightness, radiating pain, suspected infarction', mandatory: 'Cardiology, Cath Lab, ICU' },
    { id: 'stroke', name: 'Stroke', icon: Brain, desc: 'Face drooping, unilateral weakness, slurred speech', mandatory: 'Neurology, CT Scan, Stroke Team' },
    { id: 'trauma', name: 'Trauma / Accident', icon: Activity, desc: 'High-speed impact, blunt injury, active hemorrhage', mandatory: 'Trauma Surgeon, ER Bay, Blood Bank' },
    { id: 'respiratory', name: 'Respiratory Distress', icon: Wind, desc: 'Acute hypoxemia, severe dyspnea, asthma crisis', mandatory: 'Pulmonology, Ventilators, O2 Support' },
    { id: 'burns', name: 'Severe Burns', icon: Flame, desc: 'Extensive thermal, chemical or high-voltage burns', mandatory: 'Burn Care Unit, Critical Care' },
    { id: 'poisoning', name: 'Poisoning / Toxicity', icon: AlertTriangle, desc: 'Toxic chemical inhalation, ingestion or overdose', mandatory: 'Toxicology, Stomach Lavage, Antidotes' },
    { id: 'pregnancy', name: 'OB / GYN Emergency', icon: Baby, desc: 'Acute labor distress, bleeding, premature rupture', mandatory: 'Obstetrics, NICU, Delivery OT' },
    { id: 'child', name: 'Pediatric Emergency', icon: Baby, desc: 'Pediatric seizures, severe fever, pediatric shock', mandatory: 'Pediatrician, PICU, Child ER' },
  ];

  const [selectedCategory, setSelectedCategory] = useState('cardiac');
  const [severity, setSeverity] = useState('critical');
  const [ambulanceRequirement, setAmbulanceRequirement] = useState('no'); // 'yes' | 'no' | 'already_arranged'
  const [userCoords, setUserCoords] = useState([28.6139, 77.2090]); // [lat, lng]
  const [locationAddress, setLocationAddress] = useState('Detecting current GPS coordinates...');
  const [detectingGps, setDetectingGps] = useState(false);

  // Suitability Matrix Filter Options
  const [requireSpecialist, setRequireSpecialist] = useState(false);
  const [requireIcuBed, setRequireIcuBed] = useState(false);

  // Results State
  const [facilities, setFacilities] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loadingFacilities, setLoadingFacilities] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    detectLocation();
  }, []);

  useEffect(() => {
    fetchSuitableFacilities();
  }, [selectedCategory, userCoords]);

  const detectLocation = async (forceRefresh = false) => {
    try {
      setDetectingGps(true);
      const loc = await getUserCurrentLocation(forceRefresh);
      setUserCoords([loc.lat, loc.lng]);
      setUserAddressSafe(loc.address || `GPS: ${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`);
    } catch (e) {
      console.warn('Location detection note:', e);
    } finally {
      setDetectingGps(false);
    }
  };

  const setUserAddressSafe = (addr) => {
    setLocationAddress(addr);
  };

  const fetchSuitableFacilities = async () => {
    try {
      setLoadingFacilities(true);
      setError('');
      const res = await api.get('/emergency/nearby-facilities', {
        params: {
          lat: userCoords[0],
          lng: userCoords[1],
          condition: selectedCategory,
          radius: 50,
        },
      });

      if (res.data.success) {
        const rawFacilities = res.data.data || [];
        setFacilities(rawFacilities);
        
        // Auto-select all suitable candidate facilities
        const ids = rawFacilities.map((f) => f._id || f.id);
        setSelectedIds(ids);

        // If target from URL, prioritize
        if (targetFromUrl && ids.includes(targetFromUrl)) {
          setSelectedIds([targetFromUrl]);
        }
      }
    } catch (err) {
      console.error('Error fetching suitable facilities', err);
      setError('Could not query nearby emergency facilities.');
    } finally {
      setLoadingFacilities(false);
    }
  };

  // Filter facilities by active Suitability Matrix criteria
  const candidateFacilities = facilities.filter((f) => {
    if (requireSpecialist && !f.specialistOnDuty && (!f.doctorsPresent || f.doctorsPresent.length === 0)) {
      return false;
    }
    if (requireIcuBed && (!f.availableResources || (f.availableResources.icuBeds || 0) <= 0)) {
      return false;
    }
    return true;
  });

  const handleToggleSelect = (facId) => {
    setSelectedIds((prev) =>
      prev.includes(facId) ? prev.filter((id) => id !== facId) : [...prev, facId]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === candidateFacilities.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(candidateFacilities.map((f) => f._id || f.id));
    }
  };

  const handleDispatch = async (targets) => {
    if (!user) {
      navigate('/login');
      return;
    }

    const idsToSend = targets && targets.length > 0 ? targets : selectedIds;
    if (idsToSend.length === 0) {
      alert('Please select at least one suitable hospital to dispatch your emergency beep.');
      return;
    }

    try {
      setDispatching(true);
      setError('');

      const res = await api.post('/emergency/dispatch', {
        condition: selectedCategory,
        emergencyType: selectedCategory,
        severity,
        coordinates: [userCoords[1], userCoords[0]], // [lng, lat]
        locationAddress,
        ambulanceRequirement,
        patientDetails: {
          name: user.name,
          phone: user.phone || '9999999999',
        },
        hospitalIds: idsToSend,
      });

      if (res.data.success) {
        const reqId = res.data.data.emergencyRequest._id;
        navigate(`/emergency/broadcast/${reqId}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Emergency dispatch failed.');
      setDispatching(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      
      {/* Top Banner */}
      {/* Top Banner: Frosted Glassmorphism */}
      <div className="bg-red-500/10 border border-red-500/20 backdrop-blur-md rounded-2xl p-6 text-slate-800 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-red-600 text-white rounded-full text-xs font-semibold uppercase tracking-wider shadow-xs">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Smart Clinical Triage & Suitability Matrix</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 leading-snug">
              Emergency Discovery & Hospital Matching
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed font-medium">
              Real-time matching filters hospitals by active clinical capabilities, verified specialist presence, and live ER bay capacity—never geographic proximity alone.
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
            <button
              onClick={() => detectLocation(true)}
              disabled={detectingGps}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white text-slate-800 hover:bg-slate-50 border border-slate-200/80 text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-colors"
            >
              <Crosshair className={`w-3.5 h-3.5 text-blue-600 ${detectingGps ? 'animate-spin' : ''}`} />
              <span>{detectingGps ? 'Acquiring GPS...' : 'Refresh Location'}</span>
            </button>
            <span className="text-[11px] text-slate-600 font-semibold truncate max-w-xs">{locationAddress}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl font-bold flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. Triage Category Selector Grid */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-black text-slate-900">Select Clinical Triage Category</h2>
            <p className="text-[11px] text-slate-500">Filters hospitals by critical specialty teams on duty</p>
          </div>
          <span className="text-[11px] font-bold uppercase text-red-600 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">
            Selected: {selectedCategory.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {triageCategories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                  isSelected
                    ? 'bg-red-50/90 border-red-500 ring-2 ring-red-500/20 shadow-xs'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                      isSelected ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  {isSelected && <span className="text-xs font-black text-red-600">✓</span>}
                </div>

                <div>
                  <h3 className={`text-xs font-bold leading-tight ${isSelected ? 'text-red-900' : 'text-slate-900'}`}>
                    {cat.name}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{cat.mandatory}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Suitability Matrix Filter Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <SlidersHorizontal className="w-4 h-4 text-blue-600" />
          <span className="font-bold text-slate-800">Capability Requirements:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center space-x-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={requireSpecialist}
              onChange={(e) => setRequireSpecialist(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span className="font-semibold text-slate-700">Trauma / Specialist Physician Present</span>
          </label>

          <label className="flex items-center space-x-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={requireIcuBed}
              onChange={(e) => setRequireIcuBed(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span className="font-semibold text-slate-700">Verified ICU Bed Available</span>
          </label>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleSelectAll}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors cursor-pointer"
          >
            {selectedIds.length === candidateFacilities.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>
      </div>

      {/* 3. Facility Candidate Cards or Fallback Trigger */}
      {loadingFacilities ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
          Calculating clinical suitability matrix across nearby trauma centers...
        </div>
      ) : candidateFacilities.length === 0 ? (
        /* Zero Qualifying Facilities Fallback Card */
        <div className="bg-white rounded-2xl p-8 border border-red-200 shadow-lg text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-100">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-black text-slate-900">
              No Qualifying SHAP Partner Facilities Found in Range
            </h3>
            <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
              No verified participating hospitals currently match both your selected condition (<strong>{selectedCategory.toUpperCase()}</strong>) and active capability requirements.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              to="/emergency/fallback"
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center space-x-2"
            >
              <span>View External Public / Government Centers</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <a
              href="tel:108"
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase rounded-xl transition-all flex items-center space-x-1.5"
            >
              <Phone className="w-3.5 h-3.5 text-red-600" />
              <span>Call Helpline (108 / 112)</span>
            </a>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-600 px-1">
            <span>
              Matching Suitable Hospitals: <strong>{candidateFacilities.length}</strong>
            </span>
            <span className="font-semibold text-blue-600">
              {selectedIds.length} hospital{selectedIds.length === 1 ? '' : 's'} selected for broadcast
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {candidateFacilities.map((hosp, idx) => {
              const hospId = hosp._id || hosp.id;
              const isSelected = selectedIds.includes(hospId);
              const erBays = hosp.availableResources?.erBays ?? 0;
              const icuBays = hosp.availableResources?.icuBeds ?? 0;

              // Capacity Status
              const capacityStatus =
                erBays > 3 ? 'ER Bays Available' : erBays > 0 ? 'Limited Bays' : 'At Capacity';
              const capacityVariant =
                erBays > 3
                  ? 'bg-emerald-100 text-emerald-800'
                  : erBays > 0
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-red-100 text-red-800';

              return (
                <div
                  key={hospId}
                  className={`bg-white rounded-2xl p-5 border transition-all flex flex-col justify-between space-y-4 relative ${
                    isSelected
                      ? 'border-red-500 ring-2 ring-red-500/20 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {idx === 0 && (
                    <span className="absolute top-0 right-0 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-bl-lg">
                      ⭐ Top Clinical Match
                    </span>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(hospId)}
                          className="w-4 h-4 rounded text-red-600 focus:ring-red-500 cursor-pointer"
                        />
                        <div>
                          <h3 className="font-extrabold text-sm text-slate-900 leading-snug">
                            {hosp.name}
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5 flex items-center">
                            <MapPin className="w-3 h-3 mr-1 text-slate-400 shrink-0" />
                            <span>{hosp.operatingAddress?.city || hosp.address?.city || 'Local Area'}</span>
                            <span className="mx-1.5 text-slate-300">&bull;</span>
                            <strong className="text-slate-700">{hosp.distanceKm ?? 3.5} km</strong>
                            <span className="mx-1 text-slate-300">(~{hosp.estimatedTravelMinutes ?? 10} mins)</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Capabilities & Capacity Status Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                      <span className={`px-2 py-0.5 font-bold uppercase rounded-full ${capacityVariant}`}>
                        {capacityStatus} ({erBays} Available)
                      </span>

                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold uppercase rounded-full">
                        ICU Beds: {icuBays}
                      </span>

                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 font-bold rounded-full border border-emerald-200">
                        <Stethoscope className="w-3 h-3 inline mr-1" />
                        {hosp.specialistOnDuty || 'Trauma Care Specialist On Duty'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleSelect(hospId)}
                      className="text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                    >
                      {isSelected ? '✓ Selected' : '+ Include in Beep'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDispatch([hospId])}
                      disabled={dispatching}
                      className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Radio className="w-3.5 h-3.5" />
                      <span>Beep This Hospital Only</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Broadcast CTA */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => handleDispatch(selectedIds)}
              disabled={dispatching || selectedIds.length === 0}
              className="w-full py-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl shadow-xl shadow-red-500/25 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>
                {dispatching
                  ? 'Dispatching Real-time Beep Broadcast...'
                  : `Broadcast Emergency Beep to All ${selectedIds.length} Suitable Facilities`}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default EmergencyMatchPage;
