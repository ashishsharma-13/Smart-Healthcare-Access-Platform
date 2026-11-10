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
} from 'lucide-react';

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

      // Optimistically update the UI status immediately
      setAppointments((prev) =>
        prev.map((a) =>
          a._id === appointmentId || a.appointmentNumber === appointmentId
            ? { ...a, status: 'cancelled' }
            : a
        )
      );

      let res;
      try {
        // Preferred modern method: PATCH
        res = await api.patch(`/appointments/${appointmentId}/cancel`, {
          reason: 'Cancelled by patient from portal',
          cancellationReason: 'Cancelled by patient from portal',
        });
      } catch (patchErr) {
        // Fallback: PUT or POST
        try {
          res = await api.put(`/appointments/${appointmentId}/cancel`, {
            reason: 'Cancelled by patient from portal',
          });
        } catch (putErr) {
          res = await api.post(`/appointments/${appointmentId}/cancel`, {
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
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Consultations & Visits</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          View scheduled specialist visits, check-in passes, and reschedule requests.
        </p>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl font-bold flex items-center space-x-2 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl font-bold flex items-center space-x-2 animate-fade-in shadow-xs">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200/60">
        <button
          onClick={() => setFilterTab('upcoming')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            filterTab === 'upcoming'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Upcoming ({appointments.filter((a) => a.status === 'booked' || a.status === 'rescheduled').length})
        </button>

        <button
          onClick={() => setFilterTab('past')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            filterTab === 'past'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Completed ({appointments.filter((a) => a.status === 'completed').length})
        </button>

        <button
          onClick={() => setFilterTab('cancelled')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            filterTab === 'cancelled'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Cancelled ({appointments.filter((a) => a.status === 'cancelled').length})
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl">
          Loading appointments...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl space-y-3">
          <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No appointments found in this category</h3>
          <p className="text-xs text-slate-500">You can discover verified specialists and book visits anytime.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((apt) => (
            <div
              key={apt._id}
              className="p-5 sm:p-6 bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:bg-white/85"
            >
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-black text-blue-700 bg-blue-50/80 border border-blue-200/80 px-2 py-0.5 rounded-lg">
                    {apt.appointmentNumber}
                  </span>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      apt.status === 'booked'
                        ? 'bg-blue-100 text-blue-800'
                        : apt.status === 'rescheduled'
                        ? 'bg-amber-100 text-amber-800'
                        : apt.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {apt.status}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {apt.doctorId?.userId?.name || 'Assigned Specialist'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {apt.organizationId?.name || 'Healthcare Facility'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
                  <div className="flex items-center space-x-1.5 font-semibold text-slate-700">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span>{apt.slotDate}</span>
                  </div>
                  <div className="flex items-center space-x-1.5 font-semibold text-slate-700">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span>{apt.slotTime}</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{apt.organizationId?.address?.city || 'Main Clinic'}</span>
                  </div>
                </div>

                {apt.cancellationReason && apt.status === 'cancelled' && (
                  <p className="text-[11px] text-red-600 font-medium">
                    Reason: {apt.cancellationReason}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
                <button
                  onClick={() => setSelectedPass(apt)}
                  className="px-3.5 py-2 bg-white/80 hover:bg-white text-slate-800 font-bold text-xs rounded-xl border border-slate-200/80 shadow-xs transition-colors flex items-center space-x-1 cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5 text-blue-600" />
                  <span>View Pass</span>
                </button>

                {(apt.status === 'booked' || apt.status === 'rescheduled') && (
                  <>
                    <button
                      onClick={() => {
                        setRescheduleApt(apt);
                        setNewDate(apt.slotDate);
                      }}
                      className="px-3.5 py-2 bg-blue-50/80 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-200/80 transition-colors flex items-center space-x-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Reschedule</span>
                    </button>

                    <button
                      onClick={() => handleCancel(apt._id)}
                      disabled={actionLoading}
                      className="px-3.5 py-2 bg-red-50/80 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl border border-red-200/80 transition-colors flex items-center space-x-1 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Cancel</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hospital Check-in Pass Modal */}
      {selectedPass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-md animate-fade-in">
          <div className="bg-white/85 backdrop-blur-2xl border border-white/90 shadow-2xl rounded-3xl p-8 max-w-sm w-full text-center space-y-4">
            <h3 className="text-lg font-black text-slate-900">Hospital Check-in Pass</h3>
            <div className="p-4 bg-white/70 backdrop-blur-md rounded-2xl border border-white/80 inline-block shadow-inner">
              <div className="w-48 h-48 bg-white border border-slate-200 rounded-xl flex items-center justify-center p-2 mx-auto shadow-xs">
                <QrCode className="w-40 h-40 text-slate-800" />
              </div>
              <p className="text-xs font-mono font-bold text-slate-800 mt-2">
                {selectedPass.appointmentNumber}
              </p>
            </div>

            <div className="text-xs text-slate-600 text-left bg-white/70 backdrop-blur-md p-3.5 rounded-2xl border border-white/80 space-y-1 shadow-xs">
              <p><strong>Doctor:</strong> {selectedPass.doctorId?.userId?.name}</p>
              <p><strong>Schedule:</strong> {selectedPass.slotDate} ({selectedPass.slotTime})</p>
              <p><strong>Hospital:</strong> {selectedPass.organizationId?.name}</p>
            </div>

            <button
              onClick={() => setSelectedPass(null)}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-md animate-fade-in">
          <div className="bg-white/85 backdrop-blur-2xl border border-white/90 shadow-2xl rounded-3xl p-8 max-w-sm w-full space-y-4">
            <h3 className="text-lg font-black text-slate-900">Reschedule Appointment</h3>
            <p className="text-xs text-slate-500">
              Select new date and time for consultation with {rescheduleApt.doctorId?.userId?.name}
            </p>

            <form onSubmit={handleRescheduleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">New Date</label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full p-2.5 bg-white/80 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">New Slot</label>
                <select
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full p-2.5 bg-white/80 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="09:00 AM">09:00 AM</option>
                  <option value="10:00 AM">10:00 AM</option>
                  <option value="11:00 AM">11:00 AM</option>
                  <option value="02:30 PM">02:30 PM</option>
                  <option value="04:00 PM">04:00 PM</option>
                </select>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRescheduleApt(null)}
                  className="flex-1 py-2.5 bg-white/80 hover:bg-white text-slate-700 font-bold text-xs rounded-xl border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-50 cursor-pointer"
                >
                  Confirm Change
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentsPage;
