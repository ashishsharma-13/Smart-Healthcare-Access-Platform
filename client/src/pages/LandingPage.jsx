import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { DoctorCard } from '../components/common/DoctorCard';
import { HospitalCard } from '../components/common/HospitalCard';
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
} from 'lucide-react';

export const LandingPage = () => {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
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
    navigate(`/doctors?search=${searchTerm}&specialization=${selectedSpecialty}`);
  };

  const categories = [
    { name: 'Cardiology', icon: HeartPulse, count: '12 Specialists' },
    { name: 'Emergency Medicine', icon: ShieldAlert, count: '8 Facilities' },
    { name: 'Neurology', icon: Brain, count: '6 Specialists' },
    { name: 'Pediatrics', icon: Baby, count: '15 Specialists' },
    { name: 'Orthopedics', icon: Bone, count: '9 Specialists' },
    { name: 'General Physician', icon: Activity, count: '24 Available' },
  ];

  return (
    <div className="space-y-16 pb-16">
      
      {/* Hero Section matching Figma montage Screen 1 */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/70 via-white to-slate-50 pt-12 pb-20 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Smart Healthcare Access & Coordination Platform</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
                The right care. <br />
                <span className="text-blue-600">At the right time.</span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed">
                Connect with verified doctors, view real-time facility resource availability, and activate rapid parallel Emergency Beep broadcasts when seconds matter most.
              </p>

              {/* Dual CTA buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  to="/doctors"
                  className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-500/25 transition-all hover:scale-[1.02] flex items-center space-x-2"
                >
                  <Search className="w-4 h-4" />
                  <span>Find Care Now</span>
                </Link>

                <Link
                  to="/emergency/activate"
                  className="px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl shadow-md shadow-red-500/25 transition-all hover:scale-[1.02] flex items-center space-x-2"
                >
                  <ShieldAlert className="w-4 h-4 animate-pulse" />
                  <span>Emergency Beep</span>
                </Link>
              </div>

              {/* Guarantees */}
              <div className="flex items-center space-x-6 pt-4 text-xs font-semibold text-slate-500">
                <span className="flex items-center text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-1.5" />
                  Verified Doctors Only
                </span>
                <span className="flex items-center text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-1.5" />
                  Parallel Emergency Dispatch
                </span>
              </div>
            </div>

            {/* Right Graphic / Card */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md bg-white p-6 rounded-3xl shadow-xl border border-slate-200">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Live Coordination Status
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                    Network Active
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900">Apex Metro Trauma & Heart</p>
                      <p className="text-[11px] text-slate-500">14 ICU Beds &bull; 11 ER Bays Free</p>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 bg-white px-2 py-1 rounded-md border border-slate-200">
                      Ready
                    </span>
                  </div>

                  <div className="p-3 bg-red-50/70 rounded-xl border border-red-200 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-red-900">Emergency Beep Mode</p>
                      <p className="text-[11px] text-red-700">Nearest Suitable Hospital Matching</p>
                    </div>
                    <span className="text-xs font-bold text-red-600 bg-white px-2 py-1 rounded-md border border-red-200">
                      1-Tap Beep
                    </span>
                  </div>

                  <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-blue-900">QR Doctor Check-In</p>
                      <p className="text-[11px] text-blue-700">Verified Physical Facility Presence</p>
                    </div>
                    <span className="text-xs font-bold text-blue-600 bg-white px-2 py-1 rounded-md border border-blue-200">
                      Active
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Search Box Card */}
          <div className="mt-12 bg-white rounded-2xl p-4 sm:p-5 shadow-lg border border-slate-200 max-w-4xl mx-auto">
            <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <div className="sm:col-span-5 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Doctor name, condition, or specialty..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>

              <div className="sm:col-span-4 relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <select
                  value={selectedSpecialty}
                  onChange={(e) => setSelectedSpecialty(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
                >
                  <option value="">All Specializations</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Emergency Medicine">Emergency Medicine</option>
                  <option value="Pediatrics">Pediatrics</option>
                  <option value="Neurology">Neurology</option>
                  <option value="General Physician">General Physician</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl transition-colors shadow-sm"
                >
                  Search Care
                </button>
              </div>
            </form>
          </div>

        </div>
      </section>

      {/* Specialty Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Explore by Specialization</h2>
            <p className="text-xs text-slate-500">Consult top verified medical specialists</p>
          </div>
          <Link to="/doctors" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center">
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((cat, i) => {
            const Icon = cat.icon;
            return (
              <button
                key={i}
                onClick={() => navigate(`/doctors?specialization=${cat.name}`)}
                className="p-4 bg-white rounded-2xl border border-slate-200/90 hover:border-blue-400 hover:shadow-md transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Icon className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  {cat.name}
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">{cat.count}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Featured Doctors Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Featured Verified Doctors</h2>
            <p className="text-xs text-slate-500">Board-certified doctors with active practice</p>
          </div>
          <Link to="/doctors" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center">
            <span>Explore All Doctors</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400 text-xs">Loading doctors...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {doctors.map((doc) => (
              <DoctorCard key={doc._id} doctor={doc} />
            ))}
          </div>
        )}
      </section>

      {/* Emergency Readiness Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-red-600 via-red-700 to-rose-700 rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4 animate-bounce" />
              <span>Real-Time Emergency Coordination</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Emergency Beep Parallel Broadcast System
            </h3>
            <p className="text-xs sm:text-sm text-red-100 leading-relaxed">
              Don't lose critical minutes calling hospital after hospital. SHAP sends a real-time Emergency Beep to all nearby capable trauma centers simultaneously. Select the nearest suitable facility with confirmed resource reservation.
            </p>
            <div className="pt-2">
              <Link
                to="/emergency/activate"
                className="inline-flex items-center space-x-2 px-6 py-3 bg-white text-red-700 hover:bg-red-50 font-extrabold text-sm rounded-xl shadow-md transition-all hover:scale-105 active:scale-95"
              >
                <span>Activate Emergency Mode Now</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Nearby Emergency Ready Hospitals */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Emergency Ready Hospitals</h2>
            <p className="text-xs text-slate-500">Facilities participating in SHAP real-time coordination</p>
          </div>
          <Link to="/hospitals" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center">
            <span>View All Facilities</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {hospitals.map((hosp) => (
            <HospitalCard key={hosp._id} hospital={hosp} />
          ))}
        </div>
      </section>

    </div>
  );
};

