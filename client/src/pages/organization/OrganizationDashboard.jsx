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
  BellRing,
  Volume2,
  MapPin,
  Navigation,
  FileCheck2,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Toast } from '../../components/ui/Toast';
import { EmptyState } from '../../components/ui/EmptyState';

const playAlertBeep = () => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(440, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch (err) {
    console.warn('[Audio Alert] playback ignored or blocked', err);
  }
};

export const OrganizationDashboard = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [profile, setProfile] = useState(null);
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionNotice, setActionNotice] = useState('');
  const [incomingAlert, setIncomingAlert] = useState(null);

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

        playAlertBeep();
        const reqObj = data.emergencyRequestId || data;
        setIncomingAlert({
          patientName: reqObj.patientName || 'Emergency Patient',
          condition: reqObj.emergencyType || 'General Emergency',
          severity: reqObj.severity || 'CRITICAL',
        });
        setTimeout(() => setIncomingAlert(null), 8000);

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
        playAlertBeep();
        const reqObj = data.emergencyRequestId || data;
        setIncomingAlert({
          patientName: reqObj.patientName || 'Emergency Patient',
          condition: reqObj.emergencyType || 'General Emergency',
          severity: reqObj.severity || 'CRITICAL',
        });
        setTimeout(() => setIncomingAlert(null), 8000);

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
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            {profile?.verificationStatus === 'verified' || profile?.verificationStatus === 'APPROVED' ? (
              <Badge variant="presence" size="xs" dot>
                Accredited Healthcare Facility
              </Badge>
            ) : profile?.verificationStatus === 'rejected' || profile?.verificationStatus === 'REJECTED' ? (
              <Badge variant="emergency" size="xs">
                Accreditation Rejected
              </Badge>
            ) : (
              <Badge variant="neutral" size="xs">
                Pending State Accreditation Review
              </Badge>
            )}

            {profile?.uniqueOrganizationCode && (
              <span className="text-[11px] font-mono font-bold bg-brand-50 text-brand-700 px-2 py-0.5 rounded border border-brand-200">
                {profile.uniqueOrganizationCode}
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {profile?.name || profile?.organizationName || profile?.legalName}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Emergency Operations & Resource Allocation Desk &bull; Check-in Code: <span className="font-mono font-semibold text-slate-800">{profile?.qrCheckinCode || 'N/A'}</span>
            {profile?.applicationReference && (
              <> &bull; App Ref: <span className="font-mono font-semibold text-slate-600">{profile.applicationReference}</span></>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/organization/qr-code">
            <Button variant="primary" size="sm" icon={QrCode}>
              Reception Stand
            </Button>
          </Link>
        </div>
      </div>

      {/* Verification Warning Alert if not yet verified */}
      {(profile?.verificationStatus === 'pending' || profile?.verificationStatus === 'PENDING_VERIFICATION') && (
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/70 text-amber-900 flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs space-y-1">
            <p className="font-bold">Accreditation Verification In Progress</p>
            <p className="text-amber-800">
              Your organization dossier (Ref: <span className="font-mono font-semibold">{profile?.applicationReference}</span>) is under active review by the Health Department Administration. Full public healthcare directory listings and patient booking features activate automatically upon administrative accreditation approval.
            </p>
          </div>
        </div>
      )}

      {/* Rejection Alert if rejected */}
      {(profile?.verificationStatus === 'rejected' || profile?.verificationStatus === 'REJECTED') && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/70 text-rose-900 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs space-y-1">
            <p className="font-bold">Accreditation Application Returned / Rejected</p>
            <p className="text-rose-800">
              Reason recorded by Health Authority: <span className="font-semibold">{profile?.rejectionReason || 'Documentation incomplete or authority license expired.'}</span>
            </p>
            <p className="text-rose-700 text-[11px]">
              Please contact platform administration or submit updated license documentation through your organization settings.
            </p>
          </div>
        </div>
      )}

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

      {/* Facility Address & GPS Operating Telemetry Card */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-card space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-red-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Facility Address & Operating Physical GPS Location
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full border border-slate-200">
              GPS: {profile?.location?.coordinates?.[1]?.toFixed(5)}, {profile?.location?.coordinates?.[0]?.toFixed(5)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Registered Address */}
          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/60 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Official Registered Address
            </span>
            <p className="font-semibold text-slate-800">
              {profile?.registeredAddress?.buildingNumber ? `${profile.registeredAddress.buildingNumber}, ` : ''}
              {profile?.registeredAddress?.streetName || profile?.address?.street || 'N/A'}
            </p>
            <p className="text-slate-600">
              {[profile?.registeredAddress?.locality, profile?.registeredAddress?.city, profile?.registeredAddress?.state, profile?.registeredAddress?.pinCode || profile?.address?.postalCode].filter(Boolean).join(', ')}
            </p>
          </div>

          {/* Operating Address */}
          <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200/60 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">
                Physical Operating Site (Ambulance Destination)
              </span>
              {profile?.operatingAddress?.isSameAsRegistered && (
                <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">
                  Same as Registered
                </span>
              )}
            </div>
            <p className="font-semibold text-slate-900">
              {profile?.operatingAddress?.buildingNumber ? `${profile.operatingAddress.buildingNumber}, ` : ''}
              {profile?.operatingAddress?.streetName || profile?.registeredAddress?.streetName || profile?.address?.street || 'N/A'}
            </p>
            <p className="text-slate-600">
              {[profile?.operatingAddress?.locality || profile?.registeredAddress?.locality, profile?.operatingAddress?.city || profile?.registeredAddress?.city, profile?.operatingAddress?.state || profile?.registeredAddress?.state, profile?.operatingAddress?.pinCode || profile?.registeredAddress?.pinCode].filter(Boolean).join(', ')}
            </p>
          </div>
        </div>
      </div>

      {/* Live Emergency Broadcast Reception Desk */}
      <div className="bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl p-6 sm:p-8 space-y-4">
        {/* Real-time Incoming Emergency Beep Alert Badge Banner */}
        {incomingAlert && (
          <div className="p-4 bg-red-600 text-white rounded-2xl shadow-lg shadow-red-600/30 flex items-center justify-between animate-bounce">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold">
                <BellRing className="w-5 h-5 text-white animate-spin" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-white text-red-700 rounded-md">
                    NEW INCOMING EMERGENCY ALERT
                  </span>
                  <span className="text-xs font-bold text-red-200">
                    <Volume2 className="w-3.5 h-3.5 inline mr-1" />
                    Chime Active
                  </span>
                </div>
                <h4 className="text-sm font-black mt-0.5">
                  {incomingAlert.patientName} &bull; <span className="capitalize">{incomingAlert.condition} Emergency</span> ({incomingAlert.severity})
                </h4>
              </div>
            </div>
            <span className="text-xs font-bold text-red-100 hidden sm:inline">Urgent Response Requested</span>
          </div>
        )}

        <div className="flex items-center justify-between pb-3 border-b border-slate-100/80">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-red-600 animate-ping"></span>
            <h2 className="text-base font-black text-slate-900">
              Incoming Emergency Beep Telemetry & Destination Queue
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
                      {(b.responseStatus === 'PENDING' || !b.responseStatus || req.status === 'pending') && (
                        <>
                          <Button
                            size="sm"
                            variant="presence"
                            disabled={actionLoading}
                            onClick={() => handleRespond(req._id || req, 'ACCEPTED')}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1 inline" />
                            Accept & Can Receive
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-rose-600 hover:bg-rose-50"
                            disabled={actionLoading}
                            onClick={() => handleRespond(req._id || req, 'DECLINED')}
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1 inline" />
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
