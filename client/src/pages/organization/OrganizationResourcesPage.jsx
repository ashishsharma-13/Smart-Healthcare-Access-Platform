import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { BedDouble, ShieldAlert, Wind, Activity, Save, CheckCircle2 } from 'lucide-react';

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
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Healthcare Resource Capacity</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage critical care beds, emergency bays, and ventilators for real-time emergency matching and temporary reservation.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading resources...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { type: 'icu_bed', title: 'ICU Beds', icon: BedDouble, color: 'blue' },
            { type: 'er_bay', title: 'Emergency Bays', icon: ShieldAlert, color: 'red' },
            { type: 'ventilator', title: 'Ventilators', icon: Wind, color: 'emerald' },
          ].map((item) => {
            const res = resources.find((r) => r.resourceType === item.type) || {
              totalCapacity: 10,
              availableCapacity: 8,
              reservedCapacity: 0,
              occupiedCapacity: 2,
            };
            const Icon = item.icon;

            return (
              <div key={item.type} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold">
                    <Icon className="w-5 h-5 text-slate-700" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                    <p className="text-[11px] text-slate-400">Real-time capacity</p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Available:</span>
                    <strong className="text-emerald-600 font-black">{res.availableCapacity}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Temporarily Reserved:</span>
                    <strong className="text-amber-600 font-bold">{res.reservedCapacity || 0}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Occupied:</span>
                    <strong className="text-slate-800 font-bold">{res.occupiedCapacity || 0}</strong>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200">
                    <span className="text-slate-700 font-semibold">Total Capacity:</span>
                    <strong className="text-slate-900 font-black">{res.totalCapacity}</strong>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">Adjust Available</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min={0}
                      defaultValue={res.availableCapacity}
                      id={`input-${item.type}`}
                      className="w-full p-2 bg-slate-50 border rounded-xl text-xs font-bold text-slate-900"
                    />
                    <button
                      onClick={() => {
                        const val = document.getElementById(`input-${item.type}`).value;
                        handleUpdate(item.type, res.totalCapacity, val);
                      }}
                      disabled={updating}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl"
                    >
                      Update
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

