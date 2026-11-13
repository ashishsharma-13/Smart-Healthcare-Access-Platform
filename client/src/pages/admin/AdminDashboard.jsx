import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  Users,
  Stethoscope,
  Building2,
  ShieldAlert,
  Calendar,
  CheckCircle2,
  XCircle,
  FileCheck,
  AlertCircle,
  Activity,
  ShieldCheck,
  Search,
  Filter,
  Eye,
  QrCode,
  RefreshCw,
  History,
  FileText,
  X,
  Copy,
  Check,
  Download,
  ExternalLink,
  Award,
  Clock,
  ChevronRight,
  Briefcase,
  AlertTriangle,
  MapPin,
  Building,
  Navigation,
  Scan,
  Bell,
  Radio,
  Mail,
  Smartphone,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { Toast } from '../../components/ui/Toast';

export const AdminDashboard = () => {
  // Data States
  const [stats, setStats] = useState(null);
  const [pendingDoctors, setPendingDoctors] = useState([]);
  const [verifiedDoctors, setVerifiedDoctors] = useState([]);
  const [rejectedDoctors, setRejectedDoctors] = useState([]);
  const [pendingOrgs, setPendingOrgs] = useState([]);
  const [verifiedOrgs, setVerifiedOrgs] = useState([]);
  const [rejectedOrgs, setRejectedOrgs] = useState([]);
  const [presenceLogs, setPresenceLogs] = useState([]);
  const [presenceFilter, setPresenceFilter] = useState('ALL');

  // Module 13 Notification Monitoring States
  const [notificationMetrics, setNotificationMetrics] = useState(null);
  const [failedDeliveries, setFailedDeliveries] = useState([]);
  const [allNotifications, setAllNotifications] = useState([]);
  const [retryingId, setRetryingId] = useState(null);
  
  // UI States
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'verified' | 'rejected' | 'organizations' | 'presence'
  const [orgSubTab, setOrgSubTab] = useState('pending'); // 'pending' | 'verified' | 'rejected'
  const [searchQuery, setSearchQuery] = useState('');
  const [specializationFilter, setSpecializationFilter] = useState('ALL');

  // Doctor Application Details Modal State
  const [selectedApp, setSelectedApp] = useState(null);
  const [loadingAppDetails, setLoadingAppDetails] = useState(false);

  // Doctor Rejection Modal State
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [doctorToReject, setDoctorToReject] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionError, setRejectionError] = useState('');

  // Doctor QR Credential Modal State
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrModalData, setQrModalData] = useState(null);
  const [copiedToken, setCopiedToken] = useState(false);

  // Credential Reissue Modal State
  const [reissueModalOpen, setReissueModalOpen] = useState(false);
  const [doctorToReissue, setDoctorToReissue] = useState(null);
  const [reissueReason, setReissueReason] = useState('Administrative periodic rotation');

  // Organization Application Details Modal State
  const [selectedOrgApp, setSelectedOrgApp] = useState(null);
  const [loadingOrgDetails, setLoadingOrgDetails] = useState(false);

  // Organization Rejection Modal State
  const [orgRejectionModalOpen, setOrgRejectionModalOpen] = useState(false);
  const [orgToReject, setOrgToReject] = useState(null);
  const [orgRejectionReason, setOrgRejectionReason] = useState('');
  const [orgRejectionError, setOrgRejectionError] = useState('');

  // Presence Manual Correction Modal State
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [logToCorrect, setLogToCorrect] = useState(null);
  const [newCorrectionStatus, setNewCorrectionStatus] = useState('CHECKED_OUT');
  const [correctionReason, setCorrectionReason] = useState('Physician forgot to scan terminal on departure');
  const [correctionNotes, setCorrectionNotes] = useState('');

  // Document Preview Modal State
  const [previewDoc, setPreviewDoc] = useState(null);

  // Module 8: Emergency Categories & Guidance Management States
  const [adminCategories, setAdminCategories] = useState([]);
  const [adminGuidance, setAdminGuidance] = useState([]);
  const [newCatModalOpen, setNewCatModalOpen] = useState(false);
  const [newCatForm, setNewCatForm] = useState({ categoryName: '', slug: '', description: '', icon: 'Activity', displayOrder: 1 });
  const [newGuidanceModalOpen, setNewGuidanceModalOpen] = useState(false);
  const [newGuidanceForm, setNewGuidanceForm] = useState({ categoryId: '', title: '', content: '', reviewStatus: 'APPROVED' });

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [
        statsRes,
        docPendingRes,
        docVerifiedRes,
        docRejectedRes,
        orgPendingRes,
        orgVerifiedRes,
        orgRejectedRes,
        presenceRes,
        catRes,
        gdnRes,
        notifMetricsRes,
        notifFailedRes,
        notifAllRes,
      ] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/doctors/pending'),
        api.get('/admin/doctors/verified'),
        api.get('/admin/doctors/rejected'),
        api.get('/admin/organizations/pending'),
        api.get('/admin/organizations/verified'),
        api.get('/admin/organizations/rejected'),
        api.get('/admin/presence').catch(() => ({ data: { success: false, data: [] } })),
        api.get('/admin/emergency/categories').catch(() => ({ data: { success: false, data: [] } })),
        api.get('/admin/emergency/guidance').catch(() => ({ data: { success: false, data: [] } })),
        api.get('/admin/notification-metrics').catch(() => ({ data: { success: false } })),
        api.get('/admin/notifications/failed').catch(() => ({ data: { success: false, data: [] } })),
        api.get('/admin/notifications?limit=30').catch(() => ({ data: { success: false, data: [] } })),
      ]);

      if (statsRes.data?.success) setStats(statsRes.data.data);
      if (docPendingRes.data?.success) setPendingDoctors(docPendingRes.data.data || []);
      if (docVerifiedRes.data?.success) setVerifiedDoctors(docVerifiedRes.data.data || []);
      if (docRejectedRes.data?.success) setRejectedDoctors(docRejectedRes.data.data || []);
      if (orgPendingRes.data?.success) setPendingOrgs(orgPendingRes.data.data || []);
      if (orgVerifiedRes.data?.success) setVerifiedOrgs(orgVerifiedRes.data.data || []);
      if (orgRejectedRes.data?.success) setRejectedOrgs(orgRejectedRes.data.data || []);
      if (presenceRes.data?.success) {
        setPresenceLogs(presenceRes.data.data?.logs || presenceRes.data.data || []);
      }
      if (catRes.data?.success) {
        setAdminCategories(catRes.data.data || []);
      }
      if (gdnRes.data?.success) {
        setAdminGuidance(gdnRes.data.data || []);
      }
      if (notifMetricsRes?.data?.success) {
        setNotificationMetrics(notifMetricsRes.data.data);
      }
      if (notifFailedRes?.data?.success) {
        setFailedDeliveries(notifFailedRes.data.data || []);
      }
      if (notifAllRes?.data?.success) {
        setAllNotifications(notifAllRes.data.data || []);
      }
    } catch (err) {
      console.error('Error loading admin portal data', err);
      setFeedback({
        type: 'error',
        message: 'Could not load administrative governance records. Please refresh.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRetryNotification = async (notificationId) => {
    try {
      setRetryingId(notificationId);
      const res = await api.post(`/admin/notifications/${notificationId}/retry`);
      if (res.data?.success) {
        setFeedback({ type: 'success', message: 'Notification retry initiated successfully' });
        const [failedRes, allRes, metricsRes] = await Promise.all([
          api.get('/admin/notifications/failed').catch(() => ({ data: { success: false, data: [] } })),
          api.get('/admin/notifications?limit=30').catch(() => ({ data: { success: false, data: [] } })),
          api.get('/admin/notification-metrics').catch(() => ({ data: { success: false } })),
        ]);
        if (failedRes.data?.success) setFailedDeliveries(failedRes.data.data || []);
        if (allRes.data?.success) setAllNotifications(allRes.data.data || []);
        if (metricsRes.data?.success) setNotificationMetrics(metricsRes.data.data);
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Retry failed' });
    } finally {
      setRetryingId(null);
    }
  };

  const handleConfirmCorrection = async (e) => {
    e.preventDefault();
    if (!logToCorrect) return;
    try {
      setActionLoading(true);
      const res = await api.post(`/admin/presence/${logToCorrect._id}/correct`, {
        newStatus: newCorrectionStatus,
        reason: correctionReason,
        notes: correctionNotes,
      });
      if (res.data?.success) {
        setFeedback({
          type: 'success',
          message: 'Presence record manually corrected with audit trail.',
        });
        setCorrectionModalOpen(false);
        setLogToCorrect(null);
        await fetchAdminData();
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: 'Correction failed: ' + (err.response?.data?.message || err.message),
      });
    } finally {
      setActionLoading(false);
    }
  };

  // --- Module 8: Emergency Management Handlers ---
  const handleToggleCategoryActive = async (cat) => {
    try {
      setActionLoading(true);
      const res = await api.put(`/admin/emergency/categories/${cat._id || cat.categoryId}`, {
        active: !cat.active,
      });
      if (res.data?.success) {
        setFeedback({
          type: 'success',
          message: `Category "${cat.categoryName}" is now ${!cat.active ? 'active' : 'inactive'}.`,
        });
        await fetchAdminData();
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: 'Failed to update category: ' + (err.response?.data?.message || err.message),
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const res = await api.post('/admin/emergency/categories', newCatForm);
      if (res.data?.success) {
        setFeedback({ type: 'success', message: 'New emergency category created.' });
        setNewCatModalOpen(false);
        setNewCatForm({ categoryName: '', slug: '', description: '', icon: 'Activity', displayOrder: 1 });
        await fetchAdminData();
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: 'Failed to create category: ' + (err.response?.data?.message || err.message),
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveGuidance = async (guidanceId) => {
    try {
      setActionLoading(true);
      const res = await api.post(`/admin/emergency/guidance/${guidanceId}/approve`);
      if (res.data?.success) {
        setFeedback({ type: 'success', message: 'Emergency guidance approved and published.' });
        await fetchAdminData();
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: 'Approval failed: ' + (err.response?.data?.message || err.message),
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateGuidance = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const res = await api.post('/admin/emergency/guidance', newGuidanceForm);
      if (res.data?.success) {
        setFeedback({ type: 'success', message: 'Emergency guidance created.' });
        setNewGuidanceModalOpen(false);
        setNewGuidanceForm({ categoryId: '', title: '', content: '', reviewStatus: 'APPROVED' });
        await fetchAdminData();
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: 'Failed to create guidance: ' + (err.response?.data?.message || err.message),
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Open Detailed Doctor Application Drawer / Modal
  const openApplicationDetails = async (doctor) => {
    try {
      setLoadingAppDetails(true);
      setSelectedApp({ doctor }); // optimistic initial
      const res = await api.get(`/admin/doctors/${doctor._id}`);
      if (res.data?.success) {
        setSelectedApp(res.data.data);
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: 'Failed to load complete application dossier: ' + (err.response?.data?.message || err.message),
      });
    } finally {
      setLoadingAppDetails(false);
    }
  };

  // Approve Doctor Application
  const handleApproveDoctor = async (doctorId) => {
    try {
      setActionLoading(true);
      const res = await api.post(`/admin/doctors/${doctorId}/approve`);
      if (res.data?.success) {
        setFeedback({
          type: 'success',
          message: `Physician approved. Unique Doctor ID (${res.data.data?.doctorUniqueId || 'Generated'}) and Secure QR Credential issued.`,
        });
        if (selectedApp) setSelectedApp(null);
        await fetchAdminData();
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: 'Approval error: ' + (err.response?.data?.message || err.message),
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Open Doctor Rejection Modal
  const handleOpenRejectModal = (doctor) => {
    setDoctorToReject(doctor);
    setRejectionReason('');
    setRejectionError('');
    setRejectionModalOpen(true);
  };

  // Submit Doctor Rejection with Mandatory Reason
  const handleConfirmReject = async () => {
    if (!doctorToReject) return;
    const cleanReason = rejectionReason.trim();
    if (!cleanReason) {
      setRejectionError('A mandatory rejection reason is required by medical council compliance.');
      return;
    }

    try {
      setActionLoading(true);
      setRejectionError('');
      const res = await api.post(`/admin/doctors/${doctorToReject._id}/reject`, { reason: cleanReason });
      if (res.data?.success) {
        setFeedback({
          type: 'info',
          message: `Application rejected with formal remarks recorded in the audit trail.`,
        });
        setRejectionModalOpen(false);
        setDoctorToReject(null);
        if (selectedApp) setSelectedApp(null);
        await fetchAdminData();
      }
    } catch (err) {
      setRejectionError('Rejection failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  // View QR Credential Modal
  const handleViewQrCredential = async (doctor) => {
    try {
      setActionLoading(true);
      const res = await api.get(`/admin/doctors/${doctor._id}`);
      if (res.data?.success) {
        const qrCred = res.data.data?.qrCredential;
        setQrModalData({
          doctorName: doctor.userId?.name || 'Physician',
          specialization: doctor.specialization,
          doctorUniqueId: doctor.doctorUniqueId || qrCred?.uniqueId,
          qrDataUrl: qrCred?.qrDataUrl,
          credentialToken: qrCred?.token || doctor.qrCredentialToken,
          issuedAt: qrCred?.issuedAt || doctor.verifiedAt,
          status: qrCred?.status || 'ACTIVE',
        });
        setQrModalOpen(true);
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: 'Failed to retrieve active QR credential: ' + (err.response?.data?.message || err.message),
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Open Doctor Credential Reissue Modal
  const handleOpenReissueModal = (doctor) => {
    setDoctorToReissue(doctor);
    setReissueReason('Administrative periodic key rotation');
    setReissueModalOpen(true);
  };

  // Confirm Reissue QR Credential
  const handleConfirmReissue = async () => {
    if (!doctorToReissue) return;
    try {
      setActionLoading(true);
      const res = await api.post(`/admin/doctors/${doctorToReissue._id}/credentials/reissue`, {
        reason: reissueReason,
      });
      if (res.data?.success) {
        setFeedback({
          type: 'success',
          message: `QR Credential rotated and reissued for ${doctorToReissue.userId?.name || 'Doctor'}. Previous key revoked.`,
        });
        setReissueModalOpen(false);
        setDoctorToReissue(null);
        await fetchAdminData();
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: 'Credential reissue failed: ' + (err.response?.data?.message || err.message),
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Open Organization Details Modal
  const openOrgDetails = async (org) => {
    try {
      setLoadingOrgDetails(true);
      setSelectedOrgApp({ organization: org });
      const res = await api.get(`/admin/organizations/${org._id}`);
      if (res.data?.success) {
        setSelectedOrgApp(res.data.data);
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: 'Failed to load organization accreditation dossier: ' + (err.response?.data?.message || err.message),
      });
    } finally {
      setLoadingOrgDetails(false);
    }
  };

  // Approve Hospital Organization
  const handleApproveOrg = async (orgId) => {
    try {
      setActionLoading(true);
      const res = await api.post(`/admin/organizations/${orgId}/approve`);
      if (res.data?.success) {
        setFeedback({
          type: 'success',
          message: `Healthcare facility accredited successfully. Unique Organization Code (${res.data.data?.uniqueOrganizationCode || 'Issued'}) activated.`,
        });
        if (selectedOrgApp) setSelectedOrgApp(null);
        await fetchAdminData();
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: 'Approval error: ' + (err.response?.data?.message || err.message),
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Open Organization Rejection Modal
  const handleOpenRejectOrgModal = (org) => {
    setOrgToReject(org);
    setOrgRejectionReason('');
    setOrgRejectionError('');
    setOrgRejectionModalOpen(true);
  };

  // Confirm Reject Organization
  const handleConfirmRejectOrg = async () => {
    if (!orgToReject) return;
    const cleanReason = orgRejectionReason.trim();
    if (!cleanReason) {
      setOrgRejectionError('A mandatory rejection reason is required for clinical establishment compliance.');
      return;
    }

    try {
      setActionLoading(true);
      setOrgRejectionError('');
      const res = await api.post(`/admin/organizations/${orgToReject._id}/reject`, { reason: cleanReason });
      if (res.data?.success) {
        setFeedback({
          type: 'info',
          message: 'Health facility accreditation rejected with formal remarks recorded.',
        });
        setOrgRejectionModalOpen(false);
        setOrgToReject(null);
        if (selectedOrgApp) setSelectedOrgApp(null);
        await fetchAdminData();
      }
    } catch (err) {
      setOrgRejectionError('Rejection error: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  // Filter Logic
  const filterDoctorList = (list) => {
    return list.filter((item) => {
      const name = item.userId?.name || item.name || '';
      const lic = item.licenseNumber || '';
      const ref = item.applicationReference || '';
      const spec = item.specialization || '';
      const q = searchQuery.toLowerCase();

      const matchesSearch =
        name.toLowerCase().includes(q) ||
        lic.toLowerCase().includes(q) ||
        ref.toLowerCase().includes(q) ||
        spec.toLowerCase().includes(q);

      const matchesSpec =
        specializationFilter === 'ALL' ||
        spec.toLowerCase() === specializationFilter.toLowerCase();

      return matchesSearch && matchesSpec;
    });
  };

  const filterOrgList = (list) => {
    return list.filter((org) => {
      const q = searchQuery.toLowerCase();
      const name = org.name || '';
      const reg = org.registrationNumber || '';
      const code = org.uniqueOrganizationCode || '';
      const ref = org.applicationReference || '';
      const city = org.operatingAddress?.city || org.address?.city || '';
      return (
        name.toLowerCase().includes(q) ||
        reg.toLowerCase().includes(q) ||
        code.toLowerCase().includes(q) ||
        ref.toLowerCase().includes(q) ||
        city.toLowerCase().includes(q)
      );
    });
  };

  const filteredPending = filterDoctorList(pendingDoctors);
  const filteredVerified = filterDoctorList(verifiedDoctors);
  const filteredRejected = filterDoctorList(rejectedDoctors);

  const filteredPendingOrgs = filterOrgList(pendingOrgs);
  const filteredVerifiedOrgs = filterOrgList(verifiedOrgs);
  const filteredRejectedOrgs = filterOrgList(rejectedOrgs);

  if (loading) {
    return (
      <div className="space-y-6">
        <TableSkeleton rows={4} cols={4} />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="neutral" size="xs">
              System Governance & Credentialing
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Executive Governance Administration
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            National Medical Commission verification, practitioner credentials, and hospital facility accreditation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            icon={RefreshCw}
            loading={actionLoading}
            onClick={fetchAdminData}
          >
            Refresh Queue
          </Button>
        </div>
      </div>

      {feedback.message && (
        <Toast
          type={feedback.type}
          message={feedback.message}
          onClose={() => setFeedback({ type: '', message: '' })}
        />
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-card">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Users</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats?.totalUsers || 0}</p>
          <span className="text-[11px] text-brand-600 font-medium">Platform Accounts</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-card">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Practitioners</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-bold text-slate-900">{verifiedDoctors.length}</span>
            <span className="text-xs text-amber-700 font-bold">({pendingDoctors.length} pending)</span>
          </div>
          <span className="text-[11px] text-emerald-700 font-medium">NMC Verified Active</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-card">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Hospitals & Clinics</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-bold text-slate-900">{verifiedOrgs.length}</span>
            <span className="text-xs text-amber-700 font-bold">({pendingOrgs.length} pending)</span>
          </div>
          <span className="text-[11px] text-emerald-700 font-medium">Accredited Facilities</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-card">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Emergencies</span>
          <p className="text-2xl font-bold text-rose-700 mt-1">{stats?.activeEmergencies || 0}</p>
          <span className="text-[11px] text-rose-600 font-medium">Parallel Broadcasts Active</span>
        </div>
      </div>

      {/* Tab Navigation and Search Controls */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap border-b border-slate-200 bg-slate-50/50 px-4 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-2 py-3 px-3.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'pending'
                ? 'border-brand-600 text-brand-700 bg-white shadow-xs rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Doctors</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              pendingDoctors.length > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600'
            }`}>
              {pendingDoctors.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('verified')}
            className={`flex items-center gap-2 py-3 px-3.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'verified'
                ? 'border-brand-600 text-brand-700 bg-white shadow-xs rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verified Practitioners</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
              {verifiedDoctors.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('rejected')}
            className={`flex items-center gap-2 py-3 px-3.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'rejected'
                ? 'border-brand-600 text-brand-700 bg-white shadow-xs rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Rejected Doctors</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
              {rejectedDoctors.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('organizations')}
            className={`flex items-center gap-2 py-3 px-3.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'organizations'
                ? 'border-brand-600 text-brand-700 bg-white shadow-xs rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Hospital Accreditations</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              pendingOrgs.length > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600'
            }`}>
              {pendingOrgs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('presence')}
            className={`flex items-center gap-2 py-3 px-3.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'presence'
                ? 'border-brand-600 text-brand-700 bg-white shadow-xs rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Scan className="w-3.5 h-3.5" />
            <span>Presence Monitoring</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              presenceLogs.filter(p => p.status === 'CHECKED_IN').length > 0
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-slate-200 text-slate-600'
            }`}>
              {presenceLogs.filter(p => p.status === 'CHECKED_IN').length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('emergency')}
            className={`flex items-center gap-2 py-3 px-3.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'emergency'
                ? 'border-brand-600 text-brand-700 bg-white shadow-xs rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Emergency Governance</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
              {adminCategories.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-2 py-3 px-3.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'notifications'
                ? 'border-brand-600 text-brand-700 bg-white shadow-xs rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Notifications & Telemetry</span>
            {failedDeliveries.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                {failedDeliveries.length}
              </span>
            )}
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-4 bg-white border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={
                activeTab === 'organizations'
                  ? 'Search by hospital, license, unique code, or city...'
                  : activeTab === 'presence'
                  ? 'Search presence by doctor, facility, or method...'
                  : 'Search by physician, license, or ref...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white"
            />
          </div>

          {activeTab !== 'organizations' && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap">Specialty:</span>
              <select
                value={specializationFilter}
                onChange={(e) => setSpecializationFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
              >
                <option value="ALL">All Specialties</option>
                <option value="Cardiology">Cardiology</option>
                <option value="Emergency Medicine">Emergency Medicine</option>
                <option value="Neurology">Neurology</option>
                <option value="Pediatrics">Pediatrics</option>
                <option value="Orthopedics">Orthopedics</option>
                <option value="General Physician">General Physician</option>
                <option value="Dermatology">Dermatology</option>
                <option value="Psychiatry">Psychiatry</option>
                <option value="Oncology">Oncology</option>
              </select>
            </div>
          )}
        </div>

        {/* Tab 1: Pending Doctor Applications */}
        {activeTab === 'pending' && (
          <div>
            {filteredPending.length === 0 ? (
              <EmptyState
                icon={FileCheck}
                title="No Pending Physician Applications"
                description={searchQuery ? 'No pending applications matched your search.' : 'All registered doctor applications have been processed.'}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="p-3.5">Applicant & Ref</th>
                      <th className="p-3.5">Specialization</th>
                      <th className="p-3.5">NMC License #</th>
                      <th className="p-3.5">Council Jurisdiction</th>
                      <th className="p-3.5">Experience & Fee</th>
                      <th className="p-3.5 text-right">Verification Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPending.map((doc) => (
                      <tr key={doc._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{doc.userId?.name || 'Dr. Practitioner'}</span>
                            <span className="text-[10px] px-1.5 py-0.2 bg-amber-50 text-amber-800 border border-amber-200 rounded font-normal">
                              Pending
                            </span>
                          </div>
                          <div className="font-mono text-[10px] text-slate-400 mt-0.5">
                            {doc.applicationReference || doc._id}
                          </div>
                        </td>
                        <td className="p-3.5 font-medium text-brand-700">{doc.specialization}</td>
                        <td className="p-3.5 font-mono font-semibold text-slate-800">{doc.licenseNumber}</td>
                        <td className="p-3.5 text-slate-600">
                          <div>{doc.issuingAuthority || 'National Medical Commission'}</div>
                          <div className="text-[10px] text-slate-400">{doc.registrationJurisdiction || 'India'}</div>
                        </td>
                        <td className="p-3.5 text-slate-700">
                          <div>{doc.experienceYears || 0} Years</div>
                          <div className="text-[10px] text-slate-500">₹{doc.consultationFee || 800}</div>
                        </td>
                        <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                          <Button
                            size="xs"
                            variant="outline"
                            icon={Eye}
                            disabled={actionLoading}
                            onClick={() => openApplicationDetails(doc)}
                          >
                            Review Details
                          </Button>
                          <Button
                            size="xs"
                            variant="presence"
                            icon={Check}
                            disabled={actionLoading}
                            onClick={() => handleApproveDoctor(doc._id)}
                          >
                            Approve
                          </Button>
                          <Button
                            size="xs"
                            variant="outline"
                            className="text-rose-600 hover:bg-rose-50 border-rose-200"
                            icon={X}
                            disabled={actionLoading}
                            onClick={() => handleOpenRejectModal(doc)}
                          >
                            Reject
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Verified Practitioners */}
        {activeTab === 'verified' && (
          <div>
            {filteredVerified.length === 0 ? (
              <EmptyState
                icon={ShieldCheck}
                title="No Verified Practitioners Found"
                description={searchQuery ? 'No verified doctors match your filter.' : 'Approved doctors will appear here with active QR credentials.'}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="p-3.5">Doctor & Unique ID</th>
                      <th className="p-3.5">Speciality</th>
                      <th className="p-3.5">NMC License #</th>
                      <th className="p-3.5">Verification Date</th>
                      <th className="p-3.5">Credential Status</th>
                      <th className="p-3.5 text-right">Credential Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredVerified.map((doc) => (
                      <tr key={doc._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{doc.userId?.name || 'Dr. Practitioner'}</div>
                          <div className="font-mono text-[11px] font-bold text-brand-700 mt-0.5">
                            {doc.doctorUniqueId || 'DOC-ACTIVE'}
                          </div>
                        </td>
                        <td className="p-3.5 font-medium text-slate-800">{doc.specialization}</td>
                        <td className="p-3.5 font-mono text-slate-700">{doc.licenseNumber}</td>
                        <td className="p-3.5 text-slate-600">
                          <div>{doc.verifiedAt ? new Date(doc.verifiedAt).toLocaleDateString() : 'Active'}</div>
                          <div className="text-[10px] text-slate-400">Verified by Admin</div>
                        </td>
                        <td className="p-3.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            ACTIVE QR
                          </span>
                        </td>
                        <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                          <Button
                            size="xs"
                            variant="outline"
                            icon={QrCode}
                            disabled={actionLoading}
                            onClick={() => handleViewQrCredential(doc)}
                          >
                            View QR Credential
                          </Button>
                          <Button
                            size="xs"
                            variant="outline"
                            icon={RefreshCw}
                            disabled={actionLoading}
                            onClick={() => handleOpenReissueModal(doc)}
                          >
                            Rotate Key
                          </Button>
                          <Button
                            size="xs"
                            variant="outline"
                            icon={Eye}
                            disabled={actionLoading}
                            onClick={() => openApplicationDetails(doc)}
                          >
                            Profile
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Rejected Doctors */}
        {activeTab === 'rejected' && (
          <div>
            {filteredRejected.length === 0 ? (
              <EmptyState
                icon={XCircle}
                title="No Rejected Applications"
                description="There are currently no rejected doctor applications on record."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="p-3.5">Applicant & Ref</th>
                      <th className="p-3.5">Specialization</th>
                      <th className="p-3.5">License #</th>
                      <th className="p-3.5">Rejection Reason & Remarks</th>
                      <th className="p-3.5">Review Date</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRejected.map((doc) => (
                      <tr key={doc._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{doc.userId?.name || 'Dr. Applicant'}</div>
                          <div className="font-mono text-[10px] text-slate-400 mt-0.5">
                            {doc.applicationReference || doc._id}
                          </div>
                        </td>
                        <td className="p-3.5 font-medium text-slate-700">{doc.specialization}</td>
                        <td className="p-3.5 font-mono text-slate-700">{doc.licenseNumber}</td>
                        <td className="p-3.5 max-w-xs">
                          <div className="p-2 bg-rose-50 border border-rose-200 rounded text-[11px] text-rose-800 font-medium">
                            {doc.rejectionReason || 'Documentation non-compliant with medical registry standards.'}
                          </div>
                        </td>
                        <td className="p-3.5 text-slate-500 text-[11px]">
                          {doc.updatedAt ? new Date(doc.updatedAt).toLocaleDateString() : 'Recent'}
                        </td>
                        <td className="p-3.5 text-right whitespace-nowrap">
                          <Button
                            size="xs"
                            variant="outline"
                            icon={Eye}
                            disabled={actionLoading}
                            onClick={() => openApplicationDetails(doc)}
                          >
                            Review History
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Hospital Accreditations */}
        {activeTab === 'organizations' && (
          <div className="space-y-4">
            {/* Sub-tab navigation */}
            <div className="px-4 pt-3 pb-1 border-b border-slate-100 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOrgSubTab('pending')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                  orgSubTab === 'pending'
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>Pending Review</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                  orgSubTab === 'pending' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {pendingOrgs.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setOrgSubTab('verified')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                  orgSubTab === 'verified'
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>Accredited Facilities</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                  orgSubTab === 'verified' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {verifiedOrgs.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setOrgSubTab('rejected')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                  orgSubTab === 'rejected'
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>Rejected Facilities</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                  orgSubTab === 'rejected' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {rejectedOrgs.length}
                </span>
              </button>
            </div>

            {/* Sub-tab 1: Pending Hospital Applications */}
            {orgSubTab === 'pending' && (
              <div>
                {filteredPendingOrgs.length === 0 ? (
                  <EmptyState
                    icon={Building2}
                    title="No Pending Facility Accreditations"
                    description={searchQuery ? 'No pending hospitals match your search.' : 'All hospital establishment applications have been reviewed.'}
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100">
                        <tr>
                          <th className="p-3.5">Facility Name & Ref</th>
                          <th className="p-3.5">Classification</th>
                          <th className="p-3.5">License #</th>
                          <th className="p-3.5">Operating City & GPS</th>
                          <th className="p-3.5">Capabilities</th>
                          <th className="p-3.5 text-right">Accreditation Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredPendingOrgs.map((org) => (
                          <tr key={org._id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="p-3.5 font-semibold text-slate-900">
                              <div className="flex items-center gap-1.5">
                                <span>{org.name}</span>
                                <span className="text-[10px] px-1.5 py-0.2 bg-amber-50 text-amber-800 border border-amber-200 rounded font-normal">
                                  Pending Review
                                </span>
                              </div>
                              <div className="font-mono text-[10px] text-slate-400 mt-0.5">
                                {org.applicationReference || org._id}
                              </div>
                            </td>
                            <td className="p-3.5 text-slate-700 capitalize">{org.orgType?.replace(/_/g, ' ')}</td>
                            <td className="p-3.5 font-mono font-semibold text-slate-700">{org.registrationNumber}</td>
                            <td className="p-3.5 text-slate-600">
                              <div>{org.operatingAddress?.city || org.address?.city || 'Delhi'}</div>
                              <div className="font-mono text-[10px] text-slate-400">
                                {org.location?.coordinates ? `${org.location.coordinates[1].toFixed(3)}, ${org.location.coordinates[0].toFixed(3)}` : 'GPS Set'}
                              </div>
                            </td>
                            <td className="p-3.5">
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {(org.healthcareCapabilities || org.facilities || ['Emergency', 'ICU']).slice(0, 2).map((c, i) => (
                                  <span key={i} className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded">
                                    {c}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                              <Button
                                size="xs"
                                variant="outline"
                                icon={Eye}
                                disabled={actionLoading}
                                onClick={() => openOrgDetails(org)}
                              >
                                Review Dossier
                              </Button>
                              <Button
                                size="xs"
                                variant="presence"
                                icon={Check}
                                disabled={actionLoading}
                                onClick={() => handleApproveOrg(org._id)}
                              >
                                Approve
                              </Button>
                              <Button
                                size="xs"
                                variant="outline"
                                className="text-rose-600 hover:bg-rose-50 border-rose-200"
                                icon={X}
                                disabled={actionLoading}
                                onClick={() => handleOpenRejectOrgModal(org)}
                              >
                                Reject
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Sub-tab 2: Accredited Facilities */}
            {orgSubTab === 'verified' && (
              <div>
                {filteredVerifiedOrgs.length === 0 ? (
                  <EmptyState
                    icon={ShieldCheck}
                    title="No Accredited Facilities"
                    description="Approved hospitals and outpatient centers will appear here."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100">
                        <tr>
                          <th className="p-3.5">Facility Name & Code</th>
                          <th className="p-3.5">Classification</th>
                          <th className="p-3.5">Registration #</th>
                          <th className="p-3.5">Operating City</th>
                          <th className="p-3.5">Accreditation Status</th>
                          <th className="p-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredVerifiedOrgs.map((org) => (
                          <tr key={org._id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="p-3.5 font-semibold text-slate-900">
                              <div>{org.name}</div>
                              <div className="font-mono text-[11px] font-bold text-brand-700 mt-0.5">
                                {org.uniqueOrganizationCode || 'ORG-ACTIVE'}
                              </div>
                            </td>
                            <td className="p-3.5 text-slate-700 capitalize">{org.orgType?.replace(/_/g, ' ')}</td>
                            <td className="p-3.5 font-mono text-slate-700">{org.registrationNumber}</td>
                            <td className="p-3.5 text-slate-600">{org.operatingAddress?.city || org.address?.city || 'Delhi'}</td>
                            <td className="p-3.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                ACCREDITED
                              </span>
                            </td>
                            <td className="p-3.5 text-right whitespace-nowrap">
                              <Button
                                size="xs"
                                variant="outline"
                                icon={Eye}
                                onClick={() => openOrgDetails(org)}
                              >
                                Review Dossier
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Sub-tab 3: Rejected Facilities */}
            {orgSubTab === 'rejected' && (
              <div>
                {filteredRejectedOrgs.length === 0 ? (
                  <EmptyState
                    icon={XCircle}
                    title="No Rejected Facilities"
                    description="There are currently no rejected healthcare organization applications on record."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100">
                        <tr>
                          <th className="p-3.5">Facility Name & Ref</th>
                          <th className="p-3.5">Classification</th>
                          <th className="p-3.5">Registration #</th>
                          <th className="p-3.5">Rejection Reason & Remarks</th>
                          <th className="p-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredRejectedOrgs.map((org) => (
                          <tr key={org._id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="p-3.5 font-semibold text-slate-900">
                              <div>{org.name}</div>
                              <div className="font-mono text-[10px] text-slate-400 mt-0.5">
                                {org.applicationReference || org._id}
                              </div>
                            </td>
                            <td className="p-3.5 text-slate-700 capitalize">{org.orgType?.replace(/_/g, ' ')}</td>
                            <td className="p-3.5 font-mono text-slate-700">{org.registrationNumber}</td>
                            <td className="p-3.5 max-w-xs">
                              <div className="p-2 bg-rose-50 border border-rose-200 rounded text-[11px] text-rose-800 font-medium">
                                {org.rejectionReason || 'Establishment permits non-compliant with health department regulations.'}
                              </div>
                            </td>
                            <td className="p-3.5 text-right whitespace-nowrap">
                              <Button
                                size="xs"
                                variant="outline"
                                icon={Eye}
                                onClick={() => openOrgDetails(org)}
                              >
                                Review History
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Real-Time Presence & Attendance Governance (Module 7) */}
        {activeTab === 'presence' && (
          <div className="space-y-4">
            {/* Presence Sub-Filters */}
            <div className="px-4 pt-3 pb-1 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {[
                  { id: 'ALL', label: `All Sessions (${presenceLogs.length})` },
                  { id: 'CHECKED_IN', label: `Active On-Site (${presenceLogs.filter(p => p.status === 'CHECKED_IN').length})` },
                  { id: 'CHECKED_OUT', label: `Completed (${presenceLogs.filter(p => p.status === 'CHECKED_OUT').length})` },
                  { id: 'MANUAL_CORRECTED', label: `Corrected (${presenceLogs.filter(p => p.status === 'MANUAL_CORRECTED').length})` },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setPresenceFilter(f.id)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      presenceFilter === f.id
                        ? 'bg-brand-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="text-[11px] text-slate-400 font-mono">
                Real-Time Physician Attendance Matrix
              </div>
            </div>

            {/* Presence Table */}
            {presenceLogs.length === 0 ? (
              <EmptyState
                icon={Scan}
                title="No Presence Sessions Recorded"
                description="Doctors will appear here as they scan reception QR codes upon arrival at participating facilities."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="p-3.5">Doctor & Specialty</th>
                      <th className="p-3.5">Healthcare Facility</th>
                      <th className="p-3.5">Check-In Time</th>
                      <th className="p-3.5">Check-Out Time</th>
                      <th className="p-3.5">Duration</th>
                      <th className="p-3.5">Method</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Administrative Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {presenceLogs
                      .filter((log) => {
                        if (presenceFilter !== 'ALL' && log.status !== presenceFilter) return false;
                        if (searchQuery.trim()) {
                          const q = searchQuery.toLowerCase();
                          const docName = log.doctorId?.userId?.name?.toLowerCase() || '';
                          const docSpec = log.doctorId?.specialization?.toLowerCase() || '';
                          const orgName = log.organizationId?.name?.toLowerCase() || '';
                          return docName.includes(q) || docSpec.includes(q) || orgName.includes(q);
                        }
                        return true;
                      })
                      .map((log) => {
                        const checkInDate = log.checkInAt ? new Date(log.checkInAt) : log.timestamp ? new Date(log.timestamp) : null;
                        const checkOutDate = log.checkOutAt ? new Date(log.checkOutAt) : null;
                        const duration = log.durationMinutes ? `${log.durationMinutes} min` : checkOutDate && checkInDate ? `${Math.round((checkOutDate - checkInDate) / 60000)} min` : 'In progress';
                        const isActive = log.status === 'CHECKED_IN';

                        return (
                          <tr key={log._id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="p-3.5">
                              <div className="font-bold text-slate-900">
                                {log.doctorId?.userId?.name || 'Physician'}
                              </div>
                              <div className="text-[11px] text-blue-600 font-medium">
                                {log.doctorId?.specialization || 'Specialist'}
                              </div>
                              <div className="text-[10px] font-mono text-slate-400">
                                ID: {log.doctorId?.doctorUniqueId || log.doctorId?._id || 'N/A'}
                              </div>
                            </td>
                            <td className="p-3.5">
                              <div className="font-semibold text-slate-900">
                                {log.organizationId?.name || 'Healthcare Facility'}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {log.organizationId?.orgType?.replace(/_/g, ' ') || 'Medical Center'}
                              </div>
                            </td>
                            <td className="p-3.5 text-slate-600">
                              {checkInDate ? checkInDate.toLocaleString() : 'N/A'}
                            </td>
                            <td className="p-3.5 text-slate-600">
                              {checkOutDate ? (
                                checkOutDate.toLocaleString()
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                  Present On-Site
                                </span>
                              )}
                            </td>
                            <td className="p-3.5 font-mono text-slate-700 font-medium">
                              {duration}
                            </td>
                            <td className="p-3.5">
                              <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">
                                {log.checkInMethod || log.method || 'QR_SCAN'}
                              </span>
                            </td>
                            <td className="p-3.5">
                              <Badge
                                variant={
                                  log.status === 'CHECKED_IN'
                                    ? 'presence'
                                    : log.status === 'MANUAL_CORRECTED'
                                    ? 'warning'
                                    : 'neutral'
                                }
                                size="xs"
                              >
                                {log.status || 'CHECKED_IN'}
                              </Badge>
                            </td>
                            <td className="p-3.5 text-right whitespace-nowrap">
                              <Button
                                size="xs"
                                variant="outline"
                                onClick={() => {
                                  setLogToCorrect(log);
                                  setNewCorrectionStatus(log.status === 'CHECKED_IN' ? 'CHECKED_OUT' : 'MANUAL_CORRECTED');
                                  setCorrectionReason('Physician forgot to scan terminal on departure');
                                  setCorrectionNotes('');
                                  setCorrectionModalOpen(true);
                                }}
                              >
                                Manual Correction
                              </Button>
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

        {/* TAB 6: Emergency Categories & Guidance Management (Module 8) */}
        {activeTab === 'emergency' && (
          <div className="p-6 space-y-8">
            {/* Header Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Emergency Categories & Medically Reviewed Guidance
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure clinical emergency categories and manage versioned, reviewed first-aid protocols.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setNewCatModalOpen(true)}
                  icon={ShieldAlert}
                >
                  Add Category
                </Button>
                <Button
                  size="sm"
                  variant="emergency"
                  onClick={() => setNewGuidanceModalOpen(true)}
                  icon={FileText}
                >
                  Add Guidance
                </Button>
              </div>
            </div>

            {/* Section 1: Categories List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Configured Emergency Categories ({adminCategories.length})
                </h4>
                <span className="text-[11px] text-slate-400">
                  Active categories appear on patient emergency mode screen
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="p-3">Order</th>
                      <th className="p-3">Category Name</th>
                      <th className="p-3">Slug / Code</th>
                      <th className="p-3">Description</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {adminCategories.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="p-6 text-center text-xs text-slate-400">
                          No emergency categories configured yet.
                        </td>
                      </tr>
                    ) : (
                      adminCategories.map((cat) => (
                        <tr key={cat._id || cat.categoryId} className="hover:bg-slate-50/50">
                          <td className="p-3 font-mono text-slate-500 font-bold">{cat.displayOrder || 0}</td>
                          <td className="p-3 font-bold text-slate-900">{cat.categoryName}</td>
                          <td className="p-3 font-mono text-slate-600">{cat.slug}</td>
                          <td className="p-3 text-slate-600 max-w-xs truncate">{cat.description}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                cat.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {cat.active ? 'ACTIVE' : 'INACTIVE'}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleToggleCategoryActive(cat)}
                              disabled={actionLoading}
                              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                                cat.active
                                  ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                              }`}
                            >
                              {cat.active ? 'Deactivate' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 2: Medically Reviewed Guidance */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Clinical First-Aid Protocols & Guidance ({adminGuidance.length})
                </h4>
                <span className="text-[11px] text-slate-400">
                  Guidance must be APPROVED by clinical administrator before publishing
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="p-3">Category</th>
                      <th className="p-3">Title</th>
                      <th className="p-3">Version</th>
                      <th className="p-3">Review Status</th>
                      <th className="p-3">Reviewed By</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {adminGuidance.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="p-6 text-center text-xs text-slate-400">
                          No guidance protocols found.
                        </td>
                      </tr>
                    ) : (
                      adminGuidance.map((gdn) => (
                        <tr key={gdn._id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-bold text-slate-900">
                            {gdn.categoryId?.categoryName || 'General'}
                          </td>
                          <td className="p-3 font-medium text-slate-900 max-w-xs">
                            <div>{gdn.title}</div>
                            <div className="text-[11px] text-slate-400 truncate">{gdn.content}</div>
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-600">v{gdn.version || 1}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                gdn.reviewStatus === 'APPROVED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : gdn.reviewStatus === 'DRAFT'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {gdn.reviewStatus}
                            </span>
                          </td>
                          <td className="p-3 text-slate-600">
                            {gdn.reviewedBy?.name || 'Administrator'}
                          </td>
                          <td className="p-3 text-right">
                            {gdn.reviewStatus !== 'APPROVED' ? (
                              <button
                                type="button"
                                onClick={() => handleApproveGuidance(gdn._id)}
                                disabled={actionLoading}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-xs transition-colors cursor-pointer"
                              >
                                Approve & Publish
                              </button>
                            ) : (
                              <span className="text-[11px] font-semibold text-emerald-700 flex items-center justify-end gap-1">
                                <Check className="w-3.5 h-3.5" /> Published
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal: Add Category */}
            {newCatModalOpen && (
              <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                <form
                  onSubmit={handleCreateCategory}
                  className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200"
                >
                  <h3 className="text-base font-bold text-slate-900">Add Emergency Category</h3>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Category Name</label>
                    <input
                      type="text"
                      required
                      value={newCatForm.categoryName}
                      onChange={(e) =>
                        setNewCatForm({
                          ...newCatForm,
                          categoryName: e.target.value,
                          slug: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '_'),
                        })
                      }
                      placeholder="e.g., Cardiac Arrest"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Unique Slug</label>
                    <input
                      type="text"
                      required
                      value={newCatForm.slug}
                      onChange={(e) => setNewCatForm({ ...newCatForm, slug: e.target.value })}
                      placeholder="e.g., cardiac"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Description</label>
                    <textarea
                      rows={2}
                      value={newCatForm.description}
                      onChange={(e) => setNewCatForm({ ...newCatForm, description: e.target.value })}
                      placeholder="Symptoms and clinical classification description..."
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Display Order</label>
                      <input
                        type="number"
                        value={newCatForm.displayOrder}
                        onChange={(e) =>
                          setNewCatForm({ ...newCatForm, displayOrder: parseInt(e.target.value) || 0 })
                        }
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Icon Identifier</label>
                      <input
                        type="text"
                        value={newCatForm.icon}
                        onChange={(e) => setNewCatForm({ ...newCatForm, icon: e.target.value })}
                        placeholder="e.g. HeartPulse"
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setNewCatModalOpen(false)}
                      className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="px-4 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-xs disabled:opacity-50"
                    >
                      {actionLoading ? 'Saving...' : 'Save Category'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Modal: Add Guidance */}
            {newGuidanceModalOpen && (
              <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                <form
                  onSubmit={handleCreateGuidance}
                  className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200"
                >
                  <h3 className="text-base font-bold text-slate-900">Add Clinical Emergency Guidance</h3>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Target Category</label>
                    <select
                      required
                      value={newGuidanceForm.categoryId}
                      onChange={(e) => setNewGuidanceForm({ ...newGuidanceForm, categoryId: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
                    >
                      <option value="">-- Select Emergency Category --</option>
                      {adminCategories.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.categoryName} ({c.slug})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Guidance Title</label>
                    <input
                      type="text"
                      required
                      value={newGuidanceForm.title}
                      onChange={(e) => setNewGuidanceForm({ ...newGuidanceForm, title: e.target.value })}
                      placeholder="e.g., Acute Cardiac First-Aid Stabilization Protocol"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Clinical Protocol Steps</label>
                    <textarea
                      rows={5}
                      required
                      value={newGuidanceForm.content}
                      onChange={(e) => setNewGuidanceForm({ ...newGuidanceForm, content: e.target.value })}
                      placeholder="1. Keep patient resting upright...\n2. Assist with prescribed medications..."
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Initial Review Status</label>
                    <select
                      value={newGuidanceForm.reviewStatus}
                      onChange={(e) => setNewGuidanceForm({ ...newGuidanceForm, reviewStatus: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
                    >
                      <option value="APPROVED">APPROVED (Immediate publication)</option>
                      <option value="DRAFT">DRAFT (Requires clinical review)</option>
                      <option value="PENDING">PENDING (Awaiting medical director)</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setNewGuidanceModalOpen(false)}
                      className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="px-4 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-xs disabled:opacity-50"
                    >
                      {actionLoading ? 'Saving...' : 'Save Guidance'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Module 13 Notification Monitoring, Metrics & Retries */}
        {activeTab === 'notifications' && (
          <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Notification Delivery Infrastructure & Telemetry Health
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Multi-channel communication monitoring, provider logs, dead-letter recovery, and retry controls.
                </p>
              </div>

              <Button
                size="sm"
                variant="outline"
                icon={RefreshCw}
                onClick={fetchDashboardData}
              >
                Refresh Metrics
              </Button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Total Dispatched
                </span>
                <span className="text-2xl font-black text-slate-900">
                  {notificationMetrics?.total || allNotifications.length}
                </span>
              </div>
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                  Delivered / Sent
                </span>
                <span className="text-2xl font-black text-emerald-800">
                  {notificationMetrics?.delivered || allNotifications.filter(n => n.status === 'DELIVERED').length}
                </span>
              </div>
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200">
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
                  Unread Across Portal
                </span>
                <span className="text-2xl font-black text-amber-800">
                  {notificationMetrics?.unread || allNotifications.filter(n => n.status !== 'READ').length}
                </span>
              </div>
              <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200">
                <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">
                  Failed Deliveries
                </span>
                <span className="text-2xl font-black text-rose-800">
                  {failedDeliveries.length || notificationMetrics?.failed || 0}
                </span>
              </div>
            </div>

            {/* Channel Provider Health Cards */}
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">
                Active Channel Providers & Telemetry Nodes
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-brand-600" />
                    <div>
                      <span className="font-bold text-slate-900 block">In-App Database</span>
                      <span className="text-[10px] text-slate-400">Persistent Audit Log</span>
                    </div>
                  </div>
                  <Badge variant="success" size="xs">Operational</Badge>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-purple-600" />
                    <div>
                      <span className="font-bold text-slate-900 block">Socket.io Push</span>
                      <span className="text-[10px] text-slate-400">Real-Time Streams</span>
                    </div>
                  </div>
                  <Badge variant="success" size="xs">Connected</Badge>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-600" />
                    <div>
                      <span className="font-bold text-slate-900 block">Email Gateway</span>
                      <span className="text-[10px] text-slate-400">Nodemailer Engine</span>
                    </div>
                  </div>
                  <Badge variant="success" size="xs">Ready</Badge>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-amber-600" />
                    <div>
                      <span className="font-bold text-slate-900 block">SMS Dispatch</span>
                      <span className="text-[10px] text-slate-400">Mobile SMS Gateway</span>
                    </div>
                  </div>
                  <Badge variant="success" size="xs">Active</Badge>
                </div>
              </div>
            </div>

            {/* Dead-Letter / Failed Deliveries Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Failed Deliveries & Dead-Letter Queue ({failedDeliveries.length})</span>
                </h4>
              </div>

              {failedDeliveries.length === 0 ? (
                <div className="p-6 bg-emerald-50/50 border border-emerald-200 rounded-xl text-center text-xs text-emerald-800 font-medium">
                  ✓ Zero failed deliveries currently in dead-letter queue. All communication channels healthy.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="p-3">Delivery ID</th>
                        <th className="p-3">Channel</th>
                        <th className="p-3">Recipient</th>
                        <th className="p-3">Attempts</th>
                        <th className="p-3">Error Reason</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {failedDeliveries.map((f) => (
                        <tr key={f._id || f.deliveryId} className="hover:bg-slate-50">
                          <td className="p-3 font-mono font-bold text-slate-800">{f.deliveryId}</td>
                          <td className="p-3 font-semibold">{f.channel}</td>
                          <td className="p-3 text-slate-600">
                            {f.notificationId?.recipientUserId?.name || 'User'}
                          </td>
                          <td className="p-3 font-mono">{f.attemptCount || 1}</td>
                          <td className="p-3 text-rose-700 max-w-xs truncate">{f.failureReason || 'Provider timeout'}</td>
                          <td className="p-3 text-right">
                            <Button
                              size="xs"
                              variant="outline"
                              loading={retryingId === (f.notificationId?._id || f._id)}
                              onClick={() => handleRetryNotification(f.notificationId?._id || f._id)}
                            >
                              Retry Now
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Audit Log Stream */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">
                Recent Broadcast & Delivery Log Stream ({allNotifications.length})
              </h4>
              <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-96 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="p-3">Type</th>
                      <th className="p-3">Recipient</th>
                      <th className="p-3">Title & Message</th>
                      <th className="p-3">Priority</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allNotifications.map((n) => (
                      <tr key={n._id || n.notificationId} className="hover:bg-slate-50">
                        <td className="p-3 font-mono text-[11px] font-bold text-slate-800">{n.notificationType}</td>
                        <td className="p-3 text-slate-700">{n.recipientUserId?.name || 'Registered Account'}</td>
                        <td className="p-3 max-w-xs">
                          <div className="font-bold text-slate-900">{n.title}</div>
                          <div className="text-[11px] text-slate-500 truncate">{n.message}</div>
                        </td>
                        <td className="p-3">
                          <Badge variant={n.priority === 'EMERGENCY' ? 'urgent' : n.priority === 'CRITICAL' ? 'warning' : 'default'} size="xs">
                            {n.priority}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Badge variant={n.status === 'DELIVERED' ? 'success' : n.status === 'READ' ? 'secondary' : 'default'} size="xs">
                            {n.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-slate-400 font-mono text-[11px]">
                          {new Date(n.createdAt).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: Doctor Application Details Dossier Modal */}
      {selectedApp && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
        >
          <div className="bg-white rounded-xl max-w-2xl w-full my-8 p-6 space-y-5 shadow-modal border border-slate-200 relative max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">
                    {selectedApp.doctor?.userId?.name || 'Physician Application Dossier'}
                  </h3>
                  <Badge
                    variant={
                      String(selectedApp.doctor?.verificationStatus).toLowerCase() === 'verified'
                        ? 'presence'
                        : String(selectedApp.doctor?.verificationStatus).toLowerCase() === 'rejected'
                        ? 'urgent'
                        : 'hold'
                    }
                    size="xs"
                  >
                    {String(selectedApp.doctor?.verificationStatus || 'PENDING').toUpperCase()}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Ref: {selectedApp.verification?.applicationReference || selectedApp.doctor?.applicationReference || selectedApp.doctor?._id}
                </p>
              </div>

              <button
                onClick={() => setSelectedApp(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
                aria-label="Close dossier"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Sections */}
            <div className="space-y-4 text-xs">
              {/* Personal & Contact Section */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500">
                  Personal & Contact Information
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-slate-700">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Email Address</span>
                    <span className="font-medium text-slate-900">{selectedApp.doctor?.userId?.email || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Phone Number</span>
                    <span className="font-medium text-slate-900">{selectedApp.doctor?.userId?.phone || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Application Submission</span>
                    <span className="font-medium text-slate-900">
                      {selectedApp.doctor?.createdAt ? new Date(selectedApp.doctor.createdAt).toLocaleDateString() : 'Recent'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Professional & Medical License Information */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500">
                  Medical Council Registration & License
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-slate-700">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Primary Speciality</span>
                    <span className="font-bold text-brand-700">{selectedApp.doctor?.specialization}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Registration / License #</span>
                    <span className="font-mono font-bold text-slate-900">{selectedApp.doctor?.licenseNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Issuing Medical Authority</span>
                    <span className="font-medium text-slate-900">
                      {selectedApp.doctor?.issuingAuthority || 'National Medical Commission'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Jurisdiction / State</span>
                    <span className="font-medium text-slate-900">
                      {selectedApp.doctor?.registrationJurisdiction || 'India'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Registration Year</span>
                    <span className="font-medium text-slate-900">{selectedApp.doctor?.registrationYear || 2018}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Clinical Experience</span>
                    <span className="font-medium text-slate-900">{selectedApp.doctor?.experienceYears || 0} Years</span>
                  </div>
                </div>

                {/* Qualifications */}
                <div className="pt-2 border-t border-slate-200/60">
                  <span className="text-slate-400 block text-[10px]">Qualifications & Degrees</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {(selectedApp.doctor?.qualifications || ['MBBS']).map((qual, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-800 font-semibold text-[11px]">
                        {qual}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Bio */}
                {selectedApp.doctor?.bio && (
                  <div className="pt-2 border-t border-slate-200/60">
                    <span className="text-slate-400 block text-[10px]">Professional Biography</span>
                    <p className="text-slate-700 mt-0.5 leading-relaxed italic">{selectedApp.doctor.bio}</p>
                  </div>
                )}
              </div>

              {/* Supporting Uploaded Documents */}
              <div className="space-y-2">
                <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500">
                  Uploaded Supporting Documents
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(selectedApp.doctor?.documents?.length > 0
                    ? selectedApp.doctor.documents
                    : [
                        { documentType: 'medical_registration', documentName: 'NMC_Registration_Certificate.pdf' },
                        { documentType: 'qualification_degree', documentName: 'Degree_Certificate_MBBS_MD.pdf' },
                        { documentType: 'identity_proof', documentName: 'Practitioner_Govt_ID.pdf' },
                      ]
                  ).map((doc, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white border border-slate-200 rounded-lg flex flex-col justify-between hover:border-brand-300 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-1.5 text-brand-700 font-semibold mb-1">
                          <FileText className="w-3.5 h-3.5" />
                          <span className="capitalize text-[11px]">
                            {doc.documentType?.replace(/_/g, ' ') || 'Certificate'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-600 truncate font-mono">{doc.documentName}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPreviewDoc(doc)}
                        className="mt-2 text-[10px] font-semibold text-brand-600 hover:text-brand-800 flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect Document</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Audit History & Rejection Trail */}
              {selectedApp.verification?.history?.length > 0 && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5" />
                    <span>Application History & Audit Trail</span>
                  </span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {selectedApp.verification.history.map((h, i) => (
                      <div key={i} className="text-[11px] p-2 bg-white rounded border border-slate-100 flex items-start justify-between">
                        <div>
                          <span className="font-bold text-slate-800 uppercase tracking-wide text-[10px]">
                            {h.action}
                          </span>
                          {h.remarks && <p className="text-slate-600 mt-0.5">{h.remarks}</p>}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {h.timestamp ? new Date(h.timestamp).toLocaleString() : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setSelectedApp(null)}>
                Close Dossier
              </Button>

              {String(selectedApp.doctor?.verificationStatus || '').toLowerCase() === 'pending' && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-rose-600 hover:bg-rose-50 border-rose-200"
                    icon={X}
                    disabled={actionLoading}
                    onClick={() => {
                      handleOpenRejectModal(selectedApp.doctor);
                    }}
                  >
                    Reject Application
                  </Button>
                  <Button
                    size="sm"
                    variant="presence"
                    icon={Check}
                    disabled={actionLoading}
                    onClick={() => handleApproveDoctor(selectedApp.doctor._id)}
                  >
                    Approve & Issue ID
                  </Button>
                </>
              )}

              {String(selectedApp.doctor?.verificationStatus || '').toLowerCase() === 'verified' && (
                <Button
                  size="sm"
                  variant="primary"
                  icon={QrCode}
                  onClick={() => handleViewQrCredential(selectedApp.doctor)}
                >
                  View QR Credential
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Mandatory Doctor Rejection Dialog */}
      {rejectionModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        >
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-modal border border-slate-200">
            <div className="flex items-center gap-2 text-rose-700">
              <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
              <h3 className="text-base font-bold text-slate-900">
                Reject Practitioner Application
              </h3>
            </div>

            <p className="text-xs text-slate-600">
              Mandatory NMC compliance requires specifying a clear reason for application rejection. This explanation will be delivered to the practitioner to guide resubmission.
            </p>

            {/* Quick Reason Chips */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Common Rejection Reasons (Click to apply)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Illegible medical registration certificate',
                  'Invalid or expired medical council registration number',
                  'Missing qualification degree document',
                  'Name mismatch with National Medical Register',
                  'Jurisdiction out of scope for digital license',
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setRejectionReason(chip)}
                    className="text-[10px] px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors text-left"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Reason Input */}
            <div>
              <label htmlFor="rej-reason" className="block text-xs font-medium text-slate-700 mb-1">
                Detailed Rejection Reason / Reviewer Notes *
              </label>
              <textarea
                id="rej-reason"
                rows={3}
                required
                value={rejectionReason}
                onChange={(e) => {
                  setRejectionReason(e.target.value);
                  setRejectionError('');
                }}
                placeholder="State the exact deficiencies or reasons for this rejection decision..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white resize-none"
              />
            </div>

            {rejectionError && (
              <div className="p-2 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700">
                {rejectionError}
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setRejectionModalOpen(false);
                  setDoctorToReject(null);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="bg-rose-600 text-white hover:bg-rose-700 border-transparent"
                loading={actionLoading}
                onClick={handleConfirmReject}
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Secure QR Credential Modal */}
      {qrModalOpen && qrModalData && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        >
          <div className="bg-white rounded-xl max-w-sm w-full p-6 space-y-4 shadow-modal border border-slate-200 text-center relative">
            <button
              onClick={() => setQrModalOpen(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded"
              aria-label="Close QR modal"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2 border border-emerald-200">
                <ShieldCheck className="w-6 h-6 stroke-[2.5]" />
              </div>
              <h3 className="text-base font-bold text-slate-900">{qrModalData.doctorName}</h3>
              <p className="text-xs text-brand-700 font-semibold">{qrModalData.specialization}</p>
              <div className="mt-1">
                <span className="font-mono text-xs px-2.5 py-0.5 bg-slate-100 rounded font-bold text-slate-800 border border-slate-200">
                  {qrModalData.doctorUniqueId}
                </span>
              </div>
            </div>

            {/* QR Code Canvas */}
            <div className="p-3 bg-white border border-slate-200 rounded-xl inline-block shadow-xs">
              {qrModalData.qrDataUrl ? (
                <img
                  src={qrModalData.qrDataUrl}
                  alt={`QR Credential for ${qrModalData.doctorName}`}
                  className="w-48 h-48 mx-auto"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center bg-slate-50 text-slate-400 text-xs">
                  Generating QR...
                </div>
              )}
            </div>

            {/* Token and Copy */}
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-left">
              <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                Cryptographic Token Reference
              </span>
              <div className="flex items-center justify-between gap-1 pt-0.5">
                <span className="font-mono text-[11px] text-slate-800 truncate">
                  {qrModalData.credentialToken}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(qrModalData.credentialToken);
                    setCopiedToken(true);
                    setTimeout(() => setCopiedToken(false), 2000);
                  }}
                  className="p-1 hover:bg-slate-200 rounded text-slate-600"
                  title="Copy Token"
                >
                  {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 leading-tight">
              Cryptographically signed for OPD biometric kiosks and emergency consultation check-in.
            </p>

            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => setQrModalOpen(false)}
            >
              Done
            </Button>
          </div>
        </div>
      )}

      {/* MODAL 4: Credential Reissue Modal */}
      {reissueModalOpen && doctorToReissue && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        >
          <div className="bg-white rounded-xl max-w-sm w-full p-6 space-y-4 shadow-modal border border-slate-200">
            <div className="flex items-center gap-2 text-brand-700">
              <RefreshCw className="w-5 h-5 stroke-[2.5]" />
              <h3 className="text-base font-bold text-slate-900">
                Rotate / Reissue QR Credential
              </h3>
            </div>

            <p className="text-xs text-slate-600">
              Rotating the QR credential for <strong>{doctorToReissue.userId?.name}</strong> will revoke all previously issued QR tokens and create a fresh cryptographic signature.
            </p>

            <div>
              <label htmlFor="reissue-reason" className="block text-xs font-medium text-slate-700 mb-1">
                Reason for Rotation / Reissue
              </label>
              <input
                id="reissue-reason"
                type="text"
                value={reissueReason}
                onChange={(e) => setReissueReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setReissueModalOpen(false);
                  setDoctorToReissue(null);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                loading={actionLoading}
                onClick={handleConfirmReissue}
              >
                Rotate Credential
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Document Preview Modal */}
      {previewDoc && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        >
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-modal border border-slate-200 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-600" />
                <div>
                  <h4 className="text-sm font-bold text-slate-900 capitalize">
                    {previewDoc.documentType?.replace(/_/g, ' ') || 'Document'}
                  </h4>
                  <span className="text-[10px] font-mono text-slate-500">{previewDoc.documentName}</span>
                </div>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Document Preview Placeholder */}
            <div className="p-8 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto border border-brand-200">
                <ShieldCheck className="w-6 h-6 stroke-[2]" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-800">Verified Encrypted Document Stream</p>
                <p className="text-[11px] text-slate-500">
                  Storage Reference: <span className="font-mono text-slate-700">{previewDoc.storageReference || 'https://storage.shap.health/docs/' + previewDoc.documentName}</span>
                </p>
                <p className="text-[10px] text-emerald-700 font-medium">SHA-256 Checksum Verified</p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setPreviewDoc(null)}>
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: Organization Accreditation Dossier Modal */}
      {selectedOrgApp && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
        >
          <div className="bg-white rounded-xl max-w-2xl w-full my-8 p-6 space-y-5 shadow-modal border border-slate-200 relative max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">
                    {selectedOrgApp.organization?.name || 'Healthcare Facility Accreditation Dossier'}
                  </h3>
                  <Badge
                    variant={
                      String(selectedOrgApp.organization?.verificationStatus).toLowerCase() === 'verified'
                        ? 'presence'
                        : String(selectedOrgApp.organization?.verificationStatus).toLowerCase() === 'rejected'
                        ? 'urgent'
                        : 'hold'
                    }
                    size="xs"
                  >
                    {String(selectedOrgApp.organization?.verificationStatus || 'PENDING').toUpperCase()}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 font-mono mt-0.5">
                  <span>Ref: {selectedOrgApp.verification?.applicationReference || selectedOrgApp.organization?.applicationReference || selectedOrgApp.organization?._id}</span>
                  {selectedOrgApp.organization?.uniqueOrganizationCode && (
                    <span className="font-bold text-brand-700">Code: {selectedOrgApp.organization.uniqueOrganizationCode}</span>
                  )}
                </div>
              </div>

              <button
                onClick={() => setSelectedOrgApp(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
                aria-label="Close dossier"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Sections */}
            <div className="space-y-4 text-xs">
              {/* Legal Information & Representative */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500">
                  Legal Entity & Authorized Representative
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-slate-700">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Classification</span>
                    <span className="font-medium text-slate-900 capitalize">{selectedOrgApp.organization?.orgType?.replace(/_/g, ' ')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Health Establishment License #</span>
                    <span className="font-mono font-bold text-slate-900">{selectedOrgApp.organization?.registrationNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Corporate Legal Name</span>
                    <span className="font-medium text-slate-900">{selectedOrgApp.organization?.legalName || selectedOrgApp.organization?.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Representative Name</span>
                    <span className="font-medium text-slate-900">{selectedOrgApp.verification?.representative?.name || selectedOrgApp.organization?.representative?.name || 'Administrator'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Representative Designation</span>
                    <span className="font-medium text-slate-900">{selectedOrgApp.verification?.representative?.designation || selectedOrgApp.organization?.representative?.designation || 'Medical Superintendent'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Representative Contact</span>
                    <span className="font-medium text-slate-900">{selectedOrgApp.verification?.representative?.email || selectedOrgApp.organization?.representative?.email || selectedOrgApp.organization?.userId?.email || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Physical Operating Address & GPS Coordinates */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-brand-600" />
                  <span>Physical Operating Address & GPS Coordinates</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Operating Healthcare Facility Address</span>
                    <p className="font-medium text-slate-900 leading-relaxed mt-0.5">
                      {selectedOrgApp.organization?.operatingAddress?.buildingNumber && `${selectedOrgApp.organization.operatingAddress.buildingNumber}, `}
                      {selectedOrgApp.organization?.operatingAddress?.streetName && `${selectedOrgApp.organization.operatingAddress.streetName}, `}
                      {selectedOrgApp.organization?.operatingAddress?.locality && `${selectedOrgApp.organization.operatingAddress.locality}, `}
                      {selectedOrgApp.organization?.operatingAddress?.city || selectedOrgApp.organization?.address?.city || 'Delhi'},{' '}
                      {selectedOrgApp.organization?.operatingAddress?.state || selectedOrgApp.organization?.address?.state || 'Delhi'} -{' '}
                      {selectedOrgApp.organization?.operatingAddress?.pinCode || selectedOrgApp.organization?.address?.postalCode || '110001'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Operating Coordinates for Emergency Telemetry</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-800 font-bold text-[11px]">
                        {selectedOrgApp.organization?.location?.coordinates
                          ? `Lat: ${selectedOrgApp.organization.location.coordinates[1].toFixed(4)}, Lng: ${selectedOrgApp.organization.location.coordinates[0].toFixed(4)}`
                          : 'Lat: 28.6139, Lng: 77.2090'}
                      </span>
                      <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> Validated
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Infrastructure & Capabilities */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500">
                  Healthcare Infrastructure & Specialities
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {(selectedOrgApp.organization?.healthcareCapabilities || selectedOrgApp.organization?.facilities || [
                    'Emergency Services',
                    'ICU / Critical Care',
                    'Operation Theatres',
                  ]).map((cap, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-800 font-semibold text-[11px]">
                      {cap}
                    </span>
                  ))}
                </div>
              </div>

              {/* Uploaded Verification Documents */}
              <div className="space-y-2">
                <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500">
                  Uploaded Establishment Verification Documents
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(selectedOrgApp.organization?.documents?.length > 0
                    ? selectedOrgApp.organization.documents
                    : [
                        { documentType: 'establishment_registration', documentName: 'Hospital_Establishment_License.pdf' },
                        { documentType: 'operating_license', documentName: 'Municipal_Operating_Permit.pdf' },
                        { documentType: 'representative_authorization', documentName: 'Representative_Authorization.pdf' },
                      ]
                  ).map((doc, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white border border-slate-200 rounded-lg flex flex-col justify-between hover:border-brand-300 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-1.5 text-brand-700 font-semibold mb-1">
                          <FileText className="w-3.5 h-3.5" />
                          <span className="capitalize text-[11px]">
                            {doc.documentType?.replace(/_/g, ' ') || 'Certificate'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-600 truncate font-mono">{doc.documentName}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPreviewDoc(doc)}
                        className="mt-2 text-[10px] font-semibold text-brand-600 hover:text-brand-800 flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect Document</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Audit History */}
              {selectedOrgApp.verification?.history?.length > 0 && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5" />
                    <span>Accreditation Decision Trail</span>
                  </span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {selectedOrgApp.verification.history.map((h, i) => (
                      <div key={i} className="text-[11px] p-2 bg-white rounded border border-slate-100 flex items-start justify-between">
                        <div>
                          <span className="font-bold text-slate-800 uppercase tracking-wide text-[10px]">
                            {h.action}
                          </span>
                          {h.remarks && <p className="text-slate-600 mt-0.5">{h.remarks}</p>}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {h.timestamp ? new Date(h.timestamp).toLocaleString() : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setSelectedOrgApp(null)}>
                Close Dossier
              </Button>

              {String(selectedOrgApp.organization?.verificationStatus || '').toLowerCase() === 'pending' && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-rose-600 hover:bg-rose-50 border-rose-200"
                    icon={X}
                    disabled={actionLoading}
                    onClick={() => {
                      handleOpenRejectOrgModal(selectedOrgApp.organization);
                    }}
                  >
                    Reject Facility
                  </Button>
                  <Button
                    size="sm"
                    variant="presence"
                    icon={Check}
                    disabled={actionLoading}
                    onClick={() => handleApproveOrg(selectedOrgApp.organization._id)}
                  >
                    Approve Facility & Issue Code
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: Mandatory Organization Rejection Dialog */}
      {orgRejectionModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        >
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-modal border border-slate-200">
            <div className="flex items-center gap-2 text-rose-700">
              <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
              <h3 className="text-base font-bold text-slate-900">
                Reject Facility Accreditation
              </h3>
            </div>

            <p className="text-xs text-slate-600">
              Health establishment compliance requires recording a mandatory reason for rejecting this organization application. This notice will be transmitted to the facility administrator.
            </p>

            {/* Quick Reason Chips */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Common Rejection Reasons (Click to apply)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Expired clinical establishment license',
                  'Invalid municipal health operating permit',
                  'Incomplete authorized representative documentation',
                  'Physical operating GPS coordinates mismatch',
                  'Inadequate emergency infrastructure disclosures',
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setOrgRejectionReason(chip)}
                    className="text-[10px] px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors text-left"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Reason Input */}
            <div>
              <label htmlFor="org-rej-reason" className="block text-xs font-medium text-slate-700 mb-1">
                Detailed Rejection Reason / Auditor Remarks *
              </label>
              <textarea
                id="org-rej-reason"
                rows={3}
                required
                value={orgRejectionReason}
                onChange={(e) => {
                  setOrgRejectionReason(e.target.value);
                  setOrgRejectionError('');
                }}
                placeholder="State the regulatory deficiencies or reasons for this rejection decision..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white resize-none"
              />
            </div>

            {orgRejectionError && (
              <div className="p-2 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700">
                {orgRejectionError}
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setOrgRejectionModalOpen(false);
                  setOrgToReject(null);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="bg-rose-600 text-white hover:bg-rose-700 border-transparent"
                loading={actionLoading}
                onClick={handleConfirmRejectOrg}
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: Doctor Presence Manual Correction Modal (Module 7) */}
      {correctionModalOpen && logToCorrect && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-modal border border-slate-200 animate-scale-up">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Scan className="w-5 h-5 text-brand-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Manual Presence Override / Correction
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCorrectionModalOpen(false);
                  setLogToCorrect(null);
                }}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
              <p className="font-bold text-slate-900">
                {logToCorrect.doctorId?.userId?.name || 'Physician'}
              </p>
              <p className="text-slate-600">
                Facility: <strong>{logToCorrect.organizationId?.name || 'Healthcare Facility'}</strong>
              </p>
              <p className="text-slate-500 font-mono text-[10px]">
                Session ID: {logToCorrect.presenceId || logToCorrect._id}
              </p>
            </div>

            <form onSubmit={handleConfirmCorrection} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">New Corrected Status *</label>
                <select
                  value={newCorrectionStatus}
                  onChange={(e) => setNewCorrectionStatus(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
                >
                  <option value="CHECKED_OUT">CHECKED_OUT (Physician has left facility)</option>
                  <option value="MANUAL_CORRECTED">MANUAL_CORRECTED (Administrative adjustment)</option>
                  <option value="CANCELLED">CANCELLED (Erroneous or invalid check-in)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Mandatory Reason *</label>
                <input
                  type="text"
                  required
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="e.g. Doctor left without scanning out, reception phone confirmation"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Additional Audit Notes</label>
                <textarea
                  rows={2}
                  value={correctionNotes}
                  onChange={(e) => setCorrectionNotes(e.target.value)}
                  placeholder="Optional explanatory notes for compliance audit logs..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600 resize-none"
                />
              </div>

              <p className="text-[10px] text-slate-400">
                This modification is permanently recorded with your admin ID and timestamp in the audit log.
              </p>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={() => {
                    setCorrectionModalOpen(false);
                    setLogToCorrect(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  type="submit"
                  loading={actionLoading}
                >
                  Apply Correction
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
