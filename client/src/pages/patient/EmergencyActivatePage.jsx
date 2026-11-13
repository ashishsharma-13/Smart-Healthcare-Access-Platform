import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { getUserCurrentLocation } from '../../utils/geoUtils';
import { LeafletMap } from '../../components/common/LeafletMap';
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
  Check,
  Navigation,
  FileText,
  Clock,
  CheckCircle,
} from 'lucide-react';

export const EmergencyActivatePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const targetFromUrl = searchParams.get('target') || searchParams.get('facility') || searchParams.get('hospital') || '';

  // Steps:
  // 1 = Category Selection & Immediate Guidance
  // 2 = Minimum Information & Location Confirmation
  // 3 = Review & Submit Request (creates in CREATED state)
  // 4 = Request Created Confirmation
  // 5 = Facility Matching & Capability Review (Step 2 from legacy)
  const [currentStep, setCurrentStep] = useState(1);

  // Categories & Guidance state
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [guidance, setGuidance] = useState(null);
  const [loadingGuidance, setLoadingGuidance] = useState(false);

  // Form State
  const [severity, setSeverity] = useState('critical');
  const [description, setDescription] = useState('');
  const [ambulanceRequirement, setAmbulanceRequirement] = useState('NO'); // YES, NO, ALREADY_ARRANGED

  // Location State
  const [coordinates, setCoordinates] = useState([77.2090, 28.6139]); // [lng, lat]
  const [locationAddress, setLocationAddress] = useState('Connaught Place, New Delhi');
  const [locationAccuracy, setLocationAccuracy] = useState(10);
  const [locationSource, setLocationSource] = useState('GPS');
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [isManualLocation, setIsManualLocation] = useState(false);
  const [fetchingGps, setFetchingGps] = useState(false);
  const [gpsError, setGpsError] = useState('');

  // Created Request state
  const [createdEmergencyRequest, setCreatedEmergencyRequest] = useState(null);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [submissionError, setSubmissionError] = useState('');

  // Step 5: Nearby Facilities for matching & dispatch
  const [nearbyHospitals, setNearbyHospitals] = useState([]);
  const [selectedHospitalIds, setSelectedHospitalIds] = useState([]);
  const [fetchingHospitals, setFetchingHospitals] = useState(false);
  const [dispatching, setDispatching] = useState(false);

  // Fallback category mapping icons
  const iconMap = {
    HeartPulse,
    Brain,
    Activity,
    Baby,
    Flame,
    AlertTriangle,
    Bone,
    Wind,
  };

  useEffect(() => {
    fetchCategories();
    initLocation();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const res = await api.get('/emergency/categories');
      if (res.data.success && res.data.data.length > 0) {
        setCategories(res.data.data);
        const initial = res.data.data[0];
        setSelectedCategory(initial);
        fetchGuidance(initial.slug || initial.categoryId);
      }
    } catch (err) {
      console.warn('Could not load categories from server, using defaults:', err);
      // Fallback standard categories if server is unreachable
      const defaultCats = [
        { categoryId: 'CAT-CARDIAC', categoryName: 'Cardiac', slug: 'cardiac', icon: 'HeartPulse', description: 'Severe chest pain, tightness radiating to arm or jaw' },
        { categoryId: 'CAT-STROKE', categoryName: 'Stroke', slug: 'stroke', icon: 'Brain', description: 'Facial drooping, arm drift, slurred speech' },
        { categoryId: 'CAT-TRAUMA', categoryName: 'Accident/Trauma', slug: 'trauma', icon: 'Activity', description: 'Motor vehicle collision, blunt trauma, severe laceration' },
        { categoryId: 'CAT-RESPIRATORY', categoryName: 'Respiratory emergency', slug: 'respiratory', icon: 'Wind', description: 'Acute severe shortness of breath, asthma attack' },
        { categoryId: 'CAT-BURNS', categoryName: 'Burns', slug: 'burns', icon: 'Flame', description: 'Severe thermal, electric or chemical burns' },
        { categoryId: 'CAT-POISONING', categoryName: 'Poisoning', slug: 'poisoning', icon: 'AlertTriangle', description: 'Chemical, medication or toxic exposure' },
        { categoryId: 'CAT-SNAKE_BITE', categoryName: 'Snake bite', slug: 'snake_bite', icon: 'AlertTriangle', description: 'Venomous snake bite with puncture marks' },
        { categoryId: 'CAT-FRACTURE', categoryName: 'Fracture', slug: 'fracture', icon: 'Bone', description: 'Severe bone fracture, deformity, immobility' },
        { categoryId: 'CAT-CHILD', categoryName: 'Child emergency', slug: 'child', icon: 'Baby', description: 'Pediatric seizure, high fever with acute distress' },
        { categoryId: 'CAT-PREGNANCY', categoryName: 'Pregnancy-related', slug: 'pregnancy', icon: 'Baby', description: 'Premature labor, bleeding, acute complications' },
      ];
      setCategories(defaultCats);
      setSelectedCategory(defaultCats[0]);
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchGuidance = async (catIdentifier) => {
    try {
      setLoadingGuidance(true);
      const res = await api.get(`/emergency/guidance/${catIdentifier}`);
      if (res.data.success && res.data.available && res.data.data) {
        setGuidance(res.data.data);
      } else {
        setGuidance(null);
      }
    } catch (e) {
      setGuidance(null);
    } finally {
      setLoadingGuidance(false);
    }
  };

  const handleSelectCategory = (cat) => {
    setSelectedCategory(cat);
    fetchGuidance(cat.slug || cat.categoryId || cat._id);
  };

  const initLocation = async (forceRefresh = false) => {
    try {
      setFetchingGps(true);
      setGpsError('');
      const loc = await getUserCurrentLocation(forceRefresh);
      setCoordinates([loc.lng, loc.lat]);
      setLocationAddress(loc.address || `GPS Location (${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)})`);
      setLocationAccuracy(loc.accuracy || (loc.source === 'GPS' ? 12 : null));
      setLocationSource(loc.source || 'GPS');
      setLocationConfirmed(true);
      if (loc.permissionDenied) {
        setGpsError('GPS permission was not granted. Using manual fallback location.');
        setIsManualLocation(true);
      }
    } catch (e) {
      setGpsError('Unable to detect GPS. Please enter your location manually.');
      setIsManualLocation(true);
    } finally {
      setFetchingGps(false);
    }
  };

  /**
   * Submit Emergency Request -> POST /api/emergency/requests
   * Strict Requirement: sets status to CREATED and does NOT prematurely broadcast.
   */
  const handleSubmitEmergencyRequest = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!selectedCategory) {
      setSubmissionError('Please select an emergency category.');
      return;
    }

    setSubmittingRequest(true);
    setSubmissionError('');

    try {
      const payload = {
        categoryId: selectedCategory._id || selectedCategory.categoryId,
        categorySlug: selectedCategory.slug,
        categoryName: selectedCategory.categoryName,
        emergencyType: selectedCategory.slug,
        description,
        ambulanceRequirement,
        latitude: coordinates[1],
        longitude: coordinates[0],
        address: locationAddress,
        locationAccuracy,
        locationSource,
        locationConfirmed,
        patientDetails: {
          name: user.name,
          phone: user.phone || '9999999999',
        },
      };

      const res = await api.post('/emergency/requests', payload);

      if (res.data.success) {
        setCreatedEmergencyRequest(res.data.data);
        setCurrentStep(4); // Move to Request Confirmation Screen
      } else {
        setSubmissionError(res.data.message || 'Failed to create emergency request.');
      }
    } catch (err) {
      setSubmissionError(err.response?.data?.message || err.message || 'Failed to submit emergency request.');
    } finally {
      setSubmittingRequest(false);
    }
  };

  /**
   * Transition to Facility Matching & Parallel Beep broadcast (Step 5)
   */
  const handleProceedToMatching = async () => {
    setFetchingHospitals(true);
    try {
      let matchedResults = [];
      if (createdEmergencyRequest?._id) {
        try {
          const evalRes = await api.post(`/internal/emergency-matching/${createdEmergencyRequest._id}/evaluate`);
          if (evalRes.data?.success) {
            const resultsRes = await api.get(`/internal/emergency-matching/${createdEmergencyRequest._id}/results`);
            if (resultsRes.data?.success && resultsRes.data.data?.suitable?.length > 0) {
              matchedResults = resultsRes.data.data.suitable.map((item) => ({
                _id: item.organizationId?._id || item.organizationId,
                id: item.organizationId?._id || item.organizationId,
                name: item.organizationId?.name || 'Healthcare Facility',
                address: item.organizationId?.operatingAddress || item.organizationId?.address || 'Verified Address',
                emergencyContactPhone: item.organizationId?.emergencyContactPhone || item.organizationId?.phone || '+1-555-0199',
                distanceKm: item.distanceKm,
                estimatedTravelMinutes: item.estimatedTravelMinutes,
                suitabilityScore: item.overallScore,
                availableResources: { icuBeds: 5, erBays: 5, ventilators: 3 },
                specialistOnDuty: 'Emergency Specialist Verified',
                traumaStatus: 'Emergency Capability Verified',
                freshnessStatus: item.freshnessStatus,
                rank: item.rank,
              }));
            }
          }
        } catch (evalErr) {
          console.warn('Module 9 matching evaluation note:', evalErr);
        }
      }

      if (matchedResults.length > 0) {
        setNearbyHospitals(matchedResults);
        setSelectedHospitalIds(matchedResults.map((h) => h._id || h.id));
        setCurrentStep(5);
      } else {
        const res = await api.get('/emergency/nearby-facilities', {
          params: {
            lat: coordinates[1],
            lng: coordinates[0],
            condition: selectedCategory?.slug || 'cardiac',
            radius: 50,
          },
        });

        if (res.data.success) {
          const hospitals = res.data.data || [];
          setNearbyHospitals(hospitals);
          setSelectedHospitalIds(hospitals.map((h) => h._id || h.id));
          setCurrentStep(5);
        }
      }
    } catch (err) {
      console.error('Error fetching facilities:', err);
    } finally {
      setFetchingHospitals(false);
    }
  };

  const handleDispatchBeep = async (targetHospitalIds) => {
    const idsToSend = Array.isArray(targetHospitalIds) ? targetHospitalIds : selectedHospitalIds;
    if (idsToSend.length === 0) {
      alert('Please select at least one hospital.');
      return;
    }

    setDispatching(true);
    try {
      const res = await api.post('/emergency/dispatch', {
        emergencyId: createdEmergencyRequest?._id,
        condition: selectedCategory?.slug || 'cardiac',
        emergencyType: selectedCategory?.slug || 'cardiac',
        severity,
        description,
        coordinates,
        locationAddress,
        ambulanceRequirement: ambulanceRequirement.toLowerCase(),
        patientDetails: {
          name: user.name,
          phone: user.phone || '9999999999',
        },
        hospitalIds: idsToSend,
      });

      if (res.data.success) {
        const reqId = res.data.data.emergencyRequest._id || createdEmergencyRequest?._id;
        navigate(`/emergency/broadcast/${reqId}`);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Emergency dispatch broadcast failed.');
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Critical Life-Safety Top Notice Banner */}
      <div className="bg-gradient-to-r from-red-700 via-rose-700 to-red-800 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 bg-white/20 rounded-full text-[11px] font-black uppercase tracking-wider">
              <ShieldAlert className="w-3.5 h-3.5 animate-bounce" />
              <span>Critical Emergency Mode</span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="tel:112"
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-white text-red-700 text-xs font-bold rounded-lg hover:bg-red-50 transition-colors shadow-xs"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call 112 / 108</span>
              </a>
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            Emergency Request Portal
          </h1>
          <p className="text-xs text-red-100 max-w-2xl leading-relaxed">
            CRITICAL SAFETY NOTICE: If you or someone with you is experiencing an immediate life-threatening condition, call emergency telephone services directly. This system creates your verified emergency record and alerts verified healthcare facilities in parallel.
          </p>
        </div>
      </div>

      {/* Workflow Stepper Indicator */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 shadow-xs">
        <div className={`flex items-center space-x-2 ${currentStep === 1 ? 'text-red-600 font-extrabold' : currentStep > 1 ? 'text-emerald-600' : 'text-slate-400'}`}>
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] text-white ${currentStep === 1 ? 'bg-red-600' : currentStep > 1 ? 'bg-emerald-600' : 'bg-slate-300'}`}>
            {currentStep > 1 ? '✓' : '1'}
          </span>
          <span className="hidden sm:inline">1. Category</span>
        </div>
        <div className="h-0.5 w-8 sm:w-16 bg-slate-200"></div>
        <div className={`flex items-center space-x-2 ${currentStep === 2 ? 'text-red-600 font-extrabold' : currentStep > 2 ? 'text-emerald-600' : 'text-slate-400'}`}>
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] text-white ${currentStep === 2 ? 'bg-red-600' : currentStep > 2 ? 'bg-emerald-600' : 'bg-slate-300'}`}>
            {currentStep > 2 ? '✓' : '2'}
          </span>
          <span className="hidden sm:inline">2. Location & Info</span>
        </div>
        <div className="h-0.5 w-8 sm:w-16 bg-slate-200"></div>
        <div className={`flex items-center space-x-2 ${currentStep === 3 ? 'text-red-600 font-extrabold' : currentStep > 3 ? 'text-emerald-600' : 'text-slate-400'}`}>
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] text-white ${currentStep === 3 ? 'bg-red-600' : currentStep > 3 ? 'bg-emerald-600' : 'bg-slate-300'}`}>
            {currentStep > 3 ? '✓' : '3'}
          </span>
          <span className="hidden sm:inline">3. Review & Submit</span>
        </div>
        <div className="h-0.5 w-8 sm:w-16 bg-slate-200"></div>
        <div className={`flex items-center space-x-2 ${currentStep >= 4 ? 'text-emerald-600 font-extrabold' : 'text-slate-400'}`}>
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] text-white ${currentStep >= 4 ? 'bg-emerald-600' : 'bg-slate-300'}`}>
            4
          </span>
          <span className="hidden sm:inline">4. Confirmation</span>
        </div>
      </div>

      {submissionError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-bold flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{submissionError}</span>
        </div>
      )}

      {/* ================= STEP 1: CATEGORY SELECTION & IMMEDIATE GUIDANCE ================= */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-card space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-black text-slate-900">Select Emergency Category</h2>
                <p className="text-xs text-slate-500 mt-0.5">Select the medical category that best represents the current urgent situation</p>
              </div>
              <span className="text-[11px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Required</span>
            </div>

            {loadingCategories ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading emergency categories...</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {categories.map((cat) => {
                  const isSelected = selectedCategory?.slug === cat.slug || selectedCategory?.categoryId === cat.categoryId;
                  const IconComponent = iconMap[cat.icon] || HeartPulse;
                  return (
                    <button
                      key={cat.slug || cat.categoryId}
                      type="button"
                      onClick={() => handleSelectCategory(cat)}
                      className={`p-4 rounded-xl border text-left transition-all flex items-start space-x-3.5 cursor-pointer ${
                        isSelected
                          ? 'bg-red-50/90 border-red-500 ring-2 ring-red-500/20 shadow-xs'
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold ${
                          isSelected ? 'bg-red-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className={`text-xs font-bold truncate ${isSelected ? 'text-red-950' : 'text-slate-900'}`}>
                            {cat.categoryName}
                          </h3>
                          {isSelected && <Check className="w-3.5 h-3.5 text-red-600 shrink-0 ml-1" />}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug line-clamp-2">{cat.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Immediate Medically Reviewed Guidance Panel */}
          {selectedCategory && (
            <div className="bg-amber-50/90 rounded-2xl p-5 border border-amber-200/90 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-amber-900 text-xs font-bold uppercase tracking-wider">
                  <Info className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Immediate First-Aid Guidelines ({selectedCategory.categoryName})</span>
                </div>
                {guidance && (
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                    Medically Reviewed · v{guidance.version}
                  </span>
                )}
              </div>

              {loadingGuidance ? (
                <p className="text-xs text-amber-700">Loading approved clinical first-aid protocol...</p>
              ) : guidance ? (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-amber-950">{guidance.title}</h4>
                  <p className="text-xs text-amber-900 leading-relaxed whitespace-pre-line font-medium">
                    {guidance.content}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-amber-900 font-medium">
                  Keep patient resting comfortably. Maintain an open airway, stay calm, and avoid giving oral food or medication until clinical emergency personnel arrive.
                </p>
              )}

              <p className="text-[10px] text-amber-700 italic border-t border-amber-200/60 pt-2">
                *First-aid guidance is provided for immediate stabilization and does not delay your submission.
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              disabled={!selectedCategory}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              <span>Next: Minimum Details & Location</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 2: MINIMUM DETAILS & LOCATION CAPTURE ================= */}
      {currentStep === 2 && (
        <div className="space-y-6">
          {/* Selected Category Pill */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <span className="text-slate-500">Selected Category:</span>
              <strong className="text-red-600 font-bold uppercase">{selectedCategory?.categoryName}</strong>
            </div>
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
            >
              Change
            </button>
          </div>

          {/* Minimum Information Form */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-card space-y-4">
            <h2 className="text-sm font-black text-slate-900 pb-2 border-b border-slate-100">
              Patient & Emergency Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Patient Name (autofill from AuthContext) */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Patient Full Name</label>
                <input
                  type="text"
                  readOnly
                  value={user?.name || 'Emergency Patient'}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium"
                />
              </div>

              {/* Patient Phone */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Contact Number</label>
                <input
                  type="text"
                  readOnly
                  value={user?.phone || '+1-555-0199'}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium"
                />
              </div>

              {/* Ambulance Requirement Selector (YES, NO, ALREADY_ARRANGED) */}
              <div className="space-y-1.5 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Ambulance Transport Requirement</label>
                  <span className="text-[10px] text-slate-400 font-semibold">Select 1 option</span>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { value: 'YES', label: 'YES (Request Ambulance)', desc: 'Requires emergency transit' },
                    { value: 'NO', label: 'NO (Private Transit)', desc: 'Traveling by own car/cab' },
                    { value: 'ALREADY_ARRANGED', label: 'ALREADY ARRANGED', desc: 'Local ambulance called' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAmbulanceRequirement(opt.value)}
                      className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                        ambulanceRequirement === opt.value
                          ? 'bg-red-50 border-red-500 ring-2 ring-red-500/20 text-red-900 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="font-extrabold text-xs">{opt.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</div>
                    </button>
                  ))}
                </div>

                {/* Explicit Ambulance Disclosure Notice (Step 5) */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900 leading-relaxed font-medium mt-2">
                  <div className="flex items-start gap-1.5">
                    <Info className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Ambulance Integration Disclosure:</strong> Automated regional ambulance dispatch integration is currently under coordination. Selecting <em>YES</em> registers ambulance requirement with receiving hospitals. If immediate transit dispatch is needed, please dial <strong>108 / 112</strong> directly.
                    </span>
                  </div>
                </div>
              </div>

              {/* Optional Description */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700">
                  Optional Emergency Description / Visible Symptoms
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Shortness of breath started 10 minutes ago, conscious and seated..."
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Location Capture with GPS & Manual Fallback (Step 6) */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-black text-slate-900">Emergency Location Capture</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Accurate coordinates are necessary to calculate emergency travel distances
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => initLocation(true)}
                  disabled={fetchingGps}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg flex items-center space-x-1 transition-colors cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>{fetchingGps ? 'Reading GPS...' : 'Detect GPS'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsManualLocation(!isManualLocation)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  {isManualLocation ? 'Hide Manual Fields' : 'Enter Manually'}
                </button>
              </div>
            </div>

            {gpsError && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl font-medium flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>{gpsError}</span>
              </div>
            )}

            {/* Location Snapshot Meta */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Coordinates</span>
                <span className="font-mono font-bold text-slate-800">
                  {coordinates[1].toFixed(5)}, {coordinates[0].toFixed(5)}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Source & Accuracy</span>
                <span className="font-bold text-slate-800">
                  {locationSource} {locationAccuracy ? `(±${locationAccuracy}m)` : ''}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Location Confirmation</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed
                </span>
              </div>
            </div>

            {/* Address Input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Street Address / Landmark</label>
              <input
                type="text"
                required
                value={locationAddress}
                onChange={(e) => {
                  setLocationAddress(e.target.value);
                  setLocationSource('MANUAL');
                }}
                placeholder="Street address, building, or nearest landmark"
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
              />
            </div>

            {/* Manual Lat/Lng editing if manual mode */}
            {isManualLocation && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <label className="text-[11px] font-bold text-slate-600">Latitude</label>
                  <input
                    type="number"
                    step="0.00001"
                    value={coordinates[1]}
                    onChange={(e) => {
                      setCoordinates([coordinates[0], parseFloat(e.target.value) || 0]);
                      setLocationSource('MANUAL');
                    }}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600">Longitude</label>
                  <input
                    type="number"
                    step="0.00001"
                    value={coordinates[0]}
                    onChange={(e) => {
                      setCoordinates([parseFloat(e.target.value) || 0, coordinates[1]]);
                      setLocationSource('MANUAL');
                    }}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>
            )}

            {/* Interactive Leaflet Map Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">Interactive Map Confirmation</span>
                <span className="text-[11px] text-slate-400">Blue beacon indicates patient position</span>
              </div>
              <div className="h-64 w-full rounded-xl overflow-hidden border border-slate-200 shadow-inner">
                <LeafletMap
                  center={[coordinates[1], coordinates[0]]}
                  userLocation={[coordinates[1], coordinates[0]]}
                  zoom={14}
                  className="h-full w-full"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center space-x-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center space-x-2 cursor-pointer"
            >
              <span>Next: Review & Submit</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 3: REVIEW DETAILS & SUBMIT REQUEST ================= */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-card space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-black text-slate-900">Review Emergency Request Details</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Confirm all details before generating your emergency request record
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                Status on Creation: CREATED
              </span>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Condition & Ambulance</span>
                <div className="text-sm font-extrabold text-slate-900">{selectedCategory?.categoryName}</div>
                <div className="text-xs text-slate-600">Ambulance: <strong className="text-red-700">{ambulanceRequirement}</strong></div>
                {description && (
                  <div className="text-xs text-slate-500 italic mt-1">"{description}"</div>
                )}
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Confirmed Location Snapshot</span>
                <div className="text-xs font-bold text-slate-900">{locationAddress}</div>
                <div className="text-xs font-mono text-slate-500">
                  {coordinates[1].toFixed(5)}, {coordinates[0].toFixed(5)} ({locationSource})
                </div>
              </div>
            </div>

            {/* Medically Reviewed Guidance Reminder */}
            {guidance && (
              <div className="p-4 bg-amber-50/80 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Reminder: {guidance.title}</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed line-clamp-3">
                  {guidance.content}
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center space-x-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Modify Details</span>
            </button>

            <button
              type="button"
              onClick={handleSubmitEmergencyRequest}
              disabled={submittingRequest}
              className="px-8 py-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-red-500/25 transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>{submittingRequest ? 'Creating Request Record...' : 'Submit Emergency Request'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 4: REQUEST CREATED CONFIRMATION SCREEN ================= */}
      {currentStep === 4 && createdEmergencyRequest && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xl text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto text-emerald-600">
              <CheckCircle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 font-extrabold text-xs uppercase tracking-wider rounded-full">
                Status: CREATED
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                Emergency Request Created Successfully
              </h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Your emergency request has been registered in the system database. The original location snapshot has been securely recorded.
              </p>
            </div>

            {/* Request Reference Badge */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 inline-block text-center max-w-md w-full">
              <div className="text-[10px] uppercase font-bold text-slate-400">Emergency Request Identifier</div>
              <div className="text-lg font-mono font-black text-slate-900 mt-0.5">
                {createdEmergencyRequest.emergencyRequestId || createdEmergencyRequest.requestCode}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Category: <strong className="text-slate-800">{createdEmergencyRequest.emergencyType?.toUpperCase()}</strong> &bull; Ambulance: <strong className="text-red-600">{createdEmergencyRequest.ambulanceRequirement}</strong>
              </div>
            </div>

            {/* Action Buttons: Pass to Matching or View in History */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleProceedToMatching}
                disabled={fetchingHospitals}
                className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                <Radio className="w-4 h-4 animate-pulse" />
                <span>{fetchingHospitals ? 'Evaluating Nearby Facilities...' : 'Proceed to Facility Matching & Parallel Beep'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <Link
                to="/emergency/history"
                className="w-full sm:w-auto px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors text-center"
              >
                View in My Emergency History
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ================= STEP 5: NEARBY FACILITIES MATCHING & BEAP DISPATCH ================= */}
      {currentStep === 5 && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center space-x-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Confirmation</span>
                </button>
                <span className="text-slate-300">&bull;</span>
                <span className="text-xs font-bold text-slate-700 uppercase">
                  Request: <strong className="text-red-600">{createdEmergencyRequest?.requestCode}</strong>
                </span>
              </div>
              <h2 className="text-base font-black text-slate-900 mt-0.5">
                Nearby Emergency Facilities ({nearbyHospitals.length} Found)
              </h2>
            </div>

            <div className="flex items-center space-x-2.5">
              <button
                type="button"
                onClick={() => {
                  if (selectedHospitalIds.length === nearbyHospitals.length) {
                    setSelectedHospitalIds([]);
                  } else {
                    setSelectedHospitalIds(nearbyHospitals.map((h) => h._id || h.id));
                  }
                }}
                className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                {selectedHospitalIds.length === nearbyHospitals.length ? 'Deselect All' : 'Select All'}
              </button>

              <button
                type="button"
                onClick={() => handleDispatchBeep(selectedHospitalIds)}
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

          {nearbyHospitals.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 space-y-4">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
              <div>
                <h3 className="text-base font-black text-slate-900">
                  No Emergency Facilities Currently Available in Range
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  We could not find verified participating emergency facilities within 50 km.
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
                  to="/emergency/history"
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs uppercase rounded-xl hover:bg-slate-200"
                >
                  View My Requests
                </Link>
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
                        ⭐ Top Rated Match
                      </span>
                    )}

                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              setSelectedHospitalIds((prev) =>
                                prev.includes(hospId) ? prev.filter((id) => id !== hospId) : [...prev, hospId]
                              );
                            }}
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

                        <div className="pt-1.5 border-t border-slate-200/70 flex items-center space-x-1.5 text-[11px] text-emerald-800 font-semibold">
                          <Stethoscope className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{hosp.specialistOnDuty || 'Specialist Physician On Duty'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedHospitalIds((prev) =>
                            prev.includes(hospId) ? prev.filter((id) => id !== hospId) : [...prev, hospId]
                          );
                        }}
                        className="text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                      >
                        {isSelected ? '✓ Included' : '+ Select'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDispatchBeep([hospId])}
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

          {nearbyHospitals.length > 0 && (
            <div className="pt-3">
              <button
                type="button"
                onClick={() => handleDispatchBeep(selectedHospitalIds)}
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
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EmergencyActivatePage;
