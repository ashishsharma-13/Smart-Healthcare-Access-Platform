import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Stethoscope,
  Calendar,
  CheckCircle2,
  XCircle,
  QrCode,
  Clock,
  ShieldAlert,
  Activity,
  Users,
  Award,
} from 'lucide-react';

export const DoctorDashboard = () => {
  const { user } = useAuth();
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    fetchDoctorData();
  }, []);

  const fetchDoctorData = async () => {
    try {
      setLoading(true);
      const [profileRes, aptRes] = await Promise.all([
        api.get('/doctors/me'),
        api.get('/appointments/my'),
      ]);

      if (profileRes.data.success) {
        setDoctorProfile(profileRes.data.data);
      }
      if (aptRes.data.success) {
        setTodayAppointments(aptRes.data.data);
      }
    } catch (err) {
      console.error('Error fetching doctor dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEmergencyAvailability = async () => {
    try {
      setToggling(true);
      const newStatus = !doctorProfile.isAvailableForEmergency;
      const res = await api.put('/doctors/availability', {
        isAvailableForEmergency: newStatus,
      });
      if (res.data.success) {
        setDoctorProfile(res.data.data);
      }
    } catch (err) {
      alert('Error updating emergency status: ' + (err.response?.data?.message || err.message));
    } finally {
      setToggling(false);
    }
  };

  const handleToggleAppointmentsAvailability = async () => {
    try {
      setToggling(true);
      const newStatus = !doctorProfile.isAvailableForAppointments;
      const res = await api.put('/doctors/availability', {
        isAvailableForAppointments: newStatus,
      });
      if (res.data.success) {
        setDoctorProfile(res.data.data);
      }
    } catch (err) {
      alert('Error updating appointment status: ' + (err.response?.data?.message || err.message));
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading doctor portal...</div>;
  }

  const isPresent = doctorProfile?.currentPresence?.isPresent;
  const currentOrg = doctorProfile?.currentPresence?.organizationId;

  return (
    <div className="space-y-8 pb-12">
      
      {/* Top Welcome Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {doctorProfile?.userId?.name || user?.name}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
              {doctorProfile?.verificationStatus}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Specialist ID: <strong>{doctorProfile?.doctorUniqueId || 'DOC-PENDING'}</strong> &bull; {doctorProfile?.specialization}
          </p>
        </div>

        <Link
          to="/doctor/presence"
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm transition-all"
        >
          <QrCode className="w-4 h-4" />
          <span>Presence Check-In Desk</span>
        </Link>
      </div>

      {/* 3 Status Cards strictly per Section 6 instructions */}
      {/* "Display separate indicators: PRESENT / NOT PRESENT, AVAILABLE / UNAVAILABLE, AVAILABLE FOR EMERGENCY / NOT AVAILABLE FOR EMERGENCY" */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* 1. Physical Presence Indicator */}
        <div className={`p-5 rounded-3xl border shadow-xs transition-all ${
          isPresent ? 'bg-emerald-50/70 border-emerald-300' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              1. Physical Facility Presence
            </span>
            <span className={`w-3 h-3 rounded-full ${isPresent ? 'bg-emerald-500 animate-ping' : 'bg-slate-300'}`}></span>
          </div>
          <h3 className={`text-base font-black ${isPresent ? 'text-emerald-950' : 'text-slate-700'}`}>
            {isPresent ? 'PRESENT AT FACILITY' : 'NOT PRESENT'}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {isPresent
              ? `Checked in at ${currentOrg?.name || 'Hospital'}`
              : 'Physical presence requires QR check-in on-site.'}
          </p>
          <Link
            to="/doctor/presence"
            className="inline-block mt-3 text-xs font-bold text-blue-600 hover:underline"
          >
            {isPresent ? 'View Presence Log / Check Out &rarr;' : 'Scan Hospital QR to Check In &rarr;'}
          </Link>
        </div>

        {/* 2. Regular Appointment Availability */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                2. Appointment Booking
              </span>
              <span className={`w-3 h-3 rounded-full ${doctorProfile?.isAvailableForAppointments ? 'bg-blue-500' : 'bg-slate-300'}`}></span>
            </div>
            <h3 className="text-base font-black text-slate-900">
              {doctorProfile?.isAvailableForAppointments ? 'AVAILABLE' : 'UNAVAILABLE'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Toggle whether patients can book upcoming calendar slots.
            </p>
          </div>
          <button
            onClick={handleToggleAppointmentsAvailability}
            disabled={toggling}
            className={`mt-3 py-1.5 px-3 rounded-xl text-xs font-bold transition-colors ${
              doctorProfile?.isAvailableForAppointments
                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {doctorProfile?.isAvailableForAppointments ? 'Mark Unavailable' : 'Mark Available'}
          </button>
        </div>

        {/* 3. Emergency Duty Availability */}
        <div className={`p-5 rounded-3xl border shadow-xs flex flex-col justify-between transition-all ${
          doctorProfile?.isAvailableForEmergency ? 'bg-red-50/70 border-red-300' : 'bg-white border-slate-200'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                3. Emergency Duty Readiness
              </span>
              <span className={`w-3 h-3 rounded-full ${doctorProfile?.isAvailableForEmergency ? 'bg-red-500 animate-pulse' : 'bg-slate-300'}`}></span>
            </div>
            <h3 className={`text-base font-black ${doctorProfile?.isAvailableForEmergency ? 'text-red-950' : 'text-slate-700'}`}>
              {doctorProfile?.isAvailableForEmergency ? 'EMERGENCY READY' : 'NOT ON EMERGENCY DUTY'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Increases hospital emergency suitability score when you are on emergency call.
            </p>
          </div>
          <button
            onClick={handleToggleEmergencyAvailability}
            disabled={toggling}
            className={`mt-3 py-1.5 px-3 rounded-xl text-xs font-bold transition-colors ${
              doctorProfile?.isAvailableForEmergency
                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            {doctorProfile?.isAvailableForEmergency ? 'Step Down from Emergency' : 'Set Emergency Duty'}
          </button>
        </div>

      </div>

      {/* Today's Appointments Queue */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-black text-slate-900">Today's Patient Consultations</h2>
          </div>
          <span className="text-xs font-bold text-slate-400">
            Total Bookings: {todayAppointments.length}
          </span>
        </div>

        {todayAppointments.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">No appointments scheduled for today.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="p-3">Patient</th>
                  <th className="p-3">Slot Time</th>
                  <th className="p-3">Facility</th>
                  <th className="p-3">Pass / Token</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {todayAppointments.map((apt) => (
                  <tr key={apt._id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">{apt.patientId?.name}</td>
                    <td className="p-3 text-slate-700">{apt.slotDate} ({apt.slotTime})</td>
                    <td className="p-3 text-slate-600">{apt.organizationId?.name}</td>
                    <td className="p-3 font-mono font-bold text-blue-600">{apt.appointmentNumber}</td>
                    <td className="p-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                        {apt.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

