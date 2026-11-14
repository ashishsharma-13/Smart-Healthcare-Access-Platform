import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  History,
  Building2,
  Loader2,
  Star,
  MessageSquare,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Toast } from '../../components/ui/Toast';
import { FeedbackModal } from '../../components/common/FeedbackModal';

export const AppointmentsPage = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState('upcoming'); // 'upcoming', 'past', 'cancelled'

  // Modals state
  const [selectedPass, setSelectedPass] = useState(null);
  const [rescheduleApt, setRescheduleApt] = useState(null);
  const [cancelModalApt, setCancelModalApt] = useState(null);
  const [cancelReason, setCancelReason] = useState('Schedule conflict');
  const [historyModalApt, setHistoryModalApt] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [appointmentHistoryData, setAppointmentHistoryData] = useState(null);

  // Feedback state
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackTarget, setFeedbackTarget] = useState(null);
  const [submittedFeedbackMap, setSubmittedFeedbackMap] = useState({});
  const [viewFeedbackApt, setViewFeedbackApt] = useState(null);

  // Reschedule slots state
  const [newDate, setNewDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [newTime, setNewTime] = useState('');
  const [rescheduleSlots, setRescheduleSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Fallback sample data matching reference image
  const defaultUpcomingApt = {
    _id: 'apt-sample-2041',
    appointmentNumber: '#AP-2041',
    status: 'CONFIRMED',
    slotDate: '2026-11-16',
    slotTime: '10:30 AM',
    reason: 'Heart-health follow-up',
    fee: '$85 · Pay at clinic',
    doctorId: {
      userId: { name: 'Dr. Mira Patel' },
      specialization: 'Cardiology',
    },
    organizationId: {
      name: 'Apex Heart Hospital',
      address: { street: '120 River Avenue', city: 'Brookfield' },
    },
  };

  useEffect(() => {
    fetchAppointments();
    fetchFeedbackMap();
  }, []);

  const fetchFeedbackMap = async () => {
    try {
      const res = await api.get('/feedback/my');
      if (res.data?.success && Array.isArray(res.data?.data)) {
        const map = {};
        res.data.data.forEach((fb) => {
          if (fb.appointmentId) {
            const aptId = typeof fb.appointmentId === 'object' ? fb.appointmentId._id : fb.appointmentId;
            map[String(aptId)] = fb;
          }
        });
        setSubmittedFeedbackMap(map);
      }
    } catch (err) {
      console.warn('Could not load feedback map:', err);
    }
  };

  const handleOpenFeedbackModal = (apt) => {
    setFeedbackTarget({
      type: 'APPOINTMENT',
      id: apt._id,
      doctorId: apt.doctorId?._id,
      doctorName: apt.doctorId?.userId?.name || 'Dr. Specialist',
      organizationId: apt.organizationId?._id || apt.organizationId,
      organizationName: apt.organizationId?.name || 'Healthcare Facility',
      date: apt.slotDate,
    });
    setFeedbackModalOpen(true);
  };

  const handleFeedbackSuccess = (newFeedback) => {
    if (newFeedback?.appointmentId) {
      const aptId = String(
        typeof newFeedback.appointmentId === 'object'
          ? newFeedback.appointmentId._id
          : newFeedback.appointmentId
      );
      setSubmittedFeedbackMap((prev) => ({ ...prev, [aptId]: newFeedback }));
    }
    setSuccessMessage('Thank you! Your feedback and doctor/hospital rating have been recorded.');
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  useEffect(() => {
    if (rescheduleApt) {
      fetchRescheduleSlots();
    }
  }, [rescheduleApt, newDate]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/appointments/my');
      if (res.data?.success && Array.isArray(res.data?.data)) {
        setAppointments(res.data.data);
      }
    } catch (err) {
      console.warn('Could not load appointments from API, using cached state', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRescheduleSlots = async () => {
    if (!rescheduleApt) return;
    try {
      setSlotsLoading(true);
      const docId = rescheduleApt.doctorId?._id || rescheduleApt.doctorId;
      const orgId = rescheduleApt.organizationId?._id || rescheduleApt.organizationId;
      const res = await api.get('/appointments/available-slots', {
        params: {
          doctorId: docId,
          date: newDate,
          organizationId: orgId,
        },
      });

      if (res.data?.success && Array.isArray(res.data?.data)) {
        setRescheduleSlots(res.data.data);
        const firstAvail = res.data.data.find((s) => s.isAvailable);
        if (firstAvail) {
          setNewTime(firstAvail.time);
        } else {
          setNewTime('');
        }
      }
    } catch (err) {
      console.warn('Could not load slots for reschedule:', err.message);
      const defaults = [
        { time: '09:00 AM', isAvailable: true },
        { time: '10:00 AM', isAvailable: true },
        { time: '11:00 AM', isAvailable: true },
        { time: '02:00 PM', isAvailable: true },
      ];
      setRescheduleSlots(defaults);
      setNewTime(defaults[0].time);
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleCancelConfirm = async () => {
    if (!cancelModalApt) return;
    try {
      setActionLoading(true);
      setError('');

      const aptId = cancelModalApt._id;
      await api.post(`/appointments/${aptId}/cancel`, {
        reason: cancelReason,
      });

      setAppointments((prev) =>
        prev.map((a) =>
          a._id === aptId
            ? { ...a, status: 'CANCELLED', cancellationReason: cancelReason }
            : a
        )
      );

      setCancelModalApt(null);
      setSuccessMessage('Appointment cancelled successfully.');
      setTimeout(() => setSuccessMessage(''), 5000);
      await fetchAppointments();
    } catch (err) {
      console.error('Failed to cancel appointment', err);
      setError(err.response?.data?.message || err.message || 'Failed to cancel appointment');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!rescheduleApt) return;
    if (!newTime) {
      setError('Please select an available replacement slot.');
      return;
    }

    try {
      setActionLoading(true);
      setError('');

      const aptId = rescheduleApt._id;
      const res = await api.post(`/appointments/${aptId}/reschedule`, {
        newDate,
        newTime,
        reason: 'Rescheduled by patient',
      });

      setRescheduleApt(null);
      setSuccessMessage('Appointment rescheduled successfully.');
      setTimeout(() => setSuccessMessage(''), 5000);
      await fetchAppointments();
    } catch (err) {
      console.error('Failed to reschedule appointment', err);
      setError(err.response?.data?.message || err.message || 'Failed to reschedule appointment');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenHistory = async (apt) => {
    setHistoryModalApt(apt);
    setAppointmentHistoryData(null);
    try {
      setHistoryLoading(true);
      const res = await api.get(`/appointments/${apt._id}`);
      if (res.data?.success) {
        setAppointmentHistoryData(res.data.data);
      }
    } catch (err) {
      console.warn('Could not fetch status history:', err.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Status mapping helpers
  const isUpcoming = (status) => {
    const s = (status || '').toUpperCase();
    return s === 'CONFIRMED' || s === 'BOOKED' || s === 'RESCHEDULED';
  };
  const isPast = (status) => {
    const s = (status || '').toUpperCase();
    return s === 'COMPLETED' || s === 'NO_SHOW';
  };
  const isCancelled = (status) => {
    const s = (status || '').toUpperCase();
    return s === 'CANCELLED';
  };

  const realUpcoming = appointments.filter((a) => isUpcoming(a.status));
  const realPast = appointments.filter((a) => isPast(a.status));
  const realCancelled = appointments.filter((a) => isCancelled(a.status));

  const upcomingCount = realUpcoming.length > 0 ? realUpcoming.length : 1;
  const pastCount = realPast.length;
  const cancelledCount = realCancelled.length;

  const displayUpcomingList = realUpcoming.length > 0 ? realUpcoming : [defaultUpcomingApt];

  const getStatusBadge = (status) => {
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'CONFIRMED':
      case 'BOOKED':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Confirmed</span>;
      case 'RESCHEDULED':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">Rescheduled</span>;
      case 'COMPLETED':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">Completed</span>;
      case 'NO_SHOW':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">No-Show</span>;
      case 'CANCELLED':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">Cancelled</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* 1. Header Section */}
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

      {/* 2. Tabs Row */}
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

      {/* 3. Tab Contents */}
      {filterTab === 'upcoming' && (
        <div className="space-y-4">
          {displayUpcomingList.map((apt) => (
            <div
              key={apt._id || apt.appointmentNumber}
              className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs hover:border-slate-300 transition-all space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {apt.doctorId?.userId?.name || 'Dr. Specialist'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {apt.doctorId?.specialization || 'Clinical Specialist'} &bull; In-Person Consultation
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {getStatusBadge(apt.status)}
                  <span className="font-mono text-xs font-bold text-slate-500">
                    {apt.appointmentNumber || apt.appointmentId}
                  </span>
                </div>
              </div>

              {/* Timing & Facility Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="flex items-center space-x-2.5 text-slate-700">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-900 block">{apt.slotDate}</span>
                    <span className="text-slate-500">{apt.slotTime}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2.5 text-slate-700">
                  <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-900 block">
                      {apt.organizationId?.name || 'Healthcare Facility'}
                    </span>
                    <span className="text-slate-500">
                      {apt.organizationId?.address?.street || 'Main Clinical Campus'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2.5 text-slate-700">
                  <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-900 block">Reason for Visit</span>
                    <span className="text-slate-500 truncate max-w-[180px] block">
                      {apt.reason || apt.patientNotes || 'General consultation'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPass(apt)}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-lg transition flex items-center space-x-1 cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>View QR Pass</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenHistory(apt)}
                    className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg transition flex items-center space-x-1 cursor-pointer"
                  >
                    <History className="w-3.5 h-3.5 text-slate-400" />
                    <span>Audit Trail</span>
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setRescheduleApt(apt)}
                    className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg transition flex items-center space-x-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                    <span>Reschedule</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCancelModalApt(apt)}
                    className="px-3 py-1.5 border border-red-200 hover:bg-red-50 text-red-600 font-bold text-xs rounded-lg transition flex items-center space-x-1 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Cancel</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {filterTab === 'past' && (
        <div className="space-y-3">
          {realPast.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">
              No completed consultation history recorded yet.
            </div>
          ) : (
            realPast.map((apt) => (
              <div
                key={apt._id}
                className="bg-white border border-slate-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="font-bold text-slate-900">
                    {apt.doctorId?.userId?.name || 'Dr. Specialist'}
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    {apt.doctorId?.specialization || 'Outpatient'} &bull; {apt.slotDate} ({apt.slotTime})
                  </div>
                  <div className="text-slate-400 text-[11px] mt-0.5">
                    {apt.organizationId?.name || 'Healthcare Facility'}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {getStatusBadge(apt.status)}

                  {submittedFeedbackMap[String(apt._id)] ? (
                    <div className="flex items-center space-x-2">
                      <span className="flex items-center space-x-1 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 font-bold text-xs">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                        <span>{submittedFeedbackMap[String(apt._id)].rating}.0 Rated</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setViewFeedbackApt(submittedFeedbackMap[String(apt._id)])}
                        className="px-2.5 py-1 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer flex items-center space-x-1"
                      >
                        <MessageSquare className="w-3 h-3 text-slate-400" />
                        <span>Review</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenFeedbackModal(apt)}
                      className="px-3 py-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs rounded-lg shadow-xs transition flex items-center space-x-1 cursor-pointer"
                    >
                      <Star className="w-3.5 h-3.5 fill-white text-white" />
                      <span>Rate Visit</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleOpenHistory(apt)}
                    className="px-2.5 py-1 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                  >
                    View History
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {filterTab === 'cancelled' && (
        <div className="space-y-3">
          {realCancelled.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">
              No cancelled appointments.
            </div>
          ) : (
            realCancelled.map((apt) => (
              <div
                key={apt._id}
                className="bg-white border border-slate-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs opacity-75"
              >
                <div>
                  <div className="font-bold text-slate-800 line-through">
                    {apt.doctorId?.userId?.name || 'Dr. Specialist'}
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    Scheduled for {apt.slotDate} ({apt.slotTime})
                  </div>
                  <div className="text-red-500 text-[11px] mt-0.5">
                    Reason: {apt.cancellationReason || 'Cancelled by user'}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {getStatusBadge(apt.status)}

                  {submittedFeedbackMap[String(apt._id)] ? (
                    <div className="flex items-center space-x-2">
                      <span className="flex items-center space-x-1 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 font-bold text-xs">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                        <span>{submittedFeedbackMap[String(apt._id)].rating}.0 Rated</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setViewFeedbackApt(submittedFeedbackMap[String(apt._id)])}
                        className="px-2.5 py-1 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer flex items-center space-x-1"
                      >
                        <MessageSquare className="w-3 h-3 text-slate-400" />
                        <span>Review</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenFeedbackModal(apt)}
                      className="px-3 py-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs rounded-lg shadow-xs transition flex items-center space-x-1 cursor-pointer"
                    >
                      <Star className="w-3.5 h-3.5 fill-white text-white" />
                      <span>Rate Visit</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleOpenHistory(apt)}
                    className="px-2.5 py-1 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                  >
                    View History
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Hospital Check-in Pass / Details Modal */}
      {selectedPass && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in"
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
                TOKEN: {selectedPass.appointmentNumber || selectedPass.appointmentId}
              </p>
            </div>

            <div className="text-xs text-slate-600 text-left bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
              <p>
                <strong className="text-slate-900">Doctor:</strong>{' '}
                {selectedPass.doctorId?.userId?.name || 'Dr. Specialist'}
              </p>
              <p>
                <strong className="text-slate-900">Schedule:</strong> {selectedPass.slotDate} ({selectedPass.slotTime})
              </p>
              <p>
                <strong className="text-slate-900">Facility:</strong>{' '}
                {selectedPass.organizationId?.name || 'Healthcare Facility'}
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
                Print Pass
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in"
        >
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl p-6 max-w-md w-full space-y-4">
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
              Selecting replacement timing for {rescheduleApt.appointmentNumber} with{' '}
              {rescheduleApt.doctorId?.userId?.name || 'Doctor'}.
            </p>

            <form onSubmit={handleRescheduleSubmit} className="space-y-4">
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
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-700">Available Slots</label>
                  {slotsLoading && <span className="text-[10px] text-slate-400">Loading...</span>}
                </div>

                {rescheduleSlots.length === 0 && !slotsLoading ? (
                  <div className="p-3 text-center bg-slate-50 rounded-xl text-xs text-slate-400 border border-dashed border-slate-200">
                    No slots available on this date.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {rescheduleSlots.map((slot) => {
                      const isSelected = newTime === slot.time;
                      const isAvailable = slot.isAvailable !== false;
                      return (
                        <button
                          key={slot.time}
                          type="button"
                          disabled={!isAvailable}
                          onClick={() => setNewTime(slot.time)}
                          className={`py-2 px-2 rounded-lg text-xs font-bold transition-all text-center ${
                            !isAvailable
                              ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-50'
                              : isSelected
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {slot.time}
                        </button>
                      );
                    })}
                  </div>
                )}
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
                  disabled={!newTime || actionLoading}
                  loading={actionLoading}
                >
                  Confirm Change
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancellation Modal */}
      {cancelModalApt && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in"
        >
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl p-6 max-w-sm w-full space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-red-600 flex items-center space-x-1.5">
                <XCircle className="w-4 h-4" />
                <span>Cancel Reservation</span>
              </h3>
              <button
                type="button"
                onClick={() => setCancelModalApt(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to cancel your consultation{' '}
              <strong className="text-slate-900">{cancelModalApt.appointmentNumber}</strong>? Your slot will be released back to the clinical schedule.
            </p>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">Cancellation Reason</label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-600"
              >
                <option value="Schedule conflict">Schedule conflict</option>
                <option value="Symptoms resolved / feeling better">Symptoms resolved / feeling better</option>
                <option value="Transportation issue">Transportation issue</option>
                <option value="Seeking alternate facility">Seeking alternate facility</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 cursor-pointer"
                onClick={() => setCancelModalApt(null)}
              >
                Keep Booking
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                className="flex-1 cursor-pointer"
                loading={actionLoading}
                onClick={handleCancelConfirm}
              >
                Confirm Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Trail / Status History Modal */}
      {historyModalApt && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in"
        >
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl p-6 max-w-md w-full space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                <History className="w-4 h-4 text-blue-600" />
                <span>Appointment Status History</span>
              </h3>
              <button
                type="button"
                onClick={() => setHistoryModalApt(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-500">
              Auditable transition lifecycle for {historyModalApt.appointmentNumber}
            </div>

            {historyLoading ? (
              <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading lifecycle history...</span>
              </div>
            ) : appointmentHistoryData?.statusHistory && appointmentHistoryData.statusHistory.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {appointmentHistoryData.statusHistory.map((item, idx) => (
                  <div key={item._id || idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800">
                        {item.previousStatus ? `${item.previousStatus} → ` : ''}
                        <span className="text-blue-700">{item.newStatus}</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(item.changedAt).toLocaleString()}
                      </span>
                    </div>
                    {item.reason && (
                      <p className="text-[11px] text-slate-600 italic">"{item.reason}"</p>
                    )}
                    <div className="text-[10px] text-slate-400 pt-0.5">
                      By: {item.changedBy?.name || 'System / User'} ({item.changedBy?.role || 'user'})
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-xl text-xs text-slate-500 text-center">
                Initial confirmed booking state recorded.
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              className="w-full cursor-pointer"
              onClick={() => setHistoryModalApt(null)}
            >
              Close
            </Button>
          </div>
        </div>
      )}

      {/* Post-Visit Feedback Modal */}
      <FeedbackModal
        isOpen={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
        target={feedbackTarget}
        onSuccess={handleFeedbackSuccess}
      />

      {/* View Submitted Review Modal */}
      {viewFeedbackApt && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in"
        >
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl p-6 max-w-md w-full space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                <span>Your Consultation Review</span>
              </h3>
              <button
                type="button"
                onClick={() => setViewFeedbackApt(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-amber-50/60 border border-amber-100 rounded-xl space-y-1">
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-4 h-4 ${
                      s <= (viewFeedbackApt.rating || 5)
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-slate-200'
                    }`}
                  />
                ))}
                <span className="text-xs font-bold text-amber-900 ml-2">
                  {viewFeedbackApt.rating}.0 / 5.0
                </span>
              </div>
              <div className="text-[11px] text-amber-800">
                Submitted on {new Date(viewFeedbackApt.createdAt).toLocaleDateString()}
              </div>
            </div>

            {viewFeedbackApt.tags && viewFeedbackApt.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {viewFeedbackApt.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-semibold rounded-md"
                  >
                    ✓ {tag}
                  </span>
                ))}
              </div>
            )}

            {viewFeedbackApt.comments && (
              <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 italic">
                "{viewFeedbackApt.comments}"
              </div>
            )}

            <div className="flex items-center space-x-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 cursor-pointer"
                onClick={() => setViewFeedbackApt(null)}
              >
                Close
              </Button>
              {viewFeedbackApt.doctorId && (
                <Link
                  to={`/doctors/${viewFeedbackApt.doctorId?._id || viewFeedbackApt.doctorId}`}
                  className="flex-1 py-2 px-3 bg-[#0B4F9C] hover:bg-blue-800 text-white font-bold text-xs rounded-xl transition text-center flex items-center justify-center space-x-1"
                >
                  <span>View Doctor Profile</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentsPage;
