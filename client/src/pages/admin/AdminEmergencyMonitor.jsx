import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { ShieldAlert, Activity, Clock, Building2, MapPin, ChevronRight } from 'lucide-react';

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
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Emergency Coordination Oversight</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Real-time monitoring of Emergency Beep broadcasts, hospital response times, and temporary resource holds.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border">
          Loading live emergency monitor...
        </div>
      ) : emergencies.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
          <Activity className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No active or historical emergencies found</h3>
          <p className="text-xs text-slate-500">Live emergency broadcasts will appear here in real-time.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="p-3">Request Code</th>
                <th className="p-3">Patient</th>
                <th className="p-3">Emergency Type</th>
                <th className="p-3">Selected Destination</th>
                <th className="p-3">Status</th>
                <th className="p-3">Timestamp</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {emergencies.map((emg) => (
                <tr key={emg._id} className="hover:bg-slate-50">
                  <td className="p-3 font-mono font-bold text-blue-600">{emg.requestCode}</td>
                  <td className="p-3 font-bold text-slate-900">{emg.patientName}</td>
                  <td className="p-3 capitalize font-semibold text-slate-700">{emg.emergencyType}</td>
                  <td className="p-3 text-slate-600">{emg.selectedOrganizationId?.name || 'Not yet selected'}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        emg.status === 'ARRIVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : emg.status === 'CANCELLED'
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {emg.status}
                    </span>
                  </td>
                  <td className="p-3 text-slate-500">{new Date(emg.createdAt).toLocaleTimeString()}</td>
                  <td className="p-3 text-right">
                    <Link
                      to={`/emergency/tracking/${emg._id}`}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 font-bold text-xs rounded-lg transition-colors inline-flex items-center space-x-1"
                    >
                      <span>Track</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

