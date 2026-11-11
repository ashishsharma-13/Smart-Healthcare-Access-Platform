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
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';

export const EmergencyBroadcastPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { socket } = useSocket();

  const [emergency, setEmergency] = useState(null);
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBroadcastData();

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
    <div className="max-w-4xl mx-auto space-y-6 pb-12">

      {/* Compact Radar Signal Card */}
      <div className="bg-slate-900 text-white rounded-2xl py-5 px-6 max-w-2xl mx-auto text-center relative overflow-hidden shadow-xl border border-slate-800">

        {/* Animated Emergency Radar Illustration */}
        <EmergencyRadarIllustration hospitalCount={broadcasts.length} />

        <div className="space-y-1 max-w-md mx-auto mt-1">
          <span className="inline-block px-2.5 py-0.5 bg-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-wider rounded-full border border-red-500/30">
            TARGETED EMERGENCY BEEP DISPATCH
          </span>
          <h1 className="text-lg sm:text-xl font-black tracking-tight">
            Pinging {broadcasts.length} Chosen Facilities Simultaneously
          </h1>
          <p className="text-xs text-slate-400">
            Real-time ping active for <strong>{emergency?.patientName}</strong> ({emergency?.emergencyType?.toUpperCase()} EMERGENCY)
          </p>
        </div>

        {/* Compact Inline Telemetry Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-3 pt-3 border-t border-slate-800 text-xs">
          <div className="inline-flex items-center space-x-1.5 py-1.5 px-3 rounded-full bg-slate-800/80 border border-slate-700/60 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-slate-300">Responded:</span>
            <span className="font-bold text-emerald-400">{acceptedCount} Ready</span>
          </div>

          <div className="inline-flex items-center space-x-1.5 py-1.5 px-3 rounded-full bg-slate-800/80 border border-slate-700/60 font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span className="text-slate-300">Pinging:</span>
            <span className="font-bold text-amber-400">{pendingCount} Awaiting</span>
          </div>

          <div className="inline-flex items-center space-x-1.5 py-1.5 px-3 rounded-full bg-slate-800/80 border border-slate-700/60 font-medium">
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            <span className="text-slate-300">Protocol:</span>
            <span className="font-bold text-blue-400">Targeted Dispatch</span>
          </div>
        </div>

        {/* Primary Action Button when facilities respond */}
        {acceptedCount > 0 && (
          <div className="mt-3.5">
            <button
              onClick={() => navigate(`/emergency/responses/${id}`)}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-600/30 transition-all hover:scale-105 flex items-center space-x-2 mx-auto cursor-pointer"
            >
              <span>View {acceptedCount} Responding Hospital{acceptedCount > 1 ? 's' : ''} & Select Destination</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Facilities Status Feed */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-urgent-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Trauma Centers Alerted in Parallel
            </h2>
          </div>
          <button
            onClick={fetchBroadcastData}
            className="text-xs text-brand-600 hover:text-brand-800 flex items-center gap-1 font-medium"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Telemetry</span>
          </button>
        </div>

        {broadcasts.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-400">
            No matching facilities found within 15 km range.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {broadcasts.map((b) => (
              <div
                key={b._id}
                className={`p-4 rounded-xl border transition-colors ${
                  b.responseStatus === 'ACCEPTED'
                    ? 'bg-presence-50/70 border-presence-300 shadow-xs'
                    : b.responseStatus === 'DECLINED'
                    ? 'bg-slate-50 border-slate-200 opacity-60'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold flex-shrink-0 ${
                        b.responseStatus === 'ACCEPTED'
                          ? 'bg-presence-600 text-white'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-xs text-slate-900 leading-snug">
                        {b.organizationId?.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {b.organizationId?.address?.city || 'Local Area'}
                      </p>
                    </div>
                  </div>

                  <div>
                    {b.responseStatus === 'ACCEPTED' ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>ACCEPTED</span>
                      </span>
                    ) : (b.responseStatus === 'DECLINED' || b.responseStatus === 'REJECTED') ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>{b.responseStatus}</span>
                      </span>
                    ) : (
                      <Badge variant="hold" size="xs" dot pulseDot>
                        PENDING
                      </Badge>
                    )}
                  </div>
                </div>

                {b.responseStatus === 'ACCEPTED' && (
                  <div className="mt-3 pt-2.5 border-t border-presence-200 flex items-center justify-between text-xs">
                    <span className="text-presence-800 font-semibold text-[11px]">
                      Trauma Bay & Critical Team Ready
                    </span>
                    <Button
                      size="sm"
                      variant="presence"
                      icon={ArrowRight}
                      iconPosition="right"
                      onClick={() => navigate(`/emergency/responses/${id}`)}
                    >
                      Select
                    </Button>
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
