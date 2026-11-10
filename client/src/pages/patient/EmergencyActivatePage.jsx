import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';

export const EmergencyActivatePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [selectedType, setSelectedType] = useState('cardiac');
  const [severity, setSeverity] = useState('critical');
  const [description, setDescription] = useState('');
  const [ambulanceRequirement, setAmbulanceRequirement] = useState('no'); // 'yes', 'no', 'already_arranged'
  const [locationAddress, setLocationAddress] = useState('Connaught Place Circle, Central City');
  const [coordinates, setCoordinates] = useState([77.2090, 28.6139]); // [lng, lat]
  const [fetchingGps, setFetchingGps] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const emergencyCategories = [
    { id: 'cardiac', name: 'Cardiac Emergency', icon: HeartPulse, desc: 'Chest tightness, pain radiating to arm/jaw, heart attack' },
    { id: 'stroke', name: 'Stroke', icon: Brain, desc: 'Face drooping, arm weakness, slurred speech' },
    { id: 'trauma', name: 'Accident / Trauma', icon: Activity, desc: 'Vehicle collision, heavy bleeding, fall injury' },
    { id: 'respiratory', name: 'Respiratory Emergency', icon: Wind, desc: 'Severe shortness of breath, asthma attack' },
    { id: 'pregnancy', name: 'Pregnancy Emergency', icon: Baby, desc: 'Premature labor, bleeding, acute complications' },
    { id: 'burns', name: 'Burns', icon: Flame, desc: 'Severe thermal, electric or chemical burns' },
    { id: 'fracture', name: 'Fracture / Dislocation', icon: Bone, desc: 'Severe bone fracture, deformity, immobility' },
    { id: 'poisoning', name: 'Poisoning / Toxicity', icon: AlertTriangle, desc: 'Chemical, medication or toxic exposure' },
    { id: 'snake_bite', name: 'Snake Bite', icon: ShieldAlert, desc: 'Venomous reptile bite, swelling, necrosis' },
    { id: 'child', name: 'Child Emergency', icon: Baby, desc: 'Pediatric seizure, high fever with distress' },
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
          alert('GPS location permission denied. Using standard central coordinates.');
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
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      
      {/* Top Banner matching Screen 7 */}
      <div className="bg-red-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-white/20 rounded-full text-xs font-black uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4 animate-bounce" />
            <span>Emergency Mode Active</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Activate Emergency Beep Broadcast
          </h1>
          <p className="text-xs sm:text-sm text-red-100 max-w-2xl leading-relaxed">
            Select emergency category, confirm minimal vitals and location. Your alert is broadcasted in parallel to all verified nearest capable facilities simultaneously.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl font-bold flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleBroadcast} className="space-y-8">
        
        {/* Step 1: Emergency Category Grid */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-600">Step 1</span>
              <h2 className="text-base font-black text-slate-900">Select Emergency Category</h2>
            </div>
            <span className="text-xs font-bold text-slate-400">10 Predefined Conditions</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {emergencyCategories.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedType === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedType(cat.id)}
                  className={`p-4 rounded-2xl border text-left transition-all flex items-start space-x-3.5 ${
                    isSelected
                      ? 'bg-red-50/80 border-red-500 shadow-sm ring-2 ring-red-500/20'
                      : 'bg-slate-50/60 hover:bg-slate-100/70 border-slate-200 text-slate-700'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold ${
                      isSelected ? 'bg-red-600 text-white' : 'bg-white text-slate-600 border'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
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

        {/* Step 2: Immediate Guidance Accordion */}
        <div className="bg-amber-50/70 rounded-3xl p-6 border border-amber-200/80 space-y-2">
          <div className="flex items-center space-x-2 text-amber-900 text-xs font-bold uppercase tracking-wider">
            <Info className="w-4 h-4 text-amber-600" />
            <span>Immediate First-Aid Protocol ({selectedType.toUpperCase()})</span>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed font-medium">
            {firstAidTips[selectedType] || 'Ensure patient rests in a comfortable position with clear airway.'}
          </p>
          <p className="text-[10px] text-amber-700 pt-1">
            *Medically reviewed immediate stabilization guidelines. Does not replace clinical treatment.
          </p>
        </div>

        {/* Step 3: Minimal Required Emergency Information */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="pb-2 border-b border-slate-100">
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-600">Step 2</span>
            <h2 className="text-base font-black text-slate-900">Minimum Emergency Information</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Location input with GPS button */}
            <div className="space-y-1.5 sm:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Patient Emergency Location</label>
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={fetchingGps}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
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
                placeholder="Street address, landmark, or GPS coordinates"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
              />
            </div>

            {/* Severity level */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Severity Assessment</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="critical">Critical (Immediate life hazard)</option>
                <option value="severe">Severe (High risk / intense pain)</option>
                <option value="moderate">Moderate (Urgent urgent care)</option>
              </select>
            </div>

            {/* Ambulance Requirement Radio Buttons */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Ambulance Transport Requirement</label>
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
                    className={`py-2 px-2 rounded-xl text-xs font-bold uppercase transition-all ${
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

            {/* Short description */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700">Brief Symptoms Description</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Sudden crushing retrosternal pain for 20 mins, sweating, breathing difficulty..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>
        </div>

        {/* Primary CTA Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-red-500/30 transition-all hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <ShieldAlert className="w-5 h-5 animate-bounce" />
            <span>{loading ? 'Activating Parallel Broadcast...' : 'BROADCAST EMERGENCY BEEP TO HOSPITALS'}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
          <p className="text-[11px] text-center text-slate-400 mt-2 font-medium">
            *Real-time ping will alert trauma centers within 50 km simultaneously.
          </p>
        </div>

      </form>

    </div>
  );
};

