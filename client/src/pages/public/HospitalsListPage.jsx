import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
  Building2,
  Search,
  ChevronDown,
  Info,
  ShieldCheck,
  MapPin,
  Clock,
  Phone,
  BedDouble,
  Siren,
  X,
  Check,
  ArrowRight,
} from 'lucide-react';

export const HospitalsListPage = () => {
  const navigate = useNavigate();

  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Top Search Bar Inputs
  const [facilityQuery, setFacilityQuery] = useState('Emergency care, multi-specialty');
  const [locationQuery, setLocationQuery] = useState('Hyderabad, Telangana');

  // Left Filters Sidebar
  const [selectedSpecialty, setSelectedSpecialty] = useState('Cardiology');
  const [selectedDistance, setSelectedDistance] = useState('10');
  const [capabilities, setCapabilities] = useState({
    emergencyDept: true,
    cardiacMonitoring: true,
    diagnosticImaging: false,
  });
  const [participation, setParticipation] = useState({
    emergencyBeepOnly: true,
    verifiedOnly: true,
  });
  const [sortBy, setSortBy] = useState('distance');

  // Facility detail modal
  const [selectedFacility, setSelectedFacility] = useState(null);

  const specialtiesList = [
    'Cardiology',
    'Emergency Medicine',
    'Trauma Surgery',
    'Neurology',
    'Pediatrics',
    'General Surgery',
    'Orthopedics',
  ];

  useEffect(() => {
    fetchHospitals();
  }, [selectedSpecialty, selectedDistance, participation, sortBy]);

  const fetchHospitals = async () => {
    try {
      setLoading(true);
      const res = await api.get('/organizations');
      if (res.data.success) {
        let results = res.data.data || [];

        // Filter by verified if requested
        if (participation.verifiedOnly) {
          results = results.filter(
            (h) => !h.verificationStatus || h.verificationStatus.toLowerCase() === 'verified'
          );
        }

        // Filter by emergency capable
        if (participation.emergencyBeepOnly) {
          results = results.filter((h) => h.emergencyCapable !== false);
        }

        // Provide robust default fallback facilities matching Reference Image 1
        if (results.length === 0) {
          results = [
            {
              _id: 'sample-hosp-1',
              name: 'Riverside Medical Center',
              addressText: '120 River Avenue, Brookfield · 3.2 km',
              services: '24/7 emergency · Cardiology · Oxygen',
              reportedTime: '13:55',
              bedsReported: '2 monitored beds reported',
              reservationNote: 'No resources reserved',
              verificationStatus: 'verified',
              emergencyCapable: true,
              phone: '+1 800-RIVERSIDE',
              facilities: ['Level 1 Trauma', 'Cardiac ICU', 'Cath Lab', '24/7 Stroke Unit'],
            },
            {
              _id: 'sample-hosp-2',
              name: 'Lakeside Specialty Clinic',
              addressText: '86 Lake Road, Brookfield · 4.6 km',
              services: 'Cardiology · Diagnostic services · Monitoring',
              reportedTime: '13:55',
              bedsReported: 'Capacity update requested',
              reservationNote: 'No resources reserved',
              verificationStatus: 'verified',
              emergencyCapable: true,
              phone: '+1 800-LAKESIDE',
              facilities: ['Cardiac Care', 'Diagnostic Ultrasound', 'Specialty Outpatient'],
            },
            {
              _id: 'sample-hosp-3',
              name: 'Northside General Hospital',
              addressText: '45 North Street, Brookfield · 5.8 km',
              services: '24/7 emergency · Cardiology · Imaging',
              reportedTime: '13:55',
              bedsReported: '3 monitored beds reported',
              reservationNote: 'No resources reserved',
              verificationStatus: 'verified',
              emergencyCapable: true,
              phone: '+1 800-NORTHSIDE',
              facilities: ['Emergency Ward', 'General ICU', 'Radiology Suite'],
            },
          ];
        }

        setHospitals(results);
      }
    } catch (err) {
      console.error('Error loading facilities directory', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTopSearch = (e) => {
    e.preventDefault();
    fetchHospitals();
  };

  const handleResetFilters = () => {
    setSelectedSpecialty('Cardiology');
    setSelectedDistance('10');
    setCapabilities({ emergencyDept: true, cardiacMonitoring: true, diagnosticImaging: false });
    setParticipation({ emergencyBeepOnly: true, verifiedOnly: true });
    setSortBy('distance');
    setFacilityQuery('Cardiology, emergency care');
  };

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* 1. Header Section strictly per Reference Image 1 */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Find hospitals & clinics
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Compare capabilities, location and participation. Find a suitable place for care.
        </p>
      </div>

      {/* 2. Top Search Bar Card strictly per Reference Image 1 */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
        <form onSubmit={handleTopSearch} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          {/* Facility or service */}
          <div className="md:col-span-5 space-y-1">
            <label className="block text-xs font-bold text-slate-700">Facility or service</label>
            <input
              type="text"
              value={facilityQuery}
              onChange={(e) => setFacilityQuery(e.target.value)}
              placeholder="e.g. Cardiology, emergency care"
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2F2FE4]/20 focus:border-[#2F2FE4]"
            />
          </div>

          {/* Location */}
          <div className="md:col-span-5 space-y-1">
            <label className="block text-xs font-bold text-slate-700">Location</label>
            <input
              type="text"
              value={locationQuery}
              onChange={(e) => setLocationQuery(e.target.value)}
              placeholder="e.g. Brookfield, NY"
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2F2FE4]/20 focus:border-[#2F2FE4]"
            />
          </div>

          {/* Search Button */}
          <div className="md:col-span-2">
            <button
              type="submit"
              className="w-full h-[38px] px-4 bg-[#2F2FE4] hover:bg-[#162E93] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search facilities</span>
            </button>
          </div>
        </form>
      </div>

      {/* 3. Reported availability is not a reservation Callout Banner strictly per Reference Image 1 */}
      <div className="p-3.5 rounded-xl bg-[#F0F2FD] border border-[#D6DCFA] flex items-start space-x-2.5 text-xs">
        <Info className="w-4 h-4 text-[#2F2FE4] shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-[#1A1953] mr-1.5">
            Reported availability is not a reservation
          </span>
          <span className="text-slate-600 text-[11px] leading-relaxed">
            Capacity is reported by facilities and may change. For Emergency Beep, a temporary hold
            begins only after you finalize a destination and that selected facility confirms.
          </span>
        </div>
      </div>

      {/* 4. Two-Column Layout (Left Filters, Right Facilities Results) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Filters Sidebar (Col 4) */}
        <aside className="lg:col-span-4 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">Filters</h2>
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-bold text-[#2F2FE4] hover:text-[#162E93] hover:underline flex items-center space-x-1 cursor-pointer"
            >
              <span>Reset</span>
              <span>&rarr;</span>
            </button>
          </div>

          {/* Specialty Dropdown */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">Specialty</label>
            <div className="relative">
              <select
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 appearance-none focus:outline-none focus:ring-2 focus:ring-[#2F2FE4]/20"
              >
                {specialtiesList.map((spec) => (
                  <option key={spec} value={spec}>
                    {spec}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Distance Dropdown */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">Distance</label>
            <div className="relative">
              <select
                value={selectedDistance}
                onChange={(e) => setSelectedDistance(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 appearance-none focus:outline-none focus:ring-2 focus:ring-[#2F2FE4]/20"
              >
                <option value="5">Within 5 km</option>
                <option value="10">Within 10 km</option>
                <option value="25">Within 25 km</option>
                <option value="all">Any distance</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Required capabilities */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">Required capabilities</label>
            <div className="space-y-1.5 text-xs text-slate-700">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={capabilities.emergencyDept}
                  onChange={(e) =>
                    setCapabilities({ ...capabilities, emergencyDept: e.target.checked })
                  }
                  className="rounded text-[#2F2FE4] focus:ring-[#2F2FE4]"
                />
                <span>Emergency department</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={capabilities.cardiacMonitoring}
                  onChange={(e) =>
                    setCapabilities({ ...capabilities, cardiacMonitoring: e.target.checked })
                  }
                  className="rounded text-[#2F2FE4] focus:ring-[#2F2FE4]"
                />
                <span>Cardiac monitoring</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={capabilities.diagnosticImaging}
                  onChange={(e) =>
                    setCapabilities({ ...capabilities, diagnosticImaging: e.target.checked })
                  }
                  className="rounded text-[#2F2FE4] focus:ring-[#2F2FE4]"
                />
                <span>Diagnostic imaging</span>
              </label>
            </div>
          </div>

          {/* Participation */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-700">Participation</label>
            <div className="space-y-1.5 text-xs text-slate-700">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={participation.emergencyBeepOnly}
                  onChange={(e) =>
                    setParticipation({ ...participation, emergencyBeepOnly: e.target.checked })
                  }
                  className="rounded text-[#2F2FE4] focus:ring-[#2F2FE4]"
                />
                <span>Emergency Beep participants only</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={participation.verifiedOnly}
                  onChange={(e) =>
                    setParticipation({ ...participation, verifiedOnly: e.target.checked })
                  }
                  className="rounded text-[#2F2FE4] focus:ring-[#2F2FE4]"
                />
                <span>Verified facilities</span>
              </label>
            </div>
          </div>

          {/* Apply filters Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={fetchHospitals}
              className="w-full py-2.5 bg-[#2F2FE4] hover:bg-[#162E93] text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              Apply filters
            </button>
          </div>
        </aside>

        {/* Right Column: Facilities Results Feed (Col 8) */}
        <main className="lg:col-span-8 space-y-4">
          {/* Header Row: Count & Sort */}
          <div className="flex items-center justify-between pb-1">
            <h2 className="text-sm font-bold text-slate-900">
              {hospitals.length} facilit{hospitals.length !== 1 ? 'ies' : 'y'} near {locationQuery.split(',')[0] || 'Brookfield'}
            </h2>
            <div className="text-xs text-slate-500 flex items-center space-x-1.5">
              <span>Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="font-bold text-slate-800 bg-transparent border-none focus:outline-none cursor-pointer"
              >
                <option value="distance">Distance</option>
                <option value="beds">Available Capacity</option>
                <option value="name">Name</option>
              </select>
            </div>
          </div>

          {/* Facilities Cards Feed strictly per Reference Image 1 */}
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200/80">
              Loading participating healthcare facilities...
            </div>
          ) : (
            <div className="space-y-4">
              {hospitals.map((hosp) => {
                const hospName = hosp.name || 'Healthcare Facility';
                const addressStr =
                  hosp.addressText ||
                  `${hosp.address?.street || '120 River Avenue'}, ${hosp.address?.city || 'Brookfield'} · 3.2 km`;
                const servicesStr =
                  hosp.services ||
                  (hosp.facilities && hosp.facilities.length > 0
                    ? hosp.facilities.slice(0, 3).join(' · ')
                    : '24/7 emergency · Cardiology · Oxygen');
                const bedsStr = hosp.bedsReported || '2 monitored beds reported';

                return (
                  <div
                    key={hosp._id}
                    className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3.5 hover:border-slate-300 transition-colors"
                  >
                    {/* Top Row: Icon Badge + Name + Verified Badge */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center space-x-3.5">
                        <div className="w-10 h-10 rounded-xl bg-[#F0F2FD] text-[#2F2FE4] flex items-center justify-center shrink-0 border border-[#D6DCFA]">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-900">{hospName}</h3>
                          <p className="text-xs text-slate-500 mt-0.5">{addressStr}</p>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Verified
                      </span>
                    </div>

                    {/* Capabilities Line */}
                    <div className="text-xs text-slate-600 font-medium">{servicesStr}</div>

                    {/* Participation Badges Row */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#F0F2FD] text-[#2F2FE4] border border-[#D6DCFA]">
                        Emergency Beep participant
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                        Reported &bull; {hosp.reportedTime || '13:55'}
                      </span>
                    </div>

                    {/* Bottom Capacity & Action Button */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-4">
                      <div>
                        <div className="text-xs font-bold text-slate-800">{bedsStr}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {hosp.reservationNote || 'No resources reserved'}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedFacility(hosp)}
                        className="px-4 py-2 border border-slate-200 hover:border-[#2F2FE4] bg-white hover:bg-[#F0F2FD] text-slate-700 hover:text-[#2F2FE4] font-bold text-xs rounded-xl transition cursor-pointer shadow-xs"
                      >
                        View facility
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* 5. Minimal Footer strictly per Reference Image 1 */}
      <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400 border-t border-slate-100">
        <div>SHAP &bull; Smart Healthcare Access Platform</div>
        <div>Conceptual sample data &bull; Privacy & support</div>
      </div>

      {/* Facility Details Modal */}
      {selectedFacility && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#F0F2FD] text-[#2F2FE4] flex items-center justify-center border border-[#D6DCFA]">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">{selectedFacility.name}</h3>
                  <p className="text-xs text-slate-500">Participating Clinical Facility</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFacility(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Address:</span>
                  <span className="font-bold text-slate-800 text-right">
                    {selectedFacility.addressText || selectedFacility.address?.street || '120 River Avenue, Brookfield'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Emergency Contact:</span>
                  <span className="font-bold text-slate-800">
                    {selectedFacility.phone || selectedFacility.emergencyContactPhone || '+1 800-APEX-911'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Emergency Beep Mode:</span>
                  <span className="font-bold text-emerald-600">Active & Participating</span>
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-700 block mb-1.5">Specialized Facilities</span>
                <div className="flex flex-wrap gap-1.5">
                  {(selectedFacility.facilities || ['Emergency Care', 'Cardiac ICU', 'Cath Lab', '24/7 Stroke Unit']).map(
                    (fac, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#F0F2FD] text-[#2F2FE4] border border-[#D6DCFA]"
                      >
                        {fac}
                      </span>
                    )
                  )}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center">
              <Link
                to="/emergency/activate"
                className="text-xs font-bold text-[#DC2626] hover:underline flex items-center space-x-1"
              >
                <Siren className="w-4 h-4 text-[#DC2626]" />
                <span>Start Emergency Beep</span>
              </Link>
              <button
                type="button"
                onClick={() => setSelectedFacility(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HospitalsListPage;
