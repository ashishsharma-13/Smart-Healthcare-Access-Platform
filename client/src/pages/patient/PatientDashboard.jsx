import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  Calendar,
  Users,
  FileText,
  Search,
  Siren,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { PreAppointmentChecklistModal } from '../../components/common/PreAppointmentChecklistModal';

export const PatientDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState([]);
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [checklistOpen, setChecklistOpen] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [aptRes, emgRes] = await Promise.all([
        api.get('/appointments/my'),
        api.get('/emergency/user/history'),
      ]);

      if (aptRes.data.success) {
        setAppointments(aptRes.data.data || []);
      }
      if (emgRes.data.success) {
        setEmergencies(emgRes.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching patient dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/doctors?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/doctors');
    }
  };

  // Compute dynamic metrics
  const upcomingAppointments = appointments.filter(
    (apt) => apt.status !== 'cancelled' && apt.status !== 'completed'
  );
  const nextAppointment = upcomingAppointments[0] || null;

  // Distinct doctor count (fallback to default 3 or count)
  const doctorIds = new Set(appointments.map((a) => a.doctorId?._id || a.doctorId).filter(Boolean));
  const careTeamCount = doctorIds.size > 0 ? doctorIds.size : 3;
  const activityCount = (appointments.length + emergencies.length) || 2;

  // Time-aware greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = user?.name ? user.name.split(' ')[0] : 'Aarav';

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* 1. Header Greeting Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest block mb-0.5">
            YOUR CARE, CONNECTED
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {getGreeting()}, {firstName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            A little clarity for your next step in care.
          </p>
        </div>

        <Link
          to="/doctors"
          className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-[#0B4F9C] hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Find a doctor</span>
        </Link>
      </div>

      {/* 2. Top Metric / Stat Cards (Row of 3 cards strictly per Reference Image 2) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Upcoming appointments */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Upcoming appointments</span>
            <Calendar className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2">
            <span className="text-3xl font-black text-slate-900">
              {String(upcomingAppointments.length || 1).padStart(2, '0')}
            </span>
            <p className="text-[11px] text-slate-400 mt-1 truncate">
              {nextAppointment
                ? `Next visit · ${nextAppointment.slotDate}, ${nextAppointment.slotTime}`
                : 'Next visit · Tomorrow, 10:30 AM'}
            </p>
          </div>
        </div>

        {/* Card 2: Your care team */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Your care team</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2">
            <span className="text-3xl font-black text-slate-900">
              {String(careTeamCount).padStart(2, '0')}
            </span>
            <p className="text-[11px] text-slate-400 mt-1">Verified providers you've visited</p>
          </div>
        </div>

        {/* Card 3: Care activity */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Care activity</span>
            <FileText className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2">
            <span className="text-3xl font-black text-slate-900">
              {String(activityCount).padStart(2, '0')}
            </span>
            <p className="text-[11px] text-slate-400 mt-1">Updates in the last 7 days</p>
          </div>
        </div>
      </div>

      {/* 3. Main Grid (Left Col 8, Right Col 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (Col 8) */}
        <div className="lg:col-span-8 space-y-6">
          {/* "Your next appointment" Card */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Your next appointment</h2>
              <Link
                to="/patient/appointments"
                className="text-xs font-bold text-blue-600 hover:underline flex items-center space-x-1"
              >
                <span>View all</span>
                <span>&rarr;</span>
              </Link>
            </div>

            {/* Doctor Info Row */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-full bg-[#EBF3FE] text-blue-700 font-bold flex items-center justify-center text-sm border border-blue-100 shrink-0">
                  {nextAppointment?.doctorId?.userId?.name
                    ? nextAppointment.doctorId.userId.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()
                    : 'MP'}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {nextAppointment?.doctorId?.userId?.name ||
                      nextAppointment?.doctorId?.name ||
                      'Dr. Mira Patel'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {nextAppointment?.doctorId?.specialization || 'Cardiology'} &bull; In-person consultation
                  </p>
                  <p className="text-xs text-slate-400">
                    {nextAppointment?.organizationId?.name || 'Riverside Medical Center'}
                  </p>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {nextAppointment?.status
                  ? nextAppointment.status.charAt(0).toUpperCase() + nextAppointment.status.slice(1)
                  : 'Confirmed'}
              </span>
            </div>

            {/* Date & Time Container */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center space-x-3 text-xs">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="font-bold text-slate-800">
                  {nextAppointment?.slotDate
                    ? new Date(nextAppointment.slotDate).toLocaleDateString('en-GB', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    : 'Tuesday, 10 November 2026'}
                </span>
                <span className="text-slate-400 ml-2 font-mono">
                  {nextAppointment?.slotTime || '10:30–11:00 AM'} &bull; Appointment #
                  {nextAppointment?.appointmentNumber || 'AP-2041'}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3 pt-1">
              <Link
                to="/patient/appointments"
                className="px-4 py-2.5 bg-[#0B4F9C] hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                View appointment
              </Link>
              <Link
                to="/patient/appointments"
                className="px-4 py-2.5 bg-blue-50/70 hover:bg-blue-100/70 text-blue-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Reschedule
              </Link>
            </div>
          </div>

          {/* "Find your next step" Card */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Find your next step</h2>
              <p className="text-xs text-slate-500 mt-0.5">Search doctors or specialties</p>
            </div>

            {/* Search Input Box */}
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Who would you like to see?"
                className="w-full py-2.5 pl-4 pr-28 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-[#0B4F9C] hover:bg-blue-800 text-white font-bold text-xs rounded-lg flex items-center space-x-1.5 transition cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search</span>
              </button>
            </form>

            {/* Quick Filter Specialty Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {[
                { name: 'Primary care', query: 'Primary Care' },
                { name: 'Cardiology', query: 'Cardiology' },
                { name: 'Pediatrics', query: 'Pediatrics' },
              ].map((spec) => (
                <button
                  key={spec.name}
                  type="button"
                  onClick={() => navigate(`/doctors?specialization=${encodeURIComponent(spec.query)}`)}
                  className="px-3.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition cursor-pointer"
                >
                  {spec.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (Col 4) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Emergency Card strictly per Reference Image 2 & Module 8 */}
          <div className="p-6 rounded-2xl bg-[#FEF2F2] border border-rose-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Siren className="w-4 h-4 text-rose-600 shrink-0 animate-pulse" />
                <h2 className="text-sm font-black text-rose-950">Emergency Mode Access</h2>
              </div>
              <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">24/7 Active</span>
            </div>
            <p className="text-xs text-rose-800/90 leading-relaxed font-medium">
              Create an urgent emergency request with GPS coordinates, review approved first-aid protocols, and alert emergency facilities.
            </p>
            <div className="flex flex-col gap-2 pt-1">
              <Link
                to="/emergency/activate"
                className="w-full py-3 bg-[#DC2626] hover:bg-red-700 text-white font-extrabold text-xs text-center block rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
              >
                Activate Emergency Mode
              </Link>
              <Link
                to="/emergency/history"
                className="w-full py-2 bg-white/80 hover:bg-white text-rose-900 font-bold text-xs text-center block rounded-xl border border-rose-200 transition cursor-pointer"
              >
                View Emergency Request History
              </Link>
            </div>
            <p className="text-[10px] text-rose-600/80 leading-normal pt-1">
              Immediate life-threat? Call <strong>112 / 108</strong> directly. Digital requests register and alert in parallel.
            </p>
          </div>

          {/* Recent Activity Card strictly per Reference Image 2 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <div className="pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Recent activity</h2>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-0.5">
                <h3 className="font-bold text-slate-900">Booking confirmed</h3>
                <p className="text-[11px] text-slate-600">
                  {nextAppointment
                    ? `${nextAppointment.doctorId?.userId?.name || 'Dr. Mira Patel'} &bull; ${nextAppointment.slotDate}, ${nextAppointment.slotTime}`
                    : 'Dr. Mira Patel &bull; Tomorrow, 10:30 AM'}
                </p>
                <span className="text-[10px] text-slate-400 block pt-0.5">Today &bull; 9:14 AM</span>
              </div>

              <div className="space-y-0.5 pt-2 border-t border-slate-100">
                <h3 className="font-bold text-slate-900">Profile updated</h3>
                <p className="text-[11px] text-slate-600">Contact information saved</p>
                <span className="text-[10px] text-slate-400 block pt-0.5">06 Nov &bull; 4:20 PM</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom Preparation Banner strictly per Reference Image 2 */}
      <div className="p-4 rounded-2xl bg-[#ECFDF5] border border-emerald-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <FileText className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-xs text-emerald-900 font-medium">
            A little preparation helps: bring your medication list and any previous reports to your appointment.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setChecklistOpen(true)}
          className="text-xs font-bold text-emerald-700 hover:text-emerald-800 shrink-0 cursor-pointer flex items-center space-x-1"
        >
          <span>Visit checklist</span>
          <span>&rarr;</span>
        </button>
      </div>

      {/* 5. Minimal Clinical Footer strictly per Reference Image 2 */}
      <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400 border-t border-slate-100">
        <div>SHAP &bull; Smart Healthcare Access Platform</div>
        <div>Conceptual sample data &bull; Privacy & support</div>
      </div>

      {/* Pre-Appointment Checklist Modal */}
      <PreAppointmentChecklistModal isOpen={checklistOpen} onClose={() => setChecklistOpen(false)} />
    </div>
  );
};

export default PatientDashboard;
