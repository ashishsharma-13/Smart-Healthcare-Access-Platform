import React, { useState, useEffect } from 'react';
import api from '../../services/api';
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

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Doctor QR Presence & Credential</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Scan facility QR codes upon arrival. Validate physical presence on-site for real-time emergency duty.
        </p>
      </div>

      {feedback.message && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center space-x-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left: Secure Doctor QR Credential Badge (Col 5) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm text-center space-y-4">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[11px] font-bold uppercase tracking-wider border border-blue-200">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Verified Digital Credential</span>
          </div>

          <h2 className="text-lg font-black text-slate-900">{profile?.userId?.name}</h2>
          <p className="text-xs font-semibold text-blue-600">{profile?.specialization}</p>

          {/* QR Image */}
          {qrCredential?.qrDataUrl ? (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 inline-block mx-auto shadow-inner">
              <img
                src={qrCredential.qrDataUrl}
                alt="Doctor Credential QR"
                className="w-44 h-44 object-contain mx-auto"
              />
              <p className="text-[11px] font-mono font-bold text-slate-800 mt-2">
                {qrCredential.uniqueId}
              </p>
            </div>
          ) : (
            <div className="p-8 text-xs text-slate-400">QR Credential unavailable until verified</div>
          )}

          <div className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100 text-left space-y-1">
            <p><strong>License #:</strong> {profile?.licenseNumber}</p>
            <p><strong>Experience:</strong> {profile?.experienceYears} Years</p>
            <p><strong>Verification:</strong> {profile?.verificationStatus?.toUpperCase()}</p>
          </div>
        </div>

        {/* Right: Check-In / Check-Out Actions & Active Presence (Col 7) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Active Presence Banner */}
          <div
            className={`p-6 rounded-3xl border shadow-sm space-y-4 transition-all ${
              isPresent ? 'bg-emerald-50/70 border-emerald-300' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Current Physical Location
              </span>
              <span
                className={`px-3 py-1 text-xs font-extrabold uppercase rounded-full ${
                  isPresent ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {isPresent ? 'PRESENT ON-SITE' : 'NOT CHECKED IN'}
              </span>
            </div>

            {isPresent ? (
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{currentOrg?.name}</h3>
                    <p className="text-xs text-slate-500">{currentOrg?.address?.street}, {currentOrg?.address?.city}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleCheckOut}
                    disabled={submitting}
                    className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center space-x-1.5 active:scale-95 disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Check Out of this Facility</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Enter or scan the Organization's Check-in Code to mark yourself as physically present at the healthcare facility.
                </p>

                {/* Fast QR Demo Buttons */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-700 block">
                    Quick Demo Facility Codes (Click to Fill):
                  </span>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setCheckinCode('ORG-QR-APEX-METRO-2025')}
                      className="px-2.5 py-1 bg-white hover:bg-blue-50 text-slate-800 font-semibold rounded-lg border text-[11px]"
                    >
                      Apex Metro Hospital
                    </button>
                    <button
                      type="button"
                      onClick={() => setCheckinCode('ORG-QR-STJUDE-2025')}
                      className="px-2.5 py-1 bg-white hover:bg-blue-50 text-slate-800 font-semibold rounded-lg border text-[11px]"
                    >
                      St. Jude Emergency
                    </button>
                    <button
                      type="button"
                      onClick={() => setCheckinCode('ORG-QR-CITYCARE-2025')}
                      className="px-2.5 py-1 bg-white hover:bg-blue-50 text-slate-800 font-semibold rounded-lg border text-[11px]"
                    >
                      City Care Clinic
                    </button>
                  </div>
                </div>

                <form onSubmit={handleCheckIn} className="space-y-3">
                  <div className="relative">
                    <Scan className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. ORG-QR-APEX-METRO-2025"
                      value={checkinCode}
                      onChange={(e) => setCheckinCode(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center space-x-1.5 active:scale-95 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Validate & Check In</span>
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Presence History Log */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
              <History className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Recent Presence Check-In / Check-Out Log
              </h3>
            </div>

            {history.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">No check-in activity recorded yet.</p>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {history.slice(0, 5).map((log) => (
                  <div key={log._id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900">{log.organizationId?.name}</span>
                      <p className="text-[11px] text-slate-400">{new Date(log.timestamp).toLocaleString()}</p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        log.action === 'CHECK_IN'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {log.action}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};

