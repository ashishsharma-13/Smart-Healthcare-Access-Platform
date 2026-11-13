import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import {
  Bell,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Calendar,
  Building2,
  Stethoscope,
  Filter,
  Check,
  Settings,
  X,
  AlertTriangle,
  Mail,
  Smartphone,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Toast } from '../../components/ui/Toast';

export const NotificationsPage = () => {
  const { user } = useAuth();
  const socketContext = useSocket();
  const socket = socketContext?.socket || null;
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(searchParams.get('tab') === 'preferences');
  const [preferences, setPreferences] = useState([]);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [toast, setToast] = useState({ type: '', message: '' });

  useEffect(() => {
    fetchNotifications();
    fetchPreferences();
  }, [unreadOnly]);

  // Real-time socket listener
  useEffect(() => {
    if (!socket) return;
    const handleLiveEvent = (notif) => {
      fetchNotifications();
    };

    socket.on('notification:new', handleLiveEvent);
    socket.on('notification:received', handleLiveEvent);

    return () => {
      socket.off('notification:new', handleLiveEvent);
      socket.off('notification:received', handleLiveEvent);
    };
  }, [socket]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const url = `/notifications/my?limit=100${unreadOnly ? '&unreadOnly=true' : ''}`;
      const res = await api.get(url);
      if (res.data?.success) {
        setNotifications(res.data.data || []);
      }
    } catch (err) {
      console.warn('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPreferences = async () => {
    try {
      const res = await api.get('/notifications/my/preferences');
      if (res.data?.success) {
        setPreferences(res.data.data || []);
      }
    } catch (err) {
      console.warn('Error fetching preferences:', err);
    }
  };

  const handleMarkAsRead = async (id, e) => {
    e?.stopPropagation();
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id || n.notificationId === id ? { ...n, status: 'READ', readAt: new Date() } : n))
      );
    } catch (err) {
      console.warn('Error marking as read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/my/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, status: 'READ', readAt: new Date() })));
    } catch (err) {
      console.warn('Error marking all as read:', err);
    }
  };

  const handleSavePreferences = async () => {
    try {
      setSavingPrefs(true);
      const res = await api.put('/notifications/my/preferences', { preferences });
      if (res.data?.success) {
        setPreferences(res.data.data);
        setPreferencesOpen(false);
        setToast({ type: 'success', message: 'Notification preferences updated.' });
      }
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to update preferences' });
    } finally {
      setSavingPrefs(false);
    }
  };

  const togglePreferenceChannel = (channel) => {
    setPreferences((prev) =>
      prev.map((p) => (p.channel === channel ? { ...p, enabled: !p.enabled } : p))
    );
  };

  const openNotificationDetails = async (notif) => {
    try {
      const res = await api.get(`/notifications/${notif._id || notif.notificationId}`);
      if (res.data?.success) {
        setSelectedNotification(res.data.data);
      } else {
        setSelectedNotification({ notification: notif, deliveries: [] });
      }
    } catch (err) {
      setSelectedNotification({ notification: notif, deliveries: [] });
    }
    setDetailsModalOpen(true);
    if (notif.status !== 'READ') {
      handleMarkAsRead(notif._id || notif.notificationId);
    }
  };

  // Filter items by active category tab
  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'EMERGENCY') return n.notificationType?.startsWith('EMERGENCY_') || n.priority === 'EMERGENCY';
    if (activeTab === 'APPOINTMENTS') return n.notificationType?.startsWith('APPOINTMENT_');
    if (activeTab === 'FACILITY') return n.notificationType?.startsWith('ORGANIZATION_') || n.notificationType?.startsWith('DOCTOR_') || n.notificationType?.startsWith('AFFILIATION_');
    if (activeTab === 'SYSTEM') return n.notificationType === 'CRITICAL_OPERATIONAL_FAILURE' || n.notificationType === 'GENERAL_SYSTEM';
    return true;
  });

  const unreadCount = notifications.filter((n) => n.status !== 'READ').length;

  const getCategoryIcon = (type, priority) => {
    if (priority === 'EMERGENCY' || type?.startsWith('EMERGENCY_')) {
      return <ShieldAlert className="w-4 h-4 text-red-600" />;
    }
    if (type?.startsWith('APPOINTMENT_')) {
      return <Calendar className="w-4 h-4 text-blue-600" />;
    }
    if (type?.startsWith('ORGANIZATION_') || type?.startsWith('AFFILIATION_')) {
      return <Building2 className="w-4 h-4 text-purple-600" />;
    }
    if (type?.startsWith('DOCTOR_')) {
      return <Stethoscope className="w-4 h-4 text-emerald-600" />;
    }
    return <Bell className="w-4 h-4 text-slate-500" />;
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'EMERGENCY':
        return <Badge variant="urgent" size="sm">Emergency</Badge>;
      case 'CRITICAL':
        return <Badge variant="warning" size="sm">Critical</Badge>;
      case 'HIGH':
        return <Badge variant="primary" size="sm">High</Badge>;
      case 'LOW':
        return <Badge variant="default" size="sm">Low</Badge>;
      default:
        return <Badge variant="secondary" size="sm">Normal</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 bg-brand-50 text-brand-700 text-[10px] font-extrabold uppercase rounded-full">
              Unified Communications Hub
            </span>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-red-100 text-red-800 text-[10px] font-extrabold rounded-full">
                {unreadCount} Unread
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Notification Center & Communication Stream
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit log of clinical appointments, emergency broadcasts, facility affiliations, and system telemetry alerts.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              icon={CheckCircle2}
              onClick={handleMarkAllRead}
            >
              Mark All Read
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            icon={Settings}
            onClick={() => setPreferencesOpen(true)}
          >
            Preferences
          </Button>
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'ALL', label: 'All Notifications' },
            { id: 'EMERGENCY', label: 'Emergency & Beep' },
            { id: 'APPOINTMENTS', label: 'Appointments' },
            { id: 'FACILITY', label: 'Facility & Staff' },
            { id: 'SYSTEM', label: 'System & Safety' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer self-start sm:self-auto select-none">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => setUnreadOnly(e.target.checked)}
            className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300 cursor-pointer"
          />
          <span>Show Unread Only</span>
        </label>
      </div>

      {/* Notification Stream */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
          Loading notification records and delivery status...
        </div>
      ) : filteredNotifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No Notifications in this Category"
          description={
            unreadOnly
              ? 'You have caught up with all unread messages. Toggle "Show Unread Only" to view past events.'
              : 'There are currently no notification records logged for this filter category.'
          }
          actionLabel="View All Notifications"
          onAction={() => {
            setActiveTab('ALL');
            setUnreadOnly(false);
          }}
        />
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notif) => {
            const isUnread = notif.status !== 'READ';
            return (
              <div
                key={notif._id || notif.notificationId}
                onClick={() => openNotificationDetails(notif)}
                className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isUnread
                    ? 'bg-brand-50/20 border-brand-200 shadow-xs hover:border-brand-300'
                    : 'bg-white border-slate-200/90 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                    {getCategoryIcon(notif.notificationType, notif.priority)}
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 leading-snug">
                        {notif.title}
                      </span>
                      {getPriorityBadge(notif.priority)}
                      {isUnread && (
                        <span className="px-2 py-0.5 bg-brand-100 text-brand-700 text-[9.5px] font-black uppercase rounded-md">
                          Unread
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                      {notif.message}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 font-medium pt-0.5">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        {new Date(notif.createdAt).toLocaleString()}
                      </span>
                      <span>&bull;</span>
                      <span className="uppercase text-[10px] tracking-wider font-bold">
                        Channel: In-App / Telemetry
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {notif.actionUrl && (
                    <Button
                      size="xs"
                      variant="outline"
                      icon={ExternalLink}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isUnread) handleMarkAsRead(notif._id || notif.notificationId);
                        navigate(notif.actionUrl);
                      }}
                    >
                      Open
                    </Button>
                  )}
                  {isUnread && (
                    <Button
                      size="xs"
                      variant="ghost"
                      icon={Check}
                      onClick={(e) => handleMarkAsRead(notif._id || notif.notificationId, e)}
                    >
                      Read
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Details & Delivery Audit Modal */}
      {detailsModalOpen && selectedNotification && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                {getCategoryIcon(selectedNotification.notification?.notificationType, selectedNotification.notification?.priority)}
                <h3 className="text-sm font-black text-slate-900">
                  Notification Audit Details
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Title</span>
                <span className="font-bold text-slate-900 text-sm">
                  {selectedNotification.notification?.title}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Message</span>
                <p className="text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
                  {selectedNotification.notification?.message}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">TYPE</span>
                  <span className="font-mono text-slate-800 text-[11px]">
                    {selectedNotification.notification?.notificationType}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">PRIORITY</span>
                  <span className="font-bold text-slate-800">
                    {selectedNotification.notification?.priority}
                  </span>
                </div>
              </div>

              {/* Delivery Attempts */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold text-slate-800 block">
                  Delivery Channel Records ({selectedNotification.deliveries?.length || 0})
                </span>
                {selectedNotification.deliveries && selectedNotification.deliveries.length > 0 ? (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {selectedNotification.deliveries.map((del) => (
                      <div
                        key={del._id || del.deliveryId}
                        className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px]"
                      >
                        <div>
                          <span className="font-bold text-slate-800">{del.channel}</span>
                          <span className="text-slate-400 ml-2">via {del.providerName}</span>
                        </div>
                        <Badge variant={del.status === 'DELIVERED' ? 'success' : del.status === 'FAILED' ? 'urgent' : 'warning'} size="sm">
                          {del.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">In-app direct channel delivered.</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              {selectedNotification.notification?.actionUrl && (
                <Button
                  size="sm"
                  variant="primary"
                  icon={ExternalLink}
                  onClick={() => {
                    setDetailsModalOpen(false);
                    navigate(selectedNotification.notification.actionUrl);
                  }}
                >
                  Go to Action
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDetailsModalOpen(false)}
                className="ml-auto"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Preferences Modal */}
      {preferencesOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-slate-700" />
                <h3 className="text-base font-black text-slate-900">
                  Notification Delivery Preferences
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreferencesOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Medical Safety Notice */}
            <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-amber-900 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-black text-[11px] uppercase tracking-wide block">
                  Safety Protocol Invariant
                </span>
                <p className="text-[10.5px] leading-relaxed text-amber-800">
                  Critical emergency alarms, destination confirmations, and hospital dispatch alerts cannot be silenced and will always be delivered according to medical safety protocols.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Configure which communication channels you prefer for routine appointments, facility updates, and account notifications.
            </p>

            <div className="space-y-2.5 pt-1">
              {[
                { channel: 'IN_APP', label: 'In-App Alerts', desc: 'Alert bell and notification center in portal', icon: Bell },
                { channel: 'WEBSOCKET', label: 'Real-time WebSocket Push', desc: 'Instant live browser banners and audio cues', icon: Radio },
                { channel: 'EMAIL', label: 'Email Notifications', desc: 'Appointments & verification receipts', icon: Mail },
                { channel: 'SMS', label: 'SMS Mobile Text', desc: 'Critical verification codes & emergency alerts', icon: Smartphone },
              ].map((item) => {
                const isEnabled = preferences.find((p) => p.channel === item.channel)?.enabled ?? true;
                const Icon = item.icon;
                return (
                  <div
                    key={item.channel}
                    className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100/60 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">
                          {item.label}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {item.desc}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => togglePreferenceChannel(item.channel)}
                      className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                        isEnabled ? 'bg-brand-600' : 'bg-slate-300'
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                          isEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreferencesOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={savingPrefs}
                onClick={handleSavePreferences}
              >
                {savingPrefs ? 'Saving...' : 'Save Preferences'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {toast.message && (
        <Toast type={toast.type || 'info'} message={toast.message} onClose={() => setToast({ type: '', message: '' })} />
      )}
    </div>
  );
};

export default NotificationsPage;

