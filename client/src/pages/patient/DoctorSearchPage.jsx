import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { DoctorCard } from '../../components/common/DoctorCard';
import { Search, Filter, SlidersHorizontal, UserCheck, Stethoscope } from 'lucide-react';

export const DoctorSearchPage = () => {
  const [searchParams] = useSearchParams();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [specialization, setSpecialization] = useState(searchParams.get('specialization') || 'all');
  const [minExp, setMinExp] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  useEffect(() => {
    fetchDoctors();
  }, [specialization, minExp, onlyAvailable]);

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
              d.specialization?.toLowerCase().includes(searchQuery.toLowerCase())
          );
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
    <div className="space-y-6">
      
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Find Doctors & Specialists</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Consult board-certified, verified healthcare professionals across top medical facilities.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Filter Pane (Col 3) matching Screen 3 */}
        <aside className="lg:col-span-3 bg-white p-5 rounded-2xl border border-slate-200 space-y-6">
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
                setSearchQuery('');
              }}
              className="text-[11px] text-blue-600 hover:underline font-semibold"
            >
              Reset
            </button>
          </div>

          {/* Specialization Filter */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700">Specialization</label>
            <select
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Specializations</option>
              <option value="Cardiology">Cardiology</option>
              <option value="Emergency Medicine">Emergency Medicine</option>
              <option value="Pediatrics">Pediatrics</option>
              <option value="Neurology">Neurology</option>
              <option value="General Physician">General Physician</option>
            </select>
          </div>

          {/* Minimum Experience */}
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

          {/* Availability checkbox */}
          <div className="pt-2">
            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={onlyAvailable}
                onChange={(e) => setOnlyAvailable(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs font-semibold text-slate-700">Available for Appointments</span>
            </label>
          </div>

          {/* Verification info badge */}
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-start space-x-2 text-[11px] text-emerald-800">
            <UserCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <span>Only doctors with verified state medical license appear in public discovery.</span>
          </div>
        </aside>

        {/* Right Results Grid (Col 9) */}
        <div className="lg:col-span-9 space-y-4">
          
          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search doctor by name, specialty, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-24 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors"
            >
              Search
            </button>
          </form>

          {/* Count bar */}
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>Showing <strong className="text-slate-900">{doctors.length}</strong> verified doctors</span>
            {specialization !== 'all' && (
              <span className="bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded-full">
                Filter: {specialization}
              </span>
            )}
          </div>

          {/* Doctors Grid */}
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border">
              Searching verified specialists...
            </div>
          ) : doctors.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
              <Stethoscope className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No doctors match your criteria</h3>
              <p className="text-xs text-slate-500">Try adjusting your filters or search keywords.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {doctors.map((doc) => (
                <DoctorCard key={doc._id} doctor={doc} />
              ))}
            </div>
          )}

        </div>

      </div>

    </div>
  );
};

