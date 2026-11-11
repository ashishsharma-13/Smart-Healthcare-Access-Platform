import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  Calendar,
  Clock,
  MapPin,
  RefreshCw,
  XCircle,
  QrCode,
  AlertCircle,
  CheckCircle2,
  FileText,
  X,
  Printer,
  ChevronRight,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Toast } from '../../components/ui/Toast';
import { EmptyState } from '../../components/ui/EmptyState';

export const AppointmentsPage = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState('upcoming');
  const [selectedPass, setSelectedPass] = useState(null);
  const [rescheduleApt, setRescheduleApt] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('10:00 AM');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/appointments/my');
      if (res.data.success) {
        setAppointments(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching appointments', err);
      setError('Could not load appointment history');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (appointmentId) => {
    if (!window.confirm('Are you sure you want to cancel this appointment reservation?')) return;
    try {
      setActionLoading(true);
      setError('');

      setAppointments((prev) =>
        prev.map((a) =>
          a._id === appointmentId || a.appointmentNumber === appointmentId
            ? { ...a, status: 'cancelled' }
            : a
        )
      );

      try {
        await api.patch(`/appointments/${appointmentId}/cancel`, {
          reason: 'Cancelled by patient from portal',
          cancellationReason: 'Cancelled by patient from portal',
        });
      } catch (patchErr) {
        try {
          await api.put(`/appointments/${appointmentId}/cancel`, {
            reason: 'Cancelled by patient from portal',
          });
        } catch {
          await api.post(`/appointments/${appointmentId}/cancel`, {
            reason: 'Cancelled by patient from portal',
            cancellationReason: 'Cancelled by patient from portal',
          });
        }
      }

      setSuccessMessage('Appointment cancelled successfully');
      setTimeout(() => setSuccessMessage(''), 5000);
      await fetchAppointments();
    } catch (err) {
      console.error('Failed to cancel appointment', err);
      setError(err.response?.data?.message || 'Failed to cancel appointment');
      await fetchAppointments();
    } finally {
      setActionLoading(false);
    }
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!rescheduleApt) return;

    try {
      setActionLoading(true);
      setError('');

      try {
        await api.patch(`/appointments/${rescheduleApt._id}/reschedule`, {
          newDate,
          newTime,
          newSlotDate: newDate,
          newSlotTime: newTime,
          reason: 'Patient requested slot change via portal',
        });
      } catch {
        try {
          await api.put(`/appointments/${rescheduleApt._id}/reschedule`, {
            newDate,
            newTime,
            newSlotDate: newDate,
            newSlotTime: newTime,
            reason: 'Patient requested slot change via portal',
          });
        } catch {
          await api.post(`/appointments/${rescheduleApt._id}/reschedule`, {
            newDate,
            newTime,
            newSlotDate: newDate,
            newSlotTime: newTime,
            reason: 'Patient requested slot change via portal',
          });
        }
      }

      setRescheduleApt(null);
      setSuccessMessage('Appointment rescheduled successfully');
      setTimeout(() => setSuccessMessage(''), 5000);
      await fetchAppointments();
    } catch (err) {
      console.error('Failed to reschedule appointment', err);
      setError(err.response?.data?.message || 'Failed to reschedule appointment');
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = appointments.filter((apt) => {
    if (filterTab === 'upcoming') return apt.status === 'booked' || apt.status === 'rescheduled';
    if (filterTab === 'past') return apt.status === 'completed';
    if (filterTab === 'cancelled') return apt.status === 'cancelled';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="info" size="xs">
              Clinical Passes
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Consultations & Check-In Passes
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your booked appointments, digital clinic admission vouchers, and rescheduling
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => window.location.href = '/doctors'}>
          Book New Consultation
        </Button>
      </div>

      {/* Notifications */}
      {successMessage && (
        <Toast type="success" message={successMessage} onClose={() => setSuccessMessage('')} />
      )}
      {error && (
        <Toast type="error" message={error} onClose={() => setError('')} />
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setFilterTab('upcoming')}
          className={`pb-2.5 px-3 text-xs font-semibold transition-colors border-b-2 ${
            filterTab === 'upcoming'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Upcoming ({appointments.filter((a) => a.status === 'booked' || a.status === 'rescheduled').length})
        </button>

        <button
          onClick={() => setFilterTab('past')}
          className={`pb-2.5 px-3 text-xs font-semibold transition-colors border-b-2 ${
            filterTab === 'past'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Completed ({appointments.filter((a) => a.status === 'completed').length})
        </button>

        <button
          onClick={() => setFilterTab('cancelled')}
          className={`pb-2.5 px-3 text-xs font-semibold transition-colors border-b-2 ${
            filterTab === 'cancelled'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Cancelled ({appointments.filter((a) => a.status === 'cancelled').length})
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-white border border-slate-200 rounded-xl p-5 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No Consultations Found"
          description={`You have no ${filterTab} visits in your patient records.`}
          actionLabel="Find a Specialist"
          onAction={() => window.location.href = '/doctors'}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((apt) => (
            <div
              key={apt._id}
              className="p-5 bg-white border border-slate-200 rounded-xl shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-brand-300 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded">
                    {apt.appointmentNumber}
                  </span>

                  <Badge
                    variant={
                      apt.status === 'booked'
                        ? 'info'
                        : apt.status === 'rescheduled'
                        ? 'hold'
                        : apt.status === 'completed'
                        ? 'presence'
                        : 'neutral'
                    }
                    size="xs"
                  >
                    {apt.status}
                  </Badge>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-snug">
                    {apt.doctorId?.userId?.name || 'Assigned Specialist'}
                  </h3>
                  <p className="text-xs text-brand-700 font-medium">
                    {apt.doctorId?.specialization || 'Clinical Department'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {apt.organizationId?.name || 'Healthcare Facility'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 pt-1">
                  <div className="flex items-center gap-1 font-medium text-slate-700">
                    <Calendar className="w-3.5 h-3.5 text-brand-600" />
                    <span>{apt.slotDate}</span>
                  </div>
                  <div className="flex items-center gap-1 font-medium text-slate-700">
                    <Clock className="w-3.5 h-3.5 text-brand-600" />
                    <span>{apt.slotTime}</span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{apt.organizationId?.address?.city || 'Main Clinic'}</span>
                  </div>
                </div>

                {apt.cancellationReason && apt.status === 'cancelled' && (
                  <p className="text-[11px] text-rose-600 font-medium">
                    Reason: {apt.cancellationReason}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
                <Button
                  size="sm"
                  variant="outline"
                  icon={QrCode}
                  onClick={() => setSelectedPass(apt)}
                >
                  View Pass
                </Button>

                {(apt.status === 'booked' || apt.status === 'rescheduled') && (
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={RefreshCw}
                      onClick={() => {
                        setRescheduleApt(apt);
                        setNewDate(apt.slotDate);
                      }}
                    >
                      Reschedule
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      icon={XCircle}
                      disabled={actionLoading}
                      onClick={() => handleCancel(apt._id)}
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hospital Check-in Pass Modal */}
      {selectedPass && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
        >
          <div className="bg-white border border-slate-200 shadow-modal rounded-xl p-6 sm:p-7 max-w-sm w-full text-center space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Official Check-In Pass
              </span>
              <button
                onClick={() => setSelectedPass(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 inline-block">
              <div className="w-40 h-40 bg-white border border-slate-200 rounded-lg flex items-center justify-center p-2 mx-auto shadow-xs">
                <QrCode className="w-36 h-36 text-slate-900" />
              </div>
              <p className="text-xs font-mono font-bold text-slate-900 mt-2">
                TOKEN: {selectedPass.appointmentNumber}
              </p>
            </div>

            <div className="text-xs text-slate-600 text-left bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1">
              <p><strong className="text-slate-900">Doctor:</strong> {selectedPass.doctorId?.userId?.name}</p>
              <p><strong className="text-slate-900">Department:</strong> {selectedPass.doctorId?.specialization}</p>
              <p><strong className="text-slate-900">Schedule:</strong> {selectedPass.slotDate} ({selectedPass.slotTime})</p>
              <p><strong className="text-slate-900">Hospital:</strong> {selectedPass.organizationId?.name}</p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                icon={Printer}
                onClick={() => window.print()}
              >
                Print Voucher
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="flex-1"
                onClick={() => setSelectedPass(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleApt && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
        >
          <div className="bg-white border border-slate-200 shadow-modal rounded-xl p-6 sm:p-7 max-w-sm w-full space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Reschedule Consultation</h3>
              <button
                onClick={() => setRescheduleApt(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Select new date and time for consultation with {rescheduleApt.doctorId?.userId?.name}
            </p>

            <form onSubmit={handleRescheduleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">New Date</label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">New Slot Time</label>
                <select
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white"
                >
                  <option value="09:00 AM">09:00 AM</option>
                  <option value="10:00 AM">10:00 AM</option>
                  <option value="11:00 AM">11:00 AM</option>
                  <option value="02:30 PM">02:30 PM</option>
                  <option value="04:00 PM">04:00 PM</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setRescheduleApt(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  className="flex-1"
                  loading={actionLoading}
                >
                  Confirm Change
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentsPage;
