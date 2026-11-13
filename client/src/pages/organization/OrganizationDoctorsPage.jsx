import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  Search,
  Plus,
  Send,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Trash2,
  Building2,
  Stethoscope,
  Briefcase,
  GraduationCap,
} from 'lucide-react';

export const OrganizationDoctorsPage = () => {
  const [affiliations, setAffiliations] = useState([]);
  const [doctorsPresent, setDoctorsPresent] = useState([]);
  const [presenceHistory, setPresenceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'incoming' | 'invitations' | 'present' | 'history'
  const [historyView, setHistoryView] = useState('presence'); // 'presence' | 'affiliations'
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Invite Doctor Modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchDocQuery, setSearchDocQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [department, setDepartment] = useState('General Medicine');
  const [designation, setDesignation] = useState('Consultant');
  const [affiliationType, setAffiliationType] = useState('VISITING');
  const [proposedStartDate, setProposedStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [proposedEndDate, setProposedEndDate] = useState('');
  const [inviteNotes, setInviteNotes] = useState('');
  const [affiliationRequests, setAffiliationRequests] = useState([]);

  // Termination Modal state
  const [terminatingAffiliation, setTerminatingAffiliation] = useState(null);
  const [terminationReason, setTerminationReason] = useState('');

  useEffect(() => {
    fetchAffiliationData();
  }, []);

  const fetchAffiliationData = async () => {
    try {
      setLoading(true);
      const [affRes, reqRes, orgRes, livePresRes, presHistRes] = await Promise.allSettled([
        api.get('/organizations/me/affiliations'),
        api.get('/organizations/me/affiliation-requests'),
        api.get('/organizations/portal/me'),
        api.get('/organizations/me/doctors/presence').catch(() => api.get('/organizations/doctors/presence')),
        api.get('/organizations/me/doctors/presence/history').catch(() => api.get('/organizations/doctors/presence/history')),
      ]);

      if (affRes.status === 'fulfilled' && affRes.value?.data?.success) {
        setAffiliations(affRes.value.data.data || []);
      } else {
        // Fallback to legacy route if needed
        try {
          const fallbackAff = await api.get('/organizations/affiliations');
          if (fallbackAff.data.success) setAffiliations(fallbackAff.data.data || []);
        } catch {}
      }

      if (reqRes.status === 'fulfilled' && reqRes.value?.data?.success) {
        setAffiliationRequests(reqRes.value.data.data || []);
      }

      // Live doctors present on-site from Module 7 API or portal fallback
      if (livePresRes.status === 'fulfilled' && livePresRes.value?.data?.success) {
        const liveData = livePresRes.value.data.data || [];
        setDoctorsPresent(liveData);
      } else if (orgRes.status === 'fulfilled' && orgRes.value?.data?.success) {
        setDoctorsPresent(orgRes.value.data.data?.doctorsPresent || []);
      }

      // Historical presence sessions
      if (presHistRes.status === 'fulfilled' && presHistRes.value?.data?.success) {
        setPresenceHistory(presHistRes.value.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching organization doctor affiliations', err);
      setFeedback({ type: 'error', message: 'Failed to load doctor affiliations.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSearchDoctors = async (query) => {
    setSearchDocQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      setSearching(true);
      const res = await api.get(`/organizations/doctors/search?q=${encodeURIComponent(query.trim())}`);
      if (res.data.success) {
        setSearchResults(res.data.data || []);
      }
    } catch (err) {
      console.error('Error searching doctors', err);
    } finally {
      setSearching(false);
    }
  };

  const handleSendInvitation = async (e) => {
    e.preventDefault();
    if (!selectedDoctor) {
      setFeedback({ type: 'error', message: 'Please select a verified doctor.' });
      return;
    }

    try {
      setActionLoading(true);
      setFeedback({ type: '', message: '' });
      let res;
      try {
        res = await api.post('/organizations/me/affiliation-requests', {
          doctorId: selectedDoctor._id,
          department,
          designation,
          affiliationType,
          proposedStartDate,
          proposedEndDate: proposedEndDate || undefined,
          message: inviteNotes,
        });
      } catch (postErr) {
        // Fallback to legacy invite endpoint if needed
        res = await api.post('/organizations/affiliations/invite', {
          doctorId: selectedDoctor._id,
          department,
          notes: inviteNotes,
        });
      }

      if (res.data.success) {
        setFeedback({ type: 'success', message: res.data.message });
        setShowInviteModal(false);
        setSelectedDoctor(null);
        setSearchDocQuery('');
        setSearchResults([]);
        setInviteNotes('');
        fetchAffiliationData();
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Invitation failed.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveAffiliation = async (affiliationId) => {
    try {
      setActionLoading(true);
      setFeedback({ type: '', message: '' });
      const res = await api.post(`/organizations/affiliations/${affiliationId}/approve`, {
        notes: 'Approved by hospital administration.',
      });
      if (res.data.success) {
        setFeedback({ type: 'success', message: res.data.message });
        fetchAffiliationData();
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Approval failed.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectAffiliation = async (affiliationId, customReason) => {
    const reason = customReason || 'Department credential verification criteria unmet';

    try {
      setActionLoading(true);
      setFeedback({ type: '', message: '' });
      const res = await api.post(`/organizations/affiliations/${affiliationId}/reject`, {
        reason: reason || 'Application rejected by healthcare facility.',
      });
      if (res.data.success) {
        setFeedback({ type: 'success', message: res.data.message });
        fetchAffiliationData();
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Rejection failed.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleInitiateTermination = async (e) => {
    e.preventDefault();
    if (!terminatingAffiliation) return;

    try {
      setActionLoading(true);
      setFeedback({ type: '', message: '' });
      let res;
      try {
        res = await api.post(`/organizations/me/affiliations/${terminatingAffiliation._id}/terminate`, {
          reason: terminationReason,
        });
      } catch {
        res = await api.post(`/organizations/affiliations/${terminatingAffiliation._id}/terminate`, {
          reason: terminationReason,
        });
      }
      if (res.data.success) {
        setFeedback({ type: 'success', message: res.data.message });
        setTerminatingAffiliation(null);
        setTerminationReason('');
        fetchAffiliationData();
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Termination failed.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Filter affiliations according to active tabs
  const activeAffiliations = affiliations.filter(
    (a) => a.status === 'ACTIVE' || a.status === 'approved'
  );

  const incomingRequests = affiliations.filter(
    (a) =>
      (a.status === 'PENDING' || a.status === 'pending') &&
      (a.initiatedBy === 'doctor' || a.doctorAcceptance?.status === 'accepted')
  );

  const sentInvitations = affiliations.filter(
    (a) =>
      (a.status === 'PENDING' || a.status === 'pending') &&
      a.initiatedBy === 'organization' &&
      a.doctorAcceptance?.status === 'pending'
  );

  const historyAffiliations = affiliations.filter(
    (a) =>
      a.status === 'INACTIVE' ||
      a.status === 'REJECTED' ||
      a.status === 'TERMINATION_REQUESTED' ||
      a.status === 'revoked'
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Manage Doctors & Affiliations
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
              Facility Medical Staff
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your hospital's affiliated physicians, review affiliation requests, and send invitations to verified doctors.
          </p>
        </div>

        <button
          onClick={() => {
            setShowInviteModal(true);
            setFeedback({ type: '', message: '' });
          }}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Invite Verified Doctor</span>
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

      {/* Top Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Active Affiliated Doctors</span>
          <span className="text-xl font-black text-emerald-600 mt-0.5 block">{activeAffiliations.length}</span>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Incoming Requests</span>
          <span className="text-xl font-black text-blue-600 mt-0.5 block">{incomingRequests.length}</span>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Invitations Sent</span>
          <span className="text-xl font-black text-amber-500 mt-0.5 block">{sentInvitations.length}</span>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Doctors Present On-Site</span>
          <span className="text-xl font-black text-slate-800 mt-0.5 block">{doctorsPresent.length}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-4 overflow-x-auto">
        {[
          { id: 'active', label: `Active Doctors (${activeAffiliations.length})` },
          { id: 'incoming', label: `Incoming Requests (${incomingRequests.length})` },
          { id: 'invitations', label: `Invitations Sent (${sentInvitations.length})` },
          { id: 'present', label: `Present On-Site (${doctorsPresent.length})` },
          { id: 'history', label: `History (${historyAffiliations.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
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
        <div className="p-12 text-center text-xs text-slate-400">Loading affiliations desk...</div>
      ) : (
        <div>
          {/* 1. ACTIVE AFFILIATED DOCTORS */}
          {activeTab === 'active' && (
            <div className="space-y-4">
              {activeAffiliations.length === 0 ? (
                <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
                  <Users className="w-8 h-8 text-slate-300 mx-auto" />
                  <h3 className="text-sm font-bold text-slate-800">No active affiliated doctors</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Your facility currently has no active affiliated physicians. Invite verified doctors or review incoming requests.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeAffiliations.map((aff) => {
                    const doc = aff.doctorId;
                    return (
                      <div
                        key={aff._id}
                        className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between space-y-4"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start space-x-3.5">
                              <img
                                src={
                                  doc?.userId?.avatar ||
                                  'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80'
                                }
                                alt={doc?.userId?.name}
                                className="w-12 h-12 rounded-xl object-cover border border-slate-100 shrink-0"
                              />
                              <div>
                                <div className="flex items-center space-x-1.5">
                                  <h3 className="font-extrabold text-sm text-slate-900">{doc?.userId?.name}</h3>
                                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                                </div>
                                <p className="text-xs font-semibold text-blue-600">{doc?.specialization}</p>
                                <p className="text-[11px] text-slate-400">
                                  ID: <strong className="text-slate-600 font-mono">{doc?.doctorUniqueId || 'N/A'}</strong>
                                </p>
                              </div>
                            </div>

                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 shrink-0">
                              ACTIVE
                            </span>
                          </div>

                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs space-y-1">
                            <div className="flex justify-between">
                              <span className="text-slate-400 font-semibold">Department:</span>
                              <span className="font-bold text-slate-800">{aff.department || 'General Medicine'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400 font-semibold">Experience:</span>
                              <span className="text-slate-700 font-medium">{doc?.experienceYears ?? 5} years</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400 font-semibold">Qualifications:</span>
                              <span className="text-slate-700 font-medium">{doc?.qualifications?.join(', ') || 'MBBS'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-slate-400 text-[11px]">
                            Affiliated since: {new Date(aff.createdAt).toLocaleDateString()}
                          </span>

                          <button
                            onClick={() => setTerminatingAffiliation(aff)}
                            className="text-xs font-bold text-red-600 hover:text-red-700 cursor-pointer"
                          >
                            Initiate Termination
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 2. INCOMING REQUESTS (FROM DOCTORS) */}
          {activeTab === 'incoming' && (
            <div className="space-y-4">
              {incomingRequests.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-400">
                  No incoming affiliation requests from doctors awaiting review.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {incomingRequests.map((aff) => {
                    const doc = aff.doctorId;
                    return (
                      <div
                        key={aff._id}
                        className="bg-white rounded-2xl p-5 border border-blue-200 shadow-sm space-y-4"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start space-x-3">
                            <img
                              src={
                                doc?.userId?.avatar ||
                                'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80'
                              }
                              alt={doc?.userId?.name}
                              className="w-12 h-12 rounded-xl object-cover border border-slate-100 shrink-0"
                            />
                            <div>
                              <div className="flex items-center space-x-1.5">
                                <h3 className="font-extrabold text-sm text-slate-900">{doc?.userId?.name}</h3>
                                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded border border-emerald-200 font-bold">
                                  Verified Doctor
                                </span>
                              </div>
                              <p className="text-xs font-semibold text-blue-600">{doc?.specialization}</p>
                              <p className="text-[11px] text-slate-500">
                                {doc?.experienceYears ?? 5} yrs exp &bull; {doc?.qualifications?.join(', ') || 'MBBS'}
                              </p>
                            </div>
                          </div>

                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-800">
                            PENDING REVIEW
                          </span>
                        </div>

                        {aff.doctorAcceptance?.notes && (
                          <div className="p-2.5 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-100">
                            <strong>Doctor's Note:</strong> {aff.doctorAcceptance.notes}
                          </div>
                        )}

                        <div className="pt-2 border-t border-slate-100 flex items-center space-x-2">
                          <button
                            onClick={() => handleApproveAffiliation(aff._id)}
                            disabled={actionLoading}
                            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
                          >
                            Approve Affiliation
                          </button>
                          <button
                            onClick={() => handleRejectAffiliation(aff._id)}
                            disabled={actionLoading}
                            className="py-2 px-3 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 font-bold text-xs uppercase rounded-xl border border-slate-200 transition-colors cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 3. SENT INVITATIONS */}
          {activeTab === 'invitations' && (
            <div className="space-y-4">
              {sentInvitations.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-400">
                  No pending invitations sent to doctors.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sentInvitations.map((aff) => {
                    const doc = aff.doctorId;
                    return (
                      <div
                        key={aff._id}
                        className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-bold text-sm text-slate-900">{doc?.userId?.name}</h3>
                            <p className="text-xs text-blue-600 font-semibold">{doc?.specialization}</p>
                            <p className="text-[11px] text-slate-400">Department: {aff.department}</p>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200">
                            AWAITING DOCTOR ACCEPTANCE
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-400">
                          Invitation sent on: {new Date(aff.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 4. DOCTORS PRESENT ON-SITE (REAL-TIME QR ATTENDANCE) */}
          {activeTab === 'present' && (
            <div className="space-y-4">
              {doctorsPresent.length === 0 ? (
                <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
                  <Users className="w-8 h-8 text-slate-300 mx-auto" />
                  <h3 className="text-sm font-bold text-slate-800">No doctors currently checked in</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Affiliated doctors scan your facility QR code upon arrival to register their actual on-site presence.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {doctorsPresent.map((item, idx) => {
                    const doc = item.doctor || item;
                    const department = item.department || doc.specialization;
                    const checkInAt = item.checkInAt || doc.currentPresence?.checkedInAt;
                    const isEmergency = item.isAvailableForEmergency ?? doc.isAvailableForEmergency;
                    const method = item.checkInMethod || 'QR_SCAN';

                    return (
                      <div
                        key={doc._id || idx}
                        className="p-5 bg-white rounded-2xl border border-emerald-200/80 shadow-xs flex items-start space-x-3.5"
                      >
                        <img
                          src={
                            doc.userId?.avatar ||
                            'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80'
                          }
                          alt={doc.userId?.name}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-100 shrink-0"
                        />
                        <div className="space-y-1 w-full">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1.5">
                              <h3 className="text-sm font-bold text-slate-900">{doc.userId?.name || 'Physician'}</h3>
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            </div>
                            <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                              {method}
                            </span>
                          </div>

                          <p className="text-xs font-semibold text-blue-600">{doc.specialization} &bull; {department}</p>
                          
                          {checkInAt && (
                            <p className="text-[11px] text-slate-500">
                              Checked in: <strong className="text-slate-700">{new Date(checkInAt).toLocaleTimeString()}</strong>
                            </p>
                          )}

                          <div className="flex items-center space-x-2 pt-1 text-[11px]">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                              PRESENT ON-SITE
                            </span>
                            {isEmergency && (
                              <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">
                                EMERGENCY DUTY
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 5. HISTORY (PRESENCE AUDIT LOGS & AFFILIATION LIFECYCLE) */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              {/* History Sub-tabs */}
              <div className="flex gap-2 pb-2 border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => setHistoryView('presence')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    historyView === 'presence'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  On-Site Presence Logs ({presenceHistory.length})
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryView('affiliations')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    historyView === 'affiliations'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Affiliation History ({historyAffiliations.length})
                </button>
              </div>

              {historyView === 'presence' && (
                <div className="space-y-3">
                  {presenceHistory.length === 0 ? (
                    <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-400">
                      No on-site presence attendance logs recorded yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100">
                          <tr>
                            <th className="p-2.5">Doctor</th>
                            <th className="p-2.5">Check-In Time</th>
                            <th className="p-2.5">Check-Out Time</th>
                            <th className="p-2.5">Duration</th>
                            <th className="p-2.5">Method</th>
                            <th className="p-2.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {presenceHistory.map((log) => {
                            const checkInTime = log.checkInAt ? new Date(log.checkInAt) : log.timestamp ? new Date(log.timestamp) : null;
                            const checkOutTime = log.checkOutAt ? new Date(log.checkOutAt) : null;
                            const duration = log.durationMinutes ? `${log.durationMinutes} min` : checkOutTime && checkInTime ? `${Math.round((checkOutTime - checkInTime) / 60000)} min` : 'In progress';
                            const status = log.status || (log.checkOutAt ? 'CHECKED_OUT' : 'CHECKED_IN');

                            return (
                              <tr key={log._id} className="hover:bg-slate-50/70">
                                <td className="p-2.5">
                                  <span className="font-bold text-slate-900 block">{log.doctorId?.userId?.name || 'Physician'}</span>
                                  <span className="text-[10px] text-slate-500">{log.doctorId?.specialization || 'Consultant'}</span>
                                </td>
                                <td className="p-2.5 text-slate-600">
                                  {checkInTime ? checkInTime.toLocaleString() : 'N/A'}
                                </td>
                                <td className="p-2.5 text-slate-600">
                                  {checkOutTime ? checkOutTime.toLocaleString() : <span className="text-emerald-600 font-bold">Active On-Site</span>}
                                </td>
                                <td className="p-2.5 font-mono text-slate-700">
                                  {duration}
                                </td>
                                <td className="p-2.5">
                                  <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                    {log.checkInMethod || log.method || 'QR_SCAN'}
                                  </span>
                                </td>
                                <td className="p-2.5">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    status === 'CHECKED_IN' ? 'bg-emerald-100 text-emerald-800' :
                                    status === 'MANUAL_CORRECTED' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {historyView === 'affiliations' && (
                <div className="space-y-3">
                  {historyAffiliations.length === 0 ? (
                    <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-400">
                      No historical affiliation logs.
                    </div>
                  ) : (
                    historyAffiliations.map((aff) => {
                      const doc = aff.doctorId;
                      return (
                        <div
                          key={aff._id}
                          className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-bold text-slate-800">{doc?.userId?.name || 'Doctor'}</h4>
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
                              ID: {aff.affiliationId} &bull; {doc?.specialization} &bull; Logged on{' '}
                              {new Date(aff.updatedAt).toLocaleDateString()}
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
        </div>
      )}

      {/* ================= MODAL: INVITE VERIFIED DOCTOR ================= */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 border border-slate-200 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-black text-slate-900">Invite Verified Doctor to Affiliate</h2>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendInvitation} className="space-y-4">
              {/* Doctor Search */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Search Approved Doctors</label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by specialization or name..."
                    value={searchDocQuery}
                    onChange={(e) => handleSearchDoctors(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>
              </div>

              {/* Live Search Results */}
              {searching ? (
                <div className="p-3 text-center text-xs text-slate-400">Searching verified doctors...</div>
              ) : searchResults.length > 0 ? (
                <div className="max-h-40 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-2 bg-slate-50/50">
                  {searchResults.map((doc) => {
                    const isSelected = selectedDoctor?._id === doc._id;
                    return (
                      <div
                        key={doc._id}
                        onClick={() => setSelectedDoctor(doc)}
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-blue-50 border-blue-400 font-bold text-blue-900'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <p className="font-bold text-slate-900">{doc.userId?.name}</p>
                          <p className="text-[11px] text-slate-500">
                            {doc.specialization} &bull; ID: {doc.doctorUniqueId || 'Verified'}
                          </p>
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                      </div>
                    );
                  })}
                </div>
              ) : searchDocQuery.trim() ? (
                <p className="text-xs text-slate-400 italic">No verified doctors found matching query.</p>
              ) : null}

              {selectedDoctor && (
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs space-y-1">
                  <span className="text-[10px] uppercase font-bold text-blue-700">Selected Physician</span>
                  <p className="font-extrabold text-blue-950">{selectedDoctor.userId?.name}</p>
                  <p className="text-[11px] text-blue-800">
                    {selectedDoctor.specialization} &bull; {selectedDoctor.experienceYears ?? 5} years experience
                  </p>
                </div>
              )}

              {/* Department & Designation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Hospital Department</label>
                  <input
                    type="text"
                    required
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g., Cardiology OPD, Trauma Center"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Designation / Clinical Role</label>
                  <input
                    type="text"
                    required
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g., Senior Consultant, Specialist"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Affiliation Type & Proposed Start/End Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Affiliation Type</label>
                  <select
                    value={affiliationType}
                    onChange={(e) => setAffiliationType(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    <option value="VISITING">Visiting Specialist</option>
                    <option value="FULL_TIME">Full Time</option>
                    <option value="PART_TIME">Part Time</option>
                    <option value="CONSULTANT">Consultant</option>
                    <option value="HONORARY">Honorary</option>
                    <option value="RESIDENT">Resident</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Proposed Start</label>
                  <input
                    type="date"
                    required
                    value={proposedStartDate}
                    onChange={(e) => setProposedStartDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Proposed End (Opt)</label>
                  <input
                    type="date"
                    value={proposedEndDate}
                    onChange={(e) => setProposedEndDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Invitation Message</label>
                <textarea
                  rows={2}
                  value={inviteNotes}
                  onChange={(e) => setInviteNotes(e.target.value)}
                  placeholder="Offer details, clinic hours or invitation message to the physician..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !selectedDoctor}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: INITIATE TERMINATION ================= */}
      {terminatingAffiliation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-scale-up">
            <h2 className="text-base font-black text-slate-900">Initiate Affiliation Termination</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Are you sure you want to initiate termination of affiliation with{' '}
              <strong>{terminatingAffiliation.doctorId?.userId?.name || 'this doctor'}</strong>?
            </p>

            <form onSubmit={handleInitiateTermination} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Reason for Termination</label>
                <textarea
                  required
                  rows={2}
                  value={terminationReason}
                  onChange={(e) => setTerminationReason(e.target.value)}
                  placeholder="e.g., Staffing reallocation, contract conclusion, schedule change..."
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
                  {actionLoading ? 'Submitting...' : 'Confirm Termination'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizationDoctorsPage;
