import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  BedDouble,
  ShieldAlert,
  Wind,
  Activity,
  Save,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Plus,
  Edit2,
  Sliders,
  History,
  Trash2,
  Eye,
  X,
  Check,
  ChevronRight,
  AlertCircle,
  Wrench,
  Search,
  Filter,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Toast } from '../../components/ui/Toast';

export const OrganizationResourcesPage = () => {
  const [resources, setResources] = useState([]);
  const [summary, setSummary] = useState(null);
  const [resourceTypes, setResourceTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Notifications
  const [toast, setToast] = useState({ message: '', type: 'info' });

  // Modals state
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isCapacityModalOpen, setIsCapacityModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [activeResource, setActiveResource] = useState(null);

  // History state
  const [historyRecords, setHistoryRecords] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Form states
  const [registerForm, setRegisterForm] = useState({
    resourceTypeId: '',
    resourceType: '',
    resourceName: '',
    totalQuantity: 10,
    availableQuantity: 10,
    operationalStatus: 'OPERATIONAL',
    maintenanceNotes: '',
    freshnessThresholdMinutes: 60,
  });

  const [capacityForm, setCapacityForm] = useState({
    totalQuantity: 10,
    reason: '',
  });

  const [adjustForm, setAdjustForm] = useState({
    adjustmentQuantity: 0,
    reason: '',
  });

  const [statusForm, setStatusForm] = useState({
    operationalStatus: 'OPERATIONAL',
    maintenanceNotes: '',
    maintenanceStartDate: '',
    maintenanceExpectedEndDate: '',
    reason: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [reconciling, setReconciling] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchResources(), fetchSummary(), fetchResourceTypes()]);
    } catch (err) {
      console.error('Failed to load initial data', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchResources = async () => {
    try {
      const res = await api.get('/organizations/me/resources');
      if (res.data.success) {
        setResources(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching resources:', err);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await api.get('/organizations/me/resources/summary');
      if (res.data.success) {
        setSummary(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching summary:', err);
    }
  };

  const fetchResourceTypes = async () => {
    try {
      const res = await api.get('/resource-types');
      if (res.data.success) {
        setResourceTypes(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching resource types:', err);
    }
  };

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  // Reconciliation handler
  const handleReconcileAll = async () => {
    try {
      setReconciling(true);
      const res = await api.post('/organizations/me/resources/reconcile', { autoCorrect: true });
      if (res.data.success) {
        showToast(
          `Reconciliation complete: evaluated ${res.data.data.totalResources} resources, corrected ${res.data.data.reconciledCount} discrepancies.`,
          'success'
        );
        await Promise.all([fetchResources(), fetchSummary()]);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Reconciliation failed', 'error');
    } finally {
      setReconciling(false);
    }
  };

  const handleReconcileSingle = async (resource) => {
    try {
      const res = await api.post(`/organizations/me/resources/${resource._id}/reconcile`, { autoCorrect: true });
      if (res.data.success) {
        if (res.data.data.reconciled) {
          showToast(`Reconciled: Drift detected & corrected for ${resource.resourceName || resource.resourceType}`, 'success');
        } else {
          showToast(`No discrepancy found for ${resource.resourceName || resource.resourceType}. Records match perfectly.`, 'info');
        }
        await Promise.all([fetchResources(), fetchSummary()]);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Single resource reconciliation failed', 'error');
    }
  };

  // Register Resource
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await api.post('/organizations/me/resources', registerForm);
      if (res.data.success) {
        showToast(`Resource '${res.data.data.resourceName}' successfully registered into inventory.`, 'success');
        setIsRegisterModalOpen(false);
        setRegisterForm({
          resourceTypeId: '',
          resourceType: '',
          resourceName: '',
          totalQuantity: 10,
          availableQuantity: 10,
          operationalStatus: 'OPERATIONAL',
          maintenanceNotes: '',
          freshnessThresholdMinutes: 60,
        });
        await Promise.all([fetchResources(), fetchSummary()]);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Registration failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Capacity Modal
  const openCapacityModal = (resource) => {
    setActiveResource(resource);
    setCapacityForm({
      totalQuantity: resource.totalQuantity ?? resource.totalCapacity ?? 10,
      reason: '',
    });
    setIsCapacityModalOpen(true);
  };

  const handleCapacitySubmit = async (e) => {
    e.preventDefault();
    if (!activeResource) return;
    try {
      setSubmitting(true);
      const res = await api.patch(`/organizations/me/resources/${activeResource._id}/capacity`, {
        totalQuantity: Number(capacityForm.totalQuantity),
        reason: capacityForm.reason,
      });
      if (res.data.success) {
        showToast(`Capacity updated to ${res.data.data.totalQuantity}`, 'success');
        setIsCapacityModalOpen(false);
        await Promise.all([fetchResources(), fetchSummary()]);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update capacity', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Adjust Modal
  const openAdjustModal = (resource) => {
    setActiveResource(resource);
    setAdjustForm({
      adjustmentQuantity: 0,
      reason: '',
    });
    setIsAdjustModalOpen(true);
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!activeResource) return;
    if (!adjustForm.reason.trim()) {
      showToast('A mandatory reason is required for audit compliance.', 'error');
      return;
    }
    try {
      setSubmitting(true);
      const res = await api.post(`/organizations/me/resources/${activeResource._id}/availability-adjustments`, {
        adjustmentQuantity: Number(adjustForm.adjustmentQuantity),
        reason: adjustForm.reason,
      });
      if (res.data.success) {
        showToast('Availability adjustment recorded with audit trail.', 'success');
        setIsAdjustModalOpen(false);
        await Promise.all([fetchResources(), fetchSummary()]);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to adjust availability', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Status Modal
  const openStatusModal = (resource) => {
    setActiveResource(resource);
    setStatusForm({
      operationalStatus: resource.operationalStatus || 'OPERATIONAL',
      maintenanceNotes: resource.maintenanceNotes || '',
      maintenanceStartDate: resource.maintenanceStartDate ? resource.maintenanceStartDate.substring(0, 10) : '',
      maintenanceExpectedEndDate: resource.maintenanceExpectedEndDate
        ? resource.maintenanceExpectedEndDate.substring(0, 10)
        : '',
      reason: '',
    });
    setIsStatusModalOpen(true);
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (!activeResource) return;
    try {
      setSubmitting(true);
      const res = await api.patch(`/organizations/me/resources/${activeResource._id}/status`, statusForm);
      if (res.data.success) {
        showToast(`Operational status changed to ${res.data.data.operationalStatus}`, 'success');
        setIsStatusModalOpen(false);
        await Promise.all([fetchResources(), fetchSummary()]);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update status', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Open History Drawer / Modal
  const openHistoryModal = async (resource) => {
    setActiveResource(resource);
    setIsHistoryModalOpen(true);
    try {
      setHistoryLoading(true);
      const res = await api.get(`/organizations/me/resources/${resource._id}/history`);
      if (res.data.success) {
        setHistoryRecords(res.data.data || []);
      }
    } catch (err) {
      showToast('Error loading audit history', 'error');
    } finally {
      setHistoryLoading(false);
    }
  };

  // Delete Resource
  const handleDeleteResource = async (resource) => {
    const committed = (resource.reservedQuantity || 0) + (resource.allocatedQuantity || 0);
    if (committed > 0) {
      showToast(`Cannot delete resource: ${committed} units are currently reserved or allocated.`, 'error');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete '${resource.resourceName}'? This cannot be undone.`)) {
      return;
    }
    try {
      const res = await api.delete(`/organizations/me/resources/${resource._id}`);
      if (res.data.success) {
        showToast('Resource deleted successfully', 'success');
        await Promise.all([fetchResources(), fetchSummary()]);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete resource', 'error');
    }
  };

  // Filtered resources
  const filteredResources = resources.filter((r) => {
    const matchesSearch =
      !searchQuery ||
      (r.resourceName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.resourceType || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.resourceId || '').toLowerCase().includes(searchQuery.toLowerCase());

    const cat = r.resourceTypeId?.category || 'beds';
    const matchesCategory = selectedCategory === 'ALL' || cat === selectedCategory;
    const matchesStatus = selectedStatus === 'ALL' || r.operationalStatus === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16 px-4 sm:px-6">
      {/* Toast Notification */}
      {toast.message && (
        <Toast type={toast.type} message={toast.message} onClose={() => setToast({ message: '', type: 'info' })} />
      )}

      {/* Header Bar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Module 14: Inventory & Availability
            </span>
            {summary?.freshnessStatus && (
              <span
                className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
                  summary.freshnessStatus === 'FRESH'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : summary.freshnessStatus === 'STALE'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                Telemetry: {summary.freshnessStatus}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Healthcare Resource Inventory & Availability Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Strict accounting invariant governance, real-time availability freshness telemetry, and automated reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReconcileAll}
            disabled={reconciling}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${reconciling ? 'animate-spin text-blue-600' : 'text-slate-600'}`} />
            {reconciling ? 'Reconciling...' : 'Reconcile All'}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsRegisterModalOpen(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4" />
            Register Resource
          </Button>
        </div>
      </div>

      {/* KPI / Telemetry Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Resources</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{summary?.totalResources || resources.length}</div>
          <div className="text-xs text-slate-400 mt-0.5">Configured units: {summary?.totalQuantity || 0}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Available</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{summary?.availableQuantity || 0}</div>
          <div className="text-xs text-emerald-500 mt-0.5">Ready for admission</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-medium text-amber-600 uppercase tracking-wider">Reserved (Hold)</div>
          <div className="text-2xl font-bold text-amber-700 mt-1">{summary?.reservedQuantity || 0}</div>
          <div className="text-xs text-amber-500 mt-0.5">15-min hold window</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-medium text-blue-600 uppercase tracking-wider">Allocated (Occupied)</div>
          <div className="text-2xl font-bold text-blue-700 mt-1">{summary?.allocatedQuantity || 0}</div>
          <div className="text-xs text-blue-500 mt-0.5">Active patients</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-medium text-rose-600 uppercase tracking-wider">Unavailable</div>
          <div className="text-2xl font-bold text-rose-700 mt-1">{summary?.unavailableQuantity || 0}</div>
          <div className="text-xs text-rose-500 mt-0.5">Maintenance/Offline</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-medium text-indigo-600 uppercase tracking-wider">Utilization Rate</div>
          <div className="text-2xl font-bold text-indigo-700 mt-1">{summary?.utilizationRate ?? 0}%</div>
          <div className="text-xs text-indigo-500 mt-0.5">Committed capacity</div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by name, type, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs font-medium py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            <option value="beds">Beds</option>
            <option value="critical_care">Critical Care</option>
            <option value="surgical">Surgical</option>
            <option value="blood_bank">Blood Bank</option>
            <option value="imaging">Imaging</option>
            <option value="laboratory">Laboratory</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs font-medium py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPERATIONAL">Operational</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="UNAVAILABLE">Unavailable</option>
            <option value="DEGRADED">Degraded</option>
          </select>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('ALL');
              setSelectedStatus('ALL');
            }}
            className="text-xs text-slate-500 hover:text-slate-800"
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Main Inventory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading healthcare resource inventory...</div>
        ) : filteredResources.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Activity className="w-12 h-12 text-slate-300 mx-auto" />
            <div className="text-base font-semibold text-slate-700">No resources found</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No healthcare resources match your current search or filter criteria. Click "Register Resource" to add critical care equipment or beds.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/70 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="py-3.5 px-4">Resource & Type</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4 text-center">Total</th>
                  <th className="py-3.5 px-4 text-center text-emerald-700">Available</th>
                  <th className="py-3.5 px-4 text-center text-amber-700">Reserved</th>
                  <th className="py-3.5 px-4 text-center text-blue-700">Allocated</th>
                  <th className="py-3.5 px-4 text-center text-rose-700">Unavailable</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Freshness</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredResources.map((resource) => {
                  const freshness = resource.freshness || { freshnessStatus: 'FRESH', isFresh: true };
                  const total = resource.totalQuantity ?? resource.totalCapacity ?? 0;
                  const available = resource.availableQuantity ?? resource.availableCapacity ?? 0;
                  const reserved = resource.reservedQuantity ?? resource.reservedCapacity ?? 0;
                  const allocated = resource.allocatedQuantity ?? resource.occupiedCapacity ?? 0;
                  const unavailable = resource.unavailableQuantity || 0;

                  return (
                    <tr key={resource._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{resource.resourceName || resource.resourceType}</div>
                        <div className="text-xs font-mono text-slate-400 mt-0.5">{resource.resourceId || resource.resourceType}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="capitalize px-2 py-0.5 text-xs font-medium rounded-md bg-slate-100 text-slate-700">
                          {resource.resourceTypeId?.category || 'General'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-slate-800">{total}</td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-full font-bold text-xs bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {available}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-full font-bold text-xs bg-amber-50 text-amber-700 border border-amber-200">
                          {reserved}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-full font-bold text-xs bg-blue-50 text-blue-700 border border-blue-200">
                          {allocated}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-full font-bold text-xs bg-rose-50 text-rose-700 border border-rose-200">
                          {unavailable}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                            resource.operationalStatus === 'OPERATIONAL'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : resource.operationalStatus === 'MAINTENANCE'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              resource.operationalStatus === 'OPERATIONAL'
                                ? 'bg-emerald-500'
                                : resource.operationalStatus === 'MAINTENANCE'
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                          />
                          {resource.operationalStatus}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span
                            className={`text-xs font-semibold ${
                              freshness.freshnessStatus === 'FRESH'
                                ? 'text-emerald-600'
                                : freshness.freshnessStatus === 'STALE'
                                ? 'text-amber-600'
                                : 'text-rose-600'
                            }`}
                          >
                            {freshness.freshnessStatus}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {resource.lastVerifiedAt
                              ? new Date(resource.lastVerifiedAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'Never'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openCapacityModal(resource)}
                            title="Edit Total Capacity"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Sliders className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => openAdjustModal(resource)}
                            title="Manual Availability Adjustment"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => openStatusModal(resource)}
                            title="Change Operational Status & Maintenance"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                          >
                            <Wrench className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleReconcileSingle(resource)}
                            title="Reconcile Resource Inventory"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => openHistoryModal(resource)}
                            title="View Audit History"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteResource(resource)}
                            title="Delete Resource"
                            disabled={reserved > 0 || allocated > 0}
                            className={`p-1.5 rounded-lg transition-colors ${
                              reserved > 0 || allocated > 0
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                            }`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 1. Modal: Register Resource */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Register Healthcare Resource</h3>
              <button
                onClick={() => setIsRegisterModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Resource Type Standard</label>
                <select
                  required
                  value={registerForm.resourceTypeId}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    const found = resourceTypes.find((t) => t._id === selectedId || t.resourceTypeId === selectedId);
                    setRegisterForm({
                      ...registerForm,
                      resourceTypeId: selectedId,
                      resourceType: found ? found.typeName.toLowerCase().replace(/\s+/g, '_') : registerForm.resourceType,
                      resourceName: found ? found.typeName : registerForm.resourceName,
                    });
                  }}
                  className="w-full text-sm py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">-- Select Configured Resource Type --</option>
                  {resourceTypes.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.typeName} ({t.category} - {t.unitOfMeasure})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Custom Display Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Trauma Bay 1 or Cardiac ICU Bed"
                  value={registerForm.resourceName}
                  onChange={(e) => setRegisterForm({ ...registerForm, resourceName: e.target.value })}
                  className="w-full text-sm py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Total Capacity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={registerForm.totalQuantity}
                    onChange={(e) => {
                      const total = Number(e.target.value);
                      setRegisterForm({
                        ...registerForm,
                        totalQuantity: total,
                        availableQuantity: total,
                      });
                    }}
                    className="w-full text-sm py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Available</label>
                  <input
                    type="number"
                    min="0"
                    max={registerForm.totalQuantity}
                    required
                    value={registerForm.availableQuantity}
                    onChange={(e) => setRegisterForm({ ...registerForm, availableQuantity: Number(e.target.value) })}
                    className="w-full text-sm py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Operational Status</label>
                <select
                  value={registerForm.operationalStatus}
                  onChange={(e) => setRegisterForm({ ...registerForm, operationalStatus: e.target.value })}
                  className="w-full text-sm py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                >
                  <option value="OPERATIONAL">OPERATIONAL</option>
                  <option value="MAINTENANCE">MAINTENANCE</option>
                  <option value="UNAVAILABLE">UNAVAILABLE</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Maintenance / Setup Notes</label>
                <textarea
                  rows="2"
                  placeholder="Optional operational or maintenance specifications"
                  value={registerForm.maintenanceNotes}
                  onChange={(e) => setRegisterForm({ ...registerForm, maintenanceNotes: e.target.value })}
                  className="w-full text-sm py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button variant="ghost" type="button" onClick={() => setIsRegisterModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {submitting ? 'Registering...' : 'Register Resource'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal: Update Capacity */}
      {isCapacityModalOpen && activeResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Update Total Capacity</h3>
                <p className="text-xs text-slate-500 mt-0.5">{activeResource.resourceName}</p>
              </div>
              <button
                onClick={() => setIsCapacityModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCapacitySubmit} className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Total:</span>
                  <span className="font-bold text-slate-800">{activeResource.totalQuantity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Committed (Reserved + Allocated):</span>
                  <span className="font-bold text-amber-700">
                    {(activeResource.reservedQuantity || 0) + (activeResource.allocatedQuantity || 0)}
                  </span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>Minimum Permitted Capacity:</span>
                  <span className="font-bold">
                    {(activeResource.reservedQuantity || 0) +
                      (activeResource.allocatedQuantity || 0) +
                      (activeResource.unavailableQuantity || 0)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Total Capacity</label>
                <input
                  type="number"
                  min={
                    (activeResource.reservedQuantity || 0) +
                    (activeResource.allocatedQuantity || 0) +
                    (activeResource.unavailableQuantity || 0)
                  }
                  required
                  value={capacityForm.totalQuantity}
                  onChange={(e) => setCapacityForm({ ...capacityForm, totalQuantity: e.target.value })}
                  className="w-full text-sm py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Capacity Change</label>
                <input
                  type="text"
                  placeholder="e.g. Ward expansion or bed decommission"
                  value={capacityForm.reason}
                  onChange={(e) => setCapacityForm({ ...capacityForm, reason: e.target.value })}
                  className="w-full text-sm py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button variant="ghost" type="button" onClick={() => setIsCapacityModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {submitting ? 'Saving...' : 'Update Capacity'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal: Availability Adjustment */}
      {isAdjustModalOpen && activeResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Adjust Available Quantity</h3>
                <p className="text-xs text-slate-500 mt-0.5">{activeResource.resourceName}</p>
              </div>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex justify-between">
                <span className="text-slate-500">Current Available:</span>
                <span className="font-bold text-emerald-700">{activeResource.availableQuantity}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Adjustment Delta (+ for increase, - for decrease)
                </label>
                <input
                  type="number"
                  required
                  placeholder="+2 or -1"
                  value={adjustForm.adjustmentQuantity}
                  onChange={(e) => setAdjustForm({ ...adjustForm, adjustmentQuantity: e.target.value })}
                  className="w-full text-sm py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  New Available will be: {Number(activeResource.availableQuantity) + Number(adjustForm.adjustmentQuantity || 0)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mandatory Audit Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows="2"
                  required
                  placeholder="e.g. Staffing shortage in trauma unit / Emergency beds returned from sanitization"
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  className="w-full text-sm py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button variant="ghost" type="button" onClick={() => setIsAdjustModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {submitting ? 'Applying...' : 'Apply Adjustment'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Modal: Change Operational Status */}
      {isStatusModalOpen && activeResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Operational Status & Maintenance</h3>
                <p className="text-xs text-slate-500 mt-0.5">{activeResource.resourceName}</p>
              </div>
              <button
                onClick={() => setIsStatusModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStatusSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Operational Status</label>
                <select
                  value={statusForm.operationalStatus}
                  onChange={(e) => setStatusForm({ ...statusForm, operationalStatus: e.target.value })}
                  className="w-full text-sm py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                >
                  <option value="OPERATIONAL">OPERATIONAL (Accepting patients)</option>
                  <option value="MAINTENANCE">MAINTENANCE (Routine overhaul / Sterilization)</option>
                  <option value="UNAVAILABLE">UNAVAILABLE (Offline)</option>
                  <option value="DEGRADED">DEGRADED (Reduced capability)</option>
                  <option value="DECOMMISSIONED">DECOMMISSIONED (Retired)</option>
                </select>
              </div>

              {statusForm.operationalStatus === 'MAINTENANCE' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={statusForm.maintenanceStartDate}
                      onChange={(e) => setStatusForm({ ...statusForm, maintenanceStartDate: e.target.value })}
                      className="w-full text-sm py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Expected End Date</label>
                    <input
                      type="date"
                      value={statusForm.maintenanceExpectedEndDate}
                      onChange={(e) => setStatusForm({ ...statusForm, maintenanceExpectedEndDate: e.target.value })}
                      className="w-full text-sm py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Maintenance / Technical Notes</label>
                <textarea
                  rows="2"
                  placeholder="Details of biomedical inspection or maintenance ticket"
                  value={statusForm.maintenanceNotes}
                  onChange={(e) => setStatusForm({ ...statusForm, maintenanceNotes: e.target.value })}
                  className="w-full text-sm py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Status Change</label>
                <input
                  type="text"
                  placeholder="e.g. Scheduled quarterly equipment recalibration"
                  value={statusForm.reason}
                  onChange={(e) => setStatusForm({ ...statusForm, reason: e.target.value })}
                  className="w-full text-sm py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button variant="ghost" type="button" onClick={() => setIsStatusModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={submitting} className="bg-amber-600 hover:bg-amber-700 text-white">
                  {submitting ? 'Saving...' : 'Update Status'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal: Immutable Audit History Drawer */}
      {isHistoryModalOpen && activeResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white h-full w-full max-w-xl shadow-2xl flex flex-col p-6 space-y-4 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Immutable Audit History</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activeResource.resourceName} ({activeResource.resourceId})
                </p>
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {historyLoading ? (
                <div className="p-8 text-center text-slate-400">Loading audit trail...</div>
              ) : historyRecords.length === 0 ? (
                <div className="p-8 text-center text-slate-400">No audit records recorded yet.</div>
              ) : (
                historyRecords.map((item) => (
                  <div key={item._id} className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                        {item.changeType}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(item.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <div className="text-xs text-slate-700">
                      <span className="font-semibold">Reason:</span> {item.reason || 'None specified'}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-2.5 rounded-lg border border-slate-200">
                      <div>
                        <span className="text-slate-400 block">Previous Quantities:</span>
                        <span>Tot: {item.previousQuantity?.total ?? 0}</span> |{' '}
                        <span>Avail: {item.previousQuantity?.available ?? 0}</span> |{' '}
                        <span>Res: {item.previousQuantity?.reserved ?? 0}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">New Quantities:</span>
                        <span className="font-bold text-slate-900">Tot: {item.newQuantity?.total ?? 0}</span> |{' '}
                        <span className="font-bold text-emerald-700">Avail: {item.newQuantity?.available ?? 0}</span> |{' '}
                        <span className="font-bold text-amber-700">Res: {item.newQuantity?.reserved ?? 0}</span>
                      </div>
                    </div>

                    {item.changedByUserId && (
                      <div className="text-[10px] text-slate-400">
                        Changed by: {item.changedByUserId?.name || item.changedByUserId?.email || 'System'}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-slate-100 pt-3 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setIsHistoryModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
