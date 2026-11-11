import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { ShieldAlert, Activity, Clock, Building2, MapPin, ChevronRight } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { TableSkeleton } from '../../components/ui/Skeleton';

export const AdminEmergencyMonitor = () => {
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmergencies();
  }, []);

  const fetchEmergencies = async () => {
    try {
      setLoading(true);
      const res = await api.get('/emergency/user/history');
      if (res.data.success) {
        setEmergencies(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching admin emergencies', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="emergency" size="xs" dot pulseDot>
              Live Telemetry Stream
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Emergency Coordination Oversight
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time monitoring of parallel Emergency Beep broadcasts, hospital response times, and temporary resource holds.
          </p>
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={5} cols={7} />
      ) : emergencies.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No Active Emergency Dispatches"
          description="Live emergency broadcasts and hospital arrival passes will appear here in real time."
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="p-3">Request Code</th>
                  <th className="p-3">Patient</th>
                  <th className="p-3">Emergency Type</th>
                  <th className="p-3">Selected Facility</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {emergencies.map((emg) => (
                  <tr key={emg._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3 font-mono font-semibold text-brand-700">{emg.requestCode}</td>
                    <td className="p-3 font-semibold text-slate-900">{emg.patientName}</td>
                    <td className="p-3 capitalize text-slate-700">{emg.emergencyType}</td>
                    <td className="p-3 text-slate-600">{emg.selectedOrganizationId?.name || 'Awaiting Selection'}</td>
                    <td className="p-3">
                      <Badge
                        variant={
                          emg.status === 'ARRIVED'
                            ? 'presence'
                            : emg.status === 'CANCELLED'
                            ? 'neutral'
                            : 'emergency'
                        }
                        size="xs"
                      >
                        {emg.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-slate-500">{new Date(emg.createdAt).toLocaleTimeString()}</td>
                    <td className="p-3 text-right">
                      <Link to={`/emergency/tracking/${emg._id}`}>
                        <Button size="sm" variant="outline" icon={ChevronRight} iconPosition="right">
                          Telemetry
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEmergencyMonitor;
