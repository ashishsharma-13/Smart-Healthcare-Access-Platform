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
} from 'lucide-react';

export const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [pendingDoctors, setPendingDoctors] = useState([]);
  const [pendingOrgs, setPendingOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

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
        alert('Doctor verified successfully! Unique Doctor ID & QR Credential generated.');
        fetchAdminData();
      }
    } catch (err) {
      alert('Approval error: ' + (err.response?.data?.message || err.message));
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
      fetchAdminData();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveOrg = async (orgId) => {
    try {
      setActionLoading(true);
      const res = await api.post(`/admin/organizations/${orgId}/approve`);
      if (res.data.success) {
        alert('Organization verified successfully!');
        fetchAdminData();
      }
    } catch (err) {
      alert('Approval error: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading system administration...</div>;
  }

  return (
    <div className="space-y-8 pb-12">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Administrator Governance Portal</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Medical license verification, participating hospital accreditation, and emergency oversight.
        </p>
      </div>

      {/* Overview Metrics Grid matching Screen 17 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Users</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{stats?.totalUsers || 0}</p>
          <span className="text-[11px] text-blue-600 font-semibold">Registered Patients & Staff</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Doctors</span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-black text-slate-900">{stats?.doctors?.verified || 0}</span>
            <span className="text-xs text-amber-600 font-bold">({stats?.doctors?.pending || 0} pending)</span>
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold">Verified Practitioners</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Hospitals</span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-black text-slate-900">{stats?.organizations?.verified || 0}</span>
            <span className="text-xs text-amber-600 font-bold">({stats?.organizations?.pending || 0} pending)</span>
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold">Accredited Facilities</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Emergencies</span>
          <p className="text-2xl font-black text-red-600 mt-1">{stats?.activeEmergencies || 0}</p>
          <span className="text-[11px] text-red-600 font-semibold">Under Active Broadcast</span>
        </div>
      </div>

      {/* Doctor Verification Queue */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <FileCheck className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-black text-slate-900">Doctor Medical License Verification Queue</h2>
          </div>
          <span className="text-xs font-bold text-amber-600">Pending Review: {pendingDoctors.length}</span>
        </div>

        {pendingDoctors.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">No pending doctor registrations in queue.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
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
                  <tr key={doc._id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">{doc.userId?.name}</td>
                    <td className="p-3 text-blue-600 font-semibold">{doc.specialization}</td>
                    <td className="p-3 font-mono font-bold text-slate-700">{doc.licenseNumber}</td>
                    <td className="p-3 text-slate-600">{doc.experienceYears} Years</td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => handleApproveDoctor(doc._id)}
                        disabled={actionLoading}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs"
                      >
                        Approve & Issue ID
                      </button>
                      <button
                        onClick={() => handleRejectDoctor(doc._id)}
                        disabled={actionLoading}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl"
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Hospital Verification Queue */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-black text-slate-900">Healthcare Facility Accreditation Queue</h2>
          </div>
          <span className="text-xs font-bold text-amber-600">Pending Review: {pendingOrgs.length}</span>
        </div>

        {pendingOrgs.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">No pending facility registrations.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
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
                  <tr key={org._id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">{org.name}</td>
                    <td className="p-3 text-slate-700 capitalize">{org.orgType}</td>
                    <td className="p-3 font-mono font-bold text-slate-700">{org.registrationNumber}</td>
                    <td className="p-3 text-slate-600">{org.address?.city || 'Central City'}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleApproveOrg(org._id)}
                        disabled={actionLoading}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs"
                      >
                        Approve Facility
                      </button>
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

