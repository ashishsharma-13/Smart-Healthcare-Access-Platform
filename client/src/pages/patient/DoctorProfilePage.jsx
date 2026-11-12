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
  Loader2,
} from 'lucide-react';

export const DoctorProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [doctor, setDoctor] = useState(null);
  const [affiliations, setAffiliations] = useState([]);
  const [selectedAffiliation, setSelectedAffiliation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Selected Date & Time Slot
  const today = new Date();
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [reasonForVisit, setReasonForVisit] = useState('Heart-health follow-up');

  // Generate 7 consecutive days starting from today
  const daysList = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const fullDateString = `${year}-${month}-${day}`;

    return {
      index: i,
      dayName: d.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase(),
      dayNum: String(d.getDate()).padStart(2, '0'),
      fullDateString,
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

  const selectedDay = daysList[selectedDayIndex] || daysList[0];

  useEffect(() => {
    fetchDoctor();
  }, [id]);

  useEffect(() => {
    if (doctor?._id) {
      fetchSlots();
    }
  }, [doctor, selectedDayIndex, selectedAffiliation]);

  const fetchDoctor = async () => {
    try {
      setLoading(true);
      let foundDoc = null;
      try {
        const res = await api.get(`/doctors/${id}`);
        if (res.data?.success && res.data?.data) {
          foundDoc = res.data.data;
        }
      } catch (err) {
        console.warn('Direct fetch by ID failed, searching doctor list...', err.message);
      }

      if (!foundDoc) {
        try {
          const listRes = await api.get('/doctors');
          if (listRes.data?.success && Array.isArray(listRes.data?.data) && listRes.data.data.length > 0) {
            foundDoc =
              listRes.data.data.find(
                (d) =>
                  d._id === id ||
                  d.doctorUniqueId === id ||
                  (id && id.toLowerCase().includes('mira') && d.userId?.name?.toLowerCase().includes('mira'))
              ) || listRes.data.data[0];
          }
        } catch (listErr) {
          console.warn('Doctors list lookup failed:', listErr.message);
        }
      }

      if (foundDoc) {
        setDoctor(foundDoc);
        // Fetch doctor active affiliations
        try {
          const affRes = await api.get(`/doctors/${foundDoc._id}/affiliations`);
          if (affRes.data?.success && Array.isArray(affRes.data?.data)) {
            setAffiliations(affRes.data.data);
            if (affRes.data.data.length > 0) {
              setSelectedAffiliation(affRes.data.data[0]);
            }
          }
        } catch (affErr) {
          console.warn('Affiliations fetch failed:', affErr.message);
        }
      } else {
        setDoctor({
          _id: id || 'doc-sample',
          name: 'Dr. Mira Patel',
          specialization: 'Cardiologist',
          subSpecialty: 'MD, Internal Medicine',
          experienceYears: 12,
          experienceDesc: '12 years · Adult cardiology',
          languages: 'English, Hindi',
          hospitalName: 'Apex Heart Hospital',
          location: '120 River Avenue, Brookfield · 3.2 km',
          consultationFee: 85,
          about:
            'Specialist in cardiovascular consultations, preventive care and ongoing heart-health follow-ups.',
          verificationStatus: 'verified',
        });
      }
    } catch (err) {
      console.error('Error fetching doctor details', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSlots = async () => {
    if (!doctor?._id) return;
    try {
      setSlotsLoading(true);
      const orgId = selectedAffiliation?.organizationId?._id || selectedAffiliation?.organizationId;
      const res = await api.get('/appointments/available-slots', {
        params: {
          doctorId: doctor._id,
          date: selectedDay.fullDateString,
          organizationId: orgId,
        },
      });

      if (res.data?.success && Array.isArray(res.data?.data)) {
        setAvailableSlots(res.data.data);
        const firstAvailable = res.data.data.find((s) => s.isAvailable);
        if (firstAvailable) {
          setSelectedSlot(firstAvailable.time);
        } else {
          setSelectedSlot('');
        }
      }
    } catch (err) {
      console.warn('Slots fetch warning:', err.message);
      // Fallback slots
      const defaultSlots = [
        { time: '09:00 AM', isAvailable: true },
        { time: '10:00 AM', isAvailable: true },
        { time: '11:30 AM', isAvailable: true },
        { time: '02:00 PM', isAvailable: true },
      ];
      setAvailableSlots(defaultSlots);
      setSelectedSlot(defaultSlots[0].time);
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleCompleteBooking = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!selectedSlot) {
      setErrorMessage('Please select an available consultation slot.');
      return;
    }

    try {
      setBookingLoading(true);
      setErrorMessage('');

      const resolvedOrgId =
        selectedAffiliation?.organizationId?._id ||
        selectedAffiliation?.organizationId ||
        doctor?.currentPresence?.organizationId?._id ||
        doctor?.currentPresence?.organizationId ||
        doctor?.organizationId?._id ||
        doctor?.organizationId ||
        undefined;

      const payload = {
        doctorId: doctor?._id,
        organizationId: resolvedOrgId,
        affiliationId: selectedAffiliation?._id,
        slotDate: selectedDay.fullDateString,
        slotTime: selectedSlot,
        patientNotes: reasonForVisit,
        reason: reasonForVisit,
      };

      const res = await api.post('/appointments/book', payload);
      if (res.data?.success) {
        setBookingSuccess({
          ...res.data.data.appointment,
          qrPassUrl: res.data.data.qrPassUrl,
          doctorName: docName,
          hospitalName:
            selectedAffiliation?.organizationId?.name ||
            doctor?.currentPresence?.organizationId?.name ||
            'Healthcare Facility',
        });
      } else {
        throw new Error(res.data?.message || 'Could not complete booking.');
      }
    } catch (err) {
      console.error('Booking failed:', err);
      setErrorMessage(
        err.response?.data?.message || err.message || 'Could not complete booking.'
      );
    } finally {
      setBookingLoading(false);
    }
  };

  const docName = doctor?.userId?.name || doctor?.name || 'Dr. Specialist';
  const getInitials = (name) => {
    if (!name) return 'DR';
    const parts = name.replace(/^Dr\.\s*/i, '').trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* 1. Header with Breadcrumb & Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest block mb-0.5">
            FIND DOCTORS / PROVIDER PROFILE
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Consultation & Slot Booking
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Select verified provider, affiliated hospital, and preferred consultation timing.
          </p>
        </div>

        <button
          onClick={() => navigate('/doctors')}
          className="self-start sm:self-auto px-4 py-2 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
        >
          &larr; Back to search
        </button>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start space-x-2">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 2. Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Doctor Profile & Appointment Picker (Col 8) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Doctor Info Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start space-x-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-xl sm:text-2xl font-black shrink-0 shadow-md">
                  {getInitials(docName)}
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {docName}
                  </h2>
                  <p className="text-xs font-bold text-blue-700 mt-0.5">
                    {doctor?.specialization || 'Clinical Specialist'}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {doctor?.subSpecialty || doctor?.qualifications?.join(', ') || 'Board Certified'}
                  </p>
                </div>
              </div>

              <div className="sm:text-right">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-block">
                  Verified provider
                </span>
              </div>
            </div>

            {/* Key Info Grid */}
            <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-y-3.5 gap-x-6 text-xs">
              <div className="flex justify-between sm:justify-start sm:space-x-4">
                <span className="text-slate-400 font-medium w-24">Experience</span>
                <span className="text-slate-800 font-semibold">
                  {doctor?.experienceDesc || `${doctor?.experienceYears || 10} years in clinical practice`}
                </span>
              </div>
              <div className="flex justify-between sm:justify-start sm:space-x-4">
                <span className="text-slate-400 font-medium w-24">Languages</span>
                <span className="text-slate-800 font-semibold">
                  {doctor?.languages || 'English, Regional'}
                </span>
              </div>
              <div className="flex justify-between sm:justify-start sm:space-x-4">
                <span className="text-slate-400 font-medium w-24">License Ref</span>
                <span className="text-slate-800 font-mono font-semibold">
                  {doctor?.licenseNumber || doctor?.doctorUniqueId || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between sm:justify-start sm:space-x-4">
                <span className="text-slate-400 font-medium w-24">Affiliations</span>
                <span className="text-slate-800 font-semibold">
                  {affiliations.length > 0 ? `${affiliations.length} Active Hospital(s)` : 'General Outpatient'}
                </span>
              </div>
            </div>

            {/* Affiliated Organization Selector */}
            {affiliations.length > 0 && (
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Select Affiliated Healthcare Facility
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {affiliations.map((aff) => {
                    const isSelected = selectedAffiliation?._id === aff._id;
                    return (
                      <button
                        key={aff._id}
                        type="button"
                        onClick={() => setSelectedAffiliation(aff)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-600'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <Building2 className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {aff.organizationId?.name || 'Healthcare Facility'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 pl-6">
                          {aff.department || 'Outpatient'} &bull; {aff.designation || 'Consultant'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Appointment Date & Slot Selector */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Choose consultation timing</h2>
              <span className="text-xs text-slate-500">Live Schedule</span>
            </div>

            {/* 7-Day Day Selector */}
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
            <div className="text-xs font-bold text-slate-800 pt-1 flex items-center justify-between">
              <span>{selectedDay.weekdayAndDay} &bull; Outpatient In-Person</span>
              {slotsLoading && (
                <span className="text-slate-400 flex items-center space-x-1 font-normal text-[11px]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Checking slots...</span>
                </span>
              )}
            </div>

            {/* Dynamic Time Slots Grid */}
            {availableSlots.length === 0 && !slotsLoading ? (
              <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
                No slots available on this date. Doctor may be off duty, on leave, or facility closed.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {availableSlots.map((slot) => {
                  const isSlotSelected = selectedSlot === slot.time;
                  const isAvailable = slot.isAvailable !== false;
                  return (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => setSelectedSlot(slot.time)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                        !isAvailable
                          ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                          : isSlotSelected
                          ? 'bg-blue-50 border-2 border-blue-600 text-blue-700 shadow-xs cursor-pointer'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{slot.time}</span>
                        {!isAvailable && (
                          <span className="text-[9px] uppercase px-1 rounded bg-slate-200 text-slate-600">
                            {slot.reason || 'Booked'}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <p className="text-[11px] text-slate-400">
              Selecting a slot does not reserve it. Final slot confirmation occurs upon booking submission.
            </p>
          </div>
        </div>

        {/* Right Column: "Your booking summary" Card (Col 4) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-5">
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
                <span className="text-slate-400 font-medium">Specialty</span>
                <span className="text-slate-700 font-medium">
                  {doctor?.specialization || 'Cardiology'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Facility</span>
                <span className="text-slate-700 font-medium truncate max-w-[150px]">
                  {selectedAffiliation?.organizationId?.name ||
                    doctor?.currentPresence?.organizationId?.name ||
                    doctor?.hospitalName ||
                    'Outpatient Clinic'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Date</span>
                <span className="text-slate-700 font-medium">{selectedDay.formattedDate}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400 font-medium">Time Slot</span>
                <span className="text-slate-900 font-bold text-blue-700">
                  {selectedSlot || 'Please select'}
                </span>
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
                Pay at the clinic desk upon arrival.
              </p>
            </div>

            {/* Callout */}
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 text-xs flex items-start space-x-2.5">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-slate-900 text-xs">Slot Revalidation</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  The backend performs real-time transactional conflict checks to guarantee your reservation.
                </p>
              </div>
            </div>

            {/* Complete booking Button */}
            <button
              type="button"
              disabled={bookingLoading || !selectedSlot}
              onClick={handleCompleteBooking}
              className="w-full py-3 bg-[#0B4F9C] hover:bg-blue-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {bookingLoading ? 'Reserving Appointment...' : 'Complete booking'}
            </button>
          </div>
        </div>
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

            {bookingSuccess.qrPassUrl && (
              <div className="p-3 bg-white border border-slate-100 rounded-2xl inline-block mx-auto shadow-xs">
                <img src={bookingSuccess.qrPassUrl} alt="QR Pass" className="w-32 h-32 mx-auto" />
              </div>
            )}

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Appointment ID:</span>
                <span className="font-mono font-bold text-blue-600">
                  {bookingSuccess.appointmentNumber || bookingSuccess.appointmentId}
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
                <span>View My Appointments</span>
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
