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
  Activity,
  Users,
  Award,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { TableSkeleton } from '../../components/ui/Skeleton';

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
    return (
      <div className="space-y-6">
        <TableSkeleton rows={4} cols={4} />
      </div>
    );
  }

  const isPresent = doctorProfile?.currentPresence?.isPresent;
  const currentOrg = doctorProfile?.currentPresence?.organizationId;

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Welcome Bar */}
      <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="presence" size="xs" dot>
              {doctorProfile?.verificationStatus === 'verified' ? 'NMC Verified' : 'Compliance Verification'}
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Dr. {doctorProfile?.userId?.name || user?.name}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Specialist ID: <span className="font-mono font-semibold text-slate-800">{doctorProfile?.doctorUniqueId || 'DOC-PENDING'}</span> &bull; {doctorProfile?.specialization}
          </p>
        </div>

        <Link to="/doctor/presence">
          <Button variant="primary" size="sm" icon={QrCode}>
            Presence Check-In & Badge
          </Button>
        </Link>
      </div>

      {/* 2 Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* 1. Physical Presence Indicator */}
        <div className={`p-4 sm:p-5 rounded-xl border shadow-card flex flex-col justify-between transition-colors ${
          isPresent ? 'bg-presence-50/70 border-presence-300' : 'bg-white border-slate-200'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                1. Facility Presence
              </span>
              <span className={`w-2.5 h-2.5 rounded-full ${isPresent ? 'bg-presence-500 animate-pulse' : 'bg-slate-300'}`} />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              {isPresent ? 'PRESENT AT FACILITY' : 'OFF-SITE'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-snug">
              {isPresent
                ? `Physically checked in at ${currentOrg?.name || 'Hospital'}`
                : 'Presence requires physical QR check-in on hospital premises.'}
            </p>
          </div>
          <div className="pt-3 border-t border-slate-100 mt-3">
            <Link
              to="/doctor/presence"
              className="text-xs font-semibold text-brand-600 hover:text-brand-800 flex items-center gap-1"
            >
              <span>{isPresent ? 'Check Out / Log' : 'Scan Reception QR'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 2. Regular Appointment Availability */}
        <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                2. Outpatient Booking
              </span>
              <span className={`w-2.5 h-2.5 rounded-full ${doctorProfile?.isAvailableForAppointments ? 'bg-brand-500' : 'bg-slate-300'}`} />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              {doctorProfile?.isAvailableForAppointments ? 'OPEN FOR BOOKINGS' : 'CLOSED TO BOOKINGS'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-snug">
              Determines if patients can reserve consultation slots from your public schedule.
            </p>
          </div>
          <div className="pt-3 border-t border-slate-100 mt-3">
            <Button
              size="sm"
              variant={doctorProfile?.isAvailableForAppointments ? 'secondary' : 'primary'}
              disabled={toggling}
              className="w-full"
              onClick={handleToggleAppointmentsAvailability}
            >
              {doctorProfile?.isAvailableForAppointments ? 'Mark Unavailable' : 'Open for Bookings'}
            </Button>
          </div>
        </div>

      </div>

      {/* Today's Appointments Queue */}
      <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-card space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-brand-600" />
            <h2 className="text-sm font-bold text-slate-900">Today's Consultation Schedule</h2>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Total Consultations: {todayAppointments.length}
          </span>
        </div>

        {todayAppointments.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No Scheduled Consultations"
            description="You have no patient visits scheduled for today."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="p-3">Patient Name</th>
                  <th className="p-3">Slot Time</th>
                  <th className="p-3">Healthcare Facility</th>
                  <th className="p-3">Voucher Token</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {todayAppointments.map((apt) => (
                  <tr key={apt._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3 font-semibold text-slate-900">{apt.patientId?.name}</td>
                    <td className="p-3 text-slate-700">{apt.slotDate} ({apt.slotTime})</td>
                    <td className="p-3 text-slate-600">{apt.organizationId?.name}</td>
                    <td className="p-3 font-mono font-semibold text-brand-700">{apt.appointmentNumber}</td>
                    <td className="p-3">
                      <Badge variant={apt.status === 'completed' ? 'presence' : 'info'} size="xs">
                        {apt.status}
                      </Badge>
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

export default DoctorDashboard;
