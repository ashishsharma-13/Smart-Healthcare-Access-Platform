import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import {
  ShieldAlert,
  Radio,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

export const EmergencyBroadcastPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { socket } = useSocket();

  const [emergency, setEmergency] = useState(null);
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBroadcastData();

    // Subscribe to emergency socket room
    if (socket) {
      socket.emit('emergency:subscribe', { emergencyRequestId: id });

      socket.on('emergency:org_responded', (data) => {
        console.log('[Socket Update] Org responded:', data);
        fetchBroadcastData();
      });

      socket.on('emergency:status_change', (data) => {
        console.log('[Socket Update] Emergency status changed:', data);
        if (data.status === 'DESTINATION_SELECTED') {
          navigate(`/emergency/responses/${id}`);
        } else if (data.status === 'RESOURCES_RESERVED') {
          navigate(`/emergency/reserved/${id}`);
        }
      });
    }

    return () => {
      if (socket) {
        socket.emit('emergency:unsubscribe', { emergencyRequestId: id });
        socket.off('emergency:org_responded');
        socket.off('emergency:status_change');
      }
    };
  }, [id, socket]);

  const fetchBroadcastData = async () => {
    try {
      const res = await api.get(`/emergency/${id}`);
      if (res.data.success) {
        setEmergency(res.data.data.emergency);
        setBroadcasts(res.data.data.broadcasts);
      }
    } catch (err) {
      console.error('Error fetching emergency details', err);
    } finally {
      setLoading(false);
    }
  };

  const acceptedCount = broadcasts.filter((b) => b.responseStatus === 'ACCEPTED').length;
  const pendingCount = broadcasts.filter((b) => b.responseStatus === 'PENDING').length;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      
      {/* Radar Signal Card */}
      <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden shadow-2xl border border-slate-800">
        
        {/* Pulsing Radar Ring Animation */}
        <div className="relative w-44 h-44 mx-auto mb-6 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-red-600/20 animate-radar"></div>
          <div className="absolute inset-4 rounded-full bg-red-600/30 animate-ping"></div>
          <div className="relative w-28 h-28 rounded-full bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center shadow-xl shadow-red-500/50">
            <Radio className="w-12 h-12 text-white animate-pulse" />
          </div>
        </div>

        <div className="space-y-2 max-w-lg mx-auto">
          <span className="inline-block px-3 py-1 bg-red-500/20 text-red-400 text-xs font-black uppercase tracking-widest rounded-full border border-red-500/30">
            PARALLEL EMERGENCY BEEP BROADCAST
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Pinging {broadcasts.length} Matching Facilities Simultaneously
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Real-time ping active for <strong>{emergency?.patientName}</strong> ({emergency?.emergencyType?.toUpperCase()} EMERGENCY)
          </p>
        </div>

        {/* Live Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-md mx-auto mt-8">
          <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/80">
            <span className="text-[10px] uppercase font-bold text-slate-400">Pings Sent</span>
            <p className="text-xl font-black text-white">{broadcasts.length}</p>
          </div>

          <div className="p-3 bg-emerald-950/40 rounded-2xl border border-emerald-800/50">
            <span className="text-[10px] uppercase font-bold text-emerald-400">Accepted</span>
            <p className="text-xl font-black text-emerald-400">{acceptedCount}</p>
          </div>

          <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/80 col-span-2 sm:col-span-1">
            <span className="text-[10px] uppercase font-bold text-amber-400">Awaiting Response</span>
            <p className="text-xl font-black text-amber-400">{pendingCount}</p>
          </div>
        </div>

      </div>

      {/* Action to proceed */}
      <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h3 className="text-base font-black text-slate-900">
            {acceptedCount > 0 ? `${acceptedCount} Facility Ready to Receive You` : 'Waiting for Facility Confirmations'}
          </h3>
          <p className="text-xs text-slate-500">
            {acceptedCount > 0
              ? 'Review suitability scores, doctor availability, and confirm your destination.'
              : 'Participating emergency departments are receiving real-time telemetry.'}
          </p>
        </div>

        <button
          onClick={() => navigate(`/emergency/responses/${id}`)}
          className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center space-x-2"
        >
          <span>Compare & Select Destination</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Facilities Broadcast Response Status List */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            Live Facility Telemetry Status
          </h3>
          <button
            onClick={fetchBroadcastData}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        <div className="space-y-3">
          {broadcasts.map((b) => (
            <div
              key={b._id}
              className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                b.responseStatus === 'ACCEPTED'
                  ? 'bg-emerald-50/70 border-emerald-300'
                  : b.responseStatus === 'DECLINED'
                  ? 'bg-red-50/50 border-red-200 opacity-60'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center space-x-3.5">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                    b.responseStatus === 'ACCEPTED'
                      ? 'bg-emerald-600 text-white'
                      : b.responseStatus === 'DECLINED'
                      ? 'bg-red-200 text-red-700'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{b.organizationId?.name}</h4>
                  <p className="text-[11px] text-slate-500">
                    {b.distanceKm} km away &bull; ~{b.estimatedTravelMinutes} mins travel &bull; Suitability Score: <strong>{b.suitabilityScore}/100</strong>
                  </p>
                </div>
              </div>

              <div>
                {b.responseStatus === 'ACCEPTED' ? (
                  <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-black bg-emerald-600 text-white">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>ACCEPTED</span>
                  </span>
                ) : b.responseStatus === 'DECLINED' ? (
                  <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>DECLINED</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                    <span>PENDING</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

