import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { DoctorAvatar } from '../../components/graphics/DoctorAvatar';
import {
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Star,
  Award,
  Building2,
  Phone,
  ShieldCheck,
  QrCode,
  ArrowLeft,
  Stethoscope,
  ChevronRight,
  Info,
} from 'lucide-react';

export const DoctorProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [doctor, setDoctor] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  
  // Date & Slot state
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [selectedDate, setSelectedDate] = useState(tomorrow.toISOString().split('T')[0]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [patientNotes, setPatientNotes] = useState('');
  
  // Status states
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [error, setError] = useState('');

  // Generate 7 upcoming days for horizontal date selector
  const upcomingDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    return {
      iso: d.toISOString().split('T')[0],
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNumber: d.getDate(),
      month: d.toLocaleDateString('en-US', { month: 'short' }),
    };
  });

  useEffect(() => {
    const fetchDoc = async () => {
      try {
        const [docRes, orgsRes] = await Promise.all([
          api.get(`/doctors/profile/${id}`),
          api.get('/organizations'),
        ]);

        if (docRes.data.success) {
          setDoctor(docRes.data.data);
          // Set default org
          if (docRes.data.data.currentPresence?.organizationId) {
            setSelectedOrgId(docRes.data.data.currentPresence.organizationId._id);
          } else if (orgsRes.data.data?.length > 0) {
            setSelectedOrgId(orgsRes.data.data[0]._id);
          }
        }
        if (orgsRes.data.success) {
          setOrganizations(orgsRes.data.data);
        }
      } catch (err) {
        console.error('Error fetching doctor details', err);
        setError('Doctor details could not be loaded');
      } finally {
        setLoading(false);
      }
    };
    fetchDoc();
  }, [id]);

  useEffect(() => {
    if (id && selectedDate) {
      fetchSlots();
    }
  }, [id, selectedDate]);

  const fetchSlots = async () => {
    try {
      const res = await api.get(`/appointments/slots/${id}?date=${selectedDate}`);
      if (res.data.success) {
        setAvailableSlots(res.data.data);
        const firstAvail = res.data.data.find((s) => s.isAvailable);
        setSelectedSlot(firstAvail ? firstAvail.time : '');
      }
    } catch (err) {
      console.error('Error fetching slots', err);
    }
  };

  const handleBook = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    if (!selectedSlot) {
      setError('Please select an available appointment slot');
      return;
    }
    if (!selectedOrgId) {
      setError('Please choose a consultation hospital / clinic');
      return;
    }

    setBookingLoading(true);
    setError('');

    try {
      const res = await api.post('/appointments/book', {
        doctorId: id,
        organizationId: selectedOrgId,
        appointmentDate: selectedDate,
        appointmentTime: selectedSlot,
        patientReason: patientNotes || 'General Consultation',
      });

      if (res.data.success) {
        setBookingSuccess(res.data.data);
      }
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || 'Double booking error: slot is unavailable'
      );
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return <div className="p-16 text-center text-xs text-slate-400">Loading specialist profile...</div>;
  }

  if (!doctor) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border">
        <p className="text-sm font-semibold text-slate-700">Doctor not found.</p>
        <button
          onClick={() => navigate('/doctors')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl"
        >
          Back to Doctors
        </button>
      </div>
    );
  }

  const doctorName = doctor.userId?.name || doctor.name || 'Dr. Specialist';
  const isPresent = doctor.currentPresence?.isPresent;
  const currentOrg = doctor.currentPresence?.organizationId;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to search</span>
      </button>

      {/* Doctor Header Profile Banner (Screen 02 & 03 Montage) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center space-x-5">
            <div className="relative">
              {doctor.userId?.avatar ? (
                <img
                  src={doctor.userId.avatar}
                  alt={doctorName}
                  className="w-24 h-24 rounded-3xl object-cover border-2 border-slate-100 shadow-md"
                />
              ) : (
                <DoctorAvatar name={doctorName} specialization={doctor.specialization} className="w-24 h-24" />
              )}
              {doctor.verificationStatus === 'verified' && (
                <div
                  title="NMC Validated Practitioner"
                  className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-md"
                >
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 fill-emerald-100" />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">{doctorName}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                  {doctor.uniqueDoctorId || 'DOC-VERIFIED'}
                </span>
              </div>

              <p className="text-sm font-bold text-blue-600 flex items-center">
                <Stethoscope className="w-4 h-4 mr-1.5" />
                {doctor.specialization}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-500">
                <span className="flex items-center text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  <Star className="w-3.5 h-3.5 fill-amber-400 mr-1 text-amber-500" />
                  {doctor.rating ? doctor.rating.toFixed(1) : '4.9'} Rating (320+ Patients)
                </span>
                <span>&bull;</span>
                <span className="font-semibold text-slate-700">{doctor.experienceYears || 10}+ Years Experience</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-right min-w-[160px]">
            <span className="text-[11px] font-bold uppercase text-slate-400 block">Consultation Fee</span>
            <span className="text-2xl font-extrabold text-slate-900">₹{doctor.consultationFee || 600}</span>
            <span className="block text-[10px] text-slate-500">Payable at clinic desk</span>
          </div>
        </div>

        {/* Presence Indicator Banner */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-700">Live Presence:</span>
            {isPresent ? (
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Present On-Site at {currentOrg?.name || 'Facility'}</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                <span>Available via Slot Schedule</span>
              </span>
            )}
          </div>

          <div className="text-slate-500">
            <strong>Degrees:</strong> {doctor.qualifications?.join(', ') || 'MBBS, MD'}
          </div>
        </div>
      </div>

      {/* Booking Form Card (Screen 03 Montage) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center space-x-2 pb-4 border-b border-slate-100">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-bold text-slate-900">Select Date & Appointment Time Slot</h2>
        </div>

        {bookingSuccess ? (
          <div className="p-8 bg-emerald-50 rounded-3xl border border-emerald-200 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-black text-emerald-900">Appointment Confirmed!</h3>
              <p className="text-xs text-emerald-700 mt-1">
                Your consultation token pass has been generated. Token Code: <strong>{bookingSuccess.tokenNumber}</strong>
              </p>
            </div>
            <div className="flex justify-center space-x-3 pt-2">
              <button
                onClick={() => navigate('/patient/appointments')}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                View in My Appointments
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleBook} className="space-y-6">
            {error && (
              <div className="p-3.5 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-200 flex items-center space-x-2">
                <Info className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Horizontal Date Picker Pills */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Choose Consultation Date</label>
              <div className="grid grid-cols-3 sm:grid-cols-7 gap-2.5">
                {upcomingDays.map((d) => (
                  <button
                    key={d.iso}
                    type="button"
                    onClick={() => setSelectedDate(d.iso)}
                    className={`p-3 rounded-2xl border text-center transition-all ${
                      selectedDate === d.iso
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25 scale-[1.02]'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span className="block text-[10px] font-bold uppercase tracking-wider opacity-80">{d.dayName}</span>
                    <span className="block text-base font-black my-0.5">{d.dayNumber}</span>
                    <span className="block text-[10px] opacity-80">{d.month}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Time Slot Selector Grid */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Select Available Time Slot</label>
                <span className="text-[11px] text-slate-400">
                  {availableSlots.filter((s) => s.isAvailable).length} slots available on {selectedDate}
                </span>
              </div>

              {availableSlots.length === 0 ? (
                <div className="p-6 bg-slate-50 text-center rounded-2xl border text-xs text-slate-400">
                  No slots configured for this date.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                  {availableSlots.map((slot, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={!slot.isAvailable}
                      onClick={() => setSelectedSlot(slot.time)}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                        !slot.isAvailable
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through'
                          : selectedSlot === slot.time
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20'
                          : 'bg-white hover:bg-blue-50 text-slate-800 border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Facility Choice */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Consultation Hospital / Clinic Location</label>
              <select
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {organizations.map((org) => (
                  <option key={org._id} value={org._id}>
                    {org.name} - {org.address?.city}
                  </option>
                ))}
              </select>
            </div>

            {/* Patient Reason */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Reason for Consultation (Optional)</label>
              <textarea
                rows={2}
                placeholder="Describe your symptoms or reason for visit..."
                value={patientNotes}
                onChange={(e) => setPatientNotes(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Submit CTA */}
            <button
              type="submit"
              disabled={bookingLoading || !selectedSlot}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-sm rounded-2xl shadow-md shadow-blue-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center space-x-2"
            >
              <span>{bookingLoading ? 'Reserving Slot...' : `Confirm & Book Slot (${selectedSlot || 'Select Slot'})`}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>

    </div>
  );
};
export default DoctorProfilePage;
