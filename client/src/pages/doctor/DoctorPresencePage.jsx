import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { DoctorAvatar } from '../../components/graphics/DoctorAvatar';
import {
  QrCode,
  CheckCircle2,
  XCircle,
  Building2,
  Clock,
  ShieldCheck,
  History,
  Scan,
  AlertCircle,
  Award,
  Calendar,
  Sparkles,
  Camera,
  Maximize2,
  Check,
  RefreshCw,
  LogOut,
  MapPin,
  ExternalLink,
  Info,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Toast } from '../../components/ui/Toast';
import { TableSkeleton } from '../../components/ui/Skeleton';

export const DoctorPresencePage = () => {
  const [profile, setProfile] = useState(null);
  const [qrCredential, setQrCredential] = useState(null);
  const [history, setHistory] = useState([]);
  const [activeAffiliations, setActiveAffiliations] = useState([]);
  const [checkinCode, setCheckinCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Camera / Scanner State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  // Live Timer State
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Confirmation Modals State
  const [lastCheckInResult, setLastCheckInResult] = useState(null);
  const [lastCheckOutResult, setLastCheckOutResult] = useState(null);
  const [confirmCheckOutOpen, setConfirmCheckOutOpen] = useState(false);

  useEffect(() => {
    fetchPresenceData();
  }, []);

  // Timer effect for live on-site presence
  useEffect(() => {
    let interval = null;
    if (profile?.currentPresence?.isPresent && profile?.currentPresence?.checkedInAt) {
      const startTime = new Date(profile.currentPresence.checkedInAt).getTime();
      const updateTimer = () => {
        const now = Date.now();
        const diffInSeconds = Math.max(0, Math.floor((now - startTime) / 1000));
        setElapsedSeconds(diffInSeconds);
      };
      updateTimer();
      interval = setInterval(updateTimer, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [profile?.currentPresence]);

  const fetchPresenceData = async () => {
    try {
      setLoading(true);
      const [profRes, qrRes, histRes, affRes] = await Promise.all([
        api.get('/doctors/me'),
        api.get('/doctors/qr-credential').catch(() => ({ data: { success: false, data: null } })),
        api.get('/doctors/presence/history').catch(() => ({ data: { success: false, data: [] } })),
        api.get('/doctors/affiliations').catch(() => ({ data: { success: false, data: [] } })),
      ]);

      if (profRes.data?.success) setProfile(profRes.data.data);
      if (qrRes.data?.success) setQrCredential(qrRes.data.data);
      if (histRes.data?.success) setHistory(histRes.data.data);
      if (affRes.data?.success) {
        const activeOnly = (affRes.data.data || []).filter(
          (a) => a.status === 'ACTIVE' || a.status === 'approved'
        );
        setActiveAffiliations(activeOnly);
      }
    } catch (err) {
      console.error('Error loading presence data', err);
    } finally {
      setLoading(false);
    }
  };

  // Format elapsed seconds as HH:MM:SS
  const formatElapsedTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Stop camera if scanner was active
  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (e) {
        // ignore already stopped
      }
      html5QrCodeRef.current = null;
    }
    setIsScanning(false);
    setIsScannerOpen(false);
    setCameraError(null);
  };

  // Launch camera QR scanner with html5-qrcode
  const startScanner = async () => {
    setIsScannerOpen(true);
    setCameraError(null);
    setIsScanning(true);

    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      setTimeout(async () => {
        try {
          const qrElement = document.getElementById('qr-reader-container');
          if (!qrElement) return;

          const html5QrCode = new Html5Qrcode('qr-reader-container');
          html5QrCodeRef.current = html5QrCode;

          const config = { fps: 10, qrbox: { width: 220, height: 220 } };

          await html5QrCode.start(
            { facingMode: 'environment' },
            config,
            (decodedText) => {
              // On Successful Scan
              setCheckinCode(decodedText);
              stopScanner();
              // Auto-trigger checkin with the decoded code
              executeCheckIn(decodedText);
            },
            () => {
              // Frame scan error (expected per frame until QR recognized)
            }
          );
        } catch (camErr) {
          console.warn('Camera initiation failed, providing manual input', camErr);
          setCameraError(
            'Live camera access is unavailable or denied. Please enter the terminal QR code manually or click one of your affiliated hospitals below.'
          );
          setIsScanning(false);
        }
      }, 200);
    } catch (err) {
      setCameraError('QR Scanner module failed to initialize. Please use manual code entry.');
      setIsScanning(false);
    }
  };

  const executeCheckIn = async (codeToUse) => {
    const code = (codeToUse || checkinCode).trim();
    if (!code) return;

    try {
      setSubmitting(true);
      setFeedback({ type: '', message: '' });

      const res = await api.post('/doctors/presence/check-in', {
        orgQrCheckinCode: code,
        qrToken: code,
      });

      if (res.data.success) {
        setFeedback({ type: 'success', message: res.data.message || 'Presence checked in successfully!' });
        setLastCheckInResult(res.data.data);
        setCheckinCode('');
        fetchPresenceData();
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Check-in failed.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualCheckIn = (e) => {
    e.preventDefault();
    executeCheckIn(checkinCode);
  };

  const handleConfirmCheckOut = async () => {
    try {
      setSubmitting(true);
      setFeedback({ type: '', message: '' });
      const res = await api.post('/doctors/presence/check-out');
      if (res.data.success) {
        setFeedback({ type: 'success', message: 'Checked out successfully.' });
        setLastCheckOutResult(res.data.data);
        setConfirmCheckOutOpen(false);
        fetchPresenceData();
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Check-out failed.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <TableSkeleton rows={4} cols={4} />
      </div>
    );
  }

  const isPresent = profile?.currentPresence?.isPresent;
  const currentOrg = profile?.currentPresence?.organizationId;
  const doctorName = profile?.userId?.name || 'Dr. Specialist';

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Title Header */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="presence" size="xs" dot pulseDot={isPresent}>
              {isPresent ? 'LIVE ON-SITE' : 'PHYSICAL PRESENCE PROTOCOL'}
            </Badge>
            <span className="text-[11px] font-mono text-slate-400">Module 7 QR Verification</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Doctor QR Credential & Presence Desk
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cryptographically verify your physical on-site presence at participating healthcare facilities via terminal QR scan.
          </p>
        </div>

        {isPresent && (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200/80 px-4 py-2.5 rounded-2xl shadow-xs self-start sm:self-auto">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
            <div>
              <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider block">
                Session Duration
              </span>
              <span className="text-sm font-mono font-black text-emerald-950">
                {formatElapsedTime(elapsedSeconds)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Feedback Toast */}
      {feedback.message && (
        <Toast
          type={feedback.type === 'success' ? 'success' : 'error'}
          message={feedback.message}
          onClose={() => setFeedback({ type: '', message: '' })}
        />
      )}

      {/* Main Grid: Digital Credential Card + Facility Terminal Scanner Desk */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left: Official Digital ID Card */}
        <div className="md:col-span-5 bg-slate-950 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-xs">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                  NMC Medical Council
                </span>
                <span className="text-xs font-bold text-blue-300">SHAP Verified Practitioner</span>
              </div>
            </div>

            <Badge variant="presence" size="xs">
              ACTIVE STATUS
            </Badge>
          </div>

          <div className="flex items-center gap-3.5 pt-1">
            <DoctorAvatar name={doctorName} specialization={profile?.specialization} className="w-16 h-16 rounded-2xl border-2 border-blue-500/30" />
            <div className="space-y-0.5">
              <h3 className="text-base font-black text-white">{doctorName}</h3>
              <p className="text-xs font-semibold text-blue-400">{profile?.specialization}</p>
              <p className="text-[11px] text-slate-400">
                Doctor ID: <span className="text-white font-mono font-bold">{profile?.uniqueDoctorId || profile?.doctorUniqueId || 'DOC-VERIFIED'}</span>
              </p>
            </div>
          </div>

          {/* QR Credential Graphic Representation */}
          <div className="p-3.5 bg-slate-900 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
            <div className="space-y-1 text-xs">
              <p className="font-bold text-slate-200">Personal Doctor QR Credential</p>
              <p className="text-[11px] text-slate-400 leading-snug">
                Presented to hospital administration or displayed on clinical rounds.
              </p>
              <span className="inline-block text-[10px] font-mono font-semibold text-blue-400 mt-0.5">
                {qrCredential?.uniqueId || qrCredential?.token || 'SHAP-DOC-CREDENTIAL'}
              </span>
            </div>

            <div className="w-16 h-16 bg-white p-1 rounded-xl flex-shrink-0 flex items-center justify-center shadow-xs overflow-hidden">
              {qrCredential?.qrDataUrl ? (
                <img src={qrCredential.qrDataUrl} alt="Physician QR Credential" className="w-full h-full object-contain" />
              ) : (
                <QrCode className="w-14 h-14 text-slate-900" />
              )}
            </div>
          </div>

          <div className="text-[10px] text-slate-500 text-center pt-1 font-medium flex items-center justify-center gap-1">
            <Info className="w-3 h-3 text-slate-400" />
            <span>Strict Rule: Doctors can only be checked into ONE facility at a time</span>
          </div>
        </div>

        {/* Right: Hospital Check-In & Scanner Desk */}
        <div className="md:col-span-7 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Scan className="w-5 h-5 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">Hospital Reception Check-In</h2>
            </div>
            <span className="text-[11px] text-slate-400">Instant Terminal Verification</span>
          </div>

          {/* Current Presence Status Indicator Card */}
          <div className={`p-4 rounded-2xl border transition-all ${
            isPresent ? 'bg-emerald-50/70 border-emerald-200' : 'bg-slate-50 border-slate-200'
          }`}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Current Physical Verification Status
            </span>

            {isPresent ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>VERIFIED ON-SITE AT FACILITY</span>
                  </div>
                  <Badge variant="success" size="xs">ACTIVE PRESENCE</Badge>
                </div>

                <div className="bg-white p-3 rounded-xl border border-emerald-200/80 space-y-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    <span className="font-black text-slate-900 text-sm">
                      {currentOrg?.name || profile?.currentPresence?.organizationName || 'Affiliated Medical Facility'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 pt-1 border-t border-slate-100 text-[11px]">
                    <span>Checked in at: {new Date(profile?.currentPresence?.checkedInAt).toLocaleTimeString()}</span>
                    <span className="font-mono font-bold text-emerald-700">Timer: {formatElapsedTime(elapsedSeconds)}</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  loading={submitting}
                  className="w-full text-rose-600 hover:bg-rose-50 border-rose-200 hover:border-rose-300 font-bold"
                  onClick={() => setConfirmCheckOutOpen(true)}
                >
                  <LogOut className="w-4 h-4 mr-1.5" />
                  Check Out From Facility
                </Button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-slate-600 font-bold text-xs">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  <span>NOT CURRENTLY CHECKED IN AT ANY FACILITY</span>
                </div>
                <p className="text-xs text-slate-500 leading-snug">
                  Scan the QR code mounted at the hospital triage desk or select your active affiliated hospital below to check in.
                </p>
              </div>
            )}
          </div>

          {!isPresent && (
            <div className="space-y-4">
              {/* Scan with Camera or Manual Entry Options */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={startScanner}
                  className="p-3 rounded-2xl border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/50 hover:bg-blue-50 text-blue-700 font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Camera className="w-5 h-5 text-blue-600" />
                  <span>Scan Terminal QR with Camera</span>
                </button>
                <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-center text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Fast-Track Mode</span>
                  <span className="text-xs font-bold text-slate-700">Scan or Enter Code Below</span>
                </div>
              </div>

              {/* Active Affiliations Quick Fill */}
              {activeAffiliations.length > 0 ? (
                <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-blue-900">Your Active Affiliated Facilities</span>
                    <Link
                      to="/doctor/affiliations"
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline"
                    >
                      Manage
                    </Link>
                  </div>
                  <p className="text-[11px] text-blue-700">
                    Click an affiliated facility below to auto-fill its terminal code:
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {activeAffiliations.map((aff) => {
                      const org = aff.organizationId;
                      const code = org?.qrCheckinCode || `ORG-${org?.name?.toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 10)}-QR`;
                      return (
                        <button
                          key={aff._id}
                          type="button"
                          onClick={() => setCheckinCode(code)}
                          className={`text-left px-2.5 py-1.5 rounded-xl border text-[11px] transition-all cursor-pointer ${
                            checkinCode === code
                              ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                              : 'bg-white hover:bg-blue-100/50 text-slate-800 border-blue-200 font-medium'
                          }`}
                        >
                          <span className="font-bold block truncate max-w-[180px]">{org?.name}</span>
                          <span className="text-[10px] font-mono opacity-80">{code}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs space-y-1">
                  <div className="flex items-center space-x-1.5 font-bold text-amber-800">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>No Active Affiliations Found</span>
                  </div>
                  <p className="text-[11px] text-amber-700">
                    You must have an <strong>ACTIVE</strong> affiliation with an organization before you can check in to its facility.{' '}
                    <Link to="/doctor/affiliations" className="underline font-bold text-amber-900">
                      Request an affiliation here
                    </Link>.
                  </p>
                </div>
              )}

              {/* Manual Input Form */}
              <form onSubmit={handleManualCheckIn} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Facility QR Token / Terminal Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ORG-APEX-METRO-QR or raw QR cryptographic token"
                    value={checkinCode}
                    onChange={(e) => setCheckinCode(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-400 block">
                    Quick demo codes: <code>ORG-APEX-METRO-QR</code> or <code>ORG-ST-JUDE-QR</code>
                  </span>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={submitting}
                  className="w-full font-bold uppercase tracking-wider"
                >
                  {submitting ? 'Verifying Presence...' : 'Verify Presence & Check In'}
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Presence Session Audit Trail */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Presence Session Audit Trail
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Immutable Historical Log</span>
        </div>

        {history.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">No presence sessions recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="p-3">Healthcare Facility</th>
                  <th className="p-3">Check-In Time</th>
                  <th className="p-3">Check-Out Time</th>
                  <th className="p-3">Duration</th>
                  <th className="p-3">Verification Method</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((h, i) => {
                  const checkInDate = h.checkInAt ? new Date(h.checkInAt) : h.timestamp ? new Date(h.timestamp) : null;
                  const checkOutDate = h.checkOutAt ? new Date(h.checkOutAt) : null;
                  const duration = h.durationMinutes ? `${h.durationMinutes} min` : checkOutDate && checkInDate ? `${Math.round((checkOutDate - checkInDate) / 60000)} min` : 'In progress';
                  const status = h.status || (h.checkOutAt ? 'CHECKED_OUT' : 'CHECKED_IN');

                  return (
                    <tr key={h._id || i} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3 font-bold text-slate-900">
                        {h.organizationId?.name || 'Healthcare Facility'}
                      </td>
                      <td className="p-3 text-slate-600">
                        {checkInDate ? checkInDate.toLocaleString() : 'N/A'}
                      </td>
                      <td className="p-3 text-slate-600">
                        {checkOutDate ? checkOutDate.toLocaleString() : <span className="text-emerald-600 font-bold">Active On-Site</span>}
                      </td>
                      <td className="p-3 text-slate-700 font-mono font-medium">
                        {duration}
                      </td>
                      <td className="p-3">
                        <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                          {h.checkInMethod || h.method || 'QR_SCAN'}
                        </span>
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={
                            status === 'CHECKED_IN' ? 'presence' : status === 'MANUAL_CORRECTED' ? 'warning' : 'neutral'
                          }
                          size="xs"
                        >
                          {status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= MODAL: CAMERA QR SCANNER ================= */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900">Hospital Terminal Scanner</h2>
              </div>
              <button
                type="button"
                onClick={stopScanner}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {cameraError ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs space-y-2 text-amber-800">
                <div className="flex items-center gap-2 font-bold">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>Camera Notice</span>
                </div>
                <p className="text-[11px]">{cameraError}</p>
                <button
                  type="button"
                  onClick={stopScanner}
                  className="w-full mt-2 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs"
                >
                  Return to Manual Entry
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-500 text-center">
                  Position the reception desk QR code inside the viewfinder window.
                </p>

                <div className="relative rounded-2xl overflow-hidden bg-black aspect-square flex items-center justify-center">
                  <div id="qr-reader-container" className="w-full h-full" />
                  
                  {/* Visual reticle overlay */}
                  <div className="absolute inset-8 border-2 border-blue-400/80 rounded-2xl pointer-events-none flex items-center justify-center">
                    <span className="w-full h-0.5 bg-blue-400/50 animate-pulse" />
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={stopScanner}
                  className="w-full"
                >
                  Cancel Scanner
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= MODAL: CONFIRM CHECK-OUT ================= */}
      {confirmCheckOutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-scale-up text-center">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-black text-slate-900">Confirm Check-Out</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Are you ready to end your physical session at{' '}
                <strong>{currentOrg?.name || 'this facility'}</strong>?
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Elapsed Session Duration</span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {formatElapsedTime(elapsedSeconds)}
              </span>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setConfirmCheckOutOpen(false)}
              >
                Stay Checked In
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold"
                loading={submitting}
                onClick={handleConfirmCheckOut}
              >
                Confirm Check-Out
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorPresencePage;
