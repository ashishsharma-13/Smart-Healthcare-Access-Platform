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
    return <div className="p-12 text-center text-xs text-slate-400">Loading presence desk...</div>;
  }

  const isPresent = profile?.currentPresence?.isPresent;
  const currentOrg = profile?.currentPresence?.organizationId;
  const doctorName = profile?.userId?.name || 'Dr. Specialist';

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Doctor QR Credential & On-Site Presence
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Verify your physical presence on-site at participating hospitals via secure QR scan check-in.
        </p>
      </div>

      {feedback.message && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center space-x-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Main Grid: Official Doctor ID Badge (Col 6) + Facility Scanner (Col 6) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* Left: Official Digital Medical ID Card (Screen 13 Montage) */}
        <div className="md:col-span-6 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-slate-800 relative overflow-hidden space-y-5">
          {/* Hologram aesthetic accent */}
          <div className="absolute top-0 right-0 w-44 h-44 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>

          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-widest">
                  Official Practitioner ID
                </span>
                <span className="text-xs font-extrabold text-blue-400">SHAP Medical Registry</span>
              </div>
            </div>

            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              NMC VALIDATED
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <DoctorAvatar name={doctorName} specialization={profile?.specialization} className="w-20 h-20" />
            <div className="space-y-1">
              <h3 className="text-lg font-black text-white">{doctorName}</h3>
              <p className="text-xs font-bold text-blue-400">{profile?.specialization}</p>
              <div className="text-[11px] text-slate-400">
                <span>Unique ID: </span>
                <strong className="text-white font-mono">{profile?.uniqueDoctorId || 'DOC-10024'}</strong>
              </div>
            </div>
          </div>

          {/* QR Credential Graphic Representation */}
          <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between gap-4">
            <div className="space-y-1 text-xs">
              <p className="font-bold text-slate-200">Doctor QR Credential</p>
              <p className="text-[11px] text-slate-400 leading-tight">
                Scan at hospital reception QR desk to record on-site physical presence.
              </p>
              <span className="inline-block text-[10px] font-mono font-bold text-blue-300 mt-1">
                {qrCredential?.qrCodeValue || 'SHAP-DOC-CREDENTIAL'}
              </span>
            </div>

            <div className="w-20 h-20 bg-white p-1.5 rounded-xl flex-shrink-0 flex items-center justify-center shadow-xs">
              <svg viewBox="0 0 100 100" className="w-full h-full fill-current text-slate-900">
                <rect x="10" y="10" width="24" height="24" fill="#0F172A" />
                <rect x="14" y="14" width="16" height="16" fill="#FFFFFF" />
                <rect x="18" y="18" width="8" height="8" fill="#0F172A" />

                <rect x="66" y="10" width="24" height="24" fill="#0F172A" />
                <rect x="70" y="14" width="16" height="16" fill="#FFFFFF" />
                <rect x="74" y="18" width="8" height="8" fill="#0F172A" />

                <rect x="10" y="66" width="24" height="24" fill="#0F172A" />
                <rect x="14" y="70" width="16" height="16" fill="#FFFFFF" />
                <rect x="18" y="74" width="8" height="8" fill="#0F172A" />

                <rect x="42" y="15" width="8" height="8" fill="#2563EB" />
                <rect x="52" y="25" width="8" height="8" fill="#0F172A" />
                <rect x="42" y="38" width="16" height="8" fill="#0F172A" />
                <rect x="15" y="44" width="8" height="12" fill="#0F172A" />
                <rect x="42" y="55" width="10" height="10" fill="#2563EB" />
              </svg>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 text-center pt-1">
            Governed by SHAP Strict Non-Simultaneous Presence Protocol
          </div>
        </div>

        {/* Right: Facility Check-In Desk Form (Screen 13 Montage) */}
        <div className="md:col-span-6 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center space-x-2 pb-4 border-b border-slate-100">
            <Scan className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Hospital Check-In Desk</h2>
          </div>

          {/* Current Presence Status Indicator */}
          <div className="p-4 rounded-2xl border space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Current Physical Status
            </span>
            {isPresent ? (
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-emerald-700 font-extrabold text-sm">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>CHECKED IN & PRESENT ON-SITE</span>
                </div>
                <p className="text-xs text-slate-600">
                  Facility: <strong>{currentOrg?.name || 'Partner Trauma Center'}</strong>
                </p>
                <p className="text-[11px] text-slate-400">
                  Checked in at: {new Date(profile?.currentPresence?.checkedInAt).toLocaleTimeString()}
                </p>
                <button
                  onClick={handleCheckOut}
                  disabled={submitting}
                  className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                >
                  {submitting ? 'Processing Check-Out...' : 'Check Out From Facility'}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-slate-600 font-bold text-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                  <span>NOT CHECKED IN AT ANY FACILITY</span>
                </div>
                <p className="text-xs text-slate-500">
                  To indicate you are on-site and ready for emergency patient reception, enter the facility's check-in code or scan their QR badge below.
                </p>
              </div>
            )}
          </div>

          {!isPresent && (
            <form onSubmit={handleCheckIn} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Enter Facility Check-In Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ORG-APEX-METRO-QR or ORG-ST-JUDE-QR"
                  value={checkinCode}
                  onChange={(e) => setCheckinCode(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[10px] text-slate-400 block">
                  Quick demo codes: <code>ORG-APEX-METRO-QR</code> or <code>ORG-ST-JUDE-QR</code>
                </span>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
              >
                {submitting ? 'Checking In...' : 'Verify Presence & Check In'}
              </button>
            </form>
          )}
        </div>

      </div>

      {/* Presence History Table (Screen 13 Montage) */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
          <History className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Recent Presence Audit Log
          </h3>
        </div>

        {history.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">No presence sessions recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b text-slate-400 font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Facility</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Check-In</th>
                  <th className="py-2.5 px-3">Check-Out</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {history.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-bold text-slate-800">{log.organizationId?.name}</td>
                    <td className="py-2.5 px-3 text-slate-500">{new Date(log.checkInTime).toLocaleDateString()}</td>
                    <td className="py-2.5 px-3 text-slate-700">{new Date(log.checkInTime).toLocaleTimeString()}</td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {log.checkOutTime ? new Date(log.checkOutTime).toLocaleTimeString() : 'Active On-Site'}
                    </td>
                    <td className="py-2.5 px-3">
                      {log.checkOutTime ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600 font-semibold">
                          Completed
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                          Present
                        </span>
                      )}
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
