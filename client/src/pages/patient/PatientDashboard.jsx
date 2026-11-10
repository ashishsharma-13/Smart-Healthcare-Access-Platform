import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  Calendar,
  Clock,
  MapPin,
  ArrowRight,
  Activity,
  User,
} from 'lucide-react';

export const PatientDashboard = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [aptRes, emgRes] = await Promise.all([
          api.get('/appointments/my'),
          api.get('/emergency/user/history'),
        ]);
        if (aptRes.data.success) setAppointments(aptRes.data.data.slice(0, 3));
        if (emgRes.data.success) setEmergencies(emgRes.data.data.slice(0, 3));
      } catch (err) {
        console.error('Error fetching dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-8">
      
      {/* Welcome Bar (Cleaned of duplicate Emergency Beep button) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Welcome back, {user?.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage your health visits, appointments, and rapid emergency coordination.
          </p>
        </div>
      </div>

      {/* Primary Emergency Banner - Sole Primary Emergency Trigger */}
      <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white shadow-xl shadow-red-600/20 flex flex-col md:flex-row items-center justify-between gap-6 border border-red-500/80">
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-white/20 rounded-full text-[11px] font-bold uppercase tracking-wider backdrop-blur-xs">
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>Urgent Medical Emergency</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Need Immediate Critical Care?
          </h2>
          <p className="text-xs sm:text-sm text-red-100 max-w-xl leading-relaxed">
            Activate Emergency Beep to broadcast your critical condition and location simultaneously to verified nearest suitable hospitals. Compare acceptances and temporarily reserve an ICU bed or ER bay.
          </p>
        </div>

        <Link
          to="/emergency/activate"
          className="whitespace-nowrap px-6 py-3.5 bg-white hover:bg-red-50 text-red-700 font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all active:scale-95 cursor-pointer"
        >
          Activate Beep Broadcast
        </Link>
      </div>

      {/* Appointments & Quick Actions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Upcoming Appointments (Col 8) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900">Upcoming Appointments</h2>
            </div>
            <Link to="/patient/appointments" className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors">
              View All ({appointments.length})
            </Link>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl">
              Loading visits...
            </div>
          ) : appointments.length === 0 ? (
            <div className="p-8 text-center bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl space-y-3">
              <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500">No scheduled upcoming appointments.</p>
              <Link
                to="/doctors"
                className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
              >
                Book with a Specialist
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map((apt) => (
                <div
                  key={apt._id}
                  className="p-5 bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl hover:bg-white/90 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50/90 text-blue-600 border border-blue-100 flex items-center justify-center font-bold text-base shadow-xs">
                      {apt.doctorId?.userId?.name?.charAt(0) || 'D'}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{apt.doctorId?.userId?.name}</h3>
                      <p className="text-xs text-blue-600 font-semibold">{apt.doctorId?.specialization}</p>
                      <div className="flex items-center space-x-3 mt-1 text-[11px] text-slate-500">
                        <span className="flex items-center">
                          <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          {apt.slotDate} at {apt.slotTime}
                        </span>
                        <span>&bull;</span>
                        <span className="flex items-center">
                          <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          {apt.organizationId?.name}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2.5 self-end sm:self-center">
                    <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {apt.status}
                    </span>
                    <Link
                      to="/patient/appointments"
                      className="px-3.5 py-1.5 bg-white/80 hover:bg-blue-50 text-slate-700 hover:text-blue-600 font-bold text-xs rounded-xl border border-slate-200/60 shadow-xs transition-colors"
                    >
                      Details & Pass
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Health Actions / Emergency History (Col 4) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-6 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Quick Health Access
            </h3>

            <div className="space-y-2.5">
              <Link
                to="/doctors"
                className="flex items-center justify-between p-3.5 rounded-xl bg-white/60 hover:bg-white/90 border border-white/70 text-slate-800 hover:text-blue-600 transition-all group shadow-xs"
              >
                <div className="flex items-center space-x-3 text-xs font-bold">
                  <User className="w-4 h-4 text-blue-600" />
                  <span>Search Verified Doctors</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                to="/hospitals"
                className="flex items-center justify-between p-3.5 rounded-xl bg-white/60 hover:bg-white/90 border border-white/70 text-slate-800 hover:text-blue-600 transition-all group shadow-xs"
              >
                <div className="flex items-center space-x-3 text-xs font-bold">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <span>Nearby Emergency Hospitals</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Recent Emergency Status Widget */}
          <div className="bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Recent Emergency Logs
              </h3>
              <Link to="/emergency/history" className="text-[11px] font-bold text-blue-600 hover:text-blue-700 transition-colors">
                History
              </Link>
            </div>

            {emergencies.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">No recent emergency logs.</p>
            ) : (
              <div className="space-y-2">
                {emergencies.map((emg) => (
                  <Link
                    key={emg._id}
                    to={
                      emg.status === 'RESOURCES_RESERVED'
                        ? `/emergency/reserved/${emg._id}`
                        : emg.status === 'DESTINATION_SELECTED' || emg.status === 'RESPONSES_RECEIVED'
                        ? `/emergency/responses/${emg._id}`
                        : `/emergency/tracking/${emg._id}`
                    }
                    className="block p-3.5 rounded-xl bg-white/60 hover:bg-white/90 transition-all border border-white/70 shadow-xs"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900 capitalize">
                        {emg.emergencyType} Emergency
                      </span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-100/80 text-blue-700">
                        {emg.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {new Date(emg.createdAt).toLocaleDateString()} &bull; {emg.requestCode}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
