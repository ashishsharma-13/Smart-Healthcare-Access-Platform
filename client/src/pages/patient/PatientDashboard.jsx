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
  ShieldAlert,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';

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
    <div className="space-y-6">
      
      {/* Welcome Bar */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="info" size="xs">
              Patient Portal
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Welcome, {user?.name}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your medical appointments, digital passes, and parallel emergency triage coordination
          </p>
        </div>

        <Link to="/emergency/activate">
          <Button variant="emergency" size="md" icon={ShieldAlert}>
            Emergency Beep
          </Button>
        </Link>
      </div>

      {/* Primary Emergency Banner */}
      <div className="p-5 sm:p-6 rounded-xl bg-urgent-900 text-white border border-urgent-800 shadow-card flex flex-col md:flex-row items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-urgent-800/80 text-urgent-200 text-[10px] font-semibold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-urgent-400 animate-ping" />
            <span>Acute Critical Triage</span>
          </div>
          <h2 className="text-lg font-bold tracking-tight text-white">
            Need Immediate Hospital Emergency Care?
          </h2>
          <p className="text-xs text-urgent-100/90 max-w-xl leading-relaxed">
            Emergency Beep broadcasts your location and condition simultaneously to all nearby verified trauma centers within 15 km in parallel, securing an automated 15-minute emergency bay hold.
          </p>
        </div>

        <Link to="/emergency/activate" className="flex-shrink-0">
          <Button variant="secondary" size="md" className="font-semibold text-urgent-800 bg-white hover:bg-urgent-50">
            Activate Parallel Beep
          </Button>
        </Link>
      </div>

      {/* Grid: Appointments + Quick Access */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Appointments (Col 8) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-600" />
              <h2 className="text-sm font-bold text-slate-900">Upcoming Appointments</h2>
            </div>
            <Link to="/patient/appointments" className="text-xs font-semibold text-brand-600 hover:text-brand-800">
              View All ({appointments.length})
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-24 bg-white border border-slate-200 rounded-xl p-4 animate-pulse">
                  <Skeleton className="h-4 w-1/3 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : appointments.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No Upcoming Consultations"
              description="You have no scheduled doctor visits. Book with NMC-verified specialists across network hospitals."
              actionLabel="Find a Specialist"
              onAction={() => window.location.href = '/doctors'}
            />
          ) : (
            <div className="space-y-3">
              {appointments.map((apt) => (
                <div
                  key={apt._id}
                  className="p-4 bg-white border border-slate-200 rounded-xl shadow-card hover:border-brand-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-brand-50 border border-brand-200 text-brand-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {apt.doctorId?.userId?.name?.charAt(0) || 'D'}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 leading-snug">
                        {apt.doctorId?.userId?.name}
                      </h3>
                      <p className="text-[11px] font-semibold text-brand-700">
                        {apt.doctorId?.specialization}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{apt.slotDate} at {apt.slotTime}</span>
                        </span>
                        <span>&bull;</span>
                        <span className="flex items-center gap-1 truncate max-w-[180px]">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span className="truncate">{apt.organizationId?.name}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Badge variant={apt.status === 'BOOKED' ? 'presence' : 'neutral'} size="xs">
                      {apt.status}
                    </Badge>
                    <Link
                      to="/patient/appointments"
                      className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                    >
                      View Pass
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Quick Access & Emergency Logs (Col 4) */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* Quick Access Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-card space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Quick Directory Access
            </h3>

            <div className="space-y-1.5">
              <Link
                to="/doctors"
                className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 hover:border-brand-300 hover:bg-slate-50 text-slate-800 transition-colors text-xs font-medium"
              >
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-brand-600" />
                  <span>Search Verified Doctors</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>

              <Link
                to="/hospitals"
                className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 hover:border-brand-300 hover:bg-slate-50 text-slate-800 transition-colors text-xs font-medium"
              >
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-brand-600" />
                  <span>Trauma Facilities & Beds</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>
            </div>
          </div>

          {/* Recent Emergency Status Widget */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-card space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Recent Emergency Logs
              </h3>
              <Link to="/emergency/history" className="text-xs font-semibold text-brand-600 hover:text-brand-800">
                All Logs
              </Link>
            </div>

            {emergencies.length === 0 ? (
              <p className="text-xs text-slate-400 py-2 text-center">No recent emergency logs.</p>
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
                    className="block p-2.5 rounded-lg bg-slate-50 border border-slate-200 hover:border-brand-300 transition-colors text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 capitalize">
                        {emg.emergencyType} Emergency
                      </span>
                      <Badge variant="emergency" size="xs">
                        {emg.status}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {new Date(emg.createdAt).toLocaleDateString()} &bull; Code: {emg.requestCode}
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

export default PatientDashboard;
