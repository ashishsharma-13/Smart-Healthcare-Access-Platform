import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { DoctorCard } from '../../components/common/DoctorCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { DoctorCardSkeleton } from '../../components/ui/Skeleton';
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
  ShieldCheck,
  RotateCcw,
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
    { name: 'all', label: 'All Specialties' },
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

  const handleResetFilters = () => {
    setSpecialization('all');
    setMinExp('');
    setOnlyAvailable(false);
    setOnlyPresent(false);
    setMaxFee(2000);
    setSearchQuery('');
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Page Header */}
      <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="presence" size="xs" dot>
                NMC Validated Practitioner Directory
              </Badge>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Find Verified Medical Specialists
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Book scheduled consultations or filter by physicians currently verified on-site at partner hospitals
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by physician name, clinical specialty, or condition..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white"
            />
          </div>
          <Button type="submit" variant="primary" size="sm" icon={Search}>
            Search
          </Button>
        </form>

        {/* Quick Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1">
          {categories.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => setSpecialization(c.name)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                specialization === c.name
                  ? 'bg-brand-600 text-white font-semibold shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Left Filter Sidebar + Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Filter Pane (Col 3) */}
        <aside className="lg:col-span-3 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 space-y-5 shadow-card">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 text-slate-900 font-semibold text-xs uppercase tracking-wider">
              <SlidersHorizontal className="w-4 h-4 text-brand-600" />
              <span>Filters</span>
            </div>
            <button
              onClick={handleResetFilters}
              className="text-xs text-brand-600 hover:text-brand-800 font-medium flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          {/* Physical Presence Toggle */}
          <div className="p-3 bg-presence-50 rounded-lg border border-presence-200/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="onlyPresent" className="text-xs font-semibold text-presence-900 cursor-pointer">
                Present On-Site Only
              </label>
              <input
                id="onlyPresent"
                type="checkbox"
                checked={onlyPresent}
                onChange={(e) => setOnlyPresent(e.target.checked)}
                className="w-4 h-4 text-presence-600 rounded focus:ring-presence-500 cursor-pointer accent-presence-600"
              />
            </div>
            <p className="text-[11px] text-presence-700 leading-snug">
              Shows practitioners physically verified via QR check-in on facility premises right now.
            </p>
          </div>

          {/* Booking Availability */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
            <label htmlFor="onlyAvailable" className="text-xs font-medium text-slate-700 cursor-pointer">
              Open for Bookings
            </label>
            <input
              id="onlyAvailable"
              type="checkbox"
              checked={onlyAvailable}
              onChange={(e) => setOnlyAvailable(e.target.checked)}
              className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500 cursor-pointer accent-brand-600"
            />
          </div>

          {/* Consultation Fee Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium text-slate-700">
              <span>Max Consultation Fee</span>
              <span className="font-bold text-brand-700">₹{maxFee}</span>
            </div>
            <input
              type="range"
              min="300"
              max="2500"
              step="100"
              value={maxFee}
              onChange={(e) => setMaxFee(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
            />
          </div>

          {/* Minimum Experience */}
          <div className="space-y-1.5">
            <label htmlFor="filter-min-exp" className="text-xs font-medium text-slate-700 block">
              Minimum Experience
            </label>
            <select
              id="filter-min-exp"
              value={minExp}
              onChange={(e) => setMinExp(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white"
            >
              <option value="">Any Experience</option>
              <option value="5">5+ Years</option>
              <option value="10">10+ Years</option>
              <option value="15">15+ Years</option>
            </select>
          </div>

          {/* Validation Notice */}
          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
            <div className="flex items-center text-presence-700 font-semibold gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>NMC Licensed Directory</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-snug">
              Every practitioner's medical license is verified by SHAP administrative compliance.
            </p>
          </div>
        </aside>

        {/* Right Results Grid (Col 9) */}
        <main className="lg:col-span-9 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span className="font-medium text-slate-700">
              Showing {doctors.length} Verified Practitioner{doctors.length !== 1 ? 's' : ''}
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <DoctorCardSkeleton key={i} />
              ))}
            </div>
          ) : doctors.length === 0 ? (
            <EmptyState
              icon={Stethoscope}
              title="No Practitioners Found"
              description="No physicians match your filter combination. Try resetting filters or expanding fee range."
              actionLabel="Reset All Filters"
              onAction={handleResetFilters}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
