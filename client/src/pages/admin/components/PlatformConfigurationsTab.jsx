import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import {
  Sliders,
  Settings,
  History,
  Edit2,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  FolderTree,
  Stethoscope,
  X,
  FileText,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { TableSkeleton } from '../../../components/ui/Skeleton';

export const PlatformConfigurationsTab = ({ onNotify }) => {
  const [subTab, setSubTab] = useState('parameters'); // 'parameters' | 'specializations'

  // Parameters State
  const [configs, setConfigs] = useState([]);
  const [loadingConfigs, setLoadingConfigs] = useState(true);
  const [editingConfig, setEditingConfig] = useState(null);
  const [configValueInput, setConfigValueInput] = useState('');
  const [configReasonInput, setConfigReasonInput] = useState('');
  const [submittingConfig, setSubmittingConfig] = useState(false);
  const [configError, setConfigError] = useState('');

  // History State
  const [historyKey, setHistoryKey] = useState(null);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Specializations State
  const [specializations, setSpecializations] = useState([]);
  const [loadingSpecs, setLoadingSpecs] = useState(false);
  const [specModalOpen, setSpecModalOpen] = useState(false);
  const [editingSpec, setEditingSpec] = useState(null);
  const [specForm, setSpecForm] = useState({
    name: '',
    category: 'CLINICAL',
    code: '',
    description: '',
  });

  useEffect(() => {
    fetchConfigs();
    fetchSpecializations();
  }, []);

  const fetchConfigs = async () => {
    try {
      setLoadingConfigs(true);
      const res = await api.get('/admin/configurations');
      if (res.data?.success) {
        setConfigs(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching configurations:', err);
      onNotify?.({ type: 'error', message: 'Could not load platform configurations.' });
    } finally {
      setLoadingConfigs(false);
    }
  };

  const fetchSpecializations = async () => {
    try {
      setLoadingSpecs(true);
      const res = await api.get('/admin/specializations');
      if (res.data?.success) {
        setSpecializations(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching specializations:', err);
    } finally {
      setLoadingSpecs(false);
    }
  };

  const handleOpenEditConfig = (cfg) => {
    setEditingConfig(cfg);
    setConfigValueInput(String(cfg.value));
    setConfigReasonInput('');
    setConfigError('');
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    if (!configReasonInput.trim()) {
      setConfigError('A mandatory change reason is strictly required.');
      return;
    }

    try {
      setSubmittingConfig(true);
      setConfigError('');

      let val = configValueInput;
      if (editingConfig.valueType === 'NUMBER') {
        val = Number(configValueInput);
      } else if (editingConfig.valueType === 'BOOLEAN') {
        val = configValueInput === 'true';
      }

      const res = await api.put(`/admin/configurations/${editingConfig.configKey}`, {
        value: val,
        reason: configReasonInput.trim(),
      });

      if (res.data?.success) {
        onNotify?.({ type: 'success', message: `Configuration '${editingConfig.configKey}' updated.` });
        setEditingConfig(null);
        fetchConfigs();
      }
    } catch (err) {
      setConfigError(err.response?.data?.message || 'Failed to update configuration parameter.');
    } finally {
      setSubmittingConfig(false);
    }
  };

  const handleViewHistory = async (key) => {
    try {
      setHistoryKey(key);
      setLoadingHistory(true);
      const res = await api.get(`/admin/configurations/${key}/history`);
      if (res.data?.success) {
        setHistoryRecords(res.data.data || []);
      }
    } catch (err) {
      onNotify?.({ type: 'error', message: 'Could not load configuration change audit history.' });
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSaveSpecialization = async (e) => {
    e.preventDefault();
    try {
      if (editingSpec) {
        await api.put(`/admin/specializations/${editingSpec._id}`, specForm);
        onNotify?.({ type: 'success', message: 'Specialization updated successfully.' });
      } else {
        await api.post('/admin/specializations', specForm);
        onNotify?.({ type: 'success', message: 'Specialization created successfully.' });
      }
      setSpecModalOpen(false);
      setEditingSpec(null);
      setSpecForm({ name: '', category: 'CLINICAL', code: '', description: '' });
      fetchSpecializations();
    } catch (err) {
      onNotify?.({ type: 'error', message: err.response?.data?.message || 'Failed to save specialization.' });
    }
  };

  const handleToggleSpecStatus = async (spec) => {
    try {
      await api.patch(`/admin/specializations/${spec._id}/status`, {
        reason: `Administrative ${spec.isActive ? 'deactivation' : 'activation'} of ${spec.name}`,
      });
      onNotify?.({
        type: 'success',
        message: `Specialization ${spec.name} is now ${spec.isActive ? 'deactivated' : 'active'}.`,
      });
      fetchSpecializations();
    } catch (err) {
      onNotify?.({ type: 'error', message: 'Could not toggle specialization status.' });
    }
  };

  return (
    <div className="space-y-4">
      {/* Sub Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setSubTab('parameters')}
          className={`flex items-center gap-2 py-2 px-3 text-xs font-bold rounded-lg transition-colors ${
            subTab === 'parameters'
              ? 'bg-brand-50 text-brand-700 border border-brand-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Dynamic Platform Parameters ({configs.length})</span>
        </button>

        <button
          onClick={() => setSubTab('specializations')}
          className={`flex items-center gap-2 py-2 px-3 text-xs font-bold rounded-lg transition-colors ${
            subTab === 'specializations'
              ? 'bg-brand-50 text-brand-700 border border-brand-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Stethoscope className="w-3.5 h-3.5" />
          <span>Medical Specializations ({specializations.length})</span>
        </button>
      </div>

      {subTab === 'parameters' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                Runtime Platform Configurations
              </h3>
              <p className="text-[11px] text-slate-500">
                Adjust system-wide emergency thresholds, timeouts, and matching weights with complete audit trail.
              </p>
            </div>
            <Button size="sm" variant="outline" icon={RefreshCw} onClick={fetchConfigs}>
              Refresh
            </Button>
          </div>

          {loadingConfigs ? (
            <TableSkeleton rows={6} cols={6} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="p-3">Configuration Parameter</th>
                    <th className="p-3">Group</th>
                    <th className="p-3">Current Value</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Last Modified</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {configs.map((c) => (
                    <tr key={c.configKey} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3">
                        <p className="font-bold text-slate-900 font-mono text-[11px]">{c.configKey}</p>
                        <p className="text-[11px] text-slate-500">{c.configName}</p>
                      </td>
                      <td className="p-3">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                          {c.configGroup}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold text-brand-700">
                        {String(c.value)} {c.unit}
                      </td>
                      <td className="p-3 text-slate-600 text-[11px] max-w-xs">{c.description}</td>
                      <td className="p-3 text-slate-500 text-[11px]">
                        {c.lastUpdatedByEmail ? c.lastUpdatedByEmail : 'System Default'}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="xs"
                            variant="ghost"
                            icon={History}
                            onClick={() => handleViewHistory(c.configKey)}
                          >
                            History
                          </Button>
                          <Button
                            size="xs"
                            variant="outline"
                            icon={Edit2}
                            onClick={() => handleOpenEditConfig(c)}
                          >
                            Edit
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {subTab === 'specializations' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                Medical Clinical Specializations
              </h3>
              <p className="text-[11px] text-slate-500">
                Manage practitioner credentials and matching capability categories.
              </p>
            </div>
            <Button
              size="sm"
              variant="primary"
              icon={Plus}
              onClick={() => {
                setEditingSpec(null);
                setSpecForm({ name: '', category: 'CLINICAL', code: '', description: '' });
                setSpecModalOpen(true);
              }}
            >
              Add Specialization
            </Button>
          </div>

          {loadingSpecs ? (
            <TableSkeleton rows={6} cols={5} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="p-3">Specialization</th>
                    <th className="p-3">Code</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {specializations.map((spec) => (
                    <tr key={spec._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3 font-bold text-slate-900">{spec.name}</td>
                      <td className="p-3 font-mono text-[11px] text-slate-600">{spec.code || 'N/A'}</td>
                      <td className="p-3">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                          {spec.category}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600 text-[11px] max-w-xs">{spec.description || 'No description'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          spec.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {spec.isActive ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => {
                              setEditingSpec(spec);
                              setSpecForm({
                                name: spec.name,
                                category: spec.category,
                                code: spec.code || '',
                                description: spec.description || '',
                              });
                              setSpecModalOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="xs"
                            variant={spec.isActive ? 'danger' : 'outline'}
                            onClick={() => handleToggleSpecStatus(spec)}
                          >
                            {spec.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Edit Config Modal */}
      {editingConfig && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveConfig}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-sm">Modify Platform Configuration</h3>
              <button
                type="button"
                onClick={() => setEditingConfig(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {configError && (
              <div className="p-2.5 mb-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-medium">
                {configError}
              </div>
            )}

            <div className="space-y-3 text-xs mb-4">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Parameter Key</span>
                <p className="font-mono font-bold text-slate-800">{editingConfig.configKey}</p>
                <p className="text-slate-500">{editingConfig.configName}</p>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  New Value ({editingConfig.unit || editingConfig.valueType}) <span className="text-rose-500">*</span>
                </label>
                {editingConfig.valueType === 'BOOLEAN' ? (
                  <select
                    value={configValueInput}
                    onChange={(e) => setConfigValueInput(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
                  >
                    <option value="true">True (Enabled)</option>
                    <option value="false">False (Disabled)</option>
                  </select>
                ) : (
                  <input
                    type={editingConfig.valueType === 'NUMBER' ? 'number' : 'text'}
                    step={editingConfig.valueType === 'NUMBER' ? 'any' : undefined}
                    required
                    value={configValueInput}
                    onChange={(e) => setConfigValueInput(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
                  />
                )}
                {editingConfig.minValue !== undefined && editingConfig.maxValue !== undefined && (
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Permitted range: {editingConfig.minValue} to {editingConfig.maxValue} {editingConfig.unit}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  Mandatory Governance Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={configReasonInput}
                  onChange={(e) => setConfigReasonInput(e.target.value)}
                  placeholder="Explain why this runtime parameter is being updated..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setEditingConfig(null)}
                disabled={submittingConfig}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" variant="primary" loading={submittingConfig}>
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* History Modal */}
      {historyKey && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Configuration Audit Trail</h3>
                <p className="font-mono text-xs text-brand-700">{historyKey}</p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryKey(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingHistory ? (
              <TableSkeleton rows={4} cols={3} />
            ) : historyRecords.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No modification history for this configuration parameter.</p>
            ) : (
              <div className="space-y-3">
                {historyRecords.map((h) => (
                  <div key={h._id || h.historyId} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{h.changedByEmail}</span>
                      <span className="text-[10px] text-slate-500">{new Date(h.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="text-rose-600 line-through">{String(h.previousValue)}</span>
                      <span>→</span>
                      <span className="text-emerald-700 font-bold">{String(h.newValue)}</span>
                    </div>
                    <p className="text-slate-600 text-[11px] italic">"{h.changeReason}"</p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setHistoryKey(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Specialization Create/Edit Modal */}
      {specModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveSpecialization}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingSpec ? 'Edit Specialization' : 'Add Medical Specialization'}
              </h3>
              <button
                type="button"
                onClick={() => setSpecModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs mb-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  Specialization Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={specForm.name}
                  onChange={(e) => setSpecForm({ ...specForm, name: e.target.value })}
                  placeholder="e.g. Interventional Cardiology"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Code</label>
                  <input
                    type="text"
                    value={specForm.code}
                    onChange={(e) => setSpecForm({ ...specForm, code: e.target.value })}
                    placeholder="CARD"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Category</label>
                  <select
                    value={specForm.category}
                    onChange={(e) => setSpecForm({ ...specForm, category: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
                  >
                    <option value="CLINICAL">Clinical</option>
                    <option value="SURGICAL">Surgical</option>
                    <option value="DIAGNOSTIC">Diagnostic</option>
                    <option value="EMERGENCY">Emergency</option>
                    <option value="PEDIATRIC">Pediatric</option>
                    <option value="ALLIED">Allied</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={specForm.description}
                  onChange={(e) => setSpecForm({ ...specForm, description: e.target.value })}
                  placeholder="Description of clinical scope..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button type="button" size="sm" variant="ghost" onClick={() => setSpecModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" variant="primary">
                Save Specialization
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

