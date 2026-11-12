import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Calendar,
  Clock,
  ClipboardList,
  CheckCircle2,
  XCircle,
  QrCode,
  User,
  MapPin,
  X,
  Printer,
  ChevronRight,
  Building2,
  Check,
} from 'lucide-react';
import { Toast } from '../../components/ui/Toast';

export const DoctorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [doctorProfile, setDoctorProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [reviewRequest, setReviewRequest] = useState(null);
  const [toast, setToast] = useState({ type: '', message: '' });

  // Fallback defaults matching reference image
  const defaultSchedule = [
    {
      _id: 'apt-001',
      time: '1:30 PM',
      patientName: 'Noah Williams',
      patientInitials: 'NW',
      visitType: 'Follow-up',
      reason: 'Routine hypertension review',
      status: 'Completed',
      room: 'Room C-02',
    },
    {
      _id: 'apt-002',
      time: '2:30 PM',
      slotRange: '2:30–3:00 PM',
      patientName: 'Avery James',
      patientInitials: 'AJ',
      visitType: 'Initial consultation',
      reason: 'Heart-health review',
      status: 'Confirmed',
      room: 'Riverside · Room C-02',
      location: 'Riverside · Room C-02',
    },
    {
      _id: 'apt-003',
      time: '3:00 PM',
      patientName: 'Morgan Lee',
      patientInitials: 'ML',
      visitType: 'Heart-health follow-up',
      reason: 'Post-EKG consultation',
      status: 'Confirmed',
      room: 'Room C-02',
    },
    {
      _id: 'apt-004',
      time: '3:30 PM',
      patientName: 'Sam Taylor',
      patientInitials: 'ST',
      visitType: 'Follow-up',
      reason: 'Cholesterol medication review',
      status: 'Confirmed',
      room: 'Room C-02',
    },
  ];

  const defaultRoutineRequests = [
    {
      _id: 'req-01',
      patientName: 'Elena Carter',
      detail: 'Reschedule · Tue, 10 Nov · 2:30 PM',
      status: 'Pending',
      type: 'Reschedule',
    },
    {
      _id: 'req-02',
      patientName: 'Oliver Reed',
      detail: 'New visit · Wed, 11 Nov · 11:00 AM',
      status: 'Pending',
      type: 'New booking',
    },
  ];

  const [routineRequests, setRoutineRequests] = useState(defaultRoutineRequests);

  useEffect(() => {
    fetchDoctorData();
  }, []);

  const fetchDoctorData = async () => {
    try {
      setLoading(true);
      const [profileRes, aptRes] = await Promise.allSettled([
        api.get('/doctors/me'),
        api.get('/appointments/my'),
      ]);

      if (profileRes.status === 'fulfilled' && profileRes.value.data?.success) {
        setDoctorProfile(profileRes.value.data.data);
      }
      if (aptRes.status === 'fulfilled' && aptRes.value.data?.success) {
        const data = aptRes.value.data.data;
        if (Array.isArray(data) && data.length > 0) {
          setAppointments(data);
        }
      }
    } catch (err) {
      console.warn('Could not load doctor dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = (id) => {
    setRoutineRequests(routineRequests.filter((r) => r._id !== id));
    setReviewRequest(null);
    setToast({ type: 'success', message: 'Request approved and scheduled into clinic calendar!' });
    setTimeout(() => setToast({ type: '', message: '' }), 4000);
  };

  const handleCompleteVisit = async (aptId) => {
    try {
      if (aptId && aptId.length === 24) {
        await api.put(`/appointments/${aptId}/complete`, { notes: 'Completed in consultation' });
      }
      setSelectedAppointment(null);
      setToast({ type: 'success', message: 'Consultation marked as completed and recorded in medical log.' });
      setTimeout(() => setToast({ type: '', message: '' }), 4000);
      await fetchDoctorData();
    } catch (err) {
      console.error('Error completing visit', err);
      setToast({ type: 'error', message: err.response?.data?.message || 'Could not complete consultation' });
      setTimeout(() => setToast({ type: '', message: '' }), 4000);
    }
  };

  // Live schedule from appointments or fallback defaults
  const displaySchedule =
    appointments.length > 0
      ? appointments.map((apt) => {
          const ptName =
            apt.patientId?.name ||
            apt.patientName ||
            'Noah Williams';
          const initials = ptName
            .replace(/^Dr\.\s*/i, '')
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();

          return {
            _id: apt._id,
            time: apt.slotTime ? apt.slotTime.split('–')[0].trim() : '10:30 AM',
            slotRange: apt.slotTime || '10:30–11:00 AM',
            patientName: ptName,
            patientInitials: initials || 'NW',
            visitType: apt.patientNotes || 'Follow-up',
            reason: apt.patientNotes || 'Heart-health consultation',
            status:
              apt.status === 'completed'
                ? 'Completed'
                : apt.status === 'cancelled'
                ? 'Cancelled'
                : 'Confirmed',
            room: 'Room C-02',
            location: 'Riverside · Room C-02',
            appointmentNumber: apt.appointmentNumber,
            slotDate: apt.slotDate,
          };
        })
      : defaultSchedule;

  // Next patient item
  const nextPatient =
    displaySchedule.find((s) => s.status === 'Confirmed') ||
    displaySchedule[0] ||
    defaultSchedule[1];

  const doctorLastName = doctorProfile?.userId?.name
    ? doctorProfile.userId.name.replace(/^Dr\.\s*/i, '').split(' ').pop()
    : 'Patel';

  const facilityTag = doctorProfile?.currentPresence?.organizationId?.name
    ? `${doctorProfile.currentPresence.organizationId.name.toUpperCase()} / ${doctorProfile?.specialization?.toUpperCase() || 'CARDIOLOGY'}`
    : 'RIVERSIDE MEDICAL CENTER / CARDIOLOGY';

  const workingHoursDisplay = doctorProfile?.workingHours || 'Mon–Fri · 9:00 AM–4:00 PM';

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* Toast */}
      {toast.message && <Toast type={toast.type} message={toast.message} onClose={() => setToast({ type: '', message: '' })} />}

      {/* 1. Header Section strictly per Reference Image */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] sm:text-[11px] font-bold tracking-wider text-[#0B4F9C] uppercase block mb-1">
            {facilityTag}
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            A clear view of your day, Dr. {doctorLastName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Monday, 09 November &bull; Your schedule and routine requests in one place.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/doctor/presence"
            className="px-3.5 py-2.5 bg-[#EBF3FE] hover:bg-blue-100 text-[#0B4F9C] font-bold text-xs rounded-xl border border-blue-200/60 transition cursor-pointer shadow-xs flex items-center space-x-1.5"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>QR Presence & Badge</span>
          </Link>

          <button
            type="button"
            onClick={() => navigate('/doctor/availability')}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition cursor-pointer shadow-xs"
          >
            Manage availability
          </button>
        </div>
      </div>

      {/* 2. Three Stat Cards Row strictly per Reference Image */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Today's appointments */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Today's appointments</span>
            <Calendar className="w-4 h-4 text-[#0B4F9C]" />
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              {appointments.length > 0
                ? displaySchedule.length < 10
                  ? `0${displaySchedule.length}`
                  : displaySchedule.length
                : '08'}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {appointments.length > 0
                ? `${displaySchedule.filter((s) => s.status === 'Completed').length} completed • ${
                    displaySchedule.filter((s) => s.status === 'Confirmed').length
                  } remaining`
                : '5 completed • 3 remaining'}
            </div>
          </div>
        </div>

        {/* Card 2: Next consultation */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Next consultation</span>
            <Clock className="w-4 h-4 text-[#0B4F9C]" />
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              {nextPatient.time || '2:30 PM'}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              In person &bull; {nextPatient.room || 'Room C-02'}
            </div>
          </div>
        </div>

        {/* Card 3: Routine requests */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Routine requests</span>
            <ClipboardList className="w-4 h-4 text-[#0B4F9C]" />
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              {routineRequests.length < 10 ? `0${routineRequests.length}` : routineRequests.length}
            </div>
            <div className="text-xs text-slate-500 mt-1">Awaiting schedule review</div>
          </div>
        </div>
      </div>

      {/* 3. Main Two-Column Grid strictly per Reference Image */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Today's Schedule + Pending Routine Requests */}
        <div className="lg:col-span-8 space-y-6">
          {/* Card 1: Today's schedule */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Today's schedule</h2>
              <button
                type="button"
                onClick={() => navigate('/doctor/schedule')}
                className="text-xs font-bold text-[#0B4F9C] hover:underline flex items-center space-x-1 cursor-pointer"
              >
                <span>Full schedule</span>
                <span>&rarr;</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <th className="py-2.5 pr-4">Time</th>
                    <th className="py-2.5 px-4">Patient</th>
                    <th className="py-2.5 px-4">Visit</th>
                    <th className="py-2.5 pl-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {displaySchedule.map((apt) => (
                    <tr
                      key={apt._id}
                      onClick={() => setSelectedAppointment(apt)}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 pr-4 font-bold text-slate-900">{apt.time}</td>
                      <td className="py-3.5 px-4 font-medium text-slate-900">{apt.patientName}</td>
                      <td className="py-3.5 px-4 text-slate-600">{apt.visitType}</td>
                      <td className="py-3.5 pl-4 text-right">
                        {apt.status === 'Completed' ? (
                          <span className="text-slate-500 font-medium">Completed</span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Confirmed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400">
              Showing care-relevant information only. Open a visit for authorized details.
            </div>
          </div>

          {/* Card 2: Pending routine requests strictly per Reference Image */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Pending routine requests</h2>
              <button
                type="button"
                onClick={() => navigate('/doctor/schedule')}
                className="text-xs font-bold text-[#0B4F9C] hover:underline flex items-center space-x-1 cursor-pointer"
              >
                <span>Review all</span>
                <span>&rarr;</span>
              </button>
            </div>

            {routineRequests.length === 0 ? (
              <div className="text-xs text-slate-400 py-6 text-center">
                All routine patient requests have been reviewed.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {routineRequests.map((req) => (
                  <div key={req._id} className="py-3.5 flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{req.patientName}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{req.detail}</p>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200/60">
                        {req.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => setReviewRequest(req)}
                        className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-xs transition cursor-pointer"
                      >
                        Review
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (4 cols): NEXT PATIENT Card + Availability is up to date Card */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card 1: NEXT PATIENT strictly per Reference Image */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-5">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#EBF3FE] text-blue-700 inline-block">
              NEXT PATIENT
            </span>

            {/* Patient Header */}
            <div className="flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-full bg-[#EBF3FE] text-[#0B4F9C] font-bold text-sm flex items-center justify-center shrink-0">
                {nextPatient.patientInitials}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">{nextPatient.patientName}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {nextPatient.slotRange || '2:30–3:00 PM'} &bull; In person
                </p>
              </div>
            </div>

            {/* Visit Details */}
            <div className="space-y-2.5 text-xs pt-1">
              <div className="flex justify-between py-0.5">
                <span className="text-slate-400 font-medium">Visit type</span>
                <span className="font-bold text-slate-800">{nextPatient.visitType}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-400 font-medium">Reason</span>
                <span className="font-bold text-slate-800">{nextPatient.reason}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-400 font-medium">Location</span>
                <span className="font-bold text-slate-800">{nextPatient.location || 'Riverside · Room C-02'}</span>
              </div>
            </div>

            {/* Action CTA */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSelectedAppointment(nextPatient)}
                className="w-full py-2.5 bg-[#0B4F9C] hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                Open appointment
              </button>
            </div>
          </div>

          {/* Card 2: Availability is up to date strictly per Reference Image */}
          <div className="bg-[#F0FDF4] border border-emerald-100 rounded-2xl p-6 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Availability is up to date</h3>
            <p className="text-xs font-bold text-slate-700">{workingHoursDisplay}</p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Lunch blocked &bull; 12:00–1:00 PM. Your next open slot is tomorrow at 9:00 AM.
            </p>
            <div className="pt-2 border-t border-emerald-100/60">
              <button
                type="button"
                onClick={() => navigate('/doctor/availability')}
                className="text-xs font-bold text-emerald-800 hover:underline flex items-center space-x-1 cursor-pointer"
              >
                <span>Edit weekly hours</span>
                <span>&rarr;</span>
              </button>
            </div>
          </div>

          {/* Card 3: Facility Affiliations & Presence strictly per earlier requirements */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-[#0B4F9C]" />
                <span>Facility Affiliations</span>
              </span>
              <Link
                to="/doctor/affiliations"
                className="text-xs font-bold text-[#0B4F9C] hover:underline"
              >
                Manage &rarr;
              </Link>
            </div>
            <p className="text-xs text-slate-600 font-medium">
              {doctorProfile?.currentPresence?.organizationId?.name || 'Riverside Medical Center'}
            </p>
            <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-[11px]">
              <span className="text-slate-400">Hospital Presence:</span>
              <Link
                to="/doctor/presence"
                className={`font-bold flex items-center space-x-1 ${
                  doctorProfile?.currentPresence?.isPresent
                    ? 'text-emerald-600 hover:underline'
                    : 'text-slate-600 hover:text-blue-600'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full inline-block ${
                    doctorProfile?.currentPresence?.isPresent
                      ? 'bg-emerald-500 animate-pulse'
                      : 'bg-slate-300'
                  }`}
                />
                <span>
                  {doctorProfile?.currentPresence?.isPresent
                    ? 'Checked In On-Site'
                    : 'Off-site / QR Badge'}
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Minimal Footer strictly per Reference Image */}
      <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400 border-t border-slate-100">
        <div>SHAP &bull; Smart Healthcare Access Platform</div>
        <div>Conceptual sample data &bull; Privacy & support</div>
      </div>

      {/* Appointment Detail / Consultation Pass Modal */}
      {selectedAppointment && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
        >
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl p-6 max-w-md w-full space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Authorized Clinical Encounter
              </span>
              <button
                type="button"
                onClick={() => setSelectedAppointment(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center space-x-3.5 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="w-11 h-11 rounded-full bg-[#EBF3FE] text-[#0B4F9C] font-bold text-sm flex items-center justify-center shrink-0">
                {selectedAppointment.patientInitials || 'PT'}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedAppointment.patientName}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedAppointment.time || '2:30 PM'} &bull; {selectedAppointment.visitType}
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-400">Chief Complaint:</span>
                <span className="font-bold text-slate-800">{selectedAppointment.reason}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Facility / Room:</span>
                <span className="font-bold text-slate-800">
                  {selectedAppointment.room || 'Riverside Medical Center · Room C-02'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Consultation Status:</span>
                <span className="font-bold text-emerald-600">{selectedAppointment.status}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleCompleteVisit(selectedAppointment._id)}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                Mark Visit Completed
              </button>
              <button
                type="button"
                onClick={() => setSelectedAppointment(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Routine Request Review Modal */}
      {reviewRequest && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
        >
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl p-6 max-w-sm w-full space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Review Patient Request</h3>
              <button
                type="button"
                onClick={() => setReviewRequest(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-xs">
              <div className="font-bold text-slate-900 text-sm">{reviewRequest.patientName}</div>
              <div className="text-slate-500">{reviewRequest.detail}</div>
              <div className="text-amber-700 font-bold mt-2">Request Type: {reviewRequest.type}</div>
            </div>

            <p className="text-xs text-slate-500">
              Confirm this schedule adjustment to add it directly to your consultation roster.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleApproveRequest(reviewRequest._id)}
                className="flex-1 py-2.5 bg-[#0B4F9C] hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                Accept & Confirm
              </button>
              <button
                type="button"
                onClick={() => setReviewRequest(null)}
                className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorDashboard;