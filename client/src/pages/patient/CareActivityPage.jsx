import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  ClipboardList,
  Calendar,
  ShieldAlert,
  User,
  Clock,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';

export const CareActivityPage = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState('ALL');

  useEffect(() => {
    fetchActivity();
  }, []);

  const fetchActivity = async () => {
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
      console.error('Failed to load care activity', err);
    } finally {
      setLoading(false);
    }
  };

  // Build unified chronological activity events
  const events = [];

  appointments.forEach((apt) => {
    events.push({
      id: `apt-${apt._id}`,
      type: 'appointment',
      title: `Consultation Booking: ${apt.doctorId?.userId?.name || apt.doctorId?.name || 'Doctor'}`,
      subtitle: `${apt.doctorId?.specialization || 'Consultation'} · ${apt.organizationId?.name || 'Clinic'}`,
      date: apt.createdAt || apt.slotDate,
      timeString: `${apt.slotDate} (${apt.slotTime})`,
      status: apt.status,
      link: '/patient/appointments',
      passNumber: apt.appointmentNumber,
    });
  });

  emergencies.forEach((emg) => {
    events.push({
      id: `emg-${emg._id}`,
      type: 'emergency',
      title: `Emergency Beep: ${emg.emergencyType || 'Acute Emergency'}`,
      subtitle: `Severity: ${emg.severity || 'CRITICAL'} · Status: ${emg.status || 'Active'}`,
      date: emg.createdAt,
      timeString: new Date(emg.createdAt).toLocaleString(),
      status: emg.status,
      link: `/emergency/tracking/${emg._id}`,
    });
  });

  // Add profile creation/update timestamp event
  if (user?.updatedAt) {
    events.push({
      id: `profile-${user.updatedAt}`,
      type: 'profile',
      title: 'Profile Updated',
      subtitle: 'Contact and clinical records synchronized',
      date: user.updatedAt,
      timeString: new Date(user.updatedAt).toLocaleDateString(),
      status: 'saved',
      link: '/patient/profile',
    });
  }

  // Sort descending by date
  events.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  const filteredEvents = events.filter((e) => {
    if (filterTab === 'ALL') return true;
    if (filterTab === 'APPOINTMENTS') return e.type === 'appointment';
    if (filterTab === 'EMERGENCY') return e.type === 'emergency';
    if (filterTab === 'PROFILE') return e.type === 'profile';
    return true;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Banner / Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-1.5 text-xs text-slate-400 mb-1">
            <span>Patient portal</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-blue-600 font-bold">Care activity</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Care Activity & History
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Timeline of appointments, emergency activations, and profile updates.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center bg-white border border-slate-200/80 rounded-2xl p-1 shadow-xs text-xs font-bold text-slate-600">
          {[
            { id: 'ALL', label: 'All Activity' },
            { id: 'APPOINTMENTS', label: 'Consultations' },
            { id: 'EMERGENCY', label: 'Emergency Beeps' },
            { id: 'PROFILE', label: 'Profile' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                filterTab === tab.id
                  ? 'bg-blue-50 text-blue-700 font-black shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading care activity timeline...</div>
      ) : filteredEvents.length === 0 ? (
        <div className="p-12 bg-white rounded-2xl border border-slate-200/80 text-center space-y-3">
          <ClipboardList className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">No activity records found</h3>
          <p className="text-xs text-slate-400">
            Book consultations or activate emergency care to view real-time timeline logs.
          </p>
          <Link
            to="/doctors"
            className="inline-block mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
          >
            Find a Doctor
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEvents.map((event) => (
            <div
              key={event.id}
              className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-start space-x-3.5">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    event.type === 'emergency'
                      ? 'bg-rose-50 text-rose-600'
                      : event.type === 'appointment'
                      ? 'bg-blue-50 text-blue-600'
                      : 'bg-emerald-50 text-emerald-600'
                  }`}
                >
                  {event.type === 'emergency' ? (
                    <ShieldAlert className="w-5 h-5" />
                  ) : event.type === 'appointment' ? (
                    <Calendar className="w-5 h-5" />
                  ) : (
                    <User className="w-5 h-5" />
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-bold text-slate-900">{event.title}</h3>
                    {event.status && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          ['confirmed', 'completed', 'saved'].includes(event.status?.toLowerCase())
                            ? 'bg-emerald-100 text-emerald-800'
                            : ['cancelled', 'rejected'].includes(event.status?.toLowerCase())
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {event.status}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{event.subtitle}</p>
                  <div className="flex items-center space-x-3 text-[11px] text-slate-400">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{event.timeString}</span>
                    </span>
                    {event.passNumber && (
                      <span>Token: <strong className="font-mono text-blue-600">{event.passNumber}</strong></span>
                    )}
                  </div>
                </div>
              </div>

              <Link
                to={event.link}
                className="self-end sm:self-center inline-flex items-center space-x-1 px-3.5 py-2 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50/60 hover:bg-blue-100/60 rounded-xl transition cursor-pointer"
              >
                <span>View Details</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CareActivityPage;

