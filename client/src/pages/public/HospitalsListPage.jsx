import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { HospitalCard } from '../../components/common/HospitalCard';
import { Building2, Search, Filter, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

export const HospitalsListPage = () => {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchHospitals();
  }, [filterType]);

  const fetchHospitals = async () => {
    try {
      setLoading(true);
      let url = '/organizations';
      if (filterType !== 'all') {
        url += `?type=${filterType}`;
      }
      const res = await api.get(url);
      if (res.data.success) {
        setHospitals(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching hospitals', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = hospitals.filter((h) =>
    h.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.address?.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Hospitals & Clinics Directory</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Participating healthcare organizations with verified emergency capabilities and managed bed capacity.
          </p>
        </div>

        <Link
          to="/emergency/activate"
          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all self-start md:self-auto"
        >
          <ShieldAlert className="w-4 h-4 animate-bounce" />
          <span>Emergency Beep Mode</span>
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        <div className="sm:col-span-8 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search facility by name or locality..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="sm:col-span-4">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Healthcare Facilities</option>
            <option value="hospital">Hospitals Only</option>
            <option value="clinic">Outpatient Clinics</option>
            <option value="specialty_center">Specialty Centers</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading facilities...</div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No facilities found</h3>
          <p className="text-xs text-slate-500">Try adjusting your search criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((hosp) => (
            <HospitalCard key={hosp._id} hospital={hosp} />
          ))}
        </div>
      )}

    </div>
  );
};

