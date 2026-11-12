import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  Calendar,
  Clock,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Eye,
  Check,
  Building2,
  User,
  Phone,
  Mail,
  AlertCircle,
  FileText,
  Activity,
  Plus,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Toast } from '../../components/ui/Toast';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';

export const DoctorAppointmentsPage = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState({ type: '', message: '' });

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Modals
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [appointmentToComplete, setAppointmentToComplete] = useState(null);
  const [clinicalNotes, setClinicalNotes] = useState('');

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('Doctor unavailable due to clinical emergency');

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/appointments/my');
      if (res.data?.success) {
        setAppointments(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching doctor appointments', err);
      setToast({ type: 'error', message: 'Failed to load appointments.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteVisit = async (e) => {
    e.preventDefault();
    if (!appointmentToComplete) return;

    try {
      setActionLoading(true);
      const res = await api.put(`/appointments/${appointmentToComplete._id}/complete`, {
        clinicalNotes: clinicalNotes.trim() || 'Consultation completed successfully.',
      });

      if (res.data?.success) {
        setToast({ type: 'success', message: 'Consultation marked as completed.' });
        setCompleteModalOpen(false);
        setAppointmentToComplete(null);
        setClinicalNotes('');
        await fetchAppointments();
      }
    } catch (err) {
      setToast({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Could not complete consultation.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelAppointment = async (e) => {
    e.preventDefault();
    if (!appointmentToCancel) return;

    try {
      setActionLoading(true);
      const res = await api.put(`/appointments/${appointmentToCancel._id}/cancel`, {
        reason: cancelReason.trim() || 'Cancelled by physician.',
      });

      if (res.data?.success) {
        setToast({ type: 'info', message: 'Appointment cancelled and patient notified.' });
        setCancelModalOpen(false);
        setAppointmentToCancel(null);
        setCancelReason('Doctor unavailable due to clinical emergency');
        await fetchAppointments();
      }
    } catch (err) {
      setToast({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Cancellation failed.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredAppointments = appointments.filter((apt) => {
    // Status filter
    if (statusFilter !== 'ALL' && apt.status !== statusFilter) {
      return false;
    }

    // Date filter
    if (dateFilter && apt.slotDate !== dateFilter) {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const patientName = apt.patientId?.name?.toLowerCase() || apt.patientName?.toLowerCase() || '';
      const aptId = (apt.appointmentId || apt._id || '')?.toLowerCase();
      const orgName = apt.organizationId?.name?.toLowerCase() || '';
      const reason = (apt.patientNotes || apt.reason || '')?.toLowerCase();
      return patientName.includes(q) || aptId.includes(q) || orgName.includes(q) || reason.includes(q);
    }

    return true;
  });

  const confirmedCount = appointments.filter((a) => a.status === 'CONFIRMED' || a.status === 'Confirmed').length;
  const completedCount = appointments.filter((a) => a.status === 'COMPLETED' || a.status === 'Completed').length;
  const todayCount = appointments.filter((a) => a.slotDate === todayStr).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Toast Alert */}
      {toast.message && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast({ type: '', message: '' })}
        />
      )}

      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="presence" size="xs" dot>
              CLINICAL CONSULTATIONS
            </Badge>
            <span className="text-[11px] font-mono text-slate-400">Outpatient Management</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Doctor Appointments & Consultation Desk
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            View patient appointment bookings, record clinical consultation notes, and manage confirmed visits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/doctor/schedule">
            <Button variant="outline" size="sm" icon={Calendar}>
              Weekly Schedule
            </Button>
          </Link>
          <Link to="/doctor/availability">
            <Button variant="outline" size="sm" icon={Clock}>
              Availability Rules
            </Button>
          </Link>
        </div>
      </div>

      {/* Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Appointments Today
          </span>
          <span className="text-2xl font-black text-blue-600 mt-1 block">
            {todayCount}
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Confirmed Upcoming
          </span>
          <span className="text-2xl font-black text-emerald-600 mt-1 block">
            {confirmedCount}
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Completed Visits
          </span>
          <span className="text-2xl font-black text-purple-600 mt-1 block">
            {completedCount}
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Total In Directory
          </span>
          <span className="text-2xl font-black text-slate-800 mt-1 block">
            {appointments.length}
          </span>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/50 px-4 pt-2 gap-2 overflow-x-auto">
          {[
            { id: 'ALL', label: `All (${appointments.length})` },
            { id: 'CONFIRMED', label: `Confirmed (${confirmedCount})` },
            { id: 'COMPLETED', label: `Completed (${completedCount})` },
            { id: 'CANCELLED', label: `Cancelled (${appointments.filter((a) => a.status === 'CANCELLED' || a.status === 'Cancelled').length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl shadow-xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Date Filter Bar */}
        <div className="p-4 bg-white border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by patient name, reason, or Ref ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">Filter Date:</span>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
            />
            {dateFilter && (
              <button
                type="button"
                onClick={() => setDateFilter('')}
                className="text-[11px] text-blue-600 font-bold hover:underline cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Appointments Table */}
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={4} cols={5} />
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="p-12 text-center">
            <EmptyState
              icon={ClipboardList}
              title="No Appointments Found"
              description={
                searchQuery || dateFilter || statusFilter !== 'ALL'
                  ? 'No appointments match your active filter criteria.'
                  : 'You have no scheduled appointments yet. Patients can reserve slots during your configured active hours.'
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="p-3.5">Patient Details</th>
                  <th className="p-3.5">Healthcare Facility</th>
                  <th className="p-3.5">Date & Time Slot</th>
                  <th className="p-3.5">Reason / Chief Complaint</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAppointments.map((apt) => {
                  const patientName = apt.patientId?.name || apt.patientName || 'Patient';
                  const patientEmail = apt.patientId?.email || 'N/A';
                  const patientPhone = apt.patientId?.phone || apt.patientPhone || 'N/A';
                  const isConfirmed = apt.status === 'CONFIRMED' || apt.status === 'Confirmed';
                  const isCompleted = apt.status === 'COMPLETED' || apt.status === 'Completed';
                  const isCancelled = apt.status === 'CANCELLED' || apt.status === 'Cancelled';

                  return (
                    <tr key={apt._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-black flex items-center justify-center text-xs">
                            {patientName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{patientName}</span>
                            <span className="text-[11px] text-slate-500">{patientPhone}</span>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span className="font-bold text-slate-900 block">
                          {apt.organizationId?.name || 'Healthcare Facility'}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {apt.department || 'Outpatient Consultation'}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-900 block">
                            {apt.slotDate || 'Scheduled Date'}
                          </span>
                          <span className="text-[11px] font-mono font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                            {apt.slotTime || apt.time || '10:00 AM'}
                          </span>
                        </div>
                      </td>

                      <td className="p-3.5 max-w-xs">
                        <p className="text-slate-700 text-xs truncate">
                          {apt.patientNotes || apt.reason || 'Routine consultation'}
                        </p>
                        {apt.appointmentId && (
                          <span className="text-[10px] font-mono text-slate-400">
                            Ref: {apt.appointmentId}
                          </span>
                        )}
                      </td>

                      <td className="p-3.5">
                        <Badge
                          variant={
                            isConfirmed ? 'presence' : isCompleted ? 'success' : isCancelled ? 'danger' : 'neutral'
                          }
                          size="xs"
                        >
                          {apt.status}
                        </Badge>
                      </td>

                      <td className="p-3.5 text-right space-x-2 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedAppointment(apt)}
                          className="text-[11px] font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                        >
                          View Details
                        </button>

                        {isConfirmed && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setAppointmentToComplete(apt);
                                setClinicalNotes('');
                                setCompleteModalOpen(true);
                              }}
                              className="text-[11px] font-bold text-emerald-600 hover:text-emerald-800 cursor-pointer"
                            >
                              Mark Completed
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setAppointmentToCancel(apt);
                                setCancelReason('Doctor unavailable due to clinical emergency');
                                setCancelModalOpen(true);
                              }}
                              className="text-[11px] font-bold text-rose-600 hover:text-rose-800 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= MODAL 1: COMPLETE CONSULTATION ================= */}
      {completeModalOpen && appointmentToComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h2 className="text-base font-black text-slate-900">Complete Consultation</h2>
              </div>
              <button
                type="button"
                onClick={() => setCompleteModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
              <p className="font-bold text-slate-900">
                Patient: {appointmentToComplete.patientId?.name || appointmentToComplete.patientName}
              </p>
              <p className="text-slate-500 font-mono text-[11px]">
                Slot: {appointmentToComplete.slotDate} &bull; {appointmentToComplete.slotTime}
              </p>
            </div>

            <form onSubmit={handleCompleteVisit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Clinical Diagnosis & Notes</label>
                <textarea
                  rows={3}
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  placeholder="Record summary of consultation, prescribed medication, or follow-up instructions..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCompleteModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={actionLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 font-bold"
                >
                  Complete Visit
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: CANCEL APPOINTMENT ================= */}
      {cancelModalOpen && appointmentToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-600" />
                <h2 className="text-base font-black text-slate-900">Cancel Appointment</h2>
              </div>
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you need to cancel the appointment with{' '}
              <strong>{appointmentToCancel.patientId?.name || appointmentToCancel.patientName}</strong>?
            </p>

            <form onSubmit={handleCancelAppointment} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Cancellation Reason *</label>
                <input
                  type="text"
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Clinical emergency, rescheduled clinic duty"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCancelModalOpen(false)}
                >
                  Keep Appointment
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={actionLoading}
                  className="bg-rose-600 hover:bg-rose-700 font-bold"
                >
                  Confirm Cancellation
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: VIEW DETAILS DOSSIER ================= */}
      {selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-black text-slate-900">Appointment Record</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAppointment(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Patient
                </span>
                <p className="font-extrabold text-slate-900 text-sm">
                  {selectedAppointment.patientId?.name || selectedAppointment.patientName}
                </p>
                <p className="text-slate-600">
                  Phone: {selectedAppointment.patientId?.phone || selectedAppointment.patientPhone || 'N/A'} &bull; Email: {selectedAppointment.patientId?.email || 'N/A'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Facility
                  </span>
                  <p className="font-bold text-slate-900">
                    {selectedAppointment.organizationId?.name || 'Medical Center'}
                  </p>
                  <p className="text-slate-500 text-[11px]">{selectedAppointment.department || 'Outpatient OPD'}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Time & Slot
                  </span>
                  <p className="font-bold text-slate-900">{selectedAppointment.slotDate}</p>
                  <p className="text-blue-600 font-mono font-bold text-[11px]">{selectedAppointment.slotTime}</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Patient Chief Complaint
                </span>
                <p className="text-slate-800">
                  {selectedAppointment.patientNotes || selectedAppointment.reason || 'None specified.'}
                </p>
              </div>

              {selectedAppointment.clinicalNotes && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                    Doctor Clinical Notes
                  </span>
                  <p className="text-emerald-950 font-medium">{selectedAppointment.clinicalNotes}</p>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedAppointment(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorAppointmentsPage;

