import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Info,
  CalendarPlus,
  Check,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Toast } from '../../components/ui/Toast';

export const AppointmentsPage = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState('upcoming'); // 'upcoming', 'past', 'cancelled'
  const [selectedPass, setSelectedPass] = useState(null);
  const [rescheduleApt, setRescheduleApt] = useState(null);
  const [newDate, setNewDate] = useState('2026-11-12');
  const [newTime, setNewTime] = useState('11:00 AM');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Fallback sample data matching reference image
  const defaultUpcomingApt = {
    _id: 'apt-sample-2041',
    appointmentNumber: '#AP-2041',
    status: 'booked',
    slotDate: 'Tue, 10 Nov 2026',
    slotTime: '10:30–11:00 AM',
    reasonForVisit: 'Heart-health follow-up',
    fee: '$85 · Pay at clinic',
    doctorId: {
      userId: { name: 'Dr. Mira Patel' },
      specialization: 'Cardiology',
      consultationType: 'In person',
    },
    organizationId: {
      name: 'Riverside Medical Center',
      address: { street: '120 River Avenue', city: 'Brookfield' },
    },
  };

  const defaultPastAppointments = [
    {
      _id: 'past-1',
      provider: 'Dr. Sofia Chen',
      specialty: 'Cardiology',
      date: '28 Oct 2026',
      facility: 'Lakeside Specialty',
      status: 'Completed',
    },
    {
      _id: 'past-2',
      provider: 'Dr. Ethan Ross',
      specialty: 'Primary care',
      date: '14 Sep 2026',
      facility: 'Cedar Community',
      status: 'Completed',
    },
    {
      _id: 'past-3',
      provider: 'Dr. Mira Patel',
      specialty: 'Cardiology',
      date: '03 Aug 2026',
      facility: 'Riverside Medical',
      status: 'Completed',
    },
  ];

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/appointments/my');
      if (res.data.success && Array.isArray(res.data.data)) {
        setAppointments(res.data.data);
      }
    } catch (err) {
      console.warn('Could not load appointments from API, using cached state', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (apt) => {
    if (!window.confirm('Are you sure you want to cancel this appointment reservation?')) return;
    try {
      setActionLoading(true);
      setError('');

      const aptId = apt._id;
      if (aptId && aptId.length === 24) {
        await api.put(`/appointments/${aptId}/cancel`, {
          reason: 'Cancelled by patient from portal',
        });
      }

      setAppointments((prev) =>
        prev.map((a) =>
          a._id === aptId || a.appointmentNumber === apt.appointmentNumber
            ? { ...a, status: 'cancelled', cancellationReason: 'Cancelled by patient from portal' }
            : a
        )
      );

      setSuccessMessage('Appointment cancelled successfully');
      setTimeout(() => setSuccessMessage(''), 5000);
      await fetchAppointments();
    } catch (err) {
      console.error('Failed to cancel appointment', err);
      setError(err.response?.data?.message || 'Failed to cancel appointment');
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

      if (rescheduleApt._id && rescheduleApt._id.length === 24) {
        await api.put(`/appointments/${rescheduleApt._id}/reschedule`, {
          newDate,
          newTime,
        });
      }

      setAppointments((prev) =>
        prev.map((a) =>
          a._id === rescheduleApt._id
            ? { ...a, slotDate: newDate, slotTime: newTime, status: 'rescheduled' }
            : a
        )
      );

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

  // Derive counts
  const realUpcoming = appointments.filter((a) => a.status === 'booked' || a.status === 'rescheduled');
  const realPast = appointments.filter((a) => a.status === 'completed');
  const realCancelled = appointments.filter((a) => a.status === 'cancelled');

  const upcomingCount = realUpcoming.length > 0 ? realUpcoming.length : 1;
  const pastCount = realPast.length > 0 ? realPast.length : 3;
  const cancelledCount = realCancelled.length;

  // Display upcoming list (real or fallback)
  const displayUpcomingList = realUpcoming.length > 0 ? realUpcoming : [defaultUpcomingApt];

  // Past items list
  const pastList = realPast.length > 0
    ? realPast.map((a) => ({
        _id: a._id,
        provider: a.doctorId?.userId?.name || 'Specialist',
        specialty: a.doctorId?.specialization || 'Clinical care',
        date: a.slotDate || 'Recent',
        facility: a.organizationId?.name || 'Healthcare Facility',
        status: 'Completed',
      }))
    : defaultPastAppointments;

  const initials = (name) => {
    if (!name) return 'MP';
    return name
      .replace(/^Dr\.\s*/i, '')
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* 1. Header Section strictly per Reference Image 2 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Your appointments
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Keep your next visit in view, and your past care within reach.
          </p>
        </div>

        <div>
          <button
            type="button"
            onClick={() => navigate('/doctors')}
            className="px-4 py-2.5 bg-[#0B4F9C] hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            <span>Book an appointment</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <Toast type="success" message={successMessage} onClose={() => setSuccessMessage('')} />
      )}
      {error && (
        <Toast type="error" message={error} onClose={() => setError('')} />
      )}

      {/* 2. Tabs Row strictly per Reference Image 2 */}
      <div className="flex items-center space-x-1 pb-1">
        <button
          type="button"
          onClick={() => setFilterTab('upcoming')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
            filterTab === 'upcoming'
              ? 'bg-[#EBF3FE] text-[#0B4F9C]'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          Upcoming ({upcomingCount})
        </button>

        <button
          type="button"
          onClick={() => setFilterTab('past')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
            filterTab === 'past'
              ? 'bg-[#EBF3FE] text-[#0B4F9C]'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          Past ({pastCount})
        </button>

        <button
          type="button"
          onClick={() => setFilterTab('cancelled')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
            filterTab === 'cancelled'
              ? 'bg-[#EBF3FE] text-[#0B4F9C]'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          Cancelled ({cancelledCount})
        </button>
      </div>

      {/* 3. Main Body - Two Columns (Upcoming Appointment Card + Before your visit Card) */}
      {filterTab === 'upcoming' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Upcoming Appointments Cards (Col 8) */}
          <div className="lg:col-span-8 space-y-4">
            {displayUpcomingList.map((apt) => {
              const docName = apt.doctorId?.userId?.name || apt.doctorId?.name || 'Dr. Mira Patel';
              const specialty = apt.doctorId?.specialization || 'Cardiology';
              const consultType = apt.doctorId?.consultationType || 'In person';
              const aptNum = apt.appointmentNumber || '#AP-2041';
              const slotDt = apt.slotDate || 'Tue, 10 Nov 2026';
              const slotTm = apt.slotTime || '10:30–11:00 AM';
              const hospital = apt.organizationId?.name || 'Riverside Medical Center';
              const street = apt.organizationId?.address?.street || '120 River Avenue';
              const reason = apt.reasonForVisit || apt.patientNotes || 'Heart-health follow-up';
              const fee = apt.fee || `$${apt.consultationFee || 85} · Pay at clinic`;

              return (
                <div
                  key={apt._id}
                  className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-5"
                >
                  {/* Top row: Avatar + Name + Confirmed badge */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center space-x-3.5">
                      <div className="w-11 h-11 rounded-full bg-[#EBF3FE] text-[#0B4F9C] font-bold text-sm flex items-center justify-center shrink-0">
                        {initials(docName)}
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-slate-900">{docName}</h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {specialty} &bull; {consultType}
                        </p>
                      </div>
                    </div>

                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Confirmed
                    </span>
                  </div>

                  {/* Appointment Details Grid strictly per Reference Image 2 */}
                  <div className="space-y-2.5 text-xs pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 py-0.5">
                      <span className="sm:col-span-3 text-slate-400 font-medium">Appointment</span>
                      <span className="sm:col-span-9 font-bold text-slate-800">{aptNum}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 py-0.5">
                      <span className="sm:col-span-3 text-slate-400 font-medium">Date & time</span>
                      <span className="sm:col-span-9 font-bold text-slate-800">
                        {slotDt} &bull; {slotTm}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 py-0.5">
                      <span className="sm:col-span-3 text-slate-400 font-medium">Location</span>
                      <span className="sm:col-span-9 font-bold text-slate-800">
                        {hospital} &bull; {street}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 py-0.5">
                      <span className="sm:col-span-3 text-slate-400 font-medium">Reason for visit</span>
                      <span className="sm:col-span-9 font-bold text-slate-800">{reason}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 py-0.5">
                      <span className="sm:col-span-3 text-slate-400 font-medium">Consultation fee</span>
                      <span className="sm:col-span-9 font-bold text-slate-800">{fee}</span>
                    </div>
                  </div>

                  {/* Action Buttons Row */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedPass(apt)}
                      className="px-4 py-2 bg-[#0B4F9C] hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                    >
                      View details
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setRescheduleApt(apt);
                        setNewDate(apt.slotDate || '2026-11-12');
                      }}
                      className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition cursor-pointer shadow-xs"
                    >
                      Reschedule
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCancel(apt)}
                      disabled={actionLoading}
                      className="px-3 py-2 text-slate-500 hover:text-red-600 font-bold text-xs transition cursor-pointer"
                    >
                      Cancel appointment
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Before your visit Card (Col 4) strictly per Reference Image 2 */}
          <div className="lg:col-span-4 bg-[#F0F6FE] border border-blue-100 rounded-2xl p-6 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Before your visit</h2>
              <p className="text-xs text-slate-600 mt-1">Arrive 15 minutes early for check-in.</p>
            </div>

            <div className="space-y-2.5 text-xs text-slate-700 font-medium">
              <div className="flex items-center space-x-2">
                <Check className="w-3.5 h-3.5 text-slate-800 shrink-0" />
                <span>Bring a photo ID</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="w-3.5 h-3.5 text-slate-800 shrink-0" />
                <span>Bring current medication details</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="w-3.5 h-3.5 text-slate-800 shrink-0" />
                <span>Have previous reports ready</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="w-3.5 h-3.5 text-slate-800 shrink-0" />
                <span>Write down questions for your doctor</span>
              </div>
            </div>

            <div className="pt-3 border-t border-blue-200/50 text-[11px] text-slate-500 leading-relaxed">
              Need to change plans? Reschedule or cancel here so the clinic can update its schedule.
            </div>
          </div>
        </div>
      )}

      {/* 4. Recent Past Appointments Card strictly per Reference Image 2 */}
      {(filterTab === 'upcoming' || filterTab === 'past') && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">Recent past appointments</h2>
            <button
              type="button"
              onClick={() => setFilterTab('past')}
              className="text-xs font-bold text-[#0B4F9C] hover:underline flex items-center space-x-1 cursor-pointer"
            >
              <span>View full history</span>
              <span>&rarr;</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th className="py-2.5 pr-4">Provider</th>
                  <th className="py-2.5 px-4">Specialty</th>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Facility</th>
                  <th className="py-2.5 pl-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {pastList.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 pr-4 font-bold text-slate-900">{item.provider}</td>
                    <td className="py-3.5 px-4 text-slate-600">{item.specialty}</td>
                    <td className="py-3.5 px-4 text-slate-600">{item.date}</td>
                    <td className="py-3.5 px-4 text-slate-600">{item.facility}</td>
                    <td className="py-3.5 pl-4 text-right font-medium text-slate-700">
                      {item.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cancelled Tab Content */}
      {filterTab === 'cancelled' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900">Cancelled appointments</h2>
          {realCancelled.length === 0 ? (
            <div className="text-xs text-slate-400 py-8 text-center">
              No cancelled consultations on record.
            </div>
          ) : (
            <div className="space-y-3">
              {realCancelled.map((apt) => (
                <div
                  key={apt._id}
                  className="p-4 rounded-xl border border-slate-200/80 flex items-center justify-between"
                >
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {apt.doctorId?.userId?.name || 'Assigned Specialist'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {apt.slotDate} &bull; {apt.slotTime}
                    </p>
                    {apt.cancellationReason && (
                      <p className="text-[11px] text-rose-600 mt-1">
                        Reason: {apt.cancellationReason}
                      </p>
                    )}
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    Cancelled
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. Regular booking and Emergency Beep are separate Callout strictly per Reference Image 2 */}
      <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 flex items-start space-x-2.5 text-xs">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-blue-950 mr-1.5">
            Regular booking and Emergency Beep are separate
          </span>
          <span className="text-slate-600 text-[11px] leading-relaxed">
            A confirmed appointment reserves your consultation slot. Emergency resource holds require
            a finalized destination and confirmation from the selected facility.
          </span>
        </div>
      </div>

      {/* 6. Minimal Footer strictly per Reference Image 2 */}
      <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400 border-t border-slate-100">
        <div>SHAP &bull; Smart Healthcare Access Platform</div>
        <div>Conceptual sample data &bull; Privacy & support</div>
      </div>

      {/* Hospital Check-in Pass / Details Modal */}
      {selectedPass && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
        >
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl p-6 max-w-sm w-full text-center space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Official Check-In Pass
              </span>
              <button
                type="button"
                onClick={() => setSelectedPass(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 inline-block">
              <div className="w-36 h-36 bg-white border border-slate-200 rounded-lg flex items-center justify-center p-2 mx-auto shadow-xs">
                <QrCode className="w-32 h-32 text-slate-900" />
              </div>
              <p className="text-xs font-mono font-bold text-slate-900 mt-2">
                TOKEN: {selectedPass.appointmentNumber || '#AP-2041'}
              </p>
            </div>

            <div className="text-xs text-slate-600 text-left bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
              <p>
                <strong className="text-slate-900">Doctor:</strong>{' '}
                {selectedPass.doctorId?.userId?.name || 'Dr. Mira Patel'}
              </p>
              <p>
                <strong className="text-slate-900">Department:</strong>{' '}
                {selectedPass.doctorId?.specialization || 'Cardiology'}
              </p>
              <p>
                <strong className="text-slate-900">Schedule:</strong> {selectedPass.slotDate} (
                {selectedPass.slotTime})
              </p>
              <p>
                <strong className="text-slate-900">Facility:</strong>{' '}
                {selectedPass.organizationId?.name || 'Riverside Medical Center'}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 cursor-pointer"
                icon={Printer}
                onClick={() => window.print()}
              >
                Print Voucher
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="flex-1 cursor-pointer"
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
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl p-6 max-w-sm w-full space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Reschedule Consultation</h3>
              <button
                type="button"
                onClick={() => setRescheduleApt(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Select new date and time for consultation with{' '}
              {rescheduleApt.doctorId?.userId?.name || 'Dr. Mira Patel'}
            </p>

            <form onSubmit={handleRescheduleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Date</label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Slot Time</label>
                <select
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                >
                  <option value="09:00 AM">09:00 AM</option>
                  <option value="10:00 AM">10:00 AM</option>
                  <option value="10:30 AM">10:30 AM</option>
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
                  className="flex-1 cursor-pointer"
                  onClick={() => setRescheduleApt(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  className="flex-1 cursor-pointer"
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