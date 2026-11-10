import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
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
        // auto select first available
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

    setBookingLoading(true);
    setError('');

    try {
      const res = await api.post('/appointments/book', {
        doctorId: id,
        organizationId: selectedOrgId,
        slotDate: selectedDate,
        slotTime: selectedSlot,
        patientNotes,
      });

      if (res.data.success) {
        setBookingSuccess(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Slot booking failed');
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading doctor profile...</div>;
  }

  if (!doctor) {
    return <div className="p-12 text-center text-red-500 text-xs">Doctor not found</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Doctors</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Doctor Profile (Col 7) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <img
              src={
                doctor.userId?.avatar ||
                'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300&auto=format&fit=crop&q=80'
              }
              alt={doctor.userId?.name}
              className="w-24 h-24 rounded-2xl object-cover border-2 border-blue-100 shadow-sm"
            />
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">{doctor.userId?.name}</h1>
                <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-100" />
              </div>
              <p className="text-sm font-bold text-blue-600">{doctor.specialization}</p>
              
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                <span className="flex items-center text-amber-500 font-bold">
                  <Star className="w-4 h-4 fill-amber-400 mr-1" />
                  {doctor.rating} ({doctor.totalReviews} reviews)
                </span>
                <span>&bull;</span>
                <span className="font-medium">{doctor.experienceYears} Years Clinical Experience</span>
              </div>

              <div className="pt-2">
                <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-200">
                  Unique Doctor ID: {doctor.doctorUniqueId || 'DOC-VERIFIED'}
                </span>
              </div>
            </div>
          </div>

          {/* Presence Status */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Physical Presence</span>
              <p className="text-xs font-bold text-slate-900">
                {doctor.currentPresence?.isPresent
                  ? `Checked In at ${doctor.currentPresence?.organizationId?.name || 'Facility'}`
                  : 'Not Currently Checked In (Available via slot booking)'}
              </p>
            </div>
            <span
              className={`px-3 py-1 text-xs font-bold rounded-full ${
                doctor.currentPresence?.isPresent
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {doctor.currentPresence?.isPresent ? 'PRESENT' : 'NOT PRESENT'}
            </span>
          </div>

          {/* About & Bio */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900">About the Specialist</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {doctor.bio || 'Board-certified medical specialist dedicated to patient-centric clinical care.'}
            </p>
          </div>

          {/* Qualifications & License */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Qualifications</span>
              <p className="text-xs font-bold text-slate-800 mt-1">
                {doctor.qualifications?.join(', ') || 'MBBS'}
              </p>
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Medical Registration</span>
              <p className="text-xs font-bold text-slate-800 mt-1">{doctor.licenseNumber}</p>
            </div>
          </div>

          {/* Consultation Fee */}
          <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-100 flex items-center justify-between">
            <div>
              <span className="text-xs text-blue-900 font-semibold">Standard Consultation Fee</span>
              <p className="text-xl font-black text-blue-700">₹{doctor.consultationFee || 500}</p>
            </div>
            <ShieldCheck className="w-8 h-8 text-blue-500" />
          </div>

        </div>

        {/* Right Column: Slot Selection & Booking (Col 5) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-base font-black text-slate-900">Book an Appointment</h2>
            <p className="text-xs text-slate-500">Select consultation facility, date and time slot</p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleBook} className="space-y-5">
            {/* Facility Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Healthcare Facility</label>
              <select
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {organizations.map((org) => (
                  <option key={org._id} value={org._id}>
                    {org.name} ({org.address?.city || 'Central City'})
                  </option>
                ))}
              </select>
            </div>

            {/* Date Picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Appointment Date</label>
              <div className="relative">
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>
            </div>

            {/* Slots Grid */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Available Slots</label>
              {availableSlots.length === 0 ? (
                <p className="text-xs text-slate-400 py-3">Loading available slots...</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {availableSlots.map((slot, i) => (
                    <button
                      key={i}
                      type="button"
                      disabled={!slot.isAvailable}
                      onClick={() => setSelectedSlot(slot.time)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold transition-all ${
                        !slot.isAvailable
                          ? 'bg-slate-100 text-slate-400 line-through cursor-not-allowed border border-transparent'
                          : selectedSlot === slot.time
                          ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                          : 'bg-slate-50 hover:bg-blue-50 text-slate-800 border border-slate-200'
                      }`}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Reason / Patient Notes (Optional)</label>
              <textarea
                rows={2}
                value={patientNotes}
                onChange={(e) => setPatientNotes(e.target.value)}
                placeholder="Briefly describe your symptoms or inquiry..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Submit CTA */}
            <button
              type="submit"
              disabled={bookingLoading || !selectedSlot}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Calendar className="w-4 h-4" />
              <span>{bookingLoading ? 'Reserving Slot...' : 'Confirm & Book Slot'}</span>
            </button>
          </form>
        </div>

      </div>

      {/* Appointment Success Modal with QR Pass */}
      {bookingSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 text-center space-y-5 animate-scale-up">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
            </div>

            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Booking Confirmed
              </span>
              <h3 className="text-xl font-black text-slate-900 mt-2">Appointment Reserved!</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Token: <strong>{bookingSuccess.appointment?.appointmentNumber}</strong>
              </p>
            </div>

            {bookingSuccess.qrPassUrl && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 inline-block mx-auto shadow-inner">
                <img
                  src={bookingSuccess.qrPassUrl}
                  alt="Appointment Pass QR"
                  className="w-44 h-44 object-contain mx-auto"
                />
                <p className="text-[10px] text-slate-500 font-medium mt-1">
                  Present this QR at hospital reception desk
                </p>
              </div>
            )}

            <div className="text-xs text-slate-700 bg-blue-50 p-3 rounded-xl border border-blue-100 text-left space-y-1">
              <p><strong>Doctor:</strong> {doctor.userId?.name}</p>
              <p><strong>Schedule:</strong> {bookingSuccess.appointment?.slotDate} at {bookingSuccess.appointment?.slotTime}</p>
              <p><strong>Facility:</strong> {organizations.find((o) => o._id === selectedOrgId)?.name}</p>
            </div>

            <div className="pt-2 flex items-center space-x-3">
              <button
                onClick={() => navigate('/patient/appointments')}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
              >
                View My Appointments
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

