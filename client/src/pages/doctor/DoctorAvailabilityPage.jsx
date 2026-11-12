import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Save,
  Coffee,
  ShieldCheck,
  Building2,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { Toast } from '../../components/ui/Toast';

export const DoctorAvailabilityPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ type: '', message: '' });

  // Availability settings
  const [isAvailableForAppointments, setIsAvailableForAppointments] = useState(true);
  const [isAvailableForEmergency, setIsAvailableForEmergency] = useState(false);
  const [workingHours, setWorkingHours] = useState('Mon–Fri · 9:00 AM–4:00 PM');
  const [lunchBreak, setLunchBreak] = useState('12:00 PM – 01:00 PM');
  const [slotDuration, setSlotDuration] = useState('30');
  const [leadTimeHours, setLeadTimeHours] = useState('2');

  const daysList = [
    { key: 'mon', label: 'Monday', enabled: true, start: '09:00 AM', end: '04:00 PM' },
    { key: 'tue', label: 'Tuesday', enabled: true, start: '09:00 AM', end: '04:00 PM' },
    { key: 'wed', label: 'Wednesday', enabled: true, start: '09:00 AM', end: '04:00 PM' },
    { key: 'thu', label: 'Thursday', enabled: true, start: '09:00 AM', end: '04:00 PM' },
    { key: 'fri', label: 'Friday', enabled: true, start: '09:00 AM', end: '04:00 PM' },
    { key: 'sat', label: 'Saturday', enabled: false, start: '10:00 AM', end: '01:00 PM' },
    { key: 'sun', label: 'Sunday', enabled: false, start: 'Closed', end: 'Closed' },
  ];

  const [days, setDays] = useState(daysList);

  useEffect(() => {
    fetchDoctorAvailability();
  }, []);

  const fetchDoctorAvailability = async () => {
    try {
      setLoading(true);
      const res = await api.get('/doctors/me');
      if (res.data.success) {
        const doc = res.data.data;
        setIsAvailableForAppointments(doc.isAvailableForAppointments ?? true);
        setIsAvailableForEmergency(doc.isAvailableForEmergency ?? false);
        if (doc.workingHours) setWorkingHours(doc.workingHours);
      }
    } catch (err) {
      console.warn('Could not fetch doctor availability', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDay = (key) => {
    setDays(
      days.map((d) => (d.key === key ? { ...d, enabled: !d.enabled } : d))
    );
  };

  const handleSaveAvailability = async () => {
    try {
      setSaving(true);
      const payload = {
        isAvailableForAppointments,
        isAvailableForEmergency,
        workingHours,
      };

      const res = await api.put('/doctors/me', payload);
      if (res.data.success) {
        setToast({ type: 'success', message: 'Availability schedule saved successfully!' });
      }
    } catch (err) {
      console.error('Error updating availability', err);
      setToast({
        type: 'error',
        message: err.response?.data?.message || 'Failed to save availability settings.',
      });
    } finally {
      setSaving(false);
      setTimeout(() => setToast({ type: '', message: '' }), 4000);
    }
  };

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* Toast Notification */}
      {toast.message && <Toast type={toast.type} message={toast.message} onClose={() => setToast({ type: '', message: '' })} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Manage Availability & Working Hours
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Configure your active weekly consultation hours, blocked lunch breaks, and booking status.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSaveAvailability}
          disabled={saving}
          className="px-5 py-2.5 bg-[#0B4F9C] hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-2 cursor-pointer disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Availability'}</span>
        </button>
      </div>

      {/* Booking Mode Status Banners */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-card flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Outpatient Consultation Booking</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAvailableForAppointments
                ? 'Your public schedule is OPEN for patient reservations.'
                : 'Your schedule is currently PAUSED to new bookings.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAvailableForAppointments(!isAvailableForAppointments)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              isAvailableForAppointments
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
            }`}
          >
            {isAvailableForAppointments ? 'Open' : 'Paused'}
          </button>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-card flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Emergency On-Call Standby</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAvailableForEmergency
                ? 'Ready for urgent facility triage broadcast routing.'
                : 'Standby mode is off. Routine outpatient consultations only.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAvailableForEmergency(!isAvailableForEmergency)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              isAvailableForEmergency
                ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
            }`}
          >
            {isAvailableForEmergency ? 'Active' : 'Standby Off'}
          </button>
        </div>
      </div>

      {/* Weekly Schedule Days */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-card space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Weekly Operating Schedule</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Patients can only select appointment slots falling within your active days.
            </p>
          </div>
          <Link
            to="/doctor/schedule"
            className="text-xs font-bold text-[#0B4F9C] hover:underline"
          >
            Manage specific 30-min slots &rarr;
          </Link>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {days.map((day) => (
            <div key={day.key} className="py-3 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={day.enabled}
                  onChange={() => handleToggleDay(day.key)}
                  className="w-4 h-4 rounded text-[#0B4F9C] focus:ring-blue-500 cursor-pointer"
                />
                <span className={`font-bold ${day.enabled ? 'text-slate-900' : 'text-slate-400 line-through'}`}>
                  {day.label}
                </span>
              </div>

              {day.enabled ? (
                <div className="flex items-center space-x-2 text-slate-600">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 font-medium">
                    {day.start}
                  </span>
                  <span>to</span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 font-medium">
                    {day.end}
                  </span>
                </div>
              ) : (
                <span className="text-slate-400 italic">Off duty / Unavailable</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Lunch & Consultation Intervals Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
          <Coffee className="w-4 h-4 text-[#0B4F9C]" />
          <h2 className="text-sm font-bold text-slate-900">Break Blocks & Slot Duration</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1">
            <label className="block font-bold text-slate-700">Blocked Lunch Time</label>
            <input
              type="text"
              value={lunchBreak}
              onChange={(e) => setLunchBreak(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-bold text-slate-700">Slot Duration</label>
            <select
              value={slotDuration}
              onChange={(e) => setSlotDuration(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">60 minutes</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block font-bold text-slate-700">Advance Notice Required</label>
            <select
              value={leadTimeHours}
              onChange={(e) => setLeadTimeHours(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="1">1 hour in advance</option>
              <option value="2">2 hours in advance</option>
              <option value="6">6 hours in advance</option>
              <option value="24">24 hours in advance</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorAvailabilityPage;
