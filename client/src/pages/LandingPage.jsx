import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { DoctorCard } from '../components/common/DoctorCard';
import { HospitalCard } from '../components/common/HospitalCard';
import { HeroClinicalCommand } from '../components/graphics/HeroClinicalCommand';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { DoctorCardSkeleton, HospitalCardSkeleton } from '../components/ui/Skeleton';
import {
  Search,
  MapPin,
  ShieldAlert,
  CheckCircle2,
  HeartPulse,
  Brain,
  Baby,
  Bone,
  Eye,
  Activity,
  ArrowRight,
  Clock,
  Sparkles,
  Stethoscope,
  Building2,
  ChevronRight,
  PhoneCall,
  ShieldCheck,
  LocateFixed,
  Lock,
} from 'lucide-react';

export const LandingPage = () => {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [activeSearchTab, setActiveSearchTab] = useState('doctors');
  const [searchTerm, setSearchTerm] = useState('');
  const [locationTerm, setLocationTerm] = useState('Central City, New Delhi');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [docRes, hospRes] = await Promise.all([
          api.get('/doctors'),
          api.get('/organizations?emergencyOnly=true'),
        ]);
        if (docRes.data.success) setDoctors(docRes.data.data.slice(0, 4));
        if (hospRes.data.success) setHospitals(hospRes.data.data.slice(0, 3));
      } catch (err) {
        console.error('Error loading landing page data', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (activeSearchTab === 'hospitals') {
      navigate(`/hospitals?search=${encodeURIComponent(searchTerm)}`);
    } else {
      navigate(`/doctors?search=${encodeURIComponent(searchTerm)}&specialization=${encodeURIComponent(selectedSpecialty)}`);
    }
  };

  const handleUseGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocationTerm(`Lat: ${pos.coords.latitude.toFixed(2)}, Lng: ${pos.coords.longitude.toFixed(2)}`);
        },
        () => {
          setLocationTerm('Central City, New Delhi');
        }
      );
    }
  };

  const specialties = [
    {
      name: 'Cardiology',
      icon: HeartPulse,
      count: '12 Specialists',
    },
    {
      name: 'Neurology',
      icon: Brain,
      count: '8 Specialists',
    },
    {
      name: 'Pediatrics',
      icon: Baby,
      count: '15 Specialists',
    },
    {
      name: 'Orthopedics',
      icon: Bone,
      count: '9 Specialists',
    },
    {
      name: 'Ophthalmology',
      icon: Eye,
      count: '6 Specialists',
    },
    {
      name: 'General Medicine',
      icon: Activity,
      count: '24 Available',
    },
    {
      name: 'Emergency Medicine',
      icon: ShieldAlert,
      count: '8 Facilities',
    },
    {
      name: 'Gynecology',
      icon: Stethoscope,
      count: '11 Specialists',
    },
  ];

  return (
    <div className="space-y-16 sm:space-y-20 pb-20">
      
      {/* ======================================================== */}
      {/* 1. HERO SECTION: PERSUASIVE CLINICAL AUTHORITY           */}
      {/* ======================================================== */}
      <section className="relative bg-white border-b border-slate-200/90 pt-8 sm:pt-12 pb-16 sm:pb-24 overflow-hidden">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            
            {/* Left Column: Mission & Core Value */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-200/80 text-brand-800 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-brand-600 animate-pulse" />
                <span>National Healthcare Coordination Infrastructure</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight leading-[1.12]">
                The right care. <br className="hidden sm:inline" />
                <span className="text-brand-600">At the exact right time.</span>
              </h1>

              <p className="text-sm sm:text-base text-slate-600 max-w-xl leading-relaxed">
                Connect directly with NMC-verified medical specialists, monitor live hospital bed telemetry, and dispatch parallel Emergency Beep broadcasts when every second counts.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link to="/doctors">
                  <Button size="lg" variant="primary" icon={Search}>
                    Find Care Directory
                  </Button>
                </Link>

                <Link to="/emergency/activate">
                  <Button size="lg" variant="emergency" icon={ShieldAlert}>
                    Emergency Beep
                  </Button>
                </Link>
              </div>

              {/* Regulatory & Institutional Trust Bar */}
              <div className="pt-4 border-t border-slate-100 grid grid-cols-3 gap-4 max-w-xl text-left">
                <div>
                  <div className="flex items-center gap-1.5 text-slate-900 font-bold text-base sm:text-lg">
                    <ShieldCheck className="w-4 h-4 text-presence-600 shrink-0" />
                    <span>100%</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    NMC Validated Doctors
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 text-slate-900 font-bold text-base sm:text-lg">
                    <Activity className="w-4 h-4 text-brand-600 shrink-0" />
                    <span>Live</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    ICU & ER Bed Telemetry
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 text-slate-900 font-bold text-base sm:text-lg">
                    <Lock className="w-4 h-4 text-hold-600 shrink-0" />
                    <span>15 Min</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Guaranteed Hold Lock
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: High-Fidelity Clinical Command Frame */}
            <div className="lg:col-span-5 relative">
              <HeroClinicalCommand />
            </div>

          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 2. SEARCH & DISCOVERY CONSOLE                            */}
      {/* ======================================================== */}
      <section className="max-w-5xl mx-auto px-4 -mt-12 sm:-mt-16 relative z-20">
        <div className="bg-white rounded-xl p-5 sm:p-6 shadow-card border border-slate-200/90">
          
          {/* Segmented Mode Switcher Tabs */}
          <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
            <button
              onClick={() => setActiveSearchTab('doctors')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                activeSearchTab === 'doctors'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>Find Practitioners</span>
            </button>

            <button
              onClick={() => setActiveSearchTab('hospitals')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                activeSearchTab === 'hospitals'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Emergency Ready Hospitals</span>
            </button>

            <button
              onClick={() => navigate('/emergency/activate')}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-urgent-50 text-urgent-700 hover:bg-urgent-100 border border-urgent-200/80 transition-all flex items-center gap-1.5 ml-auto"
            >
              <span className="w-2 h-2 rounded-full bg-urgent-600 animate-pulse" />
              <span className="hidden sm:inline">Critical</span>
              <span>1-Tap Emergency</span>
            </button>
          </div>

          {/* Precision Search Input Form */}
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Search Query Input */}
            <div className="md:col-span-5 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder={
                  activeSearchTab === 'doctors'
                    ? 'Practitioner name, specialty, clinical condition...'
                    : 'Hospital name, trauma center, ICU capacity...'
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-11 pl-10 pr-3 bg-slate-50 hover:bg-slate-50/80 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white transition-all"
              />
            </div>

            {/* Location Input with Integrated GPS Trigger */}
            <div className="md:col-span-4 relative">
              <MapPin className="w-4 h-4 text-brand-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Locality, district, or pin code..."
                value={locationTerm}
                onChange={(e) => setLocationTerm(e.target.value)}
                className="w-full h-11 pl-10 pr-16 bg-slate-50 hover:bg-slate-50/80 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white transition-all"
              />
              <button
                type="button"
                onClick={handleUseGPS}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[11px] font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-md border border-brand-200/80 transition-colors flex items-center gap-1"
                title="Detect GPS location"
              >
                <LocateFixed className="w-3 h-3 text-brand-600" />
                <span>GPS</span>
              </button>
            </div>

            {/* Submit Action */}
            <div className="md:col-span-3">
              <button
                type="submit"
                className="w-full h-11 px-4 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs"
              >
                <Search className="w-4 h-4" />
                <span>Search Directory</span>
              </button>
            </div>
          </form>

        </div>
      </section>

      {/* ======================================================== */}
      {/* 3. CLINICAL SPECIALTIES & DEPARTMENTS                     */}
      {/* ======================================================== */}
      <section className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Clinical Specialties & Departments
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Targeted medical consultations with verified department leads across disciplines
            </p>
          </div>
          <Link
            to="/doctors"
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 group"
          >
            <span>Explore All 24 Specialties</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Cohesive, Non-Pastel Clinical Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4">
          {specialties.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                onClick={() => {
                  setSelectedSpecialty(item.name);
                  navigate(`/doctors?specialization=${encodeURIComponent(item.name)}`);
                }}
                className="bg-white hover:bg-slate-50/90 border border-slate-200/90 hover:border-brand-400 rounded-xl p-3.5 text-center transition-all duration-150 hover:-translate-y-0.5 hover:shadow-card flex flex-col items-center justify-between group h-32"
              >
                <div className="w-10 h-10 rounded-lg bg-brand-50 border border-brand-100 text-brand-700 flex items-center justify-center mb-2 group-hover:bg-brand-600 group-hover:text-white group-hover:border-brand-600 transition-colors shadow-2xs">
                  <Icon className="w-5 h-5 stroke-[2]" />
                </div>
                <div className="w-full">
                  <h3 className="text-xs font-semibold text-slate-900 group-hover:text-brand-700 transition-colors truncate">
                    {item.name}
                  </h3>
                  <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                    {item.count}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ======================================================== */}
      {/* 4. VERIFIED MEDICAL PRACTITIONERS                         */}
      {/* ======================================================== */}
      <section className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Verified Medical Practitioners
              </h2>
              <Badge variant="presence" size="xs" dot>
                NMC Validated
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Physicians with validated credentials, physical hospital presence, and active outpatient schedules
            </p>
          </div>
          <Link
            to="/doctors"
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 group"
          >
            <span>View All Doctors</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((n) => (
              <DoctorCardSkeleton key={n} />
            ))}
          </div>
        ) : doctors.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
            {doctors.map((doctor) => (
              <DoctorCard key={doctor._id} doctor={doctor} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <p className="text-xs font-semibold text-slate-600">No practitioners currently listed.</p>
          </div>
        )}
      </section>

      {/* ======================================================== */}
      {/* 5. EMERGENCY READY TRAUMA CENTERS                         */}
      {/* ======================================================== */}
      <section className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Trauma Ready Facilities
              </h2>
              <Badge variant="emergency" size="xs" dot pulseDot>
                Live Telemetry
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Real-time ICU bed and emergency trauma bay capacity synchronized with facility command
            </p>
          </div>
          <Link
            to="/hospitals"
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 group"
          >
            <span>View All Facilities</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[1, 2, 3].map((n) => (
              <HospitalCardSkeleton key={n} />
            ))}
          </div>
        ) : hospitals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
            {hospitals.map((hospital) => (
              <HospitalCard key={hospital._id} hospital={hospital} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <p className="text-xs font-semibold text-slate-600">No emergency trauma centers currently listed.</p>
          </div>
        )}
      </section>

      {/* ======================================================== */}
      {/* 6. EMERGENCY PROTOCOL BANNER (DARK NAVY)                 */}
      {/* ======================================================== */}
      <section className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-brand-950 p-6 sm:p-10 lg:p-12 text-white border border-brand-900 shadow-elevated">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-8 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-urgent-900/60 text-urgent-200 text-xs font-semibold border border-urgent-700/80">
                <span className="w-2 h-2 rounded-full bg-urgent-500 animate-ping" />
                <span>Life-Critical Emergency Protocol</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Facing an Acute Medical Emergency?
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                Do not wait on telephone hold. Emergency Beep dispatches simultaneous alerts to all verified trauma centers within 15 km in parallel. Responding facilities lock a guaranteed 15-minute hold on emergency bays and prepare resuscitation teams prior to patient arrival.
              </p>

              <div className="flex flex-wrap items-center gap-6 pt-2 text-xs text-slate-300 font-medium">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-presence-400 shrink-0" />
                  <span>Parallel 15 km Broadcast</span>
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-presence-400 shrink-0" />
                  <span>15-Minute Guaranteed Hold</span>
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-presence-400 shrink-0" />
                  <span>Real-Time GPS En-Route Telemetry</span>
                </span>
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col items-center justify-center gap-3">
              <Link to="/emergency/activate" className="w-full">
                <Button variant="emergency" size="lg" className="w-full" icon={ShieldAlert}>
                  Activate Emergency Beep
                </Button>
              </Link>

              <a
                href="tel:112"
                className="text-xs font-medium text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
              >
                <PhoneCall className="w-3.5 h-3.5 text-urgent-400" />
                <span>National Emergency Services: Dial 112 or 108</span>
              </a>
            </div>

          </div>
        </div>
      </section>

    </div>
  );
};

export default LandingPage;
