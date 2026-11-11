import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  User,
  Mail,
  Phone,
  ShieldCheck,
  Stethoscope,
  Award,
  Clock,
  DollarSign,
  Building2,
  FileText,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  Save,
  QrCode,
  Languages,
  Calendar,
} from 'lucide-react';
import { Toast } from '../../components/ui/Toast';

export const DoctorProfilePage = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ type: '', message: '' });

  // Profile Form States
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [specialization, setSpecialization] = useState('Cardiology');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [experienceYears, setExperienceYears] = useState(10);
  const [consultationFee, setConsultationFee] = useState(85);
  const [bio, setBio] = useState('');
  const [workingHours, setWorkingHours] = useState('Mon–Fri · 9:00 AM–4:00 PM');
  const [isAvailableForAppointments, setIsAvailableForAppointments] = useState(true);
  const [isAvailableForEmergency, setIsAvailableForEmergency] = useState(false);

  // Tag arrays
  const [qualifications, setQualifications] = useState(['MD', 'DM Cardiology', 'FACC']);
  const [newQualification, setNewQualification] = useState('');

  const [languages, setLanguages] = useState(['English', 'Hindi']);
  const [newLanguage, setNewLanguage] = useState('');

  // Doctor metadata
  const [doctorMeta, setDoctorMeta] = useState(null);

  const specializationsList = [
    'Cardiology',
    'Emergency Medicine',
    'Trauma Surgery',
    'Neurology',
    'Pediatrics',
    'General Surgery',
    'Internal Medicine',
    'Orthopedics',
    'Dermatology',
    'Psychiatry',
  ];

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/doctors/me');
      if (res.data.success) {
        const doc = res.data.data;
        setDoctorMeta(doc);
        setName(doc.userId?.name || user?.name || 'Dr. Mira Patel');
        setPhone(doc.userId?.phone || user?.phone || '+1 (555) 234-5678');
        setEmail(doc.userId?.email || user?.email || 'mira.patel@shap.care');
        setSpecialization(doc.specialization || 'Cardiology');
        setLicenseNumber(doc.licenseNumber || 'NMC-2014-99821');
        setExperienceYears(doc.experienceYears !== undefined ? doc.experienceYears : 12);
        setConsultationFee(doc.consultationFee !== undefined ? doc.consultationFee : 85);
        setBio(
          doc.bio ||
            'Dr. Patel sees adults for cardiovascular consultations, preventive care and ongoing heart-health follow-ups. Her approach emphasizes clear explanations and shared care planning.'
        );
        setWorkingHours(doc.workingHours || 'Mon–Fri · 9:00 AM–4:00 PM');
        setIsAvailableForAppointments(doc.isAvailableForAppointments ?? true);
        setIsAvailableForEmergency(doc.isAvailableForEmergency ?? false);

        if (Array.isArray(doc.qualifications) && doc.qualifications.length > 0) {
          setQualifications(doc.qualifications);
        }
        if (Array.isArray(doc.languages) && doc.languages.length > 0) {
          setLanguages(doc.languages);
        }
      }
    } catch (err) {
      console.warn('Could not fetch doctor profile, using fallback defaults', err);
      setName(user?.name || 'Dr. Mira Patel');
      setPhone(user?.phone || '+1 (555) 234-5678');
      setEmail(user?.email || 'mira.patel@shap.care');
      setSpecialization('Cardiology');
      setLicenseNumber('NMC-2014-99821');
    } finally {
      setLoading(false);
    }
  };

  const handleAddQualification = (e) => {
    e.preventDefault();
    if (newQualification.trim() && !qualifications.includes(newQualification.trim())) {
      setQualifications([...qualifications, newQualification.trim()]);
      setNewQualification('');
    }
  };

  const handleRemoveQualification = (item) => {
    setQualifications(qualifications.filter((q) => q !== item));
  };

  const handleAddLanguage = (e) => {
    e.preventDefault();
    if (newLanguage.trim() && !languages.includes(newLanguage.trim())) {
      setLanguages([...languages, newLanguage.trim()]);
      setNewLanguage('');
    }
  };

  const handleRemoveLanguage = (item) => {
    setLanguages(languages.filter((l) => l !== item));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        name,
        phone,
        specialization,
        licenseNumber,
        experienceYears: Number(experienceYears),
        consultationFee: Number(consultationFee),
        bio,
        workingHours,
        qualifications,
        languages,
        isAvailableForAppointments,
        isAvailableForEmergency,
      };

      const res = await api.put('/doctors/me', payload);
      if (res.data.success) {
        setDoctorMeta(res.data.data);
        if (updateUser) {
          updateUser({ name, phone });
        }
        setToast({ type: 'success', message: 'Doctor profile and credentials updated successfully!' });
      }
    } catch (err) {
      console.error('Failed to update doctor profile', err);
      setToast({
        type: 'error',
        message: err.response?.data?.message || 'Failed to save doctor profile changes.',
      });
    } finally {
      setSaving(false);
      setTimeout(() => setToast({ type: '', message: '' }), 4000);
    }
  };

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* Toast Notification */}
      {toast.message && <Toast type={toast.type} message={toast.message} onClose={() => setToast({ type: '', message: '' })} />}

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
              Verified Medical Practitioner
            </span>
            <span className="text-xs text-slate-400">
              ID: {doctorMeta?.doctorUniqueId || 'DOC-48291'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Manage Doctor Profile
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Update your clinical credentials, specialties, consultation rates, and public patient presence.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSaveProfile}
          disabled={saving}
          className="px-5 py-2.5 bg-[#0B4F9C] hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-2 cursor-pointer disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving changes...' : 'Save Profile'}</span>
        </button>
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* 1. Demographics & Contact Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <User className="w-4 h-4 text-[#0B4F9C]" />
            <h2 className="text-sm font-bold text-slate-900">Personal & Contact Details</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <label className="block font-bold text-slate-700">Full Name (with Title)</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dr. Mira Patel"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-bold text-slate-700">Direct Phone Number</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 234-5678"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-bold text-slate-700">Official Clinical Email</label>
              <input
                type="email"
                disabled
                value={email}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* 2. Clinical Credentials & Practice Details */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <Stethoscope className="w-4 h-4 text-[#0B4F9C]" />
            <h2 className="text-sm font-bold text-slate-900">Specialty & Clinical Qualifications</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <label className="block font-bold text-slate-700">Primary Specialization</label>
              <select
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {specializationsList.map((spec) => (
                  <option key={spec} value={spec}>
                    {spec}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block font-bold text-slate-700">Medical License Number</label>
              <input
                type="text"
                required
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                placeholder="NMC-2014-99821"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-bold text-slate-700">Years of Experience</label>
              <input
                type="number"
                min="0"
                max="60"
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Qualifications Tag Manager */}
          <div className="space-y-2 pt-2">
            <label className="block text-xs font-bold text-slate-700">Degrees & Board Certifications</label>
            <div className="flex flex-wrap items-center gap-2">
              {qualifications.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#EBF3FE] text-blue-700 border border-blue-200/60"
                >
                  <span>{item}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveQualification(item)}
                    className="hover:text-red-600 transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <div className="flex items-center space-x-1">
                <input
                  type="text"
                  value={newQualification}
                  onChange={(e) => setNewQualification(e.target.value)}
                  placeholder="e.g. FACC, MBBS"
                  className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleAddQualification}
                  className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Languages Tag Manager */}
          <div className="space-y-2 pt-2">
            <label className="block text-xs font-bold text-slate-700">Consultation Languages</label>
            <div className="flex flex-wrap items-center gap-2">
              {languages.map((lang) => (
                <span
                  key={lang}
                  className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200"
                >
                  <span>{lang}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveLanguage(lang)}
                    className="hover:text-red-600 transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <div className="flex items-center space-x-1">
                <input
                  type="text"
                  value={newLanguage}
                  onChange={(e) => setNewLanguage(e.target.value)}
                  placeholder="e.g. Spanish, French"
                  className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleAddLanguage}
                  className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Biography */}
          <div className="space-y-1 pt-2">
            <label className="block text-xs font-bold text-slate-700">
              Clinical Bio & Patient Philosophy
            </label>
            <textarea
              rows="3"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Describe your care approach, clinical focus, and patient philosophy..."
              className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        {/* 3. Availability, Hours & Rates */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <Clock className="w-4 h-4 text-[#0B4F9C]" />
            <h2 className="text-sm font-bold text-slate-900">Consultation Rates & Availability Controls</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="block font-bold text-slate-700">Standard Consultation Fee ($)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={consultationFee}
                  onChange={(e) => setConsultationFee(e.target.value)}
                  className="w-full pl-7 pr-3.5 py-2 rounded-xl border border-slate-200 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block font-bold text-slate-700">Standard Weekly Working Hours</label>
              <input
                type="text"
                value={workingHours}
                onChange={(e) => setWorkingHours(e.target.value)}
                placeholder="Mon–Fri · 9:00 AM–4:00 PM"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Toggle Switches */}
          <div className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <span className="block text-xs font-bold text-slate-800">
                  Open for Outpatient Bookings
                </span>
                <span className="text-[11px] text-slate-500">
                  Allows registered patients to discover and book appointments with you.
                </span>
              </div>
              <input
                type="checkbox"
                checked={isAvailableForAppointments}
                onChange={(e) => setIsAvailableForAppointments(e.target.checked)}
                className="w-5 h-5 rounded text-[#0B4F9C] focus:ring-blue-500 cursor-pointer"
              />
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <span className="block text-xs font-bold text-slate-800">
                  Emergency On-Call Standby
                </span>
                <span className="text-[11px] text-slate-500">
                  Flags availability for urgent triage when checked in at an emergency department.
                </span>
              </div>
              <input
                type="checkbox"
                checked={isAvailableForEmergency}
                onChange={(e) => setIsAvailableForEmergency(e.target.checked)}
                className="w-5 h-5 rounded text-[#0B4F9C] focus:ring-blue-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Bottom Save Bar */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-[11px] text-slate-400">
            SHAP · Smart Healthcare Access Platform · Professional Governance
          </p>

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-[#0B4F9C] hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving changes...' : 'Save Profile Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default DoctorProfilePage;
