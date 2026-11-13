import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  ShieldAlert,
  Calendar,
  Clock,
  MapPin,
  ChevronRight,
  Activity,
  XCircle,
  AlertTriangle,
  Radio,
  CheckCircle2,
  Ambulance,
  Eye,
  BedDouble,
  Navigation,
  X,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';

export const EmergencyHistoryPage = () => {
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [processingCancel, setProcessingCancel] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const openHistoryDetails = async (requestId) => {
    try {
      setHistoryLoading(true);
      setHistoryModalOpen(true);
      const res = await api.get(`/emergency/requests/${requestId}/history`);
      if (res.data.success) {
        setSelectedHistory(res.data.data);
      }
    } catch (err) {
      alert('Error fetching full history: ' + (err.response?.data?.message || err.message));
      setHistoryModalOpen(false);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      // Try /api/emergency/requests/my first, then fallback
      let res;
      try {
        res = await api.get('/emergency/requests/my');
      } catch (e) {
        res = await api.get('/emergency/user/history');
      }

      if (res.data.success) {
        setEmergencies(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching emergency history', err);
    } finally {
      setLoading(false);
    }
  };

  const openCancelModal = (id) => {
    setCancellingId(id);
    setCancelReason('');
    setCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!cancellingId) return;
    setProcessingCancel(true);
    try {
      const res = await api.post(`/emergency/requests/${cancellingId}/cancel`, {
        reason: cancelReason || 'Cancelled by patient',
      });
      if (res.data.success) {
        setCancelModalOpen(false);
        fetchHistory();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel emergency request.');
    } finally {
      setProcessingCancel(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'CREATED':
        return <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-extrabold uppercase rounded-full">Created</span>;
      case 'BROADCASTED':
      case 'RESPONSES_RECEIVED':
        return <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-extrabold uppercase rounded-full">Beep Broadcasted</span>;
      case 'DESTINATION_SELECTED':
      case 'PATIENT_EN_ROUTE':
        return <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-extrabold uppercase rounded-full">Destination En Route</span>;
      case 'ARRIVED':
      case 'COMPLETED':
        return <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase rounded-full">{status}</span>;
      case 'CANCELLED':
        return <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded-full">Cancelled</span>;
      default:
        return <span className="px-2.5 py-0.5 bg-red-100 text-red-800 text-[10px] font-extrabold uppercase rounded-full">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-extrabold uppercase rounded-full">
              Audit Trail & Status
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Emergency Request History
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit trail and chronological lifecycle of your emergency requests, location snapshots, and hospital responses.
          </p>
        </div>

        <Link to="/emergency/activate">
          <Button variant="emergency" size="sm" icon={ShieldAlert}>
            Create Emergency Request
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
          Loading emergency history records...
        </div>
      ) : emergencies.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No Emergency Requests Recorded"
          description="Your created emergency requests, broadcast logs, and destination routing outcomes will be securely recorded here."
          actionLabel="Create Emergency Request"
          onAction={() => (window.location.href = '/emergency/activate')}
        />
      ) : (
        <div className="space-y-3">
          {emergencies.map((emg) => {
            const isCancellable = ['CREATED', 'BROADCASTED', 'RESPONSES_RECEIVED', 'pending'].includes(emg.status);
            return (
              <div
                key={emg._id}
                className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-300 transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-black text-slate-900 capitalize">
                      {emg.emergencyCategoryId?.categoryName || emg.emergencyType} Emergency
                    </span>
                    {getStatusBadge(emg.status)}
                    {emg.ambulanceRequirement && (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold uppercase rounded-md flex items-center gap-1">
                        <Ambulance className="w-3 h-3 text-red-600" />
                        <span>Amb: {emg.ambulanceRequirement}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono font-bold text-slate-800">{emg.emergencyRequestId || emg.requestCode}</span>
                    <span>&bull;</span>
                    <span>{new Date(emg.createdAt).toLocaleString()}</span>
                    {emg.selectedOrganizationId && (
                      <>
                        <span>&bull;</span>
                        <span>Destination: <strong className="text-slate-800">{emg.selectedOrganizationId.name}</strong></span>
                      </>
                    )}
                  </div>

                  <div className="text-xs text-slate-600 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate max-w-md">{emg.address || emg.locationAddress || 'GPS Location'}</span>
                    {emg.locationSource && (
                      <span className="text-[10px] text-slate-400 font-mono">({emg.locationSource})</span>
                    )}
                  </div>

                  {emg.cancellationReason && (
                    <div className="text-[11px] text-red-700 bg-red-50 px-2.5 py-1 rounded-lg">
                      Cancellation Note: {emg.cancellationReason}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  {isCancellable && (
                    <button
                      type="button"
                      onClick={() => openCancelModal(emg._id)}
                      className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Cancel</span>
                    </button>
                  )}

                  {emg.status === 'CREATED' && (
                    <Link
                      to={`/emergency/broadcast/${emg._id}`}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-xs flex items-center gap-1"
                    >
                      <Radio className="w-3.5 h-3.5" />
                      <span>Broadcast Beep</span>
                    </Link>
                  )}

                  {['DESTINATION_SELECTED', 'RESOURCES_RESERVED', 'PATIENT_EN_ROUTE', 'ARRIVED'].includes(emg.status) && (
                    <Link to={`/emergency/en-route/${emg._id}`}>
                      <Button size="xs" variant="primary" icon={Navigation}>
                        Live Navigation
                      </Button>
                    </Link>
                  )}

                  <Button
                    size="xs"
                    variant="outline"
                    icon={Eye}
                    onClick={() => openHistoryDetails(emg._id)}
                  >
                    Dossier
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancel Request Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-black text-slate-900">Cancel Emergency Request</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to cancel this emergency request? Any active hospital notifications will be updated, and audit logs will record the cancellation reason.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Reason for Cancellation</label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g., Arranged private transportation, condition stabilized, or false alarm..."
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Keep Active
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={processingCancel}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {processingCancel ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Dossier / Full History Modal */}
      {historyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-black">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Emergency Dossier & Audit Log
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {selectedHistory?.emergencyRequest?.emergencyRequestId || 'Loading dossier...'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {historyLoading || !selectedHistory ? (
              <div className="py-12 text-center text-xs text-slate-400 font-medium">
                Compiling immutable journey audit records...
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {/* Status and Overview */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Status</span>
                    <span className="font-bold text-slate-900">
                      {selectedHistory.emergencyRequest?.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Created At</span>
                    <span className="font-medium text-slate-700">
                      {new Date(selectedHistory.emergencyRequest?.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Ambulance</span>
                    <span className="font-medium text-slate-700 capitalize">
                      {selectedHistory.emergencyRequest?.ambulanceRequirement || 'None'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Destination</span>
                    <span className="font-bold text-slate-900 truncate block">
                      {selectedHistory.emergencyRequest?.selectedOrganizationId?.name || 'Assigned Facility'}
                    </span>
                  </div>
                </div>

                {/* Journey & Telemetry Status */}
                <div className="border border-slate-200 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <Navigation className="w-3.5 h-3.5 text-blue-600" />
                      Journey & Navigation Telemetry
                    </span>
                    <Badge variant={selectedHistory.journey?.status === 'COMPLETED' ? 'success' : 'default'} size="sm">
                      {selectedHistory.journey?.status || 'NOT_STARTED'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-600 pt-1">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Started At</span>
                      {selectedHistory.journey?.startedAt
                        ? new Date(selectedHistory.journey.startedAt).toLocaleTimeString()
                        : '—'}
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Arrived At</span>
                      {selectedHistory.journey?.arrivedAt
                        ? new Date(selectedHistory.journey.arrivedAt).toLocaleTimeString()
                        : '—'}
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Telemetry Breadcrumbs</span>
                      <span className="font-bold text-slate-800">
                        {selectedHistory.locationUpdatesCount || 0} updates logged
                      </span>
                    </div>
                  </div>
                </div>

                {/* Arrival Record */}
                <div className="border border-slate-200 rounded-xl p-3.5 space-y-2">
                  <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Verified Arrival Record
                  </span>
                  {selectedHistory.arrivalRecord ? (
                    <div className="bg-emerald-50/60 border border-emerald-200/60 rounded-lg p-2.5 text-[11px] space-y-1">
                      <div className="flex justify-between">
                        <span className="font-bold text-emerald-900">
                          Method: {selectedHistory.arrivalRecord.verificationMethod}
                        </span>
                        <span className="text-emerald-700">
                          {new Date(selectedHistory.arrivalRecord.verifiedAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-emerald-800">
                        Status: <strong className="uppercase">{selectedHistory.arrivalRecord.verificationStatus}</strong>
                        {selectedHistory.arrivalRecord.remarks && ` — ${selectedHistory.arrivalRecord.remarks}`}
                      </p>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">
                      Arrival has not yet been attested by patient confirmation or staff check-in.
                    </p>
                  )}
                </div>

                {/* Resource Allocations */}
                <div className="border border-slate-200 rounded-xl p-3.5 space-y-2">
                  <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <BedDouble className="w-3.5 h-3.5 text-purple-600" />
                    Facility Resource Allocations
                  </span>
                  {selectedHistory.allocations && selectedHistory.allocations.length > 0 ? (
                    <div className="space-y-1.5">
                      {selectedHistory.allocations.map((alloc) => (
                        <div
                          key={alloc._id || alloc.allocationId}
                          className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200/60 rounded-lg text-[11px]"
                        >
                          <div>
                            <span className="font-bold text-slate-800">
                              {alloc.reservationItemId?.resourceTypeId?.name || 'Clinical Resource'}
                            </span>
                            <span className="text-slate-500 ml-2">
                              Qty: {alloc.allocatedQuantity}
                            </span>
                            {alloc.remarks && (
                              <span className="text-slate-400 italic ml-2">({alloc.remarks})</span>
                            )}
                          </div>
                          <Badge variant="success" size="sm">
                            {alloc.allocationStatus}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">
                      No final physical resource allocations recorded yet.
                    </p>
                  )}
                </div>

                {/* Audit Timeline */}
                <div className="border border-slate-200 rounded-xl p-3.5 space-y-2">
                  <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-600" />
                    Audit Event History ({selectedHistory.events?.length || 0})
                  </span>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {selectedHistory.events && selectedHistory.events.length > 0 ? (
                      selectedHistory.events.map((evt, idx) => (
                        <div
                          key={evt._id || idx}
                          className="flex items-start gap-2.5 text-[11px] border-l-2 border-slate-300 pl-2.5 py-0.5"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-800 text-[10px]">
                                {evt.event_type}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(evt.created_at || evt.createdAt).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-slate-600 text-[10px]">
                              {evt.previous_state && `${evt.previous_state} → `}
                              <strong className="text-slate-800">{evt.new_state}</strong>
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">No events recorded.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHistoryModalOpen(false)}
              >
                Close Dossier
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmergencyHistoryPage;
