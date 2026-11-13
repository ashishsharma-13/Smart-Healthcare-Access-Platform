import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import {
  Activity,
  Server,
  Database,
  Radio,
  Send,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';

export const SystemHealthWidget = () => {
  const [health, setHealth] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showActivity, setShowActivity] = useState(false);

  useEffect(() => {
    fetchHealthAndActivity();
  }, []);

  const fetchHealthAndActivity = async () => {
    try {
      setLoading(true);
      const [hRes, aRes] = await Promise.all([
        api.get('/admin/dashboard/system-health'),
        api.get('/admin/dashboard/activity?limit=6'),
      ]);
      if (hRes.data?.success) setHealth(hRes.data.data);
      if (aRes.data?.success) setActivity(aRes.data.data);
    } catch (err) {
      console.error('Error fetching system telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatUptime = (seconds) => {
    if (!seconds) return '0m';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-card space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-brand-600" />
          <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">
            Platform Subsystem Health & Governance Stream
          </h3>
          <Badge variant="presence" size="xs" dot pulseDot>
            Live Operational
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="xs"
            variant="ghost"
            onClick={() => setShowActivity(!showActivity)}
          >
            {showActivity ? (
              <span className="flex items-center gap-1">Hide Activity <ChevronUp className="w-3.5 h-3.5" /></span>
            ) : (
              <span className="flex items-center gap-1">Recent Activity ({activity.length}) <ChevronDown className="w-3.5 h-3.5" /></span>
            )}
          </Button>
          <Button size="xs" variant="outline" icon={RefreshCw} onClick={fetchHealthAndActivity}>
            Check
          </Button>
        </div>
      </div>

      {/* Health Status Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Core Database</span>
            <span className="font-bold text-slate-900">{health?.services?.database?.type || 'MongoDB'}</span>
          </div>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
            {health?.services?.database?.status || 'CONNECTED'}
          </span>
        </div>

        <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">WebSocket Server</span>
            <span className="font-bold text-slate-900 font-mono text-[11px]">/ws/notifications</span>
          </div>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
            {health?.services?.websocket?.status || 'LISTENING'}
          </span>
        </div>

        <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Notification Outbox</span>
            <span className="font-bold text-slate-900">{health?.services?.notificationOutbox?.pendingCount ?? 0} Pending</span>
          </div>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
            {health?.services?.notificationOutbox?.status || 'HEALTHY'}
          </span>
        </div>

        <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Platform Uptime</span>
            <span className="font-bold text-slate-900 font-mono">{formatUptime(health?.uptimeSeconds)}</span>
          </div>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
            ACTIVE
          </span>
        </div>
      </div>

      {/* Expandable Activity Feed */}
      {showActivity && (
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Real-Time Administrative Event Feed</span>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {activity.map((act, i) => (
              <div key={i} className="p-2 bg-slate-50/70 border border-slate-100 rounded-lg flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-900">{act.title}</span>
                  <p className="text-[11px] text-slate-500">{act.description}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-mono block">
                    {new Date(act.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="text-[10px] font-semibold text-brand-600">{act.actor}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

