import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import {
  Users,
  Search,
  Filter,
  Shield,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Eye,
  AlertTriangle,
  RefreshCw,
  Lock,
  Unlock,
  Calendar,
  Phone,
  Mail,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { TableSkeleton } from '../../../components/ui/Skeleton';

export const UserManagementTab = ({ onNotify }) => {
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  // Selected User Details Modal State
  const [selectedUser, setSelectedUser] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Status Change Modal State
  const [statusModalUser, setStatusModalUser] = useState(null);
  const [targetStatus, setTargetStatus] = useState('suspended');
  const [statusReason, setStatusReason] = useState('');
  const [submittingStatus, setSubmittingStatus] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter, statusFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit: 15,
      });
      if (roleFilter !== 'ALL') params.append('role', roleFilter);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (search.trim()) params.append('search', search.trim());

      const res = await api.get(`/admin/users?${params.toString()}`);
      if (res.data?.success) {
        setUsers(res.data.users || []);
        setTotalUsers(res.data.total || 0);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      onNotify?.({ type: 'error', message: 'Could not fetch user directory.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleViewUser = async (userId) => {
    try {
      setLoadingDetails(true);
      setSelectedUser(null);
      const res = await api.get(`/admin/users/${userId}`);
      if (res.data?.success) {
        setSelectedUser(res.data.data);
      }
    } catch (err) {
      onNotify?.({ type: 'error', message: 'Failed to load user details.' });
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleOpenStatusModal = (user, desiredStatus) => {
    setStatusModalUser(user);
    setTargetStatus(desiredStatus);
    setStatusReason('');
    setFormError('');
  };

  const handleConfirmStatusChange = async (e) => {
    e.preventDefault();
    if (!statusReason.trim()) {
      setFormError('A mandatory reason is strictly required to modify an account status.');
      return;
    }

    try {
      setSubmittingStatus(true);
      setFormError('');
      const res = await api.patch(`/admin/users/${statusModalUser._id}/status`, {
        status: targetStatus,
        reason: statusReason.trim(),
      });

      if (res.data?.success) {
        onNotify?.({
          type: 'success',
          message: res.data.message || `User account successfully ${targetStatus}.`,
        });
        setStatusModalUser(null);
        fetchUsers();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to update user status.');
    } finally {
      setSubmittingStatus(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search users by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Roles</option>
              <option value="patient">Patients</option>
              <option value="doctor">Doctors</option>
              <option value="organization">Organizations</option>
              <option value="admin">Administrators</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="pending_verification">Pending Verification</option>
            </select>
          </div>

          <Button size="sm" variant="outline" icon={RefreshCw} onClick={fetchUsers}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        {loading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : users.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No Users Found"
            description="No user accounts match your specified filter criteria."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="p-3">User</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Account Status</th>
                  <th className="p-3">Joined</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-brand-50 border border-brand-200 text-brand-700 font-bold flex items-center justify-center text-xs">
                          {u.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{u.name}</p>
                          <p className="text-[11px] text-slate-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        u.role === 'admin' || u.role === 'web_admin'
                          ? 'bg-purple-100 text-purple-800'
                          : u.role === 'doctor'
                          ? 'bg-blue-100 text-blue-800'
                          : u.role === 'organization'
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600 font-mono text-[11px]">{u.phone || 'N/A'}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        u.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : u.status === 'suspended'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        {u.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500 text-[11px]">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="xs"
                          variant="ghost"
                          icon={Eye}
                          onClick={() => handleViewUser(u._id)}
                        >
                          View
                        </Button>
                        {u.status === 'active' ? (
                          <Button
                            size="xs"
                            variant="danger"
                            icon={Lock}
                            onClick={() => handleOpenStatusModal(u, 'suspended')}
                          >
                            Suspend
                          </Button>
                        ) : (
                          <Button
                            size="xs"
                            variant="outline"
                            icon={Unlock}
                            onClick={() => handleOpenStatusModal(u, 'active')}
                          >
                            Activate
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-brand-600" />
                <h3 className="font-bold text-slate-900 text-sm">User Account Details</h3>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-10 h-10 rounded-full bg-brand-600 text-white font-bold flex items-center justify-center text-sm">
                  {selectedUser.user.name?.charAt(0) || 'U'}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{selectedUser.user.name}</h4>
                  <p className="text-slate-500">{selectedUser.user.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-semibold text-[10px] uppercase bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                      {selectedUser.user.role}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      selectedUser.user.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {selectedUser.user.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Phone</span>
                  <p className="font-mono text-slate-700">{selectedUser.user.phone || 'None recorded'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Blood Group</span>
                  <p className="font-mono text-slate-700">{selectedUser.user.bloodGroup || 'Not specified'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Consultations Booked</span>
                  <p className="font-bold text-brand-700">{selectedUser.activity?.appointmentsCount || 0}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Emergency Dispatches</span>
                  <p className="font-bold text-rose-700">{selectedUser.activity?.emergenciesCount || 0}</p>
                </div>
              </div>

              {selectedUser.roleProfile && (
                <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg">
                  <span className="text-[10px] text-blue-600 uppercase font-bold">Linked Practitioner / Org Profile</span>
                  <p className="font-bold text-slate-900 mt-0.5">{selectedUser.roleProfile.name}</p>
                  <p className="text-[11px] text-slate-600">
                    License / Reg: {selectedUser.roleProfile.licenseNumber || selectedUser.roleProfile.registrationNumber}
                  </p>
                  <p className="text-[11px] text-slate-500">Status: {selectedUser.roleProfile.verificationStatus}</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setSelectedUser(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Account Status / Suspension Modal */}
      {statusModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmStatusChange}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200"
          >
            <div className="flex items-center gap-2 mb-3">
              {targetStatus === 'suspended' ? (
                <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Unlock className="w-4 h-4" />
                </div>
              )}
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  {targetStatus === 'suspended' ? 'Suspend User Account' : 'Reactivate User Account'}
                </h3>
                <p className="text-xs text-slate-500">{statusModalUser.name} ({statusModalUser.email})</p>
              </div>
            </div>

            {formError && (
              <div className="p-2.5 mb-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-medium">
                {formError}
              </div>
            )}

            <div className="space-y-3 text-xs mb-4">
              <p className="text-slate-600">
                {targetStatus === 'suspended'
                  ? 'Suspending this account will immediately revoke all access, invalidate session tokens, and block emergency dispatch report creation.'
                  : 'Reactivating this user account will restore system access and booking privileges.'}
              </p>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  Mandatory Governance Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder={
                    targetStatus === 'suspended'
                      ? 'Specify regulatory violation or abuse incident rationale...'
                      : 'Specify reinstatement verification rationale...'
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setStatusModalUser(null)}
                disabled={submittingStatus}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                variant={targetStatus === 'suspended' ? 'danger' : 'primary'}
                loading={submittingStatus}
              >
                {targetStatus === 'suspended' ? 'Confirm Suspension' : 'Confirm Activation'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

