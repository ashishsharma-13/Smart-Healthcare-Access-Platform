import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { getUserCurrentLocation } from '../../utils/geoUtils';
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
} from 'lucide-react';

export const EmergencyActivatePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const targetFromUrl = searchParams.get('target') || searchParams.get('facility') || searchParams.get('hospital') || '';

  // Workflow Step: 1 = Problem Input, 2 = Nearby Hospitals & Resource Offerings
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Problem Input State
  const [selectedType, setSelectedType] = useState('cardiac');
  const [severity, setSeverity] = useState('critical');
  const [description, setDescription] = useState('');
  const [ambulanceRequirement, setAmbulanceRequirement] = useState('no'); // 'yes', 'no', 'already_arranged'
  const [locationAddress, setLocationAddress] = useState('Detecting current GPS coordinates...');
  const [coordinates, setCoordinates] = useState([77.2090, 28.6139]); // [lng, lat]
  const [targetFacility, setTargetFacility] = useState(targetFromUrl);
  const [fetchingGps, setFetchingGps] = useState(false);

  useEffect(() => {
    initLocation();
  }, []);

  const initLocation = async (forceRefresh = false) => {
    try {
      setFetchingGps(true);
      const loc = await getUserCurrentLocation(forceRefresh);
      setCoordinates([loc.lng, loc.lat]);
      setLocationAddress(loc.address || `GPS: ${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`);
    } catch (e) {
      console.warn('Location detection note:', e);
    } finally {
      setFetchingGps(false);
    }
  };

  const detectLocation = () => {
    initLocation(true);
  };

  // Step 2: Nearby Hospitals & Selection State
  const [nearbyHospitals, setNearbyHospitals] = useState([]);
  const [selectedHospitalIds, setSelectedHospitalIds] = useState([]);
  const [fetchingHospitals, setFetchingHospitals] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [error, setError] = useState('');

  const emergencyCategories = [
    { id: 'cardiac', name: 'Cardiac Emergency', icon: HeartPulse, desc: 'Chest tightness, pain radiating to arm/jaw, heart attack' },
    { id: 'stroke', name: 'Stroke', icon: Brain, desc: 'Face drooping, arm weakness, slurred speech' },
    { id: 'trauma', name: 'Accident / Trauma', icon: Activity, desc: 'Vehicle collision, heavy bleeding, fall injury' },
    { id: 'respiratory', name: 'Respiratory Emergency', icon: Wind, desc: 'Severe shortness of breath, asthma attack' },
    { id: 'general', name: 'General Emergency', icon: ShieldAlert, desc: 'Acute distress, severe sudden pain, collapse' },
    { id: 'pregnancy', name: 'Pregnancy Emergency', icon: Baby, desc: 'Premature labor, bleeding, acute complications' },
    { id: 'burns', name: 'Burns', icon: Flame, desc: 'Severe thermal, electric or chemical burns' },
    { id: 'fracture', name: 'Fracture / Dislocation', icon: Bone, desc: 'Severe bone fracture, deformity, immobility' },
    { id: 'poisoning', name: 'Poisoning / Toxicity', icon: AlertTriangle, desc: 'Chemical, medication or toxic exposure' },
    { id: 'child', name: 'Child Emergency', icon: Baby, desc: 'Pediatric seizure, high fever with distress' },
  ];

  const firstAidTips = {
    cardiac: 'Keep the patient seated and calm. Loosen tight clothing. If prescribed and not allergic, administer aspirin. Never leave alone.',
    stroke: 'Act FAST. Note the exact time symptoms started. Do not give any food, water, or aspirin. Keep airway clear.',
    trauma: 'Apply firm direct pressure to bleeding with clean cloth. Keep the patient warm. Do not move spine if neck injury is suspected.',
    respiratory: 'Help patient sit upright. Assist with their prescribed inhaler if available. Ensure calm environment with fresh airflow.',
    general: 'Ensure the patient rests in a comfortable position with clear airway. Do not offer food or oral liquids until medically cleared.',
    burns: 'Cool the burn with cool running tap water for 15 minutes. Do not apply ice, butter, or paste. Cover with sterile non-stick cloth.',
    poisoning: 'Do not induce vomiting unless advised by medical professionals. Keep the container or chemical label ready for doctors.',
    fracture: 'Immobilize the injured limb. Do not attempt to straighten broken bones. Apply wrapped ice pack to reduce swelling.',
    child: 'Keep child in a position of comfort. If feverish with seizure, clear surrounding sharp objects and turn child onto side.',
    pregnancy: 'Keep the mother resting on her left side. Avoid panic. Ensure clean warm towels are accessible.',
  };

  /**
   * Step 1 Submit: Query nearby emergency hospitals with their live capabilities.
   * Does NOT immediately broadcast to hospitals.
   */
  const handleQueryNearbyHospitals = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }

    setFetchingHospitals(true);
    setError('');

    try {
      const res = await api.get('/emergency/nearby-facilities', {
        params: {
          lat: coordinates[1],
          lng: coordinates[0],
          condition: selectedType,
          radius: 50,
        },
      });

      if (res.data.success) {
        const hospitals = res.data.data || [];
        setNearbyHospitals(hospitals);

        // Auto-select all nearby facilities by default
        setSelectedHospitalIds(hospitals.map((h) => h._id || h.id));
        setCurrentStep(2);
      } else {
        setError(res.data.message || 'Unable to retrieve nearby facilities.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to query nearby emergency facilities.');
    } finally {
      setFetchingHospitals(false);
    }
  };

  /**
   * Step 3: Immediate Dispatch via WebSockets & Database to chosen hospital(s).
   */
  const handleDispatch = async (targetHospitalIds) => {
    if (!user) {
      navigate('/login');
      return;
    }

    const idsToSend = Array.isArray(targetHospitalIds) ? targetHospitalIds : selectedHospitalIds;
    if (idsToSend.length === 0) {
      alert('Please select at least one hospital to dispatch your emergency request.');
      return;
    }

    setDispatching(true);
    setError('');

    try {
      const res = await api.post('/emergency/dispatch', {
        condition: selectedType,
        emergencyType: selectedType,
        severity,
        description,
        coordinates,
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

  const handleToggleSelectHospital = (hospitalId) => {
    setSelectedHospitalIds((prev) =>
      prev.includes(hospitalId) ? prev.filter((id) => id !== hospitalId) : [...prev, hospitalId]
    );
  };

  const handleSelectAllHospitals = () => {
    if (selectedHospitalIds.length === nearbyHospitals.length) {
      setSelectedHospitalIds([]);
    } else {
      setSelectedHospitalIds(nearbyHospitals.map((h) => h._id || h.id));
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-red-600 rounded-2xl p-5 sm:p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 space-y-1.5">
          <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 bg-white/20 rounded-full text-[11px] font-black uppercase tracking-wider">
            <ShieldAlert className="w-3.5 h-3.5 animate-bounce" />
            <span>Emergency Mode Active</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            {currentStep === 1 ? 'Step 1: Emergency Trigger & Problem Input' : 'Step 2: Review Capabilities & Dispatch Beep'}
          </h1>
          <p className="text-xs text-red-100 max-w-2xl leading-relaxed">
            {currentStep === 1
              ? 'Select emergency condition and minimum vitals. Submitting will scan for nearby emergency-enabled hospitals and their live capacities.'
              : 'Review available ICU beds, ER bays, and on-site trauma specialists. Select specific hospitals or send to all matching facilities.'}
          </p>
        </div>
      </div>

      {/* Stepper Indicator */}
      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700">
        <div className={`flex items-center space-x-2 ${currentStep === 1 ? 'text-red-600' : 'text-emerald-600'}`}>
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] text-white ${currentStep === 1 ? 'bg-red-600' : 'bg-emerald-600'}`}>
            1
          </span>
          <span>1. Problem Input</span>
        </div>
        <div className="h-0.5 w-12 bg-slate-200"></div>
        <div className={`flex items-center space-x-2 ${currentStep === 2 ? 'text-red-600' : 'text-slate-400'}`}>
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] text-white ${currentStep === 2 ? 'bg-red-600' : 'bg-slate-300'}`}>
            2
          </span>
          <span>2. Select Hospitals & Offerings</span>
        </div>
        <div className="h-0.5 w-12 bg-slate-200"></div>
        <div className="flex items-center space-x-2 text-slate-400">
          <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[11px]">
            3
          </span>
          <span>3. Live Tracking</span>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl font-bold flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ================= STEP 1: PROBLEM INPUT ================= */}
      {currentStep === 1 && (
        <form onSubmit={handleQueryNearbyHospitals} className="space-y-6">
          {/* Emergency Category Grid */}
          <div className="bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-sm font-black text-slate-900">Select Emergency Condition</h2>
              <span className="text-[11px] font-bold text-slate-400">Select Closest Symptom Match</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {emergencyCategories.map((cat) => {
                const Icon = cat.icon;
                const isSelected = selectedType === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedType(cat.id)}
                    className={`p-3.5 rounded-xl border text-left transition-all flex items-start space-x-3 cursor-pointer ${
                      isSelected
                        ? 'bg-red-50/90 border-red-500 ring-2 ring-red-500/20'
                        : 'bg-white/60 hover:bg-white/90 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 font-bold ${
                        isSelected ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600 border'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className={`text-xs font-bold ${isSelected ? 'text-red-900' : 'text-slate-900'}`}>
                        {cat.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{cat.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Immediate First-Aid Guidance */}
          <div className="bg-amber-50/80 rounded-2xl p-4 sm:p-5 border border-amber-200/80 space-y-1.5">
            <div className="flex items-center space-x-2 text-amber-900 text-xs font-bold uppercase tracking-wider">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Immediate First-Aid Protocol ({selectedType.toUpperCase()})</span>
            </div>
            <p className="text-xs text-amber-900 leading-relaxed font-medium">
              {firstAidTips[selectedType] || 'Ensure patient rests in a comfortable position with clear airway.'}
            </p>
          </div>

          {/* Minimum Information & Location */}
          <div className="bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-5 sm:p-6 space-y-4">
            <h2 className="text-sm font-black text-slate-900 pb-2 border-b border-slate-100">
              Minimum Emergency Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Location Input with GPS */}
              <div className="space-y-1.5 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Patient Emergency Location</label>
                  <button
                    type="button"
                    onClick={detectLocation}
                    disabled={fetchingGps}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center space-x-1 cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{fetchingGps ? 'Locating...' : 'Detect Exact GPS'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={locationAddress}
                  onChange={(e) => setLocationAddress(e.target.value)}
                  placeholder="Street address, locality, or landmark"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
                />
              </div>

              {/* Severity Assessment */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Severity Assessment</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="critical">Critical (Immediate life hazard)</option>
                  <option value="severe">Severe (High risk / acute pain)</option>
                  <option value="moderate">Moderate (Urgent care)</option>
                </select>
              </div>

              {/* Ambulance Requirement */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Ambulance Transport</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'yes', label: 'YES' },
                    { value: 'no', label: 'NO' },
                    { value: 'already_arranged', label: 'ARRANGED' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAmbulanceRequirement(opt.value)}
                      className={`py-2 px-1 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${
                        ambulanceRequirement === opt.value
                          ? 'bg-red-600 text-white shadow-xs'
                          : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700">Brief Symptoms Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Sudden chest tightness radiating to left arm, shortness of breath, perspiration..."
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
          </div>

          {/* Submit Step 1 CTA */}
          <div>
            <button
              type="submit"
              disabled={fetchingHospitals}
              className="w-full py-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-red-500/25 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              <Radio className="w-4 h-4 animate-pulse" />
              <span>{fetchingHospitals ? 'Scanning Nearby Emergency Capabilities...' : 'Find Available Nearby Hospitals & Capabilities'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-[11px] text-center text-slate-400 mt-2">
              *Step 1 verifies nearby capabilities before sending dispatch. You can choose specific hospitals in Step 2.
            </p>
          </div>
        </form>
      )}

      {/* ================= STEP 2: NEARBY HOSPITALS & RESOURCE OFFERINGS ================= */}
      {currentStep === 2 && (
        <div className="space-y-6">
          {/* Header Controls for Selection */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center space-x-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Problem Input</span>
                </button>
                <span className="text-slate-300">&bull;</span>
                <span className="text-xs font-bold text-slate-700 uppercase">
                  Condition: <strong className="text-red-600">{selectedType.toUpperCase()}</strong>
                </span>
              </div>
              <h2 className="text-base font-black text-slate-900 mt-0.5">
                Nearby Emergency Facilities ({nearbyHospitals.length} Found)
              </h2>
            </div>

            <div className="flex items-center space-x-2.5">
              <button
                type="button"
                onClick={handleSelectAllHospitals}
                className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                {selectedHospitalIds.length === nearbyHospitals.length ? 'Deselect All' : 'Select All'}
              </button>

              <button
                type="button"
                onClick={() => handleDispatch(selectedHospitalIds)}
                disabled={dispatching || selectedHospitalIds.length === 0}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {dispatching
                    ? 'Dispatching...'
                    : `Beep Selected (${selectedHospitalIds.length})`}
                </span>
              </button>
            </div>
          </div>

          {/* Clean Error Handling if No Facilities Found */}
          {nearbyHospitals.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 space-y-4">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
              <div>
                <h3 className="text-base font-black text-slate-900">
                  No Emergency Facilities Currently Available in Range
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  We could not find verified participating emergency facilities within 50 km of your selected location.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <a
                  href="tel:108"
                  className="px-4 py-2 bg-red-600 text-white font-bold text-xs uppercase rounded-xl flex items-center space-x-1.5 shadow-sm hover:bg-red-700"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call Emergency Helpline (108 / 112)</span>
                </a>
                <Link
                  to="/hospitals"
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs uppercase rounded-xl hover:bg-slate-200"
                >
                  Browse Healthcare Directory
                </Link>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 text-xs font-bold text-blue-600 hover:text-blue-700"
                >
                  Modify Location / Condition
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {nearbyHospitals.map((hosp, idx) => {
                const hospId = hosp._id || hosp.id;
                const isSelected = selectedHospitalIds.includes(hospId);
                const isTopMatch = idx === 0;

                return (
                  <div
                    key={hospId}
                    className={`bg-white rounded-2xl p-5 border transition-all flex flex-col justify-between space-y-4 relative ${
                      isSelected
                        ? 'border-red-400 ring-2 ring-red-400/20 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {isTopMatch && (
                      <span className="absolute top-0 right-0 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-bl-lg">
                        ⭐ Top Rated Capability
                      </span>
                    )}

                    <div className="space-y-3">
                      {/* Facility Name & Selection Checkbox */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectHospital(hospId)}
                            className="w-4 h-4 rounded text-red-600 focus:ring-red-500 cursor-pointer"
                          />
                          <div>
                            <h3 className="font-extrabold text-sm text-slate-900 leading-snug">
                              {hosp.name}
                            </h3>
                            <p className="text-xs text-slate-500 flex items-center mt-0.5">
                              <MapPin className="w-3 h-3 mr-1 text-slate-400 shrink-0" />
                              <span>{hosp.operatingAddress?.city || hosp.address?.city || 'Local Area'}</span>
                              <span className="mx-1.5 text-slate-300">&bull;</span>
                              <strong className="text-slate-700">{hosp.distanceKm ?? 3.5} km</strong>
                              <span className="mx-1 text-slate-300">(~{hosp.estimatedTravelMinutes ?? 10} mins)</span>
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Capabilities: What They Provide */}
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center space-x-1.5">
                            <BedDouble className="w-4 h-4 text-blue-600 shrink-0" />
                            <div>
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">ICU Beds</span>
                              <span className="font-black text-slate-800">
                                {hosp.availableResources?.icuBeds ?? 0} Available
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1.5">
                            <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                            <div>
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">ER Bays</span>
                              <span className="font-black text-slate-800">
                                {hosp.availableResources?.erBays ?? 0} Available
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Specialist on duty status */}
                        <div className="pt-1.5 border-t border-slate-200/70 flex items-center space-x-1.5 text-[11px] text-emerald-800 font-semibold">
                          <Stethoscope className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{hosp.specialistOnDuty || 'Specialist Physician On Duty'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Distinct Single Beep Button */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleSelectHospital(hospId)}
                        className="text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                      >
                        {isSelected ? '✓ Included' : '+ Select'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDispatch([hospId])}
                        disabled={dispatching}
                        className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Radio className="w-3.5 h-3.5" />
                        <span>Beep This Hospital</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom Dispatch Button */}
          {nearbyHospitals.length > 0 && (
            <div className="pt-3">
              <button
                type="button"
                onClick={() => handleDispatch(selectedHospitalIds)}
                disabled={dispatching || selectedHospitalIds.length === 0}
                className="w-full py-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl shadow-xl shadow-red-500/25 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>
                  {dispatching
                    ? 'Dispatching Real-time Beeps...'
                    : `Dispatch Emergency Beep to ${selectedHospitalIds.length} Selected Hospital${selectedHospitalIds.length > 1 ? 's' : ''}`}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <p className="text-[11px] text-center text-slate-400 mt-2">
                *Selected facilities will immediately receive high-priority telemetry and prepare intake bays.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EmergencyActivatePage;
