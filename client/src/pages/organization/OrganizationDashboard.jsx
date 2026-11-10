import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import {
  ShieldAlert,
  Building2,
  BedDouble,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  QrCode,
  ArrowRight,
  Activity,
  Phone,
  Wind,
  HeartPulse,
  Navigation,
  AlertTriangle,
} from 'lucide-react';

export const OrganizationDashboard = () => {
  const { socket } = useSocket();
  const [profile, setProfile] = useState(null);
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchOrgData();

    if (socket) {
      socket.on('emergency:incoming_beep', () => fetchOrgData());
      socket.on('emergency:destination_confirmed', () => fetchOrgData());
      socket.on('emergency:patient_en_route', () => fetchOrgData());
    }

    return () => {
      if (socket) {
        socket.off('emergency:incoming_beep');
        socket.off('emergency:destination_confirmed');
        socket.off('emergency:patient_en_route');
      }
    };
  }, [socket]);

  const fetchOrgData = async () => {
    try {
      setLoading(true);
      const [profRes, bCastRes] = await Promise.all([
        api.get('/organizations/portal/me'),
        api.get('/organizations/portal/broadcasts'),
      ]);

      if (profRes.data.success) setProfile(profRes.data.data);
      if (bCastRes.data.success) setBroadcasts(bCastRes.data.data);
    } catch (err) {
      console.error('Error fetching org portal', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (emergencyRequestId, status) => {
    try {
      setActionLoading(true);
      await api.post(`/emergency/${emergencyRequestId}/respond`, {
        responseStatus: status,
        offeredResources: status === 'ACCEPTED' ? { icuBed: true, erBay: true, ventilator: false } : {},
      });
      fetchOrgData();
    } catch (err) {
      alert('Error updating response: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkArrival = async (emergencyRequestId) => {
    try {
      setActionLoading(true);
      const res = await api.post(`/emergency/${emergencyRequestId}/arrived`);
      if (res.data.success) {
        alert('Patient Arrival Confirmed! Reserved bed has been atomically allocated to patient.');
        fetchOrgData();
      }
    } catch (err) {
      alert('Error recording arrival: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReservation = async (emergencyRequestId) => {
    try {
      setActionLoading(true);
      const res = await api.post(`/emergency/${emergencyRequestId}/confirm-reservation`, {
        resourceType: 'er_bay',
      });
      if (res.data.success) {
        alert('Resource temporarily reserved for 15 minutes.');
        fetchOrgData();
      }
    } catch (err) {
      alert('Reservation error: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="p-16 text-center text-xs text-slate-400">Loading hospital command center...</div>;
  }

  const incomingRequests = broadcasts.filter((b) => b.responseStatus === 'PENDING');
  const activeEnRoute = broadcasts.filter(
    (b) =>
      b.responseStatus === 'ACCEPTED' &&
      (b.emergencyRequestId?.status === 'DESTINATION_SELECTED' ||
        b.emergencyRequestId?.status === 'RESOURCES_RESERVED' ||
        b.emergencyRequestId?.status === 'PATIENT_EN_ROUTE')
  );

  return (
    <div className="space-y-8 pb-12">
      
      {/* Welcome & Facility Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">{profile?.name}</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-red-50 text-red-700 border border-red-200">
              Level 1 Trauma Center
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time Emergency Reception, Bed Capacities & Physician Presence Desk
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/organization/resources"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
          >
            <BedDouble className="w-4 h-4" />
            <span>Manage Capacities</span>
          </Link>
          <Link
            to="/organization/qr-code"
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center space-x-1.5"
          >
            <QrCode className="w-4 h-4" />
            <span>Facility QR Pass</span>
          </Link>
        </div>
      </div>

      {/* Real-time Capacity Progress Meters Grid (Screen 15 Montage) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">ICU Beds</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-slate-900">14</span>
            <span className="text-xs font-semibold text-slate-400">/ 20 Free</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: '70%' }}></div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">ER Trauma Bays</span>
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-slate-900">11</span>
            <span className="text-xs font-semibold text-slate-400">/ 15 Free</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="bg-blue-600 h-full rounded-full" style={{ width: '73%' }}></div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">Ventilators</span>
            <Wind className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-slate-900">6</span>
            <span className="text-xs font-semibold text-slate-400">/ 10 Free</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="bg-indigo-600 h-full rounded-full" style={{ width: '60%' }}></div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">On-Site Doctors</span>
            <Users className="w-4 h-4 text-purple-500" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-purple-600">{profile?.activeDoctorsCount || 4}</span>
            <span className="text-xs font-semibold text-slate-400">Checked In</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="bg-purple-600 h-full rounded-full" style={{ width: '80%' }}></div>
          </div>
        </div>
      </div>

      {/* INCOMING EMERGENCY BEEP BANNER (Screen 15 Montage) */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-5 h-5 text-red-600 animate-bounce" />
          <h2 className="text-base font-black text-slate-900">
            Incoming Parallel Emergency Beeps ({incomingRequests.length})
          </h2>
        </div>

        {incomingRequests.length === 0 ? (
          <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No Unhandled Emergency Pings</h3>
            <p className="text-xs text-slate-400">
              When a patient activates Emergency Beep within your radius, incoming pings will alert here in real-time.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {incomingRequests.map((b) => {
              const req = b.emergencyRequestId;
              return (
                <div
                  key={b._id}
                  className="bg-red-50/80 border-2 border-red-500 rounded-3xl p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6 animate-pulse"
                >
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="px-3 py-1 bg-red-600 text-white rounded-full text-xs font-black uppercase tracking-wider">
                        {req.emergencyType} CRITICAL
                      </span>
                      <span className="text-xs font-bold text-slate-700">Code: {req.requestCode}</span>
                    </div>

                    <h3 className="text-lg font-black text-slate-900">
                      Patient: {req.patientName} &bull; {req.patientPhone}
                    </h3>

                    <p className="text-xs text-slate-700">
                      <strong>Location:</strong> {req.locationAddress || 'Central City'} &bull;{' '}
                      <strong>Ambulance:</strong> {req.ambulanceRequirement?.toUpperCase()}
                    </p>

                    {req.description && (
                      <p className="text-xs text-slate-600 italic">"{req.description}"</p>
                    )}
                  </div>

                  <div className="flex items-center space-x-3 self-end md:self-center">
                    <button
                      onClick={() => handleRespond(req._id, 'DECLINED')}
                      disabled={actionLoading}
                      className="px-4 py-2.5 bg-white hover:bg-slate-100 text-red-600 border border-red-200 font-bold text-xs rounded-xl transition-colors"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => handleRespond(req._id, 'ACCEPTED')}
                      disabled={actionLoading}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-500/25 transition-all hover:scale-105"
                    >
                      Accept & Ready Triage
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ACTIVE EN ROUTE PATIENTS & TEMPORARY HOLDS (Screen 15 Montage) */}
      <div className="space-y-4">
        <h2 className="text-base font-black text-slate-900 flex items-center space-x-2">
          <Navigation className="w-4 h-4 text-blue-600" />
          <span>Active Patient En Route & Temporary Holds ({activeEnRoute.length})</span>
        </h2>

        {activeEnRoute.length === 0 ? (
          <div className="p-6 bg-slate-50 rounded-2xl border text-center text-xs text-slate-400">
            No incoming en route ambulances or active 15-minute temporary holds currently pending arrival.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeEnRoute.map((b) => {
              const req = b.emergencyRequestId;
              return (
                <div key={b._id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        {req.status?.replace(/_/g, ' ')}
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm mt-1">{req.patientName}</h4>
                      <p className="text-xs text-slate-500">{req.emergencyType?.toUpperCase()} Emergency</p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-slate-800">{req.requestCode}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border text-xs text-slate-600 space-y-1">
                    <p><strong>Contact:</strong> {req.patientPhone}</p>
                    <p><strong>En Route From:</strong> {req.locationAddress}</p>
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-3">
                    {req.status === 'DESTINATION_SELECTED' && (
                      <button
                        onClick={() => handleConfirmReservation(req._id)}
                        disabled={actionLoading}
                        className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors"
                      >
                        Confirm 15-Min Hold Lock
                      </button>
                    )}

                    {(req.status === 'RESOURCES_RESERVED' || req.status === 'PATIENT_EN_ROUTE') && (
                      <button
                        onClick={() => handleMarkArrival(req._id)}
                        disabled={actionLoading}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-1"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirm Patient Arrived (Allocate Bed)</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
export default OrganizationDashboard;
