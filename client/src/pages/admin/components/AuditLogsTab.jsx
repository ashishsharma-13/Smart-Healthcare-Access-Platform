import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import {
  History,
  Search,
  Filter,
  ShieldCheck,
  Eye,
  RefreshCw,
  FileCheck,
  FileCode,
  AlertCircle,
  X,
  User,
  Clock,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { TableSkeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';

export const AuditLogsTab = ({ onNotify }) => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('ALL');
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Selected Log Details Modal State
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter, entityFilter]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit: 15,
      });
      if (actionFilter !== 'ALL') params.append('action', actionFilter);
      if (entityFilter !== 'ALL') params.append('targetEntityType', entityFilter);
      if (search.trim()) params.append('search', search.trim());

      const res = await api.get(`/admin/audit-logs?${params.toString()}`);
      if (res.data?.success) {
        setLogs(res.data.logs || []);
        setTotal(res.data.total || 0);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      onNotify?.({ type: 'error', message: 'Could not load administrative audit logs.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const getActionBadgeColor = (action) => {
    if (action.includes('REJECTION') || action.includes('SUSPEND') || action.includes('DELETE')) {
      return 'bg-rose-100 text-rose-800 border-rose-200';
    }
    if (action.includes('APPROVAL') || action.includes('ACTIVATE') || action.includes('CREATE')) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
    if (action.includes('CONFIG') || action.includes('UPDATE')) {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-4">
      {/* Top Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by audit ID, admin email, or reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Actions</option>
              <option value="USER_STATUS_CHANGE">User Status Change</option>
              <option value="DOCTOR_APPROVAL">Doctor Approval</option>
              <option value="DOCTOR_REJECTION">Doctor Rejection</option>
              <option value="ORGANIZATION_APPROVAL">Organization Approval</option>
              <option value="ORGANIZATION_REJECTION">Organization Rejection</option>
              <option value="CONFIG_UPDATE">Configuration Update</option>
              <option value="SPECIALIZATION_CREATE">Specialization Create</option>
              <option value="SPECIALIZATION_STATUS_CHANGE">Specialization Toggle</option>
              <option value="PRESENCE_CORRECTION">Presence Correction</option>
              <option value="REPORT_GENERATED">Report Generated</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
            <select
              value={entityFilter}
              onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Entities</option>
              <option value="User">User</option>
              <option value="Doctor">Doctor</option>
              <option value="Organization">Organization</option>
              <option value="PlatformConfiguration">Platform Configuration</option>
              <option value="Specialization">Specialization</option>
              <option value="DoctorPresenceLog">Presence Log</option>
            </select>
          </div>

          <Button size="sm" variant="outline" icon={RefreshCw} onClick={fetchLogs}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
        {loading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : logs.length === 0 ? (
          <EmptyState
            icon={History}
            title="No Audit Records Found"
            description="No administrative actions match your specified search filter."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="p-3">Audit Reference</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Target Entity</th>
                  <th className="p-3">Administrator</th>
                  <th className="p-3">Mandatory Rationale</th>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log._id || log.auditLogId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3 font-mono font-bold text-brand-700 text-[11px]">{log.auditLogId}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getActionBadgeColor(log.action)}`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-3">
                      <p className="font-semibold text-slate-900">{log.targetEntityType}</p>
                      <p className="font-mono text-[10px] text-slate-400 truncate max-w-[120px]">{log.targetEntityId}</p>
                    </td>
                    <td className="p-3 text-slate-700 font-medium">{log.adminEmail}</td>
                    <td className="p-3 text-slate-600 text-[11px] max-w-xs truncate">
                      {log.reason || 'Standard operational verification'}
                    </td>
                    <td className="p-3 text-slate-500 text-[11px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        size="xs"
                        variant="ghost"
                        icon={Eye}
                        onClick={() => setSelectedLog(log)}
                      >
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inspect Audit Entry Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-brand-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Immutable Audit Record</h3>
                  <p className="font-mono text-xs text-brand-700">{selectedLog.auditLogId}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Action</span>
                  <p className="font-bold text-slate-900 mt-0.5">{selectedLog.action}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Target Entity</span>
                  <p className="font-bold text-slate-900 mt-0.5">{selectedLog.targetEntityType}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Target ID</span>
                  <p className="font-mono text-slate-700 mt-0.5 truncate">{selectedLog.targetEntityId}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Admin User</span>
                  <p className="text-slate-700 mt-0.5 truncate">{selectedLog.adminEmail}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Client IP</span>
                  <p className="font-mono text-slate-700 mt-0.5">{selectedLog.ipAddress || 'Internal'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Recorded At</span>
                  <p className="text-slate-700 mt-0.5">{new Date(selectedLog.timestamp).toLocaleString()}</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Governance Reason</span>
                <p className="font-semibold text-slate-900 mt-0.5">
                  {selectedLog.reason || 'Standard operational verification'}
                </p>
              </div>

              {selectedLog.previousValue !== null && selectedLog.newValue !== null && (
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Value Mutation Diff</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 bg-rose-50/50 border border-rose-200 rounded-lg">
                      <span className="text-[10px] font-bold text-rose-700 uppercase">Previous State</span>
                      <pre className="font-mono text-[10px] text-rose-900 mt-1 whitespace-pre-wrap overflow-x-auto max-h-40">
                        {JSON.stringify(selectedLog.previousValue, null, 2)}
                      </pre>
                    </div>
                    <div className="p-2.5 bg-emerald-50/50 border border-emerald-200 rounded-lg">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase">New State</span>
                      <pre className="font-mono text-[10px] text-emerald-900 mt-1 whitespace-pre-wrap overflow-x-auto max-h-40">
                        {JSON.stringify(selectedLog.newValue, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setSelectedLog(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

