import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
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
  Building2,
  Crosshair,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Toast } from '../../components/ui/Toast';

export const EmergencyActivatePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const targetFromUrl = searchParams.get('target') || searchParams.get('facility') || searchParams.get('hospital') || '';

  const [selectedType, setSelectedType] = useState('cardiac');
  const [severity, setSeverity] = useState('critical');
  const [description, setDescription] = useState('');
  const [ambulanceRequirement, setAmbulanceRequirement] = useState('no'); // 'yes', 'no', 'already_arranged'
  const [locationAddress, setLocationAddress] = useState('Connaught Place Circle, Central City');
  const [coordinates, setCoordinates] = useState([77.2090, 28.6139]); // [lng, lat]
  const [targetFacility, setTargetFacility] = useState(targetFromUrl);
  const [fetchingGps, setFetchingGps] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const emergencyCategories = [
    { id: 'cardiac', name: 'Cardiac Emergency', icon: HeartPulse, desc: 'Chest tightness, radiating pain, suspected infarction' },
    { id: 'stroke', name: 'Stroke', icon: Brain, desc: 'Face drooping, unilateral weakness, slurred speech' },
    { id: 'trauma', name: 'Accident / Trauma', icon: Activity, desc: 'Severe impact collision, active hemorrhage, blunt trauma' },
    { id: 'respiratory', name: 'Respiratory Distress', icon: Wind, desc: 'Acute hypoxemia, status asthmaticus, severe dyspnea' },
    { id: 'pregnancy', name: 'Obstetric Emergency', icon: Baby, desc: 'Acute labor complications, premature rupture, heavy bleeding' },
    { id: 'burns', name: 'Severe Burns', icon: Flame, desc: 'Extensive thermal, electric, or caustic chemical burns' },
    { id: 'fracture', name: 'Major Fracture', icon: Bone, desc: 'Compound or displaced bone trauma, severe deformity' },
    { id: 'poisoning', name: 'Toxic Exposure', icon: AlertTriangle, desc: 'Acute chemical, toxic substance or overdose ingestion' },
    { id: 'snake_bite', name: 'Venomous Bite', icon: ShieldAlert, desc: 'Suspected venomous reptile bite with rapid swelling' },
    { id: 'child', name: 'Pediatric Emergency', icon: Baby, desc: 'Febrile seizure, acute pediatric lethargy or respiratory arrest' },
  ];

  const firstAidTips = {
    cardiac: 'Keep the patient seated and calm. Loosen tight clothing. If prescribed and not allergic, administer aspirin. Never leave alone.',
    stroke: 'Act FAST. Note the exact time symptoms started. Do not give any food, water, or aspirin. Keep airway clear.',
    trauma: 'Apply firm direct pressure to bleeding with clean cloth. Keep the patient warm. Do not move spine if neck injury is suspected.',
    respiratory: 'Help patient sit upright. Assist with their prescribed inhaler if available. Ensure calm environment with fresh airflow.',
    burns: 'Cool the burn with cool running tap water for 15 minutes. Do not apply ice, butter, or paste. Cover with sterile non-stick cloth.',
    poisoning: 'Do not induce vomiting unless advised by medical professionals. Keep the container or chemical label ready for doctors.',
    snake_bite: 'Keep patient still and calm to slow venom spread. Immobilize the bitten limb below heart level. Do not cut or suck venom.',
    pregnancy: 'Keep the mother resting on her left side. Avoid panic. Ensure clean warm towels are accessible.',
    fracture: 'Immobilize the injured limb. Do not attempt to straighten broken bones. Apply wrapped ice pack to reduce swelling.',
    child: 'Keep child in a position of comfort. If feverish with seizure, clear surrounding sharp objects and turn child onto side.',
  };

  const detectLocation = () => {
    if ('geolocation' in navigator) {
      setFetchingGps(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoordinates([pos.coords.longitude, pos.coords.latitude]);
          setLocationAddress(`GPS: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
          setFetchingGps(false);
        },
        () => {
          setFetchingGps(false);
          alert('GPS location permission denied. Using default central coordinates.');
        }
      );
    }
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.post('/emergency/beep', {
        emergencyType: selectedType,
        severity,
        description,
        coordinates,
        locationAddress,
        ambulanceRequirement,
        patientName: user.name,
        patientPhone: user.phone || '9999999999',
        targetFacility: targetFacility.trim() || undefined,
      });

      if (res.data.success) {
        const reqId = res.data.data.emergencyRequest._id;
        navigate(`/emergency/broadcast/${reqId}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to activate Emergency Beep');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      
      {/* Top Banner */}
      <div className="bg-urgent-900 border border-urgent-800 rounded-xl p-6 text-white shadow-card space-y-2">
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-urgent-800 text-urgent-200 text-[10px] font-semibold uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-urgent-400 animate-ping" />
          <span>Life-Critical Dispatch Console</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
          Activate Parallel Emergency Beep
        </h1>
        <p className="text-xs text-urgent-100 max-w-2xl leading-relaxed">
          Select primary emergency triage category and confirm dispatch location. Your emergency telemetry is broadcasted in parallel to all nearest verified trauma centers simultaneously.
        </p>
      </div>

      {error && (
        <Toast type="emergency" message={error} onClose={() => setError('')} />
      )}

      <form onSubmit={handleBroadcast} className="space-y-6">
        
        {/* Step 1: Emergency Category Grid */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-urgent-600">Step 1</span>
              <h2 className="text-sm font-bold text-slate-900">Select Clinical Triage Category</h2>
            </div>
            <span className="text-xs text-slate-400 font-medium">10 Standardized Categories</span>
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
                  className={`p-3.5 rounded-lg border text-left transition-all flex items-start gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-urgent-50/80 border-urgent-500 shadow-xs ring-1 ring-urgent-500'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0 font-bold ${
                      isSelected ? 'bg-urgent-600 text-white' : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className={`text-xs font-bold leading-tight ${isSelected ? 'text-urgent-900' : 'text-slate-900'}`}>
                      {cat.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{cat.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Immediate First-Aid Guidance */}
        <div className="bg-hold-50 rounded-xl p-4 border border-hold-100 space-y-1.5">
          <div className="flex items-center gap-1.5 text-hold-900 text-xs font-semibold uppercase tracking-wider">
            <Info className="w-4 h-4 text-hold-600" />
            <span>Immediate First-Aid Protocol ({selectedType.toUpperCase()})</span>
          </div>
          <p className="text-xs text-hold-800 leading-relaxed font-medium">
            {firstAidTips[selectedType] || 'Ensure patient rests in a comfortable position with clear airway.'}
          </p>
        </div>

        {/* Step 3: Location and Emergency Telemetry */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-card space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-urgent-600">Step 2</span>
            <h2 className="text-sm font-bold text-slate-900">Patient Telemetry & Dispatch Location</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Location input with GPS */}
            <div className="space-y-1 sm:col-span-2">
              <div className="flex items-center justify-between">
                <label htmlFor="emg-location" className="text-xs font-medium text-slate-700">
                  Patient Location Coordinates / Address
                </label>
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={fetchingGps}
                  className="text-xs font-semibold text-brand-600 hover:text-brand-800 flex items-center gap-1"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>{fetchingGps ? 'Acquiring GPS...' : 'Detect Exact GPS'}</span>
                </button>
              </div>
              <input
                id="emg-location"
                type="text"
                required
                value={locationAddress}
                onChange={(e) => setLocationAddress(e.target.value)}
                placeholder="Street address, landmark, or GPS coordinates"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-urgent-500 focus:bg-white"
              />
            </div>

            {/* Target Facility (Optional) */}
            <div className="space-y-1 sm:col-span-2">
              <label htmlFor="emg-target" className="text-xs font-medium text-slate-700 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-brand-600" />
                <span>Preferred Facility Target (Optional)</span>
              </label>
              <input
                id="emg-target"
                type="text"
                value={targetFacility}
                onChange={(e) => setTargetFacility(e.target.value)}
                placeholder="Leave blank to broadcast to all verified nearest trauma centers"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white"
              />
            </div>

            {/* Severity level */}
            <div className="space-y-1">
              <label htmlFor="emg-severity" className="text-xs font-medium text-slate-700 block">
                Triage Severity Assessment
              </label>
              <select
                id="emg-severity"
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-urgent-500 focus:bg-white"
              >
                <option value="critical">Critical (Immediate Life Hazard)</option>
                <option value="severe">Severe (High Risk / Severe Distress)</option>
                <option value="moderate">Moderate (Acute Urgent Care)</option>
              </select>
            </div>

            {/* Ambulance Requirement */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 block">
                Ambulance Dispatch Required?
              </label>
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
                    className={`py-2 px-2 rounded-lg text-xs font-semibold uppercase transition-colors ${
                      ambulanceRequirement === opt.value
                        ? 'bg-urgent-600 text-white shadow-xs'
                        : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Short Description */}
            <div className="space-y-1 sm:col-span-2">
              <label htmlFor="emg-desc" className="text-xs font-medium text-slate-700 block">
                Clinical Details / Observable Vitals (Optional)
              </label>
              <textarea
                id="emg-desc"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Sudden retrosternal chest pain, heavy sweating, dyspnea..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-urgent-500 focus:bg-white"
              />
            </div>

          </div>
        </div>

        {/* Primary CTA Button */}
        <div className="space-y-2">
          <Button
            type="submit"
            variant="emergency"
            size="lg"
            loading={loading}
            className="w-full"
            icon={ShieldAlert}
          >
            {loading ? 'Dispatched Parallel Beep...' : 'BROADCAST EMERGENCY BEEP TO TRAUMA CENTERS'}
          </Button>
          <p className="text-[11px] text-center text-slate-400 font-medium">
            *Emergency alerts are dispatched simultaneously to trauma centers within 15 km in parallel.
          </p>
        </div>

      </form>
    </div>
  );
};

export default EmergencyActivatePage;
