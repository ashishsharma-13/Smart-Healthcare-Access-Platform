import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Bell, Mail, RefreshCw, Radio, Smartphone } from 'lucide-react';
import api from '../../services/api';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Toast } from '../../components/ui/Toast';

export const AdminNotificationsPage = () => {
  const [metrics, setMetrics] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [failedDeliveries, setFailedDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState(null);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [metricsRes, notificationsRes, failedRes] = await Promise.all([
        api.get('/admin/notification-metrics'),
        api.get('/admin/notifications?limit=50'),
        api.get('/admin/notifications/failed?limit=50'),
      ]);

      setMetrics(metricsRes.data?.data || null);
      setNotifications(notificationsRes.data?.data || []);
      setFailedDeliveries(failedRes.data?.data || []);
    } catch (err) {
      console.error('Notification telemetry load failed:', err);
      setError(
        err.response?.data?.message ||
        'Notification telemetry could not be loaded. Check the admin notification API and try again.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const retryDelivery = async (notificationId) => {
    try {
      setRetryingId(notificationId);
      await api.post(`/admin/notifications/${notificationId}/retry`);
      setFeedback({ type: 'success', message: 'Notification retry initiated.' });
      await loadNotifications();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Notification retry failed.',
      });
    } finally {
      setRetryingId(null);
    }
  };

  const deliveredCount = metrics?.delivered ??
    notifications.filter((notification) => notification.status === 'DELIVERED').length;
  const unreadCount = metrics?.unread ??
    notifications.filter((notification) => notification.status !== 'READ').length;
  const failedCount = metrics?.failed ?? failedDeliveries.length;

  return (
    <div className="space-y-6 pb-12">
      {feedback.message && (
        <Toast
          type={feedback.type}
          message={feedback.message}
          onClose={() => setFeedback({ type: '', message: '' })}
        />
      )}

      <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-card flex items-center justify-between gap-4">
        <div>
          <Badge variant="neutral" size="xs">Platform Operations</Badge>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">
            Notifications &amp; Telemetry
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Monitor delivery health, unread activity, provider status, and retryable failures.
          </p>
        </div>
        <Button size="sm" variant="outline" icon={RefreshCw} onClick={loadNotifications} loading={loading}>
          Refresh
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-sm">
          <p className="font-bold">Notification service unavailable</p>
          <p className="mt-1 text-xs">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-500">
          Loading notification telemetry…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              ['Total dispatched', metrics?.total ?? notifications.length, 'text-slate-900'],
              ['Delivered / sent', deliveredCount, 'text-emerald-700'],
              ['Unread', unreadCount, 'text-amber-700'],
              ['Failed deliveries', failedCount, 'text-rose-700'],
            ].map(([label, value, color]) => (
              <div key={label} className="p-4 bg-white rounded-xl border border-slate-200 shadow-card">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
                <p className={`text-2xl font-black mt-1 ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3">
              Channel providers
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                [Bell, 'In-App Database', 'Operational'],
                [Radio, 'Socket.io Push', 'Connected'],
                [Mail, 'Email Gateway', 'Ready'],
                [Smartphone, 'SMS Dispatch', 'Active'],
              ].map(([Icon, name, status]) => (
                <div key={name} className="p-3 border border-slate-200 rounded-xl flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-brand-600" />
                    <span className="text-xs font-bold text-slate-900">{name}</span>
                  </div>
                  <Badge variant="success" size="xs">{status}</Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-700">
                Failed deliveries ({failedDeliveries.length})
              </h2>
            </div>
            {failedDeliveries.length === 0 ? (
              <p className="p-6 text-sm text-emerald-700 bg-emerald-50/50">
                No failed deliveries currently in the retry queue.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                    <tr>
                      <th className="p-3">Delivery</th>
                      <th className="p-3">Channel</th>
                      <th className="p-3">Recipient</th>
                      <th className="p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {failedDeliveries.map((delivery) => (
                      <tr key={delivery._id || delivery.deliveryId}>
                        <td className="p-3 font-mono">{delivery.deliveryId || delivery._id}</td>
                        <td className="p-3">{delivery.channel || 'Unknown'}</td>
                        <td className="p-3">{delivery.notificationId?.recipientUserId?.name || 'User'}</td>
                        <td className="p-3">
                          <Button
                            size="xs"
                            variant="outline"
                            loading={retryingId === (delivery.notificationId?._id || delivery.notificationId)}
                            onClick={() => retryDelivery(delivery.notificationId?._id || delivery.notificationId)}
                          >
                            Retry
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminNotificationsPage;
