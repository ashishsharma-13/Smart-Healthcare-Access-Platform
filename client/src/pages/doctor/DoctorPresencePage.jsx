import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Toast } from '../../components/ui/Toast';
import { TableSkeleton } from '../../components/ui/Skeleton';

export const DoctorPresencePage = () => {
  const [profile, setProfile] = useState(null);
  const [qrCredential, setQrCredential] = useState(null);
  const [history, setHistory] = useState([]);
  const [checkinCode, setCheckinCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  useEffect(() => {
    fetchPresenceData();
  }, []);

  const fetchPresenceData = async () => {
    try {
      setLoading(true);
      const [profRes, qrRes, histRes] = await Promise.all([
        api.get('/doctors/me'),
        api.get('/doctors/qr-credential'),
        api.get('/doctors/presence/history'),
      ]);

      if (profRes.data.success) setProfile(profRes.data.data);
      if (qrRes.data.success) setQrCredential(qrRes.data.data);
      if (histRes.data.success) setHistory(histRes.data.data);
    } catch (err) {
      console.error('Error loading presence data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (e) => {
    e.preventDefault();
    if (!checkinCode.trim()) return;

    try {
      setSubmitting(true);
      setFeedback({ type: '', message: '' });
      const res = await api.post('/doctors/presence/check-in', {
        orgQrCheckinCode: checkinCode.trim(),
      });
      if (res.data.success) {
        setFeedback({ type: 'success', message: res.data.message });
        setCheckinCode('');
        fetchPresenceData();
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Check-in failed',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setSubmitting(true);
      setFeedback({ type: '', message: '' });
      const res = await api.post('/doctors/presence/check-out');
      if (res.data.success) {
        setFeedback({ type: 'success', message: 'Checked out successfully' });
        fetchPresenceData();
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Check-out failed',
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
      
      {/* Title */}
      <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="presence" size="xs" dot>
              Physical Presence Protocol
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Practitioner QR Credential & Presence Desk
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Verify your physical on-site presence at participating healthcare facilities via secure QR check-in.
          </p>
        </div>
      </div>

      {feedback.message && (
        <Toast
          type={feedback.type === 'success' ? 'success' : 'error'}
          message={feedback.message}
          onClose={() => setFeedback({ type: '', message: '' })}
        />
      )}

      {/* Main Grid: ID Badge + Facility Check-In */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* Left: Official Digital ID Card */}
        <div className="md:col-span-6 bg-brand-950 text-white rounded-xl p-5 sm:p-6 shadow-elevated border border-brand-900 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-brand-600 flex items-center justify-center font-bold text-white shadow-xs">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                  NMC Practitioner Badge
                </span>
                <span className="text-xs font-bold text-brand-300">SHAP Clinical Credential</span>
              </div>
            </div>

            <Badge variant="presence" size="xs">
              VALIDATED
            </Badge>
          </div>

          <div className="flex items-center gap-3.5">
            <DoctorAvatar name={doctorName} specialization={profile?.specialization} className="w-16 h-16" />
            <div className="space-y-0.5">
              <h3 className="text-base font-bold text-white">{doctorName}</h3>
              <p className="text-xs font-semibold text-brand-300">{profile?.specialization}</p>
              <p className="text-[11px] text-slate-400">
                Doctor ID: <span className="text-white font-mono font-bold">{profile?.uniqueDoctorId || 'DOC-10024'}</span>
              </p>
            </div>
          </div>

          {/* QR Credential Graphic Representation */}
          <div className="p-3.5 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between gap-3">
            <div className="space-y-1 text-xs">
              <p className="font-semibold text-slate-200">Physician QR Credential</p>
              <p className="text-[11px] text-slate-400 leading-snug">
                Scan at hospital reception QR stand to record on-site physical presence.
              </p>
              <span className="inline-block text-[10px] font-mono font-semibold text-brand-300 mt-0.5">
                {qrCredential?.qrCodeValue || 'SHAP-DOC-CREDENTIAL'}
              </span>
            </div>

            <div className="w-16 h-16 bg-white p-1 rounded-md flex-shrink-0 flex items-center justify-center shadow-xs">
              <QrCode className="w-14 h-14 text-slate-900" />
            </div>
          </div>

          <div className="text-[10px] text-slate-400 text-center pt-1 font-medium">
            Governed by SHAP Strict Non-Simultaneous Presence Protocol
          </div>
        </div>

        {/* Right: Hospital Check-In Desk Form */}
        <div className="md:col-span-6 bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-card space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Scan className="w-4 h-4 text-brand-600" />
            <h2 className="text-sm font-bold text-slate-900">Hospital Reception Check-In</h2>
          </div>

          {/* Current Presence Status Indicator */}
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
              Current Physical Verification
            </span>
            {isPresent ? (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-presence-800 font-bold text-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-presence-500 animate-pulse" />
                  <span>PRESENT ON-SITE</span>
                </div>
                <p className="text-xs text-slate-700">
                  Facility: <strong className="text-slate-900">{currentOrg?.name || 'Partner Facility'}</strong>
                </p>
                <p className="text-[11px] text-slate-500">
                  Checked in at: {new Date(profile?.currentPresence?.checkedInAt).toLocaleTimeString()}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  loading={submitting}
                  className="w-full text-rose-600 hover:bg-rose-50"
                  onClick={handleCheckOut}
                >
                  {submitting ? 'Checking Out...' : 'Check Out From Facility'}
                </Button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-slate-600 font-medium text-xs">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  <span>NOT CHECKED IN AT ANY FACILITY</span>
                </div>
                <p className="text-xs text-slate-500 leading-snug">
                  Enter the facility check-in code from the hospital reception desk below to mark on-site presence.
                </p>
              </div>
            )}
          </div>

          {!isPresent && (
            <form onSubmit={handleCheckIn} className="space-y-3">
              <div className="space-y-1">
                <label htmlFor="checkin-code" className="text-xs font-medium text-slate-700 block">
                  Enter Facility Reception Check-In Code
                </label>
                <input
                  id="checkin-code"
                  type="text"
                  required
                  placeholder="e.g. ORG-APEX-METRO-QR"
                  value={checkinCode}
                  onChange={(e) => setCheckinCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 uppercase focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white"
                />
                <span className="text-[10px] text-slate-400 block">
                  Quick demo codes: <code className="text-brand-700 font-bold">ORG-APEX-METRO-QR</code> or <code className="text-brand-700 font-bold">ORG-ST-JUDE-QR</code>
                </span>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={submitting}
                className="w-full"
              >
                {submitting ? 'Verifying Presence...' : 'Verify Presence & Check In'}
              </Button>
            </form>
          )}
        </div>

      </div>

      {/* Presence History Table */}
      <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-card space-y-3">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <History className="w-4 h-4 text-slate-400" />
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Presence Session Audit Trail
          </h3>
        </div>

        {history.length === 0 ? (
          <p className="text-xs text-slate-400 py-3 text-center">No presence sessions recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="p-2.5">Healthcare Organization</th>
                  <th className="p-2.5">Check-In Time</th>
                  <th className="p-2.5">Check-Out Time</th>
                  <th className="p-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((h, i) => (
                  <tr key={i} className="hover:bg-slate-50/60">
                    <td className="p-2.5 font-medium text-slate-900">{h.organizationId?.name || 'Facility'}</td>
                    <td className="p-2.5 text-slate-600">{new Date(h.checkedInAt).toLocaleString()}</td>
                    <td className="p-2.5 text-slate-600">{h.checkedOutAt ? new Date(h.checkedOutAt).toLocaleString() : 'Active On-Site'}</td>
                    <td className="p-2.5">
                      <Badge variant={h.checkedOutAt ? 'neutral' : 'presence'} size="xs">
                        {h.checkedOutAt ? 'Completed' : 'Active'}
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

export default DoctorPresencePage;
