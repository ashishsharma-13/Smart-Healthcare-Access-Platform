import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { HospitalCard } from '../../components/common/HospitalCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { HospitalCardSkeleton } from '../../components/ui/Skeleton';
import { Building2, Search, Filter, ShieldAlert } from 'lucide-react';

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-card">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="info" size="xs">
              National Health Network
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Emergency Ready Facilities Directory
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Participating healthcare organizations with verified trauma capabilities and real-time bed capacity.
          </p>
        </div>

        <Link to="/emergency/activate">
          <Button variant="emergency" size="md" icon={ShieldAlert}>
            Emergency Beep Mode
          </Button>
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-card grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        <div className="sm:col-span-8 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search facility by name, locality, or district..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white"
          />
        </div>

        <div className="sm:col-span-4">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white"
          >
            <option value="all">All Healthcare Facilities</option>
            <option value="hospital">Hospitals Only</option>
            <option value="clinic">Outpatient Clinics</option>
            <option value="specialty_center">Specialty Trauma Centers</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <HospitalCardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No Facilities Found"
          description="No healthcare organizations match your search keyword. Try clearing filters or searching another city."
          actionLabel="Reset Search"
          onAction={() => {
            setSearchTerm('');
            setFilterType('all');
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((hosp) => (
            <HospitalCard key={hosp._id} hospital={hosp} />
          ))}
        </div>
      )}

    </div>
  );
};

export default HospitalsListPage;
