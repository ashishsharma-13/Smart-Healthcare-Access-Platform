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
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Toast } from '../../components/ui/Toast';
import { EmptyState } from '../../components/ui/EmptyState';

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
      socket.on('emergency-broadcast-incoming', (data) => {
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

          return [data, ...prev];
        });
      });

      socket.on('emergency-broadcast-new', (data) => {
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

      try {
        const incomingRes = await api.get('/emergency/incoming');
        if (incomingRes.data.success && Array.isArray(incomingRes.data.data)) {
          setBroadcasts(incomingRes.data.data);
          return;
        }
      } catch (err) {
        // Fallback
      }

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
        setActionNotice('Patient Arrival Confirmed! Bed allocation active.');
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
    return (
      <div className="p-12 text-center text-xs text-slate-400">
        Loading emergency command operations...
      </div>
    );
  }

  const icuRes = profile?.resources?.find((r) => r.resourceType === 'icu_bed');
  const erRes = profile?.resources?.find((r) => r.resourceType === 'er_bay');

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Banner */}
      <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="presence" size="xs" dot>
              Verified Facility Command
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {profile?.name}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Emergency Operations & Resource Allocation Desk &bull; Code: <span className="font-mono font-semibold text-slate-800">{profile?.qrCheckinCode}</span>
          </p>
        </div>

        <Link to="/organization/qr-code">
          <Button variant="primary" size="sm" icon={QrCode}>
            Reception Check-In Stand
          </Button>
        </Link>
      </div>

      {actionNotice && (
        <Toast type="success" message={actionNotice} onClose={() => setActionNotice('')} />
      )}

      {/* Resource Counters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200 shadow-card flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ICU Bed Capacity</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold text-slate-900">{icuRes?.availableCapacity ?? 14}</span>
              <span className="text-xs text-slate-400">/ {icuRes?.totalCapacity ?? 20} available</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-700 border border-brand-200 flex items-center justify-center font-bold">
            <BedDouble className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200 shadow-card flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Emergency Bay Capacity</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold text-slate-900">{erRes?.availableCapacity ?? 11}</span>
              <span className="text-xs text-slate-400">/ {erRes?.totalCapacity ?? 15} available</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-urgent-50 text-urgent-700 border border-urgent-200 flex items-center justify-center font-bold">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200 shadow-card flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Physicians On-Site</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold text-presence-700">{profile?.doctorsPresent?.length || 1}</span>
              <span className="text-xs text-slate-400">checked in now</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-presence-50 text-presence-700 border border-presence-200 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Live Emergency Broadcast Reception Desk */}
      <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-card space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-urgent-600 animate-ping" />
            <h2 className="text-sm font-bold text-slate-900">
              Incoming Emergency Telemetry & Dispatch Queue
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-medium">Active Requests: {broadcasts.length}</span>
        </div>

        {broadcasts.length === 0 ? (
          <EmptyState
            icon={ShieldAlert}
            title="No Active Emergency Dispatches"
            description="Facility command is listening for real-time parallel emergency broadcasts within your catchment radius."
          />
        ) : (
          <div className="space-y-3">
            {broadcasts.map((b) => {
              const req = b.emergencyRequestId;
              if (!req) return null;
              const isSelectedDestination = req.selectedOrganizationId?.toString() === profile?._id?.toString();
              return (
                <div
                  key={b._id}
                  className={`p-4 rounded-xl border transition-all ${
                    isSelectedDestination
                      ? 'bg-presence-50/80 border-presence-300 ring-1 ring-presence-300'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 capitalize">
                          {req.emergencyType} Emergency
                        </span>
                        <Badge variant="emergency" size="xs">
                          {req.severity || 'CRITICAL'}
                        </Badge>
                        {isSelectedDestination && (
                          <Badge variant="presence" size="xs" dot pulseDot>
                            Destination Selected
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs text-slate-600">
                        <strong>Patient:</strong> {req.patientName || req.patientId?.name || 'Anonymous Patient'} &bull;{' '}
                        <strong>Contact:</strong> {req.patientPhone || req.patientId?.phone || 'Emergency GPS'}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>Distance: {b.distanceKm ?? 2.5} km (~{b.estimatedTravelMinutes ?? 8} mins)</span>
                        <span>&bull;</span>
                        <span>Suitability: {b.suitabilityScore ?? 90}/100</span>
                        <span>&bull;</span>
                        <span>
                          Status: <strong className="text-slate-800">{req.status || 'BROADCASTED'}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Operational Actions */}
                    <div className="flex flex-wrap items-center gap-2 self-end md:self-center">
                      {(b.responseStatus === 'PENDING' || !b.responseStatus) && (
                        <>
                          <Button
                            size="sm"
                            variant="presence"
                            disabled={actionLoading}
                            onClick={() => handleRespond(req._id || req, 'ACCEPTED')}
                          >
                            Accept & Can Receive
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-rose-600 hover:bg-rose-50"
                            disabled={actionLoading}
                            onClick={() => handleRespond(req._id || req, 'DECLINED')}
                          >
                            Decline
                          </Button>
                        </>
                      )}

                      {isSelectedDestination && req.status === 'DESTINATION_SELECTED' && (
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={actionLoading}
                          onClick={() => handleConfirmReservation(req._id || req)}
                        >
                          Confirm & Hold 1x ER Bay
                        </Button>
                      )}

                      {isSelectedDestination &&
                        (req.status === 'RESOURCES_RESERVED' || req.status === 'PATIENT_EN_ROUTE') && (
                          <Button
                            size="sm"
                            variant="presence"
                            disabled={actionLoading}
                            onClick={() => handleMarkArrival(req._id || req)}
                          >
                            Mark Patient Arrived & Allocate Bed
                          </Button>
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
