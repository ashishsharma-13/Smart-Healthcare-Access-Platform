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
  Radio,
  Compass,
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
  const [pendingConfirmations, setPendingConfirmations] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [incomingPatients, setIncomingPatients] = useState([]);
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

      socket.on('emergency:destination_selected_pending_confirmation', (data) => {
        playAlertBeep();
        setActionNotice('Patient selected your facility! Final confirmation requested.');
        fetchOrgData(false);
      });

      socket.on('emergency:destination_confirmed', () => fetchOrgData(false));
      socket.on('emergency:patient_en_route', () => fetchOrgData(false));
      socket.on('emergency:patient_arrived', () => fetchOrgData(false));
    }

    return () => {
      if (socket) {
        socket.off('emergency-broadcast-incoming');
        socket.off('emergency-broadcast-new');
        socket.off('emergency:incoming_beep');
        socket.off('emergency:destination_selected_pending_confirmation');
        socket.off('emergency:destination_confirmed');
        socket.off('emergency:patient_en_route');
        socket.off('emergency:patient_arrived');
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

      // Fetch pending destination confirmations
      try {
        const confRes = await api.get('/organizations/me/destination-confirmations');
        if (confRes.data.success && Array.isArray(confRes.data.data)) {
          setPendingConfirmations(confRes.data.data);
        }
      } catch (err) {
        // Fallback
      }

      // Fetch active reservations
      try {
        const resRes = await api.get('/organizations/me/reservations');
        if (resRes.data.success && Array.isArray(resRes.data.data)) {
          setReservations(resRes.data.data);
        }
      } catch (err) {
        // Fallback
      }

      // Module 12: Fetch incoming en-route patients
      try {
        const incRes = await api.get('/organizations/me/incoming-patients');
        if (incRes.data.success && Array.isArray(incRes.data.data)) {
          setIncomingPatients(incRes.data.data);
        }
      } catch (err) {
        // Fallback
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

  const handleConfirmFinalSelection = async (selectionId) => {
    try {
      setActionLoading(true);
      const res = await api.post(`/organizations/me/destination-confirmations/${selectionId}/confirm`, {
        requiredResources: [{ resourceType: 'er_bay', quantity: 1 }],
      });
      if (res.data.success) {
        setActionNotice('Destination confirmed & 1x ER Bay temporarily reserved for 15 minutes.');
        setTimeout(() => setActionNotice(''), 5000);
        fetchOrgData(false);
      }
    } catch (err) {
      alert('Confirmation failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineFinalSelection = async (selectionId) => {
    const reason = prompt('Specify reason for declining patient receiving:');
    if (!reason) return;
    try {
      setActionLoading(true);
      const res = await api.post(`/organizations/me/destination-confirmations/${selectionId}/decline`, {
        reason,
      });
      if (res.data.success) {
        setActionNotice('Destination declined.');
        setTimeout(() => setActionNotice(''), 4000);
        fetchOrgData(false);
      }
    } catch (err) {
      alert('Error declining: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkArrivalByReservation = async (reservationId) => {
    try {
      setActionLoading(true);
      const res = await api.post(`/organizations/me/reservations/${reservationId}/mark-arrived`);
      if (res.data.success) {
        setActionNotice('Patient arrival verified! Ready for bed allocation.');
        setTimeout(() => setActionNotice(''), 5000);
        fetchOrgData(false);
      }
    } catch (err) {
      alert('Error recording arrival: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleAllocateReservation = async (reservationId) => {
    try {
      setActionLoading(true);
      const res = await api.post(`/organizations/me/reservations/${reservationId}/allocate`);
      if (res.data.success) {
        setActionNotice('Resource officially allocated! Emergency admission completed.');
        setTimeout(() => setActionNotice(''), 5000);
        fetchOrgData(false);
      }
    } catch (err) {
      alert('Allocation error: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
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

      {/* Module 11: Pending Destination Final Confirmations Desk */}
      {pendingConfirmations.length > 0 && (
        <div className="bg-amber-50/80 border-2 border-amber-300 rounded-2xl p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-amber-200">
            <div className="flex items-center space-x-2.5">
              <span className="w-3 h-3 rounded-full bg-amber-500 animate-ping"></span>
              <h2 className="text-base font-black text-amber-950">
                Action Required: Patient Final Destination Confirmations ({pendingConfirmations.length})
              </h2>
            </div>
            <Badge variant="hold" size="xs">
              Awaiting Receiving Desk Confirmation
            </Badge>
          </div>

          <p className="text-xs text-amber-800">
            The following patients have chosen your trauma center as their final destination among all accepted facilities. Confirming will atomically lock a 15-minute temporary bed reservation and dispatch navigation routing.
          </p>

          <div className="space-y-3">
            {pendingConfirmations.map((sel) => {
              const req = sel.emergencyRequestId;
              return (
                <div
                  key={sel._id || sel.selectionId}
                  className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 capitalize">
                        {req?.emergencyType || 'Emergency'} Patient
                      </span>
                      <Badge variant="emergency" size="xs">
                        {req?.severity || 'CRITICAL'}
                      </Badge>
                      <span className="text-[10px] font-mono text-slate-400">
                        Ref: {sel.selectionId}
                      </span>
                    </div>
                    <p className="text-slate-600">
                      <strong>Patient:</strong> {req?.patientName || req?.patientId?.name || 'Emergency Patient'} &bull;{' '}
                      <strong>Contact:</strong> {req?.patientPhone || req?.patientId?.phone || 'GPS Contact'}
                    </p>
                    <p className="text-slate-500 text-[11px]">
                      Selected at: {new Date(sel.selectedAt || sel.createdAt).toLocaleTimeString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    <Button
                      size="sm"
                      variant="presence"
                      disabled={actionLoading}
                      onClick={() => handleConfirmFinalSelection(sel._id || sel.selectionId)}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1 inline" />
                      Confirm & Hold 1x ER Bay
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-rose-600 hover:bg-rose-50"
                      disabled={actionLoading}
                      onClick={() => handleDeclineFinalSelection(sel._id || sel.selectionId)}
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1 inline" />
                      Decline
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Module 11: Active Bed Reservations & Reception Desk */}
      {reservations.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <BedDouble className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base font-black text-slate-900">
                Active Bed Reservations & Arrival Management ({reservations.length})
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-medium">15-Minute Temporary Holds</span>
          </div>

          <div className="space-y-3">
            {reservations.map((res) => {
              const req = res.emergencyRequestId;
              const isExpired = new Date(res.expiresAt) < new Date();
              const isAllocated = res.status === 'ALLOCATED';
              const isArrived = res.status === 'PATIENT_ARRIVED';

              return (
                <div
                  key={res._id || res.reservationId}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{req?.patientName || 'Emergency Patient'}</span>
                      <Badge
                        variant={isAllocated ? 'presence' : isArrived ? 'info' : isExpired ? 'neutral' : 'hold'}
                        size="xs"
                      >
                        {res.status}
                      </Badge>
                      <span className="font-mono text-[10px] text-slate-400">{res.reservationId}</span>
                    </div>
                    <p className="text-slate-600">
                      <strong>Reserved:</strong> 1x {res.resourceType?.toUpperCase() || 'ER BAY'} &bull;{' '}
                      <strong>Condition:</strong> {req?.emergencyType || 'Trauma'} ({req?.severity || 'CRITICAL'})
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Hold Expires:{' '}
                      <span className={`font-bold ${isExpired ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {new Date(res.expiresAt).toLocaleTimeString()}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    {!isArrived && !isAllocated && (
                      <Button
                        size="xs"
                        variant="primary"
                        disabled={actionLoading}
                        onClick={() => handleMarkArrivalByReservation(res._id || res.reservationId)}
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1 inline" />
                        Mark Arrived
                      </Button>
                    )}
                    {isArrived && !isAllocated && (
                      <Button
                        size="xs"
                        variant="presence"
                        disabled={actionLoading}
                        onClick={() => handleAllocateReservation(res._id || res.reservationId)}
                      >
                        <BedDouble className="w-3 h-3 mr-1 inline" />
                        Allocate Bed & Admit
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Module 12: Incoming En-Route Patients (Live Telemetry) */}
      {incomingPatients.length > 0 && (
        <div className="bg-white rounded-2xl border border-blue-200 p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-blue-100">
            <div className="flex items-center space-x-2">
              <Compass className="w-5 h-5 text-blue-600 animate-pulse" />
              <h2 className="text-base font-black text-slate-900">
                Incoming En-Route Patients ({incomingPatients.length})
              </h2>
            </div>
            <span className="text-xs text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              Live Inbound Telemetry
            </span>
          </div>

          <div className="space-y-3">
            {incomingPatients.map((item) => {
              const req = item.emergencyRequest;
              const resv = item.reservation;
              const jny = item.journey;
              const isSharing = jny?.isSharingLocation;
              const isArrived = resv?.status === 'PATIENT_ARRIVED' || req?.status === 'ARRIVED';
              const isAllocated = resv?.status === 'ALLOCATED';

              return (
                <div
                  key={req?._id || jny?._id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900">{req?.patientName || 'Emergency Patient'}</span>
                      <Badge variant={isArrived ? 'presence' : 'emergency'} size="xs">
                        {req?.status || 'PATIENT_EN_ROUTE'}
                      </Badge>
                      <span className="font-mono text-[10px] text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">
                        #{req?.requestCode}
                      </span>
                      {isSharing && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                          <Radio className="w-2.5 h-2.5 animate-pulse" />
                          GPS Active
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600">
                      <strong>Triage:</strong> {req?.emergencyType?.toUpperCase()} ({req?.severity || 'CRITICAL'}) &bull;{' '}
                      <strong>Phone:</strong> {req?.patientPhone || 'N/A'}
                    </p>
                    {jny?.estimatedDurationMin && (
                      <p className="text-[11px] text-blue-700 font-semibold">
                        Estimated Arrival: ~{jny.estimatedDurationMin} mins ({jny.estimatedDistanceKm} km)
                      </p>
                    )}
                    {item.latestLocation && (
                      <p className="text-[10px] font-mono text-slate-400">
                        GPS: {item.latestLocation.latitude?.toFixed(4)}, {item.latestLocation.longitude?.toFixed(4)} (±{item.latestLocation.accuracyMeters}m)
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    {!isArrived && !isAllocated && (
                      <Button
                        size="xs"
                        variant="primary"
                        disabled={actionLoading}
                        onClick={() => handleMarkArrivalByReservation(resv?._id || resv?.reservationId)}
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1 inline" />
                        Verify Arrival at ER
                      </Button>
                    )}
                    {isArrived && !isAllocated && (
                      <Button
                        size="xs"
                        variant="presence"
                        disabled={actionLoading}
                        onClick={() => handleAllocateReservation(resv?._id || resv?.reservationId)}
                      >
                        <BedDouble className="w-3 h-3 mr-1 inline" />
                        Allocate Bay & Admit
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
