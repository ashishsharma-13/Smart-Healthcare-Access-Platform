import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { ShieldAlert, Calendar, Clock, MapPin, ChevronRight, Activity } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';

export const EmergencyHistoryPage = () => {
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

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

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="emergency" size="xs">
              Audit Trail
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Emergency Beep History
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit trail and records of past emergency activations, broadcasted trauma facilities, and destination outcomes.
          </p>
        </div>

        <Link to="/emergency/activate">
          <Button variant="emergency" size="sm" icon={ShieldAlert}>
            Activate New Beep
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
          Loading emergency history...
        </div>
      ) : emergencies.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No Emergency Logs Recorded"
          description="Your parallel emergency dispatch activations and destination passes will appear here."
          actionLabel="Emergency Broadcast Mode"
          onAction={() => window.location.href = '/emergency/activate'}
        />
      ) : (
        <div className="space-y-3">
          {emergencies.map((emg) => (
            <div
              key={emg._id}
              className="p-4 sm:p-5 bg-white rounded-xl border border-slate-200 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-brand-300 transition-colors"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 capitalize">
                    {emg.emergencyType} Emergency
                  </span>
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
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-mono text-slate-700 font-semibold">{emg.requestCode}</span>
                  <span>&bull;</span>
                  <span>{new Date(emg.createdAt).toLocaleString()}</span>
                  {emg.selectedOrganizationId && (
                    <>
                      <span>&bull;</span>
                      <span>Destination: <strong className="text-slate-800">{emg.selectedOrganizationId.name}</strong></span>
                    </>
                  )}
                </div>
              </div>

              <Link
                to={`/emergency/tracking/${emg._id}`}
                className="self-end sm:self-center"
              >
                <Button size="sm" variant="outline" icon={ChevronRight} iconPosition="right">
                  Details
                </Button>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmergencyHistoryPage;
