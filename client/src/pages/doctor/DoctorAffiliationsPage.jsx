import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  Building2,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Search,
  Plus,
  Send,
  ShieldCheck,
  MapPin,
  Calendar,
  AlertCircle,
  ArrowRight,
  FileText,
  Trash2,
  RefreshCw,
} from 'lucide-react';

export const DoctorAffiliationsPage = () => {
  const [affiliations, setAffiliations] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'invitations' | 'pending' | 'history'
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Search & Request Modal state
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [searchOrgQuery, setSearchOrgQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [department, setDepartment] = useState('General Medicine');
  const [requestNotes, setRequestNotes] = useState('');

  // Termination Modal state
  const [terminatingAffiliation, setTerminatingAffiliation] = useState(null);
  const [terminationReason, setTerminationReason] = useState('');

  useEffect(() => {
    fetchAffiliations();
  }, []);

  const fetchAffiliations = async () => {
    try {
      setLoading(true);
      const [affRes, reqRes] = await Promise.allSettled([
        api.get('/doctors/me/affiliations'),
        api.get('/doctors/me/affiliation-requests'),
      ]);

      if (affRes.status === 'fulfilled' && affRes.value?.data?.success) {
        setAffiliations(affRes.value.data.data || []);
      }
      if (reqRes.status === 'fulfilled' && reqRes.value?.data?.success) {
        setIncomingRequests(reqRes.value.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching doctor affiliations', err);
      setFeedback({ type: 'error', message: 'Failed to load affiliations.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSearchOrgs = async (query = '') => {
    setSearchOrgQuery(query);
    try {
      setSearching(true);
      const res = await api.get(`/doctors/organizations/search?q=${encodeURIComponent(query.trim())}`);
      if (res.data.success) {
        setSearchResults(res.data.data || []);
      }
    } catch (err) {
      console.error('Error searching organizations', err);
    } finally {
      setSearching(false);
    }
  };

  const openRequestModal = () => {
    setShowRequestModal(true);
    setSelectedOrg(null);
    setSearchOrgQuery('');
    setFeedback({ type: '', message: '' });
    handleSearchOrgs('');
  };

  const handleSendAffiliationRequest = async (e) => {
    e.preventDefault();
    if (!selectedOrg) {
      setFeedback({ type: 'error', message: 'Please select an organization.' });
      return;
    }

    try {
      setActionLoading(true);
      setFeedback({ type: '', message: '' });
      const res = await api.post('/doctors/affiliations', {
        organizationId: selectedOrg._id,
        department,
        notes: requestNotes,
      });

      if (res.data.success) {
        setFeedback({ type: 'success', message: res.data.message });
        setShowRequestModal(false);
        setSelectedOrg(null);
        setSearchOrgQuery('');
        setSearchResults([]);
        setRequestNotes('');
        fetchAffiliations();
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Request failed.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptInvitation = async (invitationId, isReq = false) => {
    try {
      setActionLoading(true);
      setFeedback({ type: '', message: '' });
      let res;
      if (isReq) {
        res = await api.post(`/doctors/me/affiliation-requests/${invitationId}/accept`, {
          message: 'Invitation accepted by doctor.',
        });
      } else {
        try {
          res = await api.post(`/doctors/me/affiliation-requests/${invitationId}/accept`, {
            message: 'Invitation accepted by doctor.',
          });
        } catch {
          res = await api.post(`/doctors/affiliations/${invitationId}/accept`, {
            notes: 'Invitation accepted by doctor.',
          });
        }
      }
      if (res.data.success) {
        setFeedback({ type: 'success', message: res.data.message });
        fetchAffiliations();
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Error accepting invitation.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineInvitation = async (invitationId, isReq = false, declineReason) => {
    const reason = declineReason || 'Schedule capacity constraints at selected facility';

    try {
      setActionLoading(true);
      setFeedback({ type: '', message: '' });
      let res;
      if (isReq) {
        res = await api.post(`/doctors/me/affiliation-requests/${invitationId}/reject`, {
          reason: reason || 'Declined by doctor',
        });
      } else {
        try {
          res = await api.post(`/doctors/me/affiliation-requests/${invitationId}/reject`, {
            reason: reason || 'Declined by doctor',
          });
        } catch {
          res = await api.post(`/doctors/affiliations/${invitationId}/decline`, {
            reason: reason || 'Declined by doctor',
          });
        }
      }
      if (res.data.success) {
        setFeedback({ type: 'success', message: res.data.message });
        fetchAffiliations();
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Error declining invitation.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestTermination = async (e) => {
    e.preventDefault();
    if (!terminatingAffiliation) return;

    try {
      setActionLoading(true);
      setFeedback({ type: '', message: '' });
      const res = await api.post(`/doctors/me/affiliations/${terminatingAffiliation._id}/terminate`, {
        reason: terminationReason,
      });
      if (res.data.success) {
        setFeedback({ type: 'success', message: res.data.message });
        setTerminatingAffiliation(null);
        setTerminationReason('');
        fetchAffiliations();
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to request termination.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Filter affiliations according to active tabs
  const activeAffiliations = affiliations.filter(
    (a) => a.status === 'ACTIVE' || a.status === 'approved'
  );

  const pendingIncomingReqs = incomingRequests
    .filter((r) => r.status === 'PENDING')
    .map((r) => ({ ...r, isRequest: true }));

  const legacyIncoming = affiliations.filter(
    (a) =>
      (a.status === 'PENDING' || a.status === 'pending') &&
      a.initiatedBy === 'organization' &&
      a.doctorAcceptance?.status === 'pending'
  );

  const incomingInvitations = [...pendingIncomingReqs, ...legacyIncoming];

  const pendingRequests = affiliations.filter(
    (a) =>
      (a.status === 'PENDING' || a.status === 'pending') &&
      (a.initiatedBy === 'doctor' || a.doctorAcceptance?.status === 'accepted')
  );

  const historyAffiliations = [
    ...affiliations.filter(
      (a) =>
        a.status === 'INACTIVE' ||
        a.status === 'REJECTED' ||
        a.status === 'TERMINATION_REQUESTED' ||
        a.status === 'TERMINATED' ||
        a.status === 'revoked'
    ),
    ...incomingRequests
      .filter((r) => r.status === 'REJECTED' || r.status === 'CANCELLED')
      .map((r) => ({ ...r, isRequest: true })),
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Hospital & Clinic Affiliations
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-800 border border-blue-200">
              Many-to-Many Multi-Facility
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your verified associations across hospitals and clinics. Active affiliations are required for QR check-in and patient appointments.
          </p>
        </div>

        <button
          onClick={openRequestModal}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Request New Affiliation</span>
        </button>
      </div>

      {/* Feedback Alert */}
      {feedback.message && (
        <div
          className={`p-4 rounded-xl text-xs font-bold flex items-center space-x-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Active Affiliations</span>
          <span className="text-xl font-black text-emerald-600 mt-0.5 block">{activeAffiliations.length}</span>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Invitations Received</span>
          <span className="text-xl font-black text-amber-500 mt-0.5 block">{incomingInvitations.length}</span>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Pending Requests</span>
          <span className="text-xl font-black text-blue-600 mt-0.5 block">{pendingRequests.length}</span>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Terminated / Past</span>
          <span className="text-xl font-black text-slate-600 mt-0.5 block">{historyAffiliations.length}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-4">
        {[
          { id: 'active', label: `Active (${activeAffiliations.length})` },
          { id: 'invitations', label: `Invitations (${incomingInvitations.length})` },
          { id: 'pending', label: `Requests Sent (${pendingRequests.length})` },
          { id: 'history', label: `History (${historyAffiliations.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 text-xs font-bold transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading affiliations...</div>
      ) : (
        <div>
          {/* 1. ACTIVE AFFILIATIONS */}
          {activeTab === 'active' && (
            <div className="space-y-4">
              {activeAffiliations.length === 0 ? (
                <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
                  <Building2 className="w-8 h-8 text-slate-300 mx-auto" />
                  <h3 className="text-sm font-bold text-slate-800">No active affiliations</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    You are not currently affiliated with any verified hospital or clinic. Use the button above to request affiliation.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeAffiliations.map((aff) => {
                    const org = aff.organizationId;
                    return (
                      <div
                        key={aff._id}
                        className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between space-y-4"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start space-x-3">
                              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
                                <Building2 className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="flex items-center space-x-1.5">
                                  <h3 className="font-extrabold text-sm text-slate-900">{org?.name}</h3>
                                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                                </div>
                                <p className="text-xs text-slate-500 flex items-center mt-0.5">
                                  <MapPin className="w-3 h-3 mr-1 text-slate-400 shrink-0" />
                                  <span>{org?.address?.city || 'Local Area'}</span>
                                  <span className="mx-1 text-slate-300">&bull;</span>
                                  <span className="capitalize">{org?.orgType || 'Hospital'}</span>
                                </p>
                              </div>
                            </div>

                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                              ACTIVE
                            </span>
                          </div>

                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs space-y-1">
                            <div className="flex justify-between">
                              <span className="text-slate-400 font-semibold">Affiliation ID:</span>
                              <span className="font-mono text-slate-700">{aff.affiliationId || 'AFF-001'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400 font-semibold">Department:</span>
                              <span className="font-bold text-slate-800">{aff.department || 'General Medicine'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400 font-semibold">QR Check-in Code:</span>
                              <span className="font-mono text-blue-600 font-bold">{org?.qrCheckinCode || 'N/A'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-slate-400 text-[11px]">
                            Since: {new Date(aff.createdAt).toLocaleDateString()}
                          </span>

                          <button
                            onClick={() => setTerminatingAffiliation(aff)}
                            className="text-xs font-bold text-red-600 hover:text-red-700 cursor-pointer"
                          >
                            Request Termination
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 2. INCOMING INVITATIONS */}
          {activeTab === 'invitations' && (
            <div className="space-y-4">
              {incomingInvitations.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-400">
                  No pending invitations from healthcare organizations.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {incomingInvitations.map((aff) => {
                    const org = aff.organizationId;
                    return (
                      <div
                        key={aff._id}
                        className="bg-white rounded-2xl p-5 border border-amber-300 ring-2 ring-amber-300/20 shadow-xs space-y-4"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start space-x-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
                              <Building2 className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="font-extrabold text-sm text-slate-900">{org?.name || org?.legalName}</h3>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Sent an affiliation invitation &bull; {org?.address?.city || 'Healthcare Center'}
                                {org?.uniqueOrganizationCode && (
                                  <span className="ml-1.5 font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                                    {org.uniqueOrganizationCode}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>

                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 animate-pulse">
                            INVITATION
                          </span>
                        </div>

                        {/* Proposed Details */}
                        <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <div>
                            <span className="text-slate-400 block font-semibold uppercase text-[9px]">Department</span>
                            <span className="font-bold text-slate-800">{aff.department || 'General Medicine'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-semibold uppercase text-[9px]">Designation</span>
                            <span className="font-bold text-slate-800">{aff.designation || 'Consultant'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-semibold uppercase text-[9px]">Type</span>
                            <span className="font-bold text-slate-800">{aff.affiliationType || 'VISITING'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-semibold uppercase text-[9px]">Start Date</span>
                            <span className="font-bold text-slate-800">
                              {aff.proposedStartDate ? new Date(aff.proposedStartDate).toLocaleDateString() : 'Immediate'}
                            </span>
                          </div>
                        </div>

                        {(aff.message || aff.doctorAcceptance?.notes) && (
                          <div className="p-2.5 bg-blue-50/60 rounded-xl text-xs text-blue-900 border border-blue-100">
                            <strong>Message:</strong> {aff.message || aff.doctorAcceptance?.notes}
                          </div>
                        )}

                        <div className="pt-2 border-t border-slate-100 flex items-center space-x-2">
                          <button
                            onClick={() => handleAcceptInvitation(aff._id, aff.isRequest)}
                            disabled={actionLoading}
                            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
                          >
                            Accept Affiliation
                          </button>
                          <button
                            onClick={() => handleDeclineInvitation(aff._id, aff.isRequest)}
                            disabled={actionLoading}
                            className="py-2 px-3 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 font-bold text-xs uppercase rounded-xl border border-slate-200 transition-colors cursor-pointer"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 3. REQUESTS SENT (PENDING ORG APPROVAL) */}
          {activeTab === 'pending' && (
            <div className="space-y-4">
              {pendingRequests.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-400">
                  No affiliation requests currently pending approval.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingRequests.map((aff) => {
                    const org = aff.organizationId;
                    return (
                      <div
                        key={aff._id}
                        className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-bold text-sm text-slate-900">{org?.name}</h3>
                            <p className="text-xs text-slate-500 mt-0.5">{org?.address?.city || 'Local Facility'}</p>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                            AWAITING ORG APPROVAL
                          </span>
                        </div>

                        <p className="text-xs text-slate-600">
                          <strong>Department:</strong> {aff.department || 'General Medicine'}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Submitted on: {new Date(aff.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 4. HISTORY / TERMINATED */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {historyAffiliations.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-400">
                  No past or terminated affiliations in audit history.
                </div>
              ) : (
                historyAffiliations.map((aff) => {
                  const org = aff.organizationId;
                  return (
                    <div
                      key={aff._id}
                      className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-bold text-slate-800">{org?.name}</h4>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                              aff.status === 'TERMINATION_REQUESTED'
                                ? 'bg-amber-100 text-amber-800'
                                : aff.status === 'REJECTED'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {aff.status}
                          </span>
                        </div>
                        <p className="text-slate-400 text-[11px] mt-0.5">
                          ID: {aff.affiliationId} &bull; Requested on {new Date(aff.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      {aff.rejectionReason && (
                        <p className="text-red-600 text-[11px] max-w-xs truncate">
                          Reason: {aff.rejectionReason}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* ================= MODAL: REQUEST NEW AFFILIATION ================= */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 border border-slate-200 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-black text-slate-900">Request Affiliation with Organization</h2>
              <button
                onClick={() => setShowRequestModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendAffiliationRequest} className="space-y-4">
              {/* Organization Search */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Search Verified Organization</label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by hospital name or city..."
                    value={searchOrgQuery}
                    onChange={(e) => handleSearchOrgs(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>
              </div>

              {/* Live Search Results */}
              {searching ? (
                <div className="p-3 text-center text-xs text-slate-400">Searching verified facilities...</div>
              ) : searchResults.length > 0 ? (
                <div className="max-h-40 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-2 bg-slate-50/50">
                  {searchResults.map((org) => {
                    const isSelected = selectedOrg?._id === org._id;
                    return (
                      <div
                        key={org._id}
                        onClick={() => setSelectedOrg(org)}
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-blue-50 border-blue-400 font-bold text-blue-900'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <p className="font-bold text-slate-900">{org.name}</p>
                          <p className="text-[11px] text-slate-500">{org.operatingAddress?.city || org.address?.city || 'Healthcare Site'} &bull; {org.orgType}</p>
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                      </div>
                    );
                  })}
                </div>
              ) : searchOrgQuery.trim() ? (
                <p className="text-xs text-slate-400 italic">No organizations found matching query.</p>
              ) : null}

              {selectedOrg && (
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs space-y-1">
                  <span className="text-[10px] uppercase font-bold text-blue-700">Selected Facility</span>
                  <p className="font-extrabold text-blue-950">{selectedOrg.name}</p>
                  <p className="text-[11px] text-blue-800">{selectedOrg.address?.street}, {selectedOrg.address?.city}</p>
                </div>
              )}

              {/* Department */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Department / Practice Field</label>
                <input
                  type="text"
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g., Cardiology, Emergency Medicine, Surgery"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Cover Note (Optional)</label>
                <textarea
                  rows={2}
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                  placeholder="Introduce your medical credentials, availability or proposed practice schedule..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !selectedOrg}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: TERMINATION REQUEST ================= */}
      {terminatingAffiliation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-scale-up">
            <h2 className="text-base font-black text-slate-900">Request Affiliation Termination</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Are you sure you want to initiate termination of your affiliation with{' '}
              <strong>{terminatingAffiliation.organizationId?.name}</strong>?
            </p>

            <form onSubmit={handleRequestTermination} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Reason for Termination</label>
                <textarea
                  required
                  rows={2}
                  value={terminationReason}
                  onChange={(e) => setTerminationReason(e.target.value)}
                  placeholder="e.g., Relocation, schedule adjustment, contract completion..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setTerminatingAffiliation(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? 'Submitting...' : 'Confirm Termination Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorAffiliationsPage;
