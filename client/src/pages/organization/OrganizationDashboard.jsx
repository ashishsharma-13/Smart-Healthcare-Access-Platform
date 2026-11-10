import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
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
  AlertTriangle,
} from 'lucide-react';

export const OrganizationDashboard = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [profile, setProfile] = useState(null);
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionNotice, setActionNotice] = useState('');

  // 1. Socket room joining on hospital mount / profile load
  useEffect(() => {
    if (socket) {
      const hospitalId = profile?._id || user?._id;
      if (hospitalId) {
        socket.emit('join-facility-room', hospitalId);
        socket.emit('join-organization', hospitalId);
      }
      if (profile?.slug) {
        socket.emit('join-facility-room', profile.slug);
      }
      if (profile?.name) {
        socket.emit('join-facility-room', profile.name);
      }
    }
  }, [socket, profile, user]);

  // 2. Real-time broadcast and telemetry listeners
  useEffect(() => {
    fetchOrgData(true);

    if (socket) {
      // Direct real-time queue append for incoming emergency telemetry
      socket.on('emergency-broadcast-incoming', (data) => {
        console.log('[Hospital Socket] emergency-broadcast-incoming received:', data);
        if (!data) return;

        setBroadcasts((prev) => {
          const incomingReqId = (data.emergencyRequestId?._id || data.emergencyRequestId || '').toString();
          const exists = prev.some((b) => {
            const bReqId = (b.emergencyRequestId?._id || b.emergencyRequestId || '').toString();
            return (b._id && b._id.toString() === (data._id || '').toString()) || (bReqId && bReqId === incomingReqId);
          });

          if (exists) {
            return prev.map((b) => {
              const bReqId = (b.emergencyRequestId?._id || b.emergencyRequestId || '').toString();
              return (b._id && b._id.toString() === (data._id || '').toString()) || (bReqId && bReqId === incomingReqId)
                ? { ...b, ...data }
                : b;
            });
          }

          // Prepend directly to incoming emergency telemetry queue
          return [data, ...prev];
        });
      });

      // Global broadcast notice for active hospital dashboards
      socket.on('emergency-broadcast-new', (data) => {
        console.log('[Hospital Socket] emergency-broadcast-new notice received:', data);
        fetchOrgData(false);
      });

      socket.on('emergency:incoming_beep', (data) => {
        if (!data) return;
        setBroadcasts((prev) => {
          const incomingReqId = (data.emergencyRequestId?._id || data.emergencyRequestId || '').toString();
          const exists = prev.some((b) => {
            const bReqId = (b.emergencyRequestId?._id || b.emergencyRequestId || '').toString();
            return (b._id && b._id.toString() === (data._id || '').toString()) || (bReqId && bReqId === incomingReqId);
          });
          if (exists) return prev;
          return [data, ...prev];
        });
      });

      socket.on('emergency:destination_confirmed', () => fetchOrgData(false));
      socket.on('emergency:patient_en_route', () => fetchOrgData(false));
    }

    return () => {
      if (socket) {
        socket.off('emergency-broadcast-incoming');
        socket.off('emergency-broadcast-new');
        socket.off('emergency:incoming_beep');
        socket.off('emergency:destination_confirmed');
        socket.off('emergency:patient_en_route');
      }
    };
  }, [socket]);

  const fetchOrgData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);

      const profRes = await api.get('/organizations/portal/me');
      if (profRes.data.success) {
        setProfile(profRes.data.data);
        if (socket && profRes.data.data?._id) {
          socket.emit('join-facility-room', profRes.data.data._id);
          socket.emit('join-organization', profRes.data.data._id);
          if (profRes.data.data.slug) socket.emit('join-facility-room', profRes.data.data.slug);
          if (profRes.data.data.name) socket.emit('join-facility-room', profRes.data.data.name);
        }
      }

      // Query active incoming broadcasts from GET /api/emergency/incoming first
      try {
        const incomingRes = await api.get('/emergency/incoming');
        if (incomingRes.data.success && Array.isArray(incomingRes.data.data)) {
          setBroadcasts(incomingRes.data.data);
          return;
        }
      } catch (err) {
        console.warn('Falling back to /organizations/portal/broadcasts', err.message);
      }

      // Fallback
      const bCastRes = await api.get('/organizations/portal/broadcasts');
      if (bCastRes.data.success) {
        setBroadcasts(bCastRes.data.data);
      }
    } catch (err) {
      console.error('Error fetching org portal', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleRespond = async (emergencyRequestId, status) => {
    try {
      setActionLoading(true);
      await api.post(`/emergency/${emergencyRequestId}/respond`, {
        responseStatus: status,
        offeredResources: status === 'ACCEPTED' ? { icuBed: true, erBay: true, ventilator: false } : {},
      });
      setActionNotice(`Response '${status}' submitted successfully.`);
      setTimeout(() => setActionNotice(''), 4000);
      fetchOrgData(false);
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
        setActionNotice('Patient Arrival Confirmed! Reserved bed has been allocated.');
        setTimeout(() => setActionNotice(''), 5000);
        fetchOrgData(false);
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
        setActionNotice('Resource temporarily reserved for 15 minutes.');
        setTimeout(() => setActionNotice(''), 5000);
        fetchOrgData(false);
      }
    } catch (err) {
      alert('Reservation error: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading emergency operations desk...</div>;
  }

  const icuRes = profile?.resources?.find((r) => r.resourceType === 'icu_bed');
  const erRes = profile?.resources?.find((r) => r.resourceType === 'er_bay');

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">{profile?.name}</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
              Verified Facility
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Emergency Operations & Resource Allocation Desk &bull; Code: {profile?.qrCheckinCode}
          </p>
        </div>

        <Link
          to="/organization/qr-code"
          className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm transition-all"
        >
          <QrCode className="w-4 h-4" />
          <span>Reception Check-In QR</span>
        </Link>
      </div>

      {actionNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl font-bold flex items-center space-x-2 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Resource Counters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">ICU Bed Capacity</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-black text-slate-900">{icuRes?.availableCapacity ?? 14}</span>
              <span className="text-xs text-slate-400">/ {icuRes?.totalCapacity ?? 20} available</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <BedDouble className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Emergency Bay Capacity</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-black text-slate-900">{erRes?.availableCapacity ?? 11}</span>
              <span className="text-xs text-slate-400">/ {erRes?.totalCapacity ?? 15} available</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Physicians Present</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-black text-emerald-600">{profile?.doctorsPresent?.length || 1}</span>
              <span className="text-xs text-slate-400">physicians on-site</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Live Emergency Broadcast Reception Desk */}
      <div className="bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100/80">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-red-600 animate-ping"></span>
            <h2 className="text-base font-black text-slate-900">
              Incoming Emergency Beep Telemetry & Destination Queue
            </h2>
          </div>
          <span className="text-xs font-bold text-slate-500">Active Requests: {broadcasts.length}</span>
        </div>

        {broadcasts.length === 0 ? (
          <div className="p-8 text-center bg-white/50 backdrop-blur-md rounded-2xl border border-white/60 space-y-2">
            <ShieldAlert className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-500 font-medium">
              No active emergency broadcasts at this moment. Listening for real-time parallel beeps.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {broadcasts.map((b) => {
              const req = b.emergencyRequestId;
              if (!req) return null;
              const isSelectedDestination = req.selectedOrganizationId?.toString() === profile?._id?.toString();
              return (
                <div
                  key={b._id}
                  className={`p-5 rounded-2xl border transition-all ${
                    isSelectedDestination
                      ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-400/20'
                      : 'bg-white/80 border-white/90 shadow-sm'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-black text-slate-900 capitalize">
                          {req.emergencyType} Emergency
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-100 text-red-700">
                          {req.severity || 'CRITICAL'}
                        </span>
                        {isSelectedDestination && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-600 text-white">
                            Selected Destination
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600">
                        <strong>Patient:</strong> {req.patientName || req.patientId?.name || 'Anonymous Patient'} &bull;{' '}
                        <strong>Contact:</strong> {req.patientPhone || req.patientId?.phone || 'Emergency GPS'}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span>Distance: {b.distanceKm ?? 2.5} km (~{b.estimatedTravelMinutes ?? 8} mins)</span>
                        <span>&bull;</span>
                        <span>Suitability: {b.suitabilityScore ?? 90}/100</span>
                        <span>&bull;</span>
                        <span>
                          Request Status: <strong className="text-slate-800">{req.status || 'BROADCASTED'}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Operational Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 self-end md:self-center">
                      {(b.responseStatus === 'PENDING' || !b.responseStatus) && (
                        <>
                          <button
                            onClick={() => handleRespond(req._id || req, 'ACCEPTED')}
                            disabled={actionLoading}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-xs cursor-pointer"
                          >
                            Accept & Can Receive
                          </button>
                          <button
                            onClick={() => handleRespond(req._id || req, 'DECLINED')}
                            disabled={actionLoading}
                            className="px-3 py-2 bg-slate-200 hover:bg-red-50 hover:text-red-700 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
                          >
                            Decline
                          </button>
                        </>
                      )}

                      {isSelectedDestination && req.status === 'DESTINATION_SELECTED' && (
                        <button
                          onClick={() => handleConfirmReservation(req._id || req)}
                          disabled={actionLoading}
                          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-xs cursor-pointer"
                        >
                          Confirm & Hold 1x ER Bay
                        </button>
                      )}

                      {isSelectedDestination &&
                        (req.status === 'RESOURCES_RESERVED' || req.status === 'PATIENT_EN_ROUTE') && (
                          <button
                            onClick={() => handleMarkArrival(req._id || req)}
                            disabled={actionLoading}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                          >
                            Mark Patient Arrived & Allocate Bed
                          </button>
                        )}
                    </div>
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
