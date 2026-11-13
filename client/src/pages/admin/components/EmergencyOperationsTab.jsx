import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import {
  ShieldAlert,
  Activity,
  Clock,
  Radio,
  Building2,
  MapPin,
  Ambulance,
  Calendar,
  CheckCircle2,
  XCircle,
  Eye,
  RefreshCw,
  Search,
  Filter,
  Layers,
  Navigation,
  Compass,
  X,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { TableSkeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';

export const EmergencyOperationsTab = ({ onNotify }) => {
  const [requests, setRequests] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Drill-down Modal State
  const [selectedReqId, setSelectedReqId] = useState(null);
  const [details, setDetails] = useState(null);
  const [timelineData, setTimelineData] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [modalActiveSubTab, setModalActiveSubTab] = useState('overview'); // 'overview' | 'timeline' | 'broadcasts' | 'responses' | 'reservation' | 'journey'

  useEffect(() => {
    fetchRequests();
  }, [page, statusFilter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit: 15,
      });
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (search.trim()) params.append('search', search.trim());

      const res = await api.get(`/admin/emergency/requests?${params.toString()}`);
      if (res.data?.success) {
        setRequests(res.data.requests || []);
        setTotal(res.data.total || 0);
      }
    } catch (err) {
      console.error('Error fetching emergency requests:', err);
      onNotify?.({ type: 'error', message: 'Could not load emergency operations records.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchRequests();
  };

  const handleInspect = async (id) => {
    setSelectedReqId(id);
    setDetails(null);
    setTimelineData(null);
    setModalActiveSubTab('overview');
    try {
      setLoadingDetails(true);
      const [detRes, timeRes] = await Promise.all([
        api.get(`/admin/emergency/requests/${id}`),
        api.get(`/admin/emergency/requests/${id}/timeline`),
      ]);
      if (detRes.data?.success) setDetails(detRes.data.data);
      if (timeRes.data?.success) setTimelineData(timeRes.data.data);
    } catch (err) {
      onNotify?.({ type: 'error', message: 'Failed to load emergency telemetry details.' });
    } finally {
      setLoadingDetails(false);
    }
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'CANCELLED':
      case 'EXPIRED':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'DECLINED':
      case 'NO_RESPONSE':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'PATIENT_EN_ROUTE':
      case 'RESOURCES_RESERVED':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-amber-100 text-amber-800 border-amber-200';
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by request code or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Operational States</option>
              <option value="CREATED">Created</option>
              <option value="BROADCASTED">Broadcasted</option>
              <option value="RESPONSES_RECEIVED">Responses Received</option>
              <option value="DESTINATION_SELECTED">Destination Selected</option>
              <option value="RESOURCES_RESERVED">Resources Reserved</option>
              <option value="PATIENT_EN_ROUTE">Patient En Route</option>
              <option value="ARRIVED">Arrived</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <Button size="sm" variant="outline" icon={RefreshCw} onClick={fetchRequests}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        {loading ? (
          <TableSkeleton rows={6} cols={7} />
        ) : requests.length === 0 ? (
          <EmptyState
            icon={ShieldAlert}
            title="No Emergency Operations Found"
            description="No emergency requests match your specified criteria."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="p-3">Request Code</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Patient</th>
                  <th className="p-3">Ambulance</th>
                  <th className="p-3">Location</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((r) => (
                  <tr key={r._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3 font-mono font-bold text-brand-700">
                      {r.requestCode || r.emergencyRequestId || r.requestId}
                    </td>
                    <td className="p-3 font-semibold text-slate-900">{r.emergencyCategory}</td>
                    <td className="p-3">
                      <p className="font-medium text-slate-800">{r.patientName || 'Anonymous Patient'}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{r.patientPhone || ''}</p>
                    </td>
                    <td className="p-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        r.ambulanceRequirement === 'YES' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {r.ambulanceRequirement || 'NO'}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600 text-[11px] max-w-xs truncate">
                      {r.location?.address || 'Coordinates Recorded'}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeVariant(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500 text-[11px]">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        size="xs"
                        variant="primary"
                        icon={Eye}
                        onClick={() => handleInspect(r.requestCode || r.emergencyRequestId || r._id)}
                      >
                        Inspect Telemetry
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drill-Down Inspection Modal */}
      {selectedReqId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-rose-600 animate-pulse" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Emergency Telemetry & Incident Audit</h3>
                  <p className="font-mono text-xs text-brand-700">{selectedReqId}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedReqId(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex flex-wrap gap-1 border-b border-slate-200 pb-2 mb-4">
              {['overview', 'timeline', 'broadcasts', 'responses', 'reservation', 'journey'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setModalActiveSubTab(tab)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg capitalize transition-colors ${
                    modalActiveSubTab === tab
                      ? 'bg-brand-50 text-brand-700 border border-brand-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto pr-1">
              {loadingDetails ? (
                <TableSkeleton rows={5} cols={4} />
              ) : !details ? (
                <p className="text-xs text-slate-500 py-6 text-center">Unable to load incident details.</p>
              ) : (
                <>
                  {/* OVERVIEW TAB */}
                  {modalActiveSubTab === 'overview' && (
                    <div className="space-y-3 text-xs">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Patient Name</span>
                          <p className="font-bold text-slate-900">{details.request.patientName || 'Anonymous'}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Patient Contact</span>
                          <p className="font-mono text-slate-700">{details.request.patientPhone || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Emergency Category</span>
                          <p className="font-bold text-rose-700">{details.request.emergencyCategory}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Operational State</span>
                          <p className="font-bold">{details.request.status}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Ambulance Needed</span>
                          <p className="font-semibold">{details.request.ambulanceRequirement || 'NO'}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Initiated Timestamp</span>
                          <p className="text-slate-600">{new Date(details.request.createdAt).toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Incident Geolocation</span>
                        <p className="font-semibold text-slate-900 mt-0.5">{details.request.location?.address || 'Address not resolved'}</p>
                        <p className="font-mono text-[11px] text-slate-500 mt-0.5">
                          Coordinates: [{details.request.location?.coordinates?.join(', ') || '0, 0'}]
                        </p>
                      </div>

                      {details.fallbackSession && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                          <span className="text-[10px] text-amber-700 font-bold uppercase">Fallback Session Active</span>
                          <p className="font-bold text-slate-900 mt-0.5">Trigger: {details.fallbackSession.triggerReason}</p>
                          <p className="text-[11px] text-slate-600">Current Search Level: {details.fallbackSession.currentSearchLevel} ({details.fallbackSession.currentSearchRadiusKm} km)</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TIMELINE TAB */}
                  {modalActiveSubTab === 'timeline' && (
                    <div className="space-y-3">
                      {!timelineData?.timeline?.length ? (
                        <p className="text-xs text-slate-500 py-4 text-center">No timeline events recorded.</p>
                      ) : (
                        <div className="relative border-l-2 border-brand-200 ml-4 space-y-4 my-2">
                          {timelineData.timeline.map((evt, idx) => (
                            <div key={idx} className="relative pl-6">
                              <div className="absolute -left-2 top-0.5 w-3.5 h-3.5 rounded-full bg-brand-600 border-2 border-white" />
                              <div className="text-xs">
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {new Date(evt.timestamp).toLocaleTimeString()}
                                </span>
                                <h4 className="font-bold text-slate-900">{evt.title}</h4>
                                <p className="text-[11px] text-slate-600 mt-0.5">{evt.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* BROADCASTS TAB */}
                  {modalActiveSubTab === 'broadcasts' && (
                    <div className="space-y-2">
                      {!details.broadcasts?.length ? (
                        <p className="text-xs text-slate-500 py-4 text-center">No broadcasts initiated yet.</p>
                      ) : (
                        details.broadcasts.map((b) => (
                          <div key={b._id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-slate-900">Broadcast ID: {b.broadcastId}</span>
                              <Badge size="xs" variant={b.status === 'COMPLETED' ? 'presence' : 'neutral'}>{b.status}</Badge>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-600 pt-1">
                              <div>Radius: <span className="font-bold text-slate-800">{b.radiusKm} km</span></div>
                              <div>Candidate Hospitals: <span className="font-bold text-slate-800">{b.candidateCount}</span></div>
                              <div>Sent: <span className="text-slate-500">{new Date(b.createdAt).toLocaleTimeString()}</span></div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* RESPONSES TAB */}
                  {modalActiveSubTab === 'responses' && (
                    <div className="space-y-2">
                      {!details.responses?.length ? (
                        <p className="text-xs text-slate-500 py-4 text-center">No organization responses collected.</p>
                      ) : (
                        details.responses.map((resp) => (
                          <div key={resp._id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900">{resp.organizationId?.name || 'Healthcare Facility'}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                resp.responseStatus === 'ACCEPTED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : resp.responseStatus === 'DECLINED'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-slate-200 text-slate-600'
                              }`}>
                                {resp.responseStatus}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500">{resp.organizationId?.address?.city || ''}</p>
                            {resp.rejectionReason && (
                              <p className="text-[11px] text-rose-600 italic">Decline reason: {resp.rejectionReason}</p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* RESERVATION TAB */}
                  {modalActiveSubTab === 'reservation' && (
                    <div className="space-y-3 text-xs">
                      {!details.reservation ? (
                        <p className="text-xs text-slate-500 py-4 text-center">No resource reservation currently created for this incident.</p>
                      ) : (
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">Reservation: {details.reservation.reservationId}</span>
                            <Badge size="xs" variant="primary">{details.reservation.status}</Badge>
                          </div>
                          <p className="text-slate-700">Facility: <span className="font-semibold">{details.reservation.organizationId?.name}</span></p>
                          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1">
                            <div>Reserved At: {new Date(details.reservation.reservedAt).toLocaleTimeString()}</div>
                            <div>Expires At: {new Date(details.reservation.expiresAt).toLocaleTimeString()}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* JOURNEY TAB */}
                  {modalActiveSubTab === 'journey' && (
                    <div className="space-y-3 text-xs">
                      {!details.journey ? (
                        <p className="text-xs text-slate-500 py-4 text-center">No journey commenced.</p>
                      ) : (
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">Journey ID: {details.journey.journeyId}</span>
                            <Badge size="xs" variant={details.journey.status === 'COMPLETED' ? 'presence' : 'warning'}>
                              {details.journey.status}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1">
                            <div>Started: {details.journey.startedAt ? new Date(details.journey.startedAt).toLocaleTimeString() : 'Pending'}</div>
                            <div>Arrived: {details.journey.arrivedAt ? new Date(details.journey.arrivedAt).toLocaleTimeString() : 'In Transit'}</div>
                            <div>Completed: {details.journey.completedAt ? new Date(details.journey.completedAt).toLocaleTimeString() : 'In Progress'}</div>
                            <div>Verification: {details.journey.arrivalVerificationMethod || 'Standard'}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setSelectedReqId(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

