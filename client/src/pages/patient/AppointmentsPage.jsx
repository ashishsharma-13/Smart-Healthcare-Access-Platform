import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  Calendar,
  Clock,
  MapPin,
  QrCode,
  XCircle,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';

export const AppointmentsPage = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState('upcoming'); // 'upcoming', 'past', 'cancelled'
  const [selectedPass, setSelectedPass] = useState(null);
  const [rescheduleApt, setRescheduleApt] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('11:00 AM');
  const [actionLoading, setActionLoading] = useState(false);

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
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    const reason = prompt('Reason for cancellation (optional):');
    if (reason === null) return;

    try {
      setActionLoading(true);
      await api.put(`/appointments/${id}/cancel`, { reason });
      fetchAppointments();
    } catch (err) {
      alert('Error cancelling appointment: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!newDate || !newTime) return;

    try {
      setActionLoading(true);
      await api.put(`/appointments/${rescheduleApt._id}/reschedule`, {
        newDate,
        newTime,
      });
      setRescheduleApt(null);
      fetchAppointments();
    } catch (err) {
      alert('Reschedule error: ' + (err.response?.data?.message || err.message));
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
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Appointments</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          View scheduled specialist visits, check-in passes, and reschedule requests.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200">
        <button
          onClick={() => setFilterTab('upcoming')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 ${
            filterTab === 'upcoming'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Upcoming ({appointments.filter((a) => a.status === 'booked' || a.status === 'rescheduled').length})
        </button>

        <button
          onClick={() => setFilterTab('past')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 ${
            filterTab === 'past'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Completed ({appointments.filter((a) => a.status === 'completed').length})
        </button>

        <button
          onClick={() => setFilterTab('cancelled')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 ${
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
        <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border">
          Loading appointments...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No appointments found in this category</h3>
          <p className="text-xs text-slate-500">You can discover verified specialists and book visits anytime.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((apt) => (
            <div
              key={apt._id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-base flex-shrink-0">
                  {apt.doctorId?.userId?.name?.charAt(0) || 'D'}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-bold text-slate-900">{apt.doctorId?.userId?.name}</h3>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        apt.status === 'booked'
                          ? 'bg-blue-100 text-blue-700'
                          : apt.status === 'rescheduled'
                          ? 'bg-amber-100 text-amber-800'
                          : apt.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {apt.status}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-blue-600 mt-0.5">{apt.doctorId?.specialization}</p>

                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500">
                    <span className="flex items-center text-slate-800 font-medium">
                      <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      {apt.slotDate}
                    </span>
                    <span>&bull;</span>
                    <span className="flex items-center text-slate-800 font-medium">
                      <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      {apt.slotTime}
                    </span>
                    <span>&bull;</span>
                    <span className="flex items-center text-slate-800 font-medium">
                      <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      {apt.organizationId?.name}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 mt-1">
                    Pass Token: <code className="text-slate-600 font-mono font-bold">{apt.appointmentNumber}</code>
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 self-end md:self-center">
                <button
                  onClick={() => setSelectedPass(apt)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors flex items-center space-x-1"
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
                      className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl transition-colors flex items-center space-x-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Reschedule</span>
                    </button>

                    <button
                      onClick={() => handleCancel(apt._id)}
                      disabled={actionLoading}
                      className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl transition-colors flex items-center space-x-1"
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

      {/* QR Pass Modal */}
      {selectedPass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-slate-200 text-center space-y-4 animate-scale-up">
            <h3 className="text-base font-black text-slate-900">Hospital Check-in Pass</h3>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 inline-block">
              <div className="w-48 h-48 bg-white border border-slate-300 rounded-xl flex items-center justify-center p-2 mx-auto">
                <QrCode className="w-40 h-40 text-slate-800" />
              </div>
              <p className="text-xs font-mono font-bold text-slate-800 mt-2">
                {selectedPass.appointmentNumber}
              </p>
            </div>

            <div className="text-xs text-slate-600 text-left bg-blue-50/70 p-3 rounded-xl border border-blue-100 space-y-1">
              <p><strong>Doctor:</strong> {selectedPass.doctorId?.userId?.name}</p>
              <p><strong>Schedule:</strong> {selectedPass.slotDate} ({selectedPass.slotTime})</p>
              <p><strong>Hospital:</strong> {selectedPass.organizationId?.name}</p>
            </div>

            <button
              onClick={() => setSelectedPass(null)}
              className="w-full py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4 animate-scale-up">
            <h3 className="text-base font-black text-slate-900">Reschedule Appointment</h3>
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
                  className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">New Slot</label>
                <select
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-semibold"
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
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl disabled:opacity-50"
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

