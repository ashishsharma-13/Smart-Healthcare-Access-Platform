import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { DoctorAvatar } from '../../components/graphics/DoctorAvatar';
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
  Printer,
  X,
  Stethoscope,
  Building2,
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
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Appointments</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          View scheduled specialist visits, digital check-in passes, and reschedule requests.
        </p>
      </div>

      {/* Tabs matching Screen 05 Montage */}
      <div className="flex space-x-2 border-b border-slate-200">
        <button
          onClick={() => setFilterTab('upcoming')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 ${
            filterTab === 'upcoming'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Upcoming (
          {appointments.filter((a) => a.status === 'booked' || a.status === 'rescheduled').length})
        </button>

        <button
          onClick={() => setFilterTab('past')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 ${
            filterTab === 'past'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Past Visits ({appointments.filter((a) => a.status === 'completed').length})
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

      {/* Appointment Cards List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((n) => (
            <div key={n} className="h-40 bg-white rounded-2xl border animate-pulse"></div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">No {filterTab} appointments found</h3>
          <p className="text-xs text-slate-400">
            Book an appointment with top specialists across participating trauma centers.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((apt) => {
            const doctorName = apt.doctorId?.userId?.name || apt.doctorId?.name || 'Dr. Specialist';
            const spec = apt.doctorId?.specialization || 'Cardiology';

            return (
              <div
                key={apt._id}
                className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:shadow-sm transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="flex items-start space-x-4">
                  <DoctorAvatar name={doctorName} specialization={spec} className="w-14 h-14" />
                  
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-bold text-slate-900 text-sm">{doctorName}</h3>
                      <span className="text-xs font-semibold text-blue-600">({spec})</span>
                    </div>

                    <p className="text-xs text-slate-600 flex items-center">
                      <Building2 className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      <span>{apt.organizationId?.name || 'Medical Center'}</span>
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-500 font-medium">
                      <span className="flex items-center text-slate-700 font-bold">
                        <Calendar className="w-3.5 h-3.5 mr-1 text-blue-600" />
                        {new Date(apt.appointmentDate).toLocaleDateString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center text-slate-700 font-bold">
                        <Clock className="w-3.5 h-3.5 mr-1 text-blue-600" />
                        {apt.appointmentTime}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 self-end md:self-center">
                  <div className="text-right sm:text-center sm:pr-4 sm:border-r border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Token</span>
                    <span className="text-sm font-black font-mono text-blue-600">{apt.tokenNumber}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedPass(apt)}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors flex items-center space-x-1.5"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Check-In Pass</span>
                    </button>

                    {apt.status === 'booked' && (
                      <>
                        <button
                          onClick={() => {
                            setRescheduleApt(apt);
                            setNewDate(apt.appointmentDate?.split('T')[0]);
                          }}
                          className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                        >
                          Reschedule
                        </button>
                        <button
                          onClick={() => handleCancel(apt._id)}
                          className="px-3 py-2 rounded-xl text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Check-In Pass Modal (Screen 05 / 07 Montage) */}
      {selectedPass && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setSelectedPass(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                Official Check-In Boarding Pass
              </span>
              <h3 className="text-lg font-black text-slate-900">Patient Arrival Token</h3>
              <p className="text-xs text-slate-500">Present this QR pass at the clinic registration desk</p>
            </div>

            {/* QR Code Graphic Representation */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center justify-center">
              <div className="w-36 h-36 bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-full h-full fill-current text-slate-900">
                  <rect x="10" y="10" width="24" height="24" fill="#0F172A" />
                  <rect x="14" y="14" width="16" height="16" fill="#FFFFFF" />
                  <rect x="18" y="18" width="8" height="8" fill="#0F172A" />

                  <rect x="66" y="10" width="24" height="24" fill="#0F172A" />
                  <rect x="70" y="14" width="16" height="16" fill="#FFFFFF" />
                  <rect x="74" y="18" width="8" height="8" fill="#0F172A" />

                  <rect x="10" y="66" width="24" height="24" fill="#0F172A" />
                  <rect x="14" y="70" width="16" height="16" fill="#FFFFFF" />
                  <rect x="18" y="74" width="8" height="8" fill="#0F172A" />

                  <rect x="42" y="15" width="8" height="8" fill="#2563EB" />
                  <rect x="52" y="25" width="8" height="8" fill="#0F172A" />
                  <rect x="42" y="38" width="16" height="8" fill="#0F172A" />
                  <rect x="15" y="44" width="8" height="12" fill="#0F172A" />
                  <rect x="42" y="55" width="10" height="10" fill="#2563EB" />
                  <rect x="65" y="45" width="12" height="10" fill="#0F172A" />
                </svg>
              </div>
              <span className="text-base font-black font-mono text-blue-600 mt-3 tracking-widest">
                {selectedPass.tokenNumber}
              </span>
            </div>

            {/* Pass details table */}
            <div className="space-y-2 text-xs border-t border-slate-100 pt-3">
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">Doctor:</span>
                <span className="font-bold text-slate-800">
                  {selectedPass.doctorId?.userId?.name || selectedPass.doctorId?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">Facility:</span>
                <span className="font-bold text-slate-800">{selectedPass.organizationId?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">Date & Time:</span>
                <span className="font-bold text-slate-800">
                  {selectedPass.appointmentDate?.split('T')[0]} at {selectedPass.appointmentTime}
                </span>
              </div>
            </div>

            <button
              onClick={() => window.print()}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center space-x-2"
            >
              <Printer className="w-4 h-4" />
              <span>Print Arrival Pass</span>
            </button>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleApt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleRescheduleSubmit}
            className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200"
          >
            <h3 className="text-base font-black text-slate-900">Reschedule Appointment</h3>
            <p className="text-xs text-slate-500">
              Select a new date and time for consultation with {rescheduleApt.doctorId?.userId?.name}.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">New Date</label>
              <input
                type="date"
                required
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">New Time</label>
              <select
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              >
                <option value="09:00 AM">09:00 AM</option>
                <option value="10:00 AM">10:00 AM</option>
                <option value="11:00 AM">11:00 AM</option>
                <option value="02:00 PM">02:00 PM</option>
                <option value="04:00 PM">04:00 PM</option>
                <option value="06:00 PM">06:00 PM</option>
              </select>
            </div>

            <div className="flex justify-end space-x-2 pt-3">
              <button
                type="button"
                onClick={() => setRescheduleApt(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl"
              >
                {actionLoading ? 'Updating...' : 'Confirm Reschedule'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
export default AppointmentsPage;
