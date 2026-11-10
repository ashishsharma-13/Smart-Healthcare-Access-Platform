import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { EmergencyRadarIllustration } from '../../components/graphics/EmergencyRadarIllustration';
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
  Phone,
  Activity,
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

      {/* Radar Signal Card with Graphic Illustration (Screen 07 Montage) */}
      <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-10 text-center relative overflow-hidden shadow-2xl border border-slate-800">

        {/* Animated Emergency Radar Illustration */}
        <EmergencyRadarIllustration hospitalCount={broadcasts.length} />

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

        {/* Live Parallel Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-md mx-auto mt-6 pt-6 border-t border-slate-800 text-center">
          <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-700/60">
            <span className="text-xs text-slate-400 block font-bold">Responded</span>
            <span className="text-xl font-black text-emerald-400">{acceptedCount} Ready</span>
          </div>

          <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-700/60">
            <span className="text-xs text-slate-400 block font-bold">Pinging</span>
            <span className="text-xl font-black text-amber-400">{pendingCount} Awaiting</span>
          </div>

          <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-700/60 col-span-2 sm:col-span-1">
            <span className="text-xs text-slate-400 block font-bold">Protocol</span>
            <span className="text-xl font-black text-blue-400">Parallel</span>
          </div>
        </div>

        {/* Action Button when hospitals have responded */}
        {acceptedCount > 0 && (
          <div className="mt-8 animate-bounce">
            <button
              onClick={() => navigate(`/emergency/responses/${id}`)}
              className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-emerald-600/30 transition-all hover:scale-105 flex items-center space-x-2 mx-auto"
            >
              <span>View {acceptedCount} Responding Hospital{acceptedCount > 1 ? 's' : ''} & Select Destination</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Hospital Status Cards List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-2">
            <Activity className="w-4 h-4 text-red-600" />
            <span>Trauma Centers Contacted in Parallel</span>
          </h2>
          <button
            onClick={fetchBroadcastData}
            className="text-xs text-blue-600 hover:text-blue-700 flex items-center space-x-1 font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {broadcasts.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border text-xs text-slate-400">
            No matching facilities found within range.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {broadcasts.map((b) => (
              <div
                key={b._id}
                className={`p-5 rounded-2xl border transition-all ${b.responseStatus === 'ACCEPTED'
                    ? 'bg-emerald-50/70 border-emerald-300 shadow-sm'
                    : b.responseStatus === 'DECLINED'
                      ? 'bg-red-50/50 border-red-200 opacity-60'
                      : 'bg-white border-slate-200'
                  }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${b.responseStatus === 'ACCEPTED'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-700'
                        }`}
                    >
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{b.organizationId?.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {b.organizationId?.address?.city || 'Local Facility'}
                      </p>
                    </div>
                  </div>

                  <div>
                    {b.responseStatus === 'ACCEPTED' ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>ACCEPTED</span>
                      </span>
                    ) : b.responseStatus === 'DECLINED' ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>DECLINED</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 animate-pulse">
                        <Clock className="w-3.5 h-3.5" />
                        <span>PENDING</span>
                      </span>
                    )}
                  </div>
                </div>

                {b.responseStatus === 'ACCEPTED' && (
                  <div className="mt-4 pt-3 border-t border-emerald-200 flex items-center justify-between text-xs">
                    <span className="text-emerald-800 font-semibold">
                      Bed & Trauma team ready
                    </span>
                    <button
                      onClick={() => navigate(`/emergency/responses/${id}`)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors flex items-center space-x-1"
                    >
                      <span>Select</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
export default EmergencyBroadcastPage;
