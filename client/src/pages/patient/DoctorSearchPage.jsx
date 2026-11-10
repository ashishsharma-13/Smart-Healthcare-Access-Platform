import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { DoctorCard } from '../../components/common/DoctorCard';
import {
  Search,
  Filter,
  SlidersHorizontal,
  UserCheck,
  Stethoscope,
  HeartPulse,
  Brain,
  Baby,
  Bone,
  Eye,
  Activity,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

export const DoctorSearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [specialization, setSpecialization] = useState(searchParams.get('specialization') || 'all');
  const [minExp, setMinExp] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [onlyPresent, setOnlyPresent] = useState(false);
  const [maxFee, setMaxFee] = useState(2000);

  const categories = [
    { name: 'all', label: 'All Specialists' },
    { name: 'Cardiology', label: 'Cardiology' },
    { name: 'Neurology', label: 'Neurology' },
    { name: 'Pediatrics', label: 'Pediatrics' },
    { name: 'Orthopedics', label: 'Orthopedics' },
    { name: 'Ophthalmology', label: 'Ophthalmology' },
    { name: 'General Medicine', label: 'General Medicine' },
    { name: 'Emergency Medicine', label: 'Emergency Medicine' },
  ];

  useEffect(() => {
    fetchDoctors();
  }, [specialization, minExp, onlyAvailable, onlyPresent]);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (specialization && specialization !== 'all') {
        queryParams.append('specialization', specialization);
      }
      if (minExp) {
        queryParams.append('experienceYears', minExp);
      }
      if (onlyAvailable) {
        queryParams.append('isAvailable', 'true');
      }

      const res = await api.get(`/doctors?${queryParams.toString()}`);
      if (res.data.success) {
        let results = res.data.data;
        if (searchQuery) {
          results = results.filter(
            (d) =>
              d.userId?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              d.specialization?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              d.qualifications?.some((q) => q.toLowerCase().includes(searchQuery.toLowerCase()))
          );
        }
        if (onlyPresent) {
          results = results.filter((d) => d.currentPresence?.isPresent);
        }
        if (maxFee) {
          results = results.filter((d) => (d.consultationFee || 500) <= maxFee);
        }
        setDoctors(results);
      }
    } catch (err) {
      console.error('Error fetching doctors', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchDoctors();
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Page Header (Screen 01 & 04 Montage) */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold border border-blue-200 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>NMC Validated Practitioner Directory</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Find Verified Doctors & Specialists
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Book scheduled clinic appointments or filter by doctors currently present on-site at partner facilities.
            </p>
          </div>
        </div>

        {/* Search Input Bar */}
        <form onSubmit={handleSearchSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by doctor name, specialty, or condition..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl shadow-xs transition-colors flex items-center space-x-1.5"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search</span>
          </button>
        </form>

        {/* Quick Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
          {categories.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => setSpecialization(c.name)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                specialization === c.name
                  ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Filter Pane (Col 3) matching Screen 01 Montage */}
        <aside className="lg:col-span-3 bg-white p-5 rounded-3xl border border-slate-200 space-y-6 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2 text-slate-900 font-bold text-xs uppercase tracking-wider">
              <SlidersHorizontal className="w-4 h-4 text-blue-600" />
              <span>Filter Providers</span>
            </div>
            <button
              onClick={() => {
                setSpecialization('all');
                setMinExp('');
                setOnlyAvailable(false);
                setOnlyPresent(false);
                setMaxFee(2000);
                setSearchQuery('');
              }}
              className="text-[11px] text-blue-600 hover:underline font-semibold"
            >
              Reset All
            </button>
          </div>

          {/* Physical Presence Toggle - Core Rule */}
          <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="onlyPresent" className="text-xs font-bold text-emerald-900 cursor-pointer">
                Present On-Site Only
              </label>
              <input
                id="onlyPresent"
                type="checkbox"
                checked={onlyPresent}
                onChange={(e) => setOnlyPresent(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded-sm focus:ring-emerald-500 cursor-pointer"
              />
            </div>
            <p className="text-[10px] text-emerald-700 leading-tight">
              Only shows physicians physically verified via QR check-in on-site right now.
            </p>
          </div>

          {/* Availability Toggle */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <label htmlFor="onlyAvailable" className="text-xs font-bold text-slate-700 cursor-pointer">
              Open For Bookings
            </label>
            <input
              id="onlyAvailable"
              type="checkbox"
              checked={onlyAvailable}
              onChange={(e) => setOnlyAvailable(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded-sm focus:ring-blue-500 cursor-pointer"
            />
          </div>

          {/* Max Consultation Fee Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Max Fee</span>
              <span className="text-blue-600">₹{maxFee}</span>
            </div>
            <input
              type="range"
              min="300"
              max="2500"
              step="100"
              value={maxFee}
              onChange={(e) => setMaxFee(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          {/* Experience Filter */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700">Minimum Experience</label>
            <select
              value={minExp}
              onChange={(e) => setMinExp(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Any Experience</option>
              <option value="5">5+ Years</option>
              <option value="10">10+ Years</option>
              <option value="15">15+ Years</option>
            </select>
          </div>

          {/* Trust Guarantee Note */}
          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
            <div className="flex items-center text-emerald-600 font-bold">
              <UserCheck className="w-3.5 h-3.5 mr-1" />
              <span>NMC Licensed</span>
            </div>
            <p className="text-[10px] text-slate-400">
              Unverified doctors are strictly quarantined and never displayed.
            </p>
          </div>
        </aside>

        {/* Right Doctor Results Grid (Col 9) */}
        <main className="lg:col-span-9 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span className="font-semibold text-slate-700">
              Showing {doctors.length} Verified Specialist{doctors.length !== 1 ? 's' : ''}
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-60 bg-white border rounded-2xl animate-pulse"></div>
              ))}
            </div>
          ) : doctors.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
              <Stethoscope className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">No Specialists Match Your Filter</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Try resetting filters or searching with a different specialty keyword.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {doctors.map((doctor) => (
                <DoctorCard key={doctor._id} doctor={doctor} />
              ))}
            </div>
          )}
        </main>

      </div>

    </div>
  );
};
export default DoctorSearchPage;
