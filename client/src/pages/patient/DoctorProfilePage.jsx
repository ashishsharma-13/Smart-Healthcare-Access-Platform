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
  ShieldCheck,
  ArrowLeft,
  User,
  Info,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Toast } from '../../components/ui/Toast';
import { Skeleton } from '../../components/ui/Skeleton';

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
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-slate-200 space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <div className="lg:col-span-5 bg-white p-6 rounded-xl border border-slate-200 space-y-4">
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="max-w-md mx-auto p-8 text-center bg-white rounded-xl border border-slate-200 space-y-4">
        <h3 className="text-base font-bold text-slate-900">Physician Not Found</h3>
        <p className="text-xs text-slate-500">The requested doctor profile is not available or is unverified.</p>
        <Button variant="secondary" size="sm" onClick={() => navigate('/doctors')}>
          Back to Directory
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Specialist Directory</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Doctor Profile (Col 7) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 shadow-card rounded-xl p-6 sm:p-7 space-y-6">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <img
              src={
                doctor.userId?.avatar ||
                'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300&auto=format&fit=crop&q=80'
              }
              alt={doctor.userId?.name || 'Physician'}
              className="w-20 h-20 rounded-lg object-cover border border-slate-200"
            />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">{doctor.userId?.name}</h1>
                <Badge variant="presence" size="xs" dot>
                  NMC Verified
                </Badge>
              </div>
              <p className="text-xs font-semibold text-brand-700">{doctor.specialization}</p>
              
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 pt-0.5">
                <span className="flex items-center text-amber-600 font-semibold">
                  <Star className="w-3.5 h-3.5 fill-amber-400 mr-0.5" />
                  {doctor.rating} ({doctor.totalReviews} reviews)
                </span>
                <span>&bull;</span>
                <span>{doctor.experienceYears} Years Clinical Experience</span>
              </div>

              <div className="pt-1.5">
                <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  ID: {doctor.doctorUniqueId || 'DOC-VERIFIED'}
                </span>
              </div>
            </div>
          </div>

          {/* Physical Presence Status Banner */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Hospital On-Site Verification
              </span>
              <p className="text-xs font-semibold text-slate-900">
                {doctor.currentPresence?.isPresent
                  ? `Physically Checked In at ${doctor.currentPresence?.organizationId?.name || 'Facility'}`
                  : 'Currently Off-Site (Available via scheduled consultation)'}
              </p>
            </div>
            <Badge
              variant={doctor.currentPresence?.isPresent ? 'presence' : 'neutral'}
              size="sm"
              dot={doctor.currentPresence?.isPresent}
              pulseDot={doctor.currentPresence?.isPresent}
            >
              {doctor.currentPresence?.isPresent ? 'ON-SITE' : 'OFF-SITE'}
            </Badge>
          </div>

          {/* About & Clinical Summary */}
          <div className="space-y-1.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Clinical Background</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {doctor.bio || 'Board-certified medical practitioner committed to standardized clinical quality and patient-first consultations.'}
            </p>
          </div>

          {/* Credentials Matrix */}
          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Qualifications</span>
              <p className="text-xs font-semibold text-slate-800 mt-0.5">
                {doctor.qualifications?.join(', ') || 'MBBS, MD'}
              </p>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">NMC Medical Registration</span>
              <p className="text-xs font-mono font-semibold text-slate-800 mt-0.5">{doctor.licenseNumber}</p>
            </div>
          </div>

          {/* Consultation Fee */}
          <div className="p-3.5 bg-brand-50/60 rounded-lg border border-brand-200/80 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-brand-900 font-medium">Standard Consultation Fee</span>
              <p className="text-lg font-bold text-brand-700">₹{doctor.consultationFee || 500}</p>
            </div>
            <ShieldCheck className="w-6 h-6 text-brand-500" />
          </div>

        </div>

        {/* Right Column: Slot Selection & Booking (Col 5) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 shadow-card rounded-xl p-6 sm:p-7 space-y-5">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">Book Consultation Slot</h2>
            <p className="text-xs text-slate-500">Select healthcare facility, date and time slot</p>
          </div>

          {error && (
            <Toast type="error" message={error} onClose={() => setError('')} />
          )}

          <form onSubmit={handleBook} className="space-y-4">
            {/* Facility Selector */}
            <div className="space-y-1">
              <label htmlFor="slot-org" className="text-xs font-medium text-slate-700 block">
                Healthcare Facility
              </label>
              <select
                id="slot-org"
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white"
              >
                {organizations.map((org) => (
                  <option key={org._id} value={org._id}>
                    {org.name} ({org.address?.city || 'Central City'})
                  </option>
                ))}
              </select>
            </div>

            {/* Date Picker */}
            <div className="space-y-1">
              <label htmlFor="slot-date" className="text-xs font-medium text-slate-700 block">
                Consultation Date
              </label>
              <input
                id="slot-date"
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white"
              />
            </div>

            {/* Slots Grid */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 block">Available Time Slots</label>
              {availableSlots.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">Loading available slots...</p>
              ) : (
                <div className="grid grid-cols-3 gap-1.5">
                  {availableSlots.map((slot, i) => (
                    <button
                      key={i}
                      type="button"
                      disabled={!slot.isAvailable}
                      onClick={() => setSelectedSlot(slot.time)}
                      className={`py-2 px-2 rounded-md text-xs font-medium transition-colors ${
                        !slot.isAvailable
                          ? 'bg-slate-100 text-slate-400 line-through cursor-not-allowed border border-transparent'
                          : selectedSlot === slot.time
                          ? 'bg-brand-600 text-white font-semibold shadow-xs'
                          : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-200'
                      }`}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label htmlFor="patient-notes" className="text-xs font-medium text-slate-700 block">
                Chief Complaint / Symptoms (Optional)
              </label>
              <textarea
                id="patient-notes"
                rows={2}
                value={patientNotes}
                onChange={(e) => setPatientNotes(e.target.value)}
                placeholder="Briefly describe your medical concerns..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white"
              />
            </div>

            {/* Submit */}
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={bookingLoading}
              disabled={!selectedSlot}
              className="w-full"
              icon={Calendar}
            >
              {bookingLoading ? 'Reserving Slot...' : 'Confirm Consultation Booking'}
            </Button>
          </form>
        </div>

      </div>

      {/* Appointment Success Confirmation Modal */}
      {bookingSuccess && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
        >
          <div className="bg-white border border-slate-200 shadow-modal rounded-xl p-6 sm:p-8 max-w-md w-full text-center space-y-5">
            <div className="w-12 h-12 rounded-lg bg-presence-50 text-presence-700 border border-presence-200 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div>
              <Badge variant="presence" size="sm">
                Booking Confirmed
              </Badge>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight mt-2">
                Consultation Reserved
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Your appointment pass has been issued and notified to the clinic.
              </p>
            </div>

            {/* Pass Summary Details */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg text-left space-y-2 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Appointment Token</span>
                <span className="font-mono font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                  {bookingSuccess.appointment?.appointmentNumber}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Doctor</span>
                <span className="font-semibold text-slate-900">{doctor.userId?.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Schedule</span>
                <span className="font-semibold text-slate-900">
                  {bookingSuccess.appointment?.slotDate} at {bookingSuccess.appointment?.slotTime}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Facility</span>
                <span className="font-semibold text-slate-900 truncate max-w-[200px]">
                  {organizations.find((o) => o._id === selectedOrgId)?.name || 'Medical Center'}
                </span>
              </div>
            </div>

            <Button
              variant="primary"
              size="md"
              className="w-full"
              onClick={() => navigate('/patient/appointments')}
            >
              View My Appointment Passes
            </Button>
          </div>
        </div>
      )}

    </div>
  );
};

export default DoctorProfilePage;
