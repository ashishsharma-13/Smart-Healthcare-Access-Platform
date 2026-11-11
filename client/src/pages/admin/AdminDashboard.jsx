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
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { Toast } from '../../components/ui/Toast';

export const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [pendingDoctors, setPendingDoctors] = useState([]);
  const [pendingOrgs, setPendingOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [statsRes, docRes, orgRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/doctors/pending'),
        api.get('/admin/organizations/pending'),
      ]);

      if (statsRes.data.success) setStats(statsRes.data.data);
      if (docRes.data.success) setPendingDoctors(docRes.data.data);
      if (orgRes.data.success) setPendingOrgs(orgRes.data.data);
    } catch (err) {
      console.error('Error loading admin portal', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveDoctor = async (doctorId) => {
    try {
      setActionLoading(true);
      const res = await api.post(`/admin/doctors/${doctorId}/approve`);
      if (res.data.success) {
        setFeedback({ type: 'success', message: 'Doctor verified successfully. Unique ID & QR Credential generated.' });
        fetchAdminData();
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Approval error: ' + (err.response?.data?.message || err.message) });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectDoctor = async (doctorId) => {
    const reason = prompt('Specify rejection reason:');
    if (!reason) return;

    try {
      setActionLoading(true);
      await api.post(`/admin/doctors/${doctorId}/reject`, { reason });
      setFeedback({ type: 'info', message: 'Doctor application rejected.' });
      fetchAdminData();
    } catch (err) {
      setFeedback({ type: 'error', message: 'Error: ' + (err.response?.data?.message || err.message) });
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveOrg = async (orgId) => {
    try {
      setActionLoading(true);
      const res = await api.post(`/admin/organizations/${orgId}/approve`);
      if (res.data.success) {
        setFeedback({ type: 'success', message: 'Facility accredited and active for parallel emergency dispatch.' });
        fetchAdminData();
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Approval error: ' + (err.response?.data?.message || err.message) });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <TableSkeleton rows={4} cols={4} />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      
      {/* Title */}
      <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="neutral" size="xs">
              System Governance & Accreditation
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Executive Governance Administration
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            NMC medical license validation, participating hospital accreditation, and emergency oversight.
          </p>
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
          <span className="text-[11px] text-brand-600 font-medium">Registered Patients & Staff</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-card">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Practitioners</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-bold text-slate-900">{stats?.doctors?.verified || 0}</span>
            <span className="text-xs text-hold-700 font-bold">({stats?.doctors?.pending || 0} pending)</span>
          </div>
          <span className="text-[11px] text-presence-700 font-medium">NMC Verified</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-card">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Hospitals</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-bold text-slate-900">{stats?.organizations?.verified || 0}</span>
            <span className="text-xs text-hold-700 font-bold">({stats?.organizations?.pending || 0} pending)</span>
          </div>
          <span className="text-[11px] text-presence-700 font-medium">Accredited Trauma Centers</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-card">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Emergencies</span>
          <p className="text-2xl font-bold text-urgent-700 mt-1">{stats?.activeEmergencies || 0}</p>
          <span className="text-[11px] text-urgent-600 font-medium">Parallel Broadcasts Active</span>
        </div>
      </div>

      {/* Doctor Verification Queue */}
      <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-card space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-brand-600" />
            <h2 className="text-sm font-bold text-slate-900">Physician License Verification Queue</h2>
          </div>
          <Badge variant={pendingDoctors.length > 0 ? 'hold' : 'neutral'} size="xs">
            Pending Review: {pendingDoctors.length}
          </Badge>
        </div>

        {pendingDoctors.length === 0 ? (
          <EmptyState
            icon={FileCheck}
            title="No Pending Physician Applications"
            description="All registered doctors have been processed and validated."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="p-3">Applicant Name</th>
                  <th className="p-3">Specialization</th>
                  <th className="p-3">License Number</th>
                  <th className="p-3">Experience</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingDoctors.map((doc) => (
                  <tr key={doc._id} className="hover:bg-slate-50/60">
                    <td className="p-3 font-semibold text-slate-900">{doc.userId?.name}</td>
                    <td className="p-3 text-brand-700 font-medium">{doc.specialization}</td>
                    <td className="p-3 font-mono font-semibold text-slate-700">{doc.licenseNumber}</td>
                    <td className="p-3 text-slate-600">{doc.experienceYears} Years</td>
                    <td className="p-3 text-right space-x-2">
                      <Button
                        size="sm"
                        variant="presence"
                        disabled={actionLoading}
                        onClick={() => handleApproveDoctor(doc._id)}
                      >
                        Approve & Issue ID
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-rose-600 hover:bg-rose-50"
                        disabled={actionLoading}
                        onClick={() => handleRejectDoctor(doc._id)}
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

      {/* Hospital Accreditation Queue */}
      <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-card space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-brand-600" />
            <h2 className="text-sm font-bold text-slate-900">Hospital Accreditation Queue</h2>
          </div>
          <Badge variant={pendingOrgs.length > 0 ? 'hold' : 'neutral'} size="xs">
            Pending Review: {pendingOrgs.length}
          </Badge>
        </div>

        {pendingOrgs.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No Pending Hospital Accreditations"
            description="All healthcare facilities in the network have been validated."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="p-3">Organization Name</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Registration #</th>
                  <th className="p-3">Location</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingOrgs.map((org) => (
                  <tr key={org._id} className="hover:bg-slate-50/60">
                    <td className="p-3 font-semibold text-slate-900">{org.name}</td>
                    <td className="p-3 text-slate-700 capitalize">{org.orgType}</td>
                    <td className="p-3 font-mono font-semibold text-slate-700">{org.registrationNumber}</td>
                    <td className="p-3 text-slate-600">{org.address?.city || 'Central City'}</td>
                    <td className="p-3 text-right">
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={actionLoading}
                        onClick={() => handleApproveOrg(org._id)}
                      >
                        Approve Facility
                      </Button>
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

export default AdminDashboard;
