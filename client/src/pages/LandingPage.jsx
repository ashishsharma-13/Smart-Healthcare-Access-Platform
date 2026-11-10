import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { DoctorCard } from '../components/common/DoctorCard';
import { HospitalCard } from '../components/common/HospitalCard';
import { MedicalHeroIllustration } from '../components/graphics/MedicalHeroIllustration';
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
  Navigation,
  ChevronRight,
  PhoneCall,
  BedDouble,
} from 'lucide-react';

export const LandingPage = () => {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [activeSearchTab, setActiveSearchTab] = useState('doctors');
  const [searchTerm, setSearchTerm] = useState('');
  const [locationTerm, setLocationTerm] = useState('Connaught Place, New Delhi');
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
          setLocationTerm('Connaught Place, New Delhi');
        }
      );
    }
  };

  const specialties = [
    {
      name: 'Cardiology',
      icon: HeartPulse,
      count: '12 Specialists',
      bg: 'bg-rose-50 hover:bg-rose-100',
      text: 'text-rose-600',
      border: 'border-rose-100',
      iconBg: 'bg-rose-100',
    },
    {
      name: 'Neurology',
      icon: Brain,
      count: '8 Specialists',
      bg: 'bg-purple-50 hover:bg-purple-100',
      text: 'text-purple-600',
      border: 'border-purple-100',
      iconBg: 'bg-purple-100',
    },
    {
      name: 'Pediatrics',
      icon: Baby,
      count: '15 Specialists',
      bg: 'bg-amber-50 hover:bg-amber-100',
      text: 'text-amber-600',
      border: 'border-amber-100',
      iconBg: 'bg-amber-100',
    },
    {
      name: 'Orthopedics',
      icon: Bone,
      count: '10 Specialists',
      bg: 'bg-emerald-50 hover:bg-emerald-100',
      text: 'text-emerald-600',
      border: 'border-emerald-100',
      iconBg: 'bg-emerald-100',
    },
    {
      name: 'Ophthalmology',
      icon: Eye,
      count: '6 Specialists',
      bg: 'bg-cyan-50 hover:bg-cyan-100',
      text: 'text-cyan-600',
      border: 'border-cyan-100',
      iconBg: 'bg-cyan-100',
    },
    {
      name: 'General Medicine',
      icon: Activity,
      count: '24 Available',
      bg: 'bg-blue-50 hover:bg-blue-100',
      text: 'text-blue-600',
      border: 'border-blue-100',
      iconBg: 'bg-blue-100',
    },
    {
      name: 'Emergency Medicine',
      icon: ShieldAlert,
      count: '8 Trauma Centers',
      bg: 'bg-red-50 hover:bg-red-100',
      text: 'text-red-600',
      border: 'border-red-100',
      iconBg: 'bg-red-100',
    },
    {
      name: 'Gynecology',
      icon: Stethoscope,
      count: '11 Specialists',
      bg: 'bg-pink-50 hover:bg-pink-100',
      text: 'text-pink-600',
      border: 'border-pink-100',
      iconBg: 'bg-pink-100',
    },
  ];

  return (
    <div className="space-y-16 pb-16">
      
      {/* ======================================================== */}
      {/* 1. HERO SECTION WITH GRAPHIC ILLUSTRATION (Screen 00)    */}
      {/* ======================================================== */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/70 via-sky-50/30 to-white pt-10 pb-20 border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Left Content Column */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-100/80 text-blue-800 text-xs font-bold border border-blue-200/60 shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                <span>Smart Healthcare Access & Emergency Coordination</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.12]">
                The right care. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                  At the right time.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed">
                Connect with verified medical specialists, track live hospital bed availability, and activate rapid parallel Emergency Beep broadcasts when every second counts.
              </p>

              {/* Dual CTA buttons matching Figma Montage */}
              <div className="flex flex-wrap items-center gap-4 pt-1">
                <Link
                  to="/doctors"
                  className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-2xl shadow-md shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center space-x-2.5"
                >
                  <Search className="w-4 h-4" />
                  <span>Find Care Now</span>
                </Link>

                <Link
                  to="/emergency/activate"
                  className="px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-2xl shadow-md shadow-red-500/30 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center space-x-2.5"
                >
                  <ShieldAlert className="w-4 h-4 animate-pulse" />
                  <span>Emergency Beep</span>
                </Link>
              </div>

              {/* Trust & Guarantee Badges */}
              <div className="flex flex-wrap items-center gap-6 pt-3 text-xs font-semibold text-slate-600">
                <span className="flex items-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-1.5 flex-shrink-0" />
                  100% Verified Practitioners
                </span>
                <span className="flex items-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-1.5 flex-shrink-0" />
                  Parallel Emergency Dispatch
                </span>
                <span className="flex items-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-1.5 flex-shrink-0" />
                  15-Min Hold Lock
                </span>
              </div>
            </div>

            {/* Right Graphic Column: Vector Medical Team Illustration */}
            <div className="lg:col-span-5 relative flex items-center justify-center">
              <MedicalHeroIllustration />
            </div>

          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 2. FLOATING MULTI-FILTER SEARCH CARD (Screen 00)         */}
      {/* ======================================================== */}
      <section className="max-w-6xl mx-auto px-4 -mt-20 relative z-20">
        <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xl shadow-slate-200/60 border border-slate-200">
          
          {/* Tabs on Top of Search Card */}
          <div className="flex items-center space-x-3 mb-5 border-b border-slate-100 pb-3 overflow-x-auto">
            <button
              onClick={() => setActiveSearchTab('doctors')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
                activeSearchTab === 'doctors'
                  ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>Find Doctors</span>
            </button>

            <button
              onClick={() => setActiveSearchTab('hospitals')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
                activeSearchTab === 'hospitals'
                  ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Emergency Facilities & Hospitals</span>
            </button>

            <button
              onClick={() => navigate('/emergency/activate')}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 transition-all flex items-center space-x-2 ml-auto"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-red-600 animate-pulse" />
              <span>Emergency 1-Tap</span>
            </button>
          </div>

          {/* Form Inputs Grid */}
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
            {/* Input 1: Search query */}
            <div className="md:col-span-5 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={
                  activeSearchTab === 'doctors'
                    ? 'Search by doctor name, specialty, condition...'
                    : 'Search hospitals, trauma centers, ICU bays...'
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>

            {/* Input 2: Location with GPS */}
            <div className="md:col-span-5 relative">
              <MapPin className="w-4 h-4 text-blue-600 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Enter city, locality, or landmark..."
                value={locationTerm}
                onChange={(e) => setLocationTerm(e.target.value)}
                className="w-full pl-11 pr-14 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
              <button
                type="button"
                onClick={handleUseGPS}
                title="Use Current GPS"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2 py-1 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
              >
                GPS
              </button>
            </div>

            {/* Submit Button */}
            <div className="md:col-span-2">
              <button
                type="submit"
                className="w-full h-full py-3.5 px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl shadow-md shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center space-x-2"
              >
                <Search className="w-4 h-4" />
                <span>Search</span>
              </button>
            </div>
          </form>

        </div>
      </section>

      {/* ======================================================== */}
      {/* 3. CLINICAL SPECIALTIES & DEPARTMENTS (Screen 00)        */}
      {/* ======================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Clinical Specialties & Departments
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Consult top verified specialists for targeted diagnosis and treatment
            </p>
          </div>
          <Link
            to="/doctors"
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
          >
            <span>Explore All</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 8 Pastel Department Cards with Circle Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3.5">
          {specialties.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                onClick={() => {
                  setSelectedSpecialty(item.name);
                  navigate(`/doctors?specialization=${encodeURIComponent(item.name)}`);
                }}
                className={`p-4 rounded-2xl border ${item.border} ${item.bg} text-center transition-all hover:-translate-y-1 hover:shadow-sm flex flex-col items-center justify-center group`}
              >
                <div className={`w-12 h-12 rounded-full ${item.iconBg} ${item.text} flex items-center justify-center mb-2.5 shadow-xs group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6 stroke-[2]" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                  {item.name}
                </h3>
                <span className="text-[10px] font-semibold text-slate-500 mt-0.5">
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ======================================================== */}
      {/* 4. VERIFIED DOCTORS NEAR YOU (Screen 00 & Screen 04)     */}
      {/* ======================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
              <span>Verified Doctors Near You</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                NMC Approved
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Only doctors with validated medical licenses and verified credentials appear in search
            </p>
          </div>
          <Link
            to="/doctors"
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
          >
            <span>View All Doctors</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-64 bg-slate-100 animate-pulse rounded-2xl"></div>
            ))}
          </div>
        ) : doctors.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {doctors.map((doctor) => (
              <DoctorCard key={doctor._id} doctor={doctor} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
            <p className="text-sm font-semibold text-slate-600">No doctors currently listed.</p>
          </div>
        )}
      </section>

      {/* ======================================================== */}
      {/* 5. NEARBY HOSPITALS & EMERGENCY CAPACITY (Screen 00)     */}
      {/* ======================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
              <span>Emergency Ready Trauma Centers</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                <ShieldAlert className="w-3.5 h-3.5 mr-1 text-red-600 animate-pulse" />
                Live Capacity Active
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Real-time ICU bed and emergency bay counts synchronized with facility operations
            </p>
          </div>
          <Link
            to="/hospitals"
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
          >
            <span>View All Hospitals</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-56 bg-slate-100 animate-pulse rounded-2xl"></div>
            ))}
          </div>
        ) : hospitals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {hospitals.map((hospital) => (
              <HospitalCard key={hospital._id} hospital={hospital} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
            <p className="text-sm font-semibold text-slate-600">No trauma centers currently listed.</p>
          </div>
        )}
      </section>

      {/* ======================================================== */}
      {/* 6. EMERGENCY READINESS BANNER (Screen 00 Montage)        */}
      {/* ======================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-8 sm:p-12 text-white shadow-2xl">
          {/* Ambient background rings */}
          <div className="absolute -right-10 -bottom-10 w-96 h-96 rounded-full border border-blue-500/20 pointer-events-none"></div>
          <div className="absolute -right-20 -bottom-20 w-[30rem] h-[30rem] rounded-full border border-red-500/10 pointer-events-none"></div>

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-red-600/30 text-red-300 text-xs font-bold border border-red-500/40">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                <span>Immediate Critical Care Protocol</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Facing an Acute Medical Emergency?
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                Do not wait on hold. Activating Emergency Beep dispatches simultaneous alerts to all nearby trauma centers within 10 km in parallel. Responding facilities lock a 15-minute hold on emergency bays and ready triage teams before you arrive.
              </p>

              <div className="flex flex-wrap items-center gap-6 pt-2 text-xs text-slate-300 font-medium">
                <span className="flex items-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mr-1.5" />
                  Zero Sequential Calling Bottlenecks
                </span>
                <span className="flex items-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mr-1.5" />
                  Suitability Scored Routing
                </span>
                <span className="flex items-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mr-1.5" />
                  Automated Hold Release Protection
                </span>
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col items-center justify-center space-y-3">
              <Link
                to="/emergency/activate"
                className="w-full py-4 px-6 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-red-600/40 transition-all hover:scale-[1.03] active:scale-[0.98] flex items-center justify-center space-x-2.5 text-center"
              >
                <ShieldAlert className="w-5 h-5 animate-bounce" />
                <span>Activate Emergency Beep Now</span>
              </Link>

              <a
                href="tel:112"
                className="text-xs font-semibold text-slate-300 hover:text-white flex items-center space-x-1.5 transition-colors"
              >
                <PhoneCall className="w-3.5 h-3.5 text-red-400" />
                <span>Or dial National Emergency Helpline 112 / 108</span>
              </a>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};
export default LandingPage;
