import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { BedDouble, ShieldAlert, Wind, Activity, Save, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Toast } from '../../components/ui/Toast';
import { Skeleton } from '../../components/ui/Skeleton';

export const OrganizationResourcesPage = () => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      setLoading(true);
      const res = await api.get('/organizations/portal/me');
      if (res.data.success) {
        setResources(res.data.data.resources || []);
      }
    } catch (err) {
      console.error('Error fetching resources', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (resourceType, totalCapacity, availableCapacity) => {
    try {
      setUpdating(true);
      setSuccessMsg('');
      const res = await api.put('/organizations/portal/resources', {
        resourceType,
        totalCapacity: Number(totalCapacity),
        availableCapacity: Number(availableCapacity),
      });
      if (res.data.success) {
        setSuccessMsg(`Successfully updated ${resourceType.replace(/_/g, ' ')} capacity`);
        fetchResources();
      }
    } catch (err) {
      alert('Error updating capacity: ' + (err.response?.data?.message || err.message));
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="info" size="xs">
              Resource Telemetry
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Critical Care Resource Capacity
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage real-time bed inventories, trauma bays, and ventilators for parallel emergency matching.
          </p>
        </div>
      </div>

      {successMsg && (
        <Toast type="success" message={successMsg} onClose={() => setSuccessMsg('')} />
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-60 bg-white border border-slate-200 rounded-xl p-5 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { type: 'icu_bed', title: 'ICU Beds', icon: BedDouble },
            { type: 'er_bay', title: 'Emergency Trauma Bays', icon: ShieldAlert },
            { type: 'ventilator', title: 'Ventilators', icon: Wind },
          ].map((item) => {
            const res = resources.find((r) => r.resourceType === item.type) || {
              totalCapacity: 10,
              availableCapacity: 8,
              reservedCapacity: 0,
              occupiedCapacity: 2,
            };
            const Icon = item.icon;

            return (
              <div key={item.type} className="bg-white rounded-xl p-5 border border-slate-200 shadow-card space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-brand-50 border border-brand-200 text-brand-700 flex items-center justify-center font-bold flex-shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900">{item.title}</h3>
                      <p className="text-[11px] text-slate-400">Synchronized live</p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Available:</span>
                      <strong className="text-presence-700 font-bold">{res.availableCapacity}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Held (15m):</span>
                      <strong className="text-hold-700 font-bold">{res.reservedCapacity ?? 0}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Total Operational:</span>
                      <strong className="text-slate-900 font-bold">{res.totalCapacity}</strong>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 block mb-0.5">Available</label>
                      <input
                        type="number"
                        min="0"
                        defaultValue={res.availableCapacity}
                        id={`avail-${item.type}`}
                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-600"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 block mb-0.5">Total</label>
                      <input
                        type="number"
                        min="1"
                        defaultValue={res.totalCapacity}
                        id={`total-${item.type}`}
                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-600"
                      />
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    disabled={updating}
                    onClick={() => {
                      const avail = document.getElementById(`avail-${item.type}`).value;
                      const tot = document.getElementById(`total-${item.type}`).value;
                      handleUpdate(item.type, tot, avail);
                    }}
                  >
                    Update Capacity
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrganizationResourcesPage;
