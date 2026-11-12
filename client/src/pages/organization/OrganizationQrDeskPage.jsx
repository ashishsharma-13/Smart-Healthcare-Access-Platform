import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  QrCode,
  Building2,
  Printer,
  ShieldCheck,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Ban,
  Clock,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton, TableSkeleton } from '../../components/ui/Skeleton';
import { Toast } from '../../components/ui/Toast';

export const OrganizationQrDeskPage = () => {
  const [legacyQrData, setLegacyQrData] = useState(null);
  const [qrCodes, setQrCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Modal: Generate Terminal QR
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [newLocation, setNewLocation] = useState('Main Reception Desk');
  const [newCodeType, setNewCodeType] = useState('STATIC');
  const [newValidityDays, setNewValidityDays] = useState(30);

  // Selected QR for printing or inspection
  const [selectedStandQr, setSelectedStandQr] = useState(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [portalRes, qrListRes] = await Promise.allSettled([
        api.get('/organizations/portal/qr-code'),
        api.get('/organizations/me/presence-qr'),
      ]);

      if (portalRes.status === 'fulfilled' && portalRes.value?.data?.success) {
        setLegacyQrData(portalRes.value.data.data);
      }

      if (qrListRes.status === 'fulfilled' && qrListRes.value?.data?.success) {
        const list = qrListRes.value.data.data || [];
        setQrCodes(list);
        if (list.length > 0 && !selectedStandQr) {
          setSelectedStandQr(list[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching terminal QR codes', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateNewQR = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setFeedback({ type: '', message: '' });
      const res = await api.post('/organizations/me/presence-qr', {
        location: newLocation,
        codeType: newCodeType,
        validityDays: parseInt(newValidityDays, 10) || 30,
      });

      if (res.data?.success) {
        setFeedback({
          type: 'success',
          message: `New Terminal QR code issued successfully for ${newLocation}.`,
        });
        setShowGenerateModal(false);
        setSelectedStandQr(res.data.data);
        await fetchAllData();
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to issue new terminal QR.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeQR = async (qrId) => {
    const reason = prompt('Specify reason for revoking this terminal QR code (e.g. Relocated reception, compromised token):');
    if (!reason) return;

    try {
      setActionLoading(true);
      setFeedback({ type: '', message: '' });
      const res = await api.post(`/organizations/me/presence-qr/${qrId}/revoke`, { reason });
      if (res.data?.success) {
        setFeedback({ type: 'success', message: 'Terminal QR code revoked.' });
        await fetchAllData();
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to revoke QR code.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Determine which QR to display on the physical poster
  const posterQr = selectedStandQr || legacyQrData;
  const qrImage = posterQr?.qrDataUrl;
  const displayCode = posterQr?.qrToken || legacyQrData?.qrCheckinCode || 'ORG-CHECKIN-QR';
  const orgName = legacyQrData?.organizationName || 'Healthcare Facility';

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="presence" size="xs" dot>
              TERMINAL MANAGEMENT
            </Badge>
            <span className="text-[11px] font-mono text-slate-400">Module 7 Presence Engine</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Facility Reception QR Code Stand & Terminals
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage, generate, and print high-security cryptographic QR stands mounted at hospital entrances for physician on-site check-in.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowGenerateModal(true)}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Issue New Terminal QR</span>
        </button>
      </div>

      {feedback.message && (
        <Toast
          type={feedback.type === 'success' ? 'success' : 'error'}
          message={feedback.message}
          onClose={() => setFeedback({ type: '', message: '' })}
        />
      )}

      {loading ? (
        <TableSkeleton rows={4} cols={4} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Left: Physical Printable Reception Stand Card */}
          <div className="md:col-span-5 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-lg space-y-5 text-center print:border-none print:shadow-none">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">
                Official Check-In Stand
              </span>
              <div className="flex items-center justify-center gap-1.5 text-slate-900 font-extrabold text-base">
                <Building2 className="w-5 h-5 text-blue-600" />
                <span>{orgName}</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Location: <strong className="text-slate-800">{posterQr?.location || 'Main Reception Desk'}</strong>
              </p>
            </div>

            {/* QR Visual */}
            <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-200/80 inline-block mx-auto shadow-inner">
              {qrImage ? (
                <img
                  src={qrImage}
                  alt="Facility Presence QR"
                  className="w-52 h-52 object-contain mx-auto rounded-lg"
                />
              ) : (
                <div className="w-52 h-52 flex items-center justify-center bg-white rounded-lg border border-slate-200">
                  <QrCode className="w-40 h-40 text-slate-900" />
                </div>
              )}
              <div className="mt-3 pt-2 border-t border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Terminal Identifier</span>
                <p className="text-xs font-mono font-black text-slate-900 break-all select-all">
                  {displayCode}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
              <p>
                Physicians scanning this QR are validated against verified affiliation status and marked as{' '}
                <strong className="text-emerald-700">PRESENT ON-SITE</strong> in real time.
              </p>
            </div>

            <Button
              size="md"
              variant="primary"
              icon={Printer}
              onClick={() => window.print()}
              className="w-full font-bold uppercase tracking-wider"
            >
              Print Reception Stand Poster
            </Button>
          </div>

          {/* Right: Issued Terminal QR Codes Table & Lifecycle */}
          <div className="md:col-span-7 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-blue-600" />
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Active Facility Terminal QR Registry ({qrCodes.length})
                </h2>
              </div>
              <button
                type="button"
                onClick={fetchAllData}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                Refresh
              </button>
            </div>

            {qrCodes.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                <QrCode className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-semibold text-slate-700">Using Default Base QR Stand</p>
                <p className="text-[11px] max-w-sm mx-auto">
                  Click "Issue New Terminal QR" above to create dedicated entrance stands for specific triage desks or wards.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="p-3">Location / Name</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Issued Date</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {qrCodes.map((qr) => {
                      const isActive = qr.status === 'ACTIVE';
                      const isSelected = selectedStandQr?._id === qr._id;

                      return (
                        <tr
                          key={qr._id}
                          className={`hover:bg-slate-50/70 transition-colors ${
                            isSelected ? 'bg-blue-50/40' : ''
                          }`}
                        >
                          <td className="p-3">
                            <span className="font-bold text-slate-900 block">{qr.location}</span>
                            <span className="text-[10px] font-mono text-slate-400">{qr.qrId}</span>
                          </td>
                          <td className="p-3">
                            <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">
                              {qr.codeType || 'STATIC'}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500 text-[11px]">
                            {new Date(qr.issuedAt).toLocaleDateString()}
                          </td>
                          <td className="p-3">
                            <Badge variant={isActive ? 'success' : 'danger'} size="xs">
                              {qr.status}
                            </Badge>
                          </td>
                          <td className="p-3 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() => setSelectedStandQr(qr)}
                              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                            >
                              View Stand
                            </button>
                            {isActive && (
                              <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() => handleRevokeQR(qr._id)}
                                className="text-[11px] font-bold text-rose-600 hover:text-rose-800 cursor-pointer disabled:opacity-50"
                              >
                                Revoke
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= MODAL: ISSUE NEW TERMINAL QR ================= */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-black text-slate-900">Issue New Terminal QR Stand</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowGenerateModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGenerateNewQR} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Terminal Physical Location / Desk</label>
                <input
                  type="text"
                  required
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="e.g., North Wing OPD Triage, Emergency Entrance"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Code Type</label>
                  <select
                    value={newCodeType}
                    onChange={(e) => setNewCodeType(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    <option value="STATIC">Static Stand</option>
                    <option value="DYNAMIC">Dynamic Rolling</option>
                    <option value="ROTATING">Rotating Key</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Validity (Days)</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    required
                    value={newValidityDays}
                    onChange={(e) => setNewValidityDays(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                  </input>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-snug">
                Generates a cryptographically signed SHA-256 token and scannable QR Data URL recorded in the immutable terminal registry.
              </p>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowGenerateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={actionLoading}
                  className="font-bold"
                >
                  Issue Terminal QR
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizationQrDeskPage;
