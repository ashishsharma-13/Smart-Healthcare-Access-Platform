import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { ShieldAlert, Calendar, Clock, MapPin, ChevronRight, Activity } from 'lucide-react';

export const EmergencyHistoryPage = () => {
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get('/emergency/user/history');
        if (res.data.success) {
          setEmergencies(res.data.data);
        }
      } catch (err) {
        console.error('Error fetching emergency history', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Emergency Beep History</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Audit trail and records of past emergency activations, broadcasted facilities, and destinations.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border">
          Loading history...
        </div>
      ) : emergencies.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <Activity className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No emergency logs recorded</h3>
          <p className="text-xs text-slate-500">Your emergency broadcast history will be preserved here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {emergencies.map((emg) => (
            <div
              key={emg._id}
              className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-bold text-slate-900 capitalize">
                    {emg.emergencyType} Emergency
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      emg.status === 'ARRIVED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : emg.status === 'CANCELLED'
                        ? 'bg-slate-100 text-slate-600'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {emg.status}
                  </span>
                </div>
                <div className="flex items-center space-x-3 text-xs text-slate-500">
                  <span>Code: <strong>{emg.requestCode}</strong></span>
                  <span>&bull;</span>
                  <span>{new Date(emg.createdAt).toLocaleString()}</span>
                  {emg.selectedOrganizationId && (
                    <>
                      <span>&bull;</span>
                      <span>Destination: <strong>{emg.selectedOrganizationId.name}</strong></span>
                    </>
                  )}
                </div>
              </div>

              <Link
                to={`/emergency/tracking/${emg._id}`}
                className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 font-bold text-xs rounded-lg transition-colors flex items-center space-x-1"
              >
                <span>View Details</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

