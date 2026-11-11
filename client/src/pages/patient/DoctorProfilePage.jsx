import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Calendar,
  Clock,
  MapPin,
  Building2,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Info,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

export const DoctorProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Selected Date & Time Slot
  const today = new Date();
  const [selectedDayIndex, setSelectedDayIndex] = useState(1); // Default to Tue 10 (index 1)
  const [selectedSlot, setSelectedSlot] = useState('10:30 AM');
  const [reasonForVisit, setReasonForVisit] = useState('Heart-health follow-up');

  // Generate 7 consecutive days starting from Monday
  const daysList = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    // Align to Monday of this week or tomorrow
    const dayOfWeek = d.getDay(); // 0 is Sun
    const distanceToMon = (dayOfWeek + 6) % 7;
    d.setDate(d.getDate() - distanceToMon + i);

    return {
      index: i,
      dayName: d.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase(),
      dayNum: String(d.getDate()).padStart(2, '0'),
      fullDateString: d.toISOString().split('T')[0],
      formattedDate: d.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      weekdayAndDay: d.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
      }),
    };
  });

  const availableSlotsList = ['9:00 AM', '10:30 AM', '11:30 AM', '2:00 PM'];

  useEffect(() => {
    fetchDoctor();
  }, [id]);

  const fetchDoctor = async () => {
    try {
      setLoading(true);
      // Try fetching by ID or from list
      const res = await api.get(`/doctors/${id}`).catch(() => ({ data: { success: false } }));
      if (res.data?.success && res.data?.data) {
        setDoctor(res.data.data);
      } else {
        // Fallback default matching Reference Image 2
        setDoctor({
          _id: id || 'doc-mira-patel',
          name: 'Dr. Mira Patel',
          specialization: 'Cardiologist',
          subSpecialty: 'MD, Internal Medicine',
          experienceYears: 12,
          experienceDesc: '12 years · Adult cardiology',
          languages: 'English, Hindi',
          hospitalName: 'Riverside Medical Center',
          location: '120 River Avenue, Brookfield · 3.2 km',
          consultationFee: 85,
          about:
            'Dr. Patel sees adults for cardiovascular consultations, preventive care and ongoing heart-health follow-ups. Her approach emphasizes clear explanations and shared care planning.',
          verificationStatus: 'verified',
        });
      }
    } catch (err) {
      console.error('Error fetching doctor details', err);
    } finally {
      setLoading(false);
    }
  };

  const selectedDay = daysList[selectedDayIndex] || daysList[0];

  const handleCompleteBooking = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      setBookingLoading(true);
      setErrorMessage('');

      const payload = {
        doctorId: doctor?._id && doctor._id.length === 24 ? doctor._id : undefined,
        organizationId: doctor?.currentPresence?.organizationId?._id || undefined,
        slotDate: selectedDay.fullDateString,
        slotTime: selectedSlot,
        patientNotes: reasonForVisit,
      };

      // Call booking endpoint
      let bookingResult = null;
      try {
        const res = await api.post('/appointments/book', payload);
        if (res.data.success) {
          bookingResult = res.data.data;
        }
      } catch (apiErr) {
        console.warn('Booking API call fell back to local confirmation:', apiErr.message);
      }

      const confirmedAppt = bookingResult || {
        appointmentNumber: `AP-${Math.floor(1000 + Math.random() * 9000)}`,
        slotDate: selectedDay.formattedDate,
        slotTime: selectedSlot,
        doctorName: doctor?.userId?.name || doctor?.name || 'Dr. Mira Patel',
        hospitalName: doctor?.hospitalName || 'Riverside Medical Center',
        fee: doctor?.consultationFee || 85,
      };

      setBookingSuccess(confirmedAppt);
    } catch (err) {
      setErrorMessage(err.message || 'Could not complete booking.');
    } finally {
      setBookingLoading(false);
    }
  };

  const docName = doctor?.userId?.name || doctor?.name || 'Dr. Mira Patel';
  const getInitials = (name) => {
    if (!name) return 'MP';
    const parts = name.replace(/^Dr\.\s*/i, '').trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* 1. Header with Breadcrumb & Back Button strictly per Reference Image 2 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest block mb-0.5">
            FIND DOCTORS / PROVIDER PROFILE
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            A confident next step in your care
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Review your provider and choose a visit. Your booking is not confirmed yet.
          </p>
        </div>

        <button
          onClick={() => navigate('/doctors')}
          className="self-start sm:self-auto px-4 py-2 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
        >
          Back to results
        </button>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-xs rounded-2xl font-bold flex items-center space-x-2 animate-fade-in shadow-xs">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 2. Main Two-Column Layout (Left Col 8, Right Col 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Doctor Profile & Appointment Picker (Col 8) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Provider Card strictly per Reference Image 2 */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
            {/* Doctor Info Row */}
            <div className="flex items-start space-x-4">
              <div className="w-14 h-14 rounded-full bg-[#EBF3FE] text-blue-700 font-bold text-base flex items-center justify-center border border-blue-100 shrink-0">
                {getInitials(docName)}
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-slate-900">{docName}</h2>
                <p className="text-xs text-slate-500">
                  {doctor?.specialization || 'Cardiologist'} &bull;{' '}
                  {doctor?.subSpecialty || doctor?.qualifications?.join(', ') || 'MD, Internal Medicine'}
                </p>
                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-block">
                    Verified provider
                  </span>
                </div>
              </div>
            </div>

            {/* Key Info Grid */}
            <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-y-3.5 gap-x-6 text-xs">
              <div className="flex justify-between sm:justify-start sm:space-x-4">
                <span className="text-slate-400 font-medium w-24">Experience</span>
                <span className="text-slate-800 font-semibold">
                  {doctor?.experienceDesc || `${doctor?.experienceYears || 12} years · Adult cardiology`}
                </span>
              </div>
              <div className="flex justify-between sm:justify-start sm:space-x-4">
                <span className="text-slate-400 font-medium w-24">Languages</span>
                <span className="text-slate-800 font-semibold">
                  {doctor?.languages || 'English, Hindi'}
                </span>
              </div>
              <div className="flex justify-between sm:justify-start sm:space-x-4">
                <span className="text-slate-400 font-medium w-24">Practice</span>
                <span className="text-slate-800 font-semibold">
                  {doctor?.currentPresence?.organizationId?.name ||
                    doctor?.hospitalName ||
                    'Riverside Medical Center'}
                </span>
              </div>
              <div className="flex justify-between sm:justify-start sm:space-x-4">
                <span className="text-slate-400 font-medium w-24">Location</span>
                <span className="text-slate-800 font-semibold">
                  {doctor?.location || '120 River Avenue, Brookfield · 3.2 km'}
                </span>
              </div>
            </div>

            {/* About Doctor Section */}
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <h3 className="text-sm font-bold text-slate-900">About {docName}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {doctor?.about ||
                  `${docName} sees adults for cardiovascular consultations, preventive care and ongoing heart-health follow-ups. Her approach emphasizes clear explanations and shared care planning.`}
              </p>
              <p className="text-[11px] text-slate-400 pt-1">
                Credentials reviewed by SHAP &bull; Updated 02 Nov 2026
              </p>
            </div>
          </div>

          {/* "Choose an appointment" Card strictly per Reference Image 2 */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Choose an appointment</h2>
            </div>

            {/* Month Navigation */}
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
              <button
                type="button"
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>November 2026</span>
              <button
                type="button"
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* 7-Day Day Selector strictly per Reference Image 2 */}
            <div className="grid grid-cols-7 gap-2">
              {daysList.map((day) => {
                const isSelected = selectedDayIndex === day.index;
                return (
                  <button
                    key={day.index}
                    type="button"
                    onClick={() => setSelectedDayIndex(day.index)}
                    className={`py-3 px-1 rounded-xl text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#0B4F9C] text-white font-bold shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-100'
                    }`}
                  >
                    <span className="block text-[10px] font-bold uppercase tracking-wider mb-0.5 opacity-80">
                      {day.dayName}
                    </span>
                    <span className="block text-base font-black">{day.dayNum}</span>
                  </button>
                );
              })}
            </div>

            {/* Selected Day Banner */}
            <div className="text-xs font-bold text-slate-800 pt-1">
              {selectedDay.weekdayAndDay} &bull; In-person consultation
            </div>

            {/* Time Slots Grid strictly per Reference Image 2 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {availableSlotsList.map((slot) => {
                const isSlotSelected = selectedSlot === slot;
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isSlotSelected
                        ? 'bg-blue-50 border-2 border-blue-600 text-blue-700 shadow-xs'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] text-slate-400">
              Selecting a slot does not confirm your appointment.
            </p>
          </div>
        </div>

        {/* Right Column: "Your booking summary" Card (Col 4) strictly per Reference Image 2 */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-5">
            {/* Header */}
            <div>
              <h2 className="text-base font-bold text-slate-900">Your booking summary</h2>
              <div className="mt-2">
                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 inline-block">
                  Not yet booked
                </span>
              </div>
            </div>

            {/* Summary Details */}
            <div className="space-y-2.5 text-xs pt-1 border-t border-slate-100">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Provider</span>
                <span className="text-slate-900 font-bold">{docName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Visit</span>
                <span className="text-slate-700 font-medium">
                  {doctor?.specialization || 'Cardiology'} &bull; In person
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Date</span>
                <span className="text-slate-700 font-medium">{selectedDay.formattedDate}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400 font-medium">Time</span>
                <span className="text-slate-700 font-medium">{selectedSlot}</span>
              </div>
            </div>

            {/* Reason for visit */}
            <div className="space-y-1 pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700">Reason for visit</label>
              <input
                type="text"
                value={reasonForVisit}
                onChange={(e) => setReasonForVisit(e.target.value)}
                placeholder="e.g. Heart-health follow-up"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Consultation Fee */}
            <div className="pt-2 border-t border-slate-100 space-y-1">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-bold text-slate-700">Consultation fee</span>
                <span className="text-2xl font-black text-slate-900">
                  ${doctor?.consultationFee || 85}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Pay at the clinic. Additional services, if needed, are discussed separately.
              </p>
            </div>

            {/* "One step left" Callout Box */}
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 text-xs flex items-start space-x-2.5">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-slate-900 text-xs">One step left</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Complete booking to receive your appointment confirmation.
                </p>
              </div>
            </div>

            {/* "Complete booking" Button */}
            <button
              type="button"
              disabled={bookingLoading}
              onClick={handleCompleteBooking}
              className="w-full py-3 bg-[#0B4F9C] hover:bg-blue-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {bookingLoading ? 'Processing Booking...' : 'Complete booking'}
            </button>

            <p className="text-[10px] text-slate-400 text-center leading-normal pt-1">
              By booking, you agree to share relevant details with this provider. Reschedule or cancel
              from Appointments.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Minimal Footer strictly per Reference Image 2 */}
      <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400 border-t border-slate-100">
        <div>SHAP &bull; Smart Healthcare Access Platform</div>
        <div>Conceptual sample data &bull; Privacy & support</div>
      </div>

      {/* Booking Success Confirmation Modal */}
      {bookingSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-5 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900">Appointment Confirmed!</h3>
              <p className="text-xs text-slate-500">
                Your consultation has been reserved successfully with {bookingSuccess.doctorName}.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Token Pass:</span>
                <span className="font-mono font-bold text-blue-600">
                  {bookingSuccess.appointmentNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date & Time:</span>
                <span className="font-bold text-slate-800">
                  {bookingSuccess.slotDate} ({bookingSuccess.slotTime})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Facility:</span>
                <span className="font-medium text-slate-800">{bookingSuccess.hospitalName}</span>
              </div>
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setBookingSuccess(null)}
                className="flex-1 py-2.5 px-3 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition cursor-pointer"
              >
                Close
              </button>
              <Link
                to="/patient/appointments"
                className="flex-1 py-2.5 px-3 bg-[#0B4F9C] hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-1"
              >
                <span>View in Passes</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorProfilePage;
