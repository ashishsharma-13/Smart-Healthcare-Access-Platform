import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  User,
  Heart,
  ShieldAlert,
  Activity,
  Pill,
  Phone,
  MapPin,
  Calendar,
  Save,
  CheckCircle2,
  AlertTriangle,
  Plus,
  X,
  FileText,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

export const PatientProfilePage = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successNotice, setSuccessNotice] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    bloodGroup: '',
    address: {
      street: '',
      city: '',
      state: '',
      postalCode: '',
    },
    emergencyContact: {
      name: '',
      relationship: '',
      phone: '',
    },
    medicalNotes: '',
  });

  // Tag list state
  const [allergies, setAllergies] = useState([]);
  const [chronicConditions, setChronicConditions] = useState([]);
  const [currentMedications, setCurrentMedications] = useState([]);

  // Tag inputs
  const [allergyInput, setAllergyInput] = useState('');
  const [conditionInput, setConditionInput] = useState('');
  const [medicationInput, setMedicationInput] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        dateOfBirth: user.dateOfBirth || '',
        gender: user.gender || '',
        bloodGroup: user.bloodGroup || '',
        address: {
          street: user.address?.street || '',
          city: user.address?.city || '',
          state: user.address?.state || '',
          postalCode: user.address?.postalCode || '',
        },
        emergencyContact: {
          name: user.emergencyContact?.name || '',
          relationship: user.emergencyContact?.relationship || '',
          phone: user.emergencyContact?.phone || '',
        },
        medicalNotes: user.medicalNotes || '',
      });
      setAllergies(user.allergies || []);
      setChronicConditions(user.chronicConditions || []);
      setCurrentMedications(user.currentMedications || []);
    }
  }, [user]);

  // Calculate completion percentage
  const calculateCompletion = () => {
    let score = 0;
    const checks = [
      formData.name,
      formData.email || formData.phone,
      formData.dateOfBirth,
      formData.gender,
      formData.bloodGroup,
      formData.address.city,
      formData.emergencyContact.name && formData.emergencyContact.phone,
      allergies.length > 0 || chronicConditions.length > 0 || currentMedications.length > 0,
    ];
    checks.forEach((item) => {
      if (item) score += 12.5;
    });
    return Math.round(score);
  };

  const handleAddTag = (listSetter, inputVal, inputSetter) => {
    const trimmed = inputVal.trim();
    if (!trimmed) return;
    listSetter((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    inputSetter('');
  };

  const handleRemoveTag = (listSetter, tagToRemove) => {
    listSetter((prev) => prev.filter((t) => t !== tagToRemove));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setSuccessNotice('');
      setErrorMessage('');

      const payload = {
        name: formData.name,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        bloodGroup: formData.bloodGroup,
        address: formData.address,
        emergencyContact: formData.emergencyContact,
        allergies,
        chronicConditions,
        currentMedications,
        medicalNotes: formData.medicalNotes,
      };

      const res = await api.put('/auth/me', payload);
      if (res.data.success) {
        updateUser(res.data.user);
        setSuccessNotice('Patient profile successfully saved to clinical records.');
        setTimeout(() => setSuccessNotice(''), 5000);
      }
    } catch (err) {
      console.error('Failed to update profile', err);
      setErrorMessage(err.response?.data?.message || 'Error updating profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const completionPct = calculateCompletion();

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Banner / Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-1.5 text-xs text-slate-400 mb-1">
            <span>Patient portal</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span>Settings & privacy</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-blue-600 font-bold">Manage profile</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Manage Clinical Profile
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Update personal demographics, emergency contacts, and medical triage background.
          </p>
        </div>

        {/* Completion Gauge Card */}
        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs flex items-center space-x-4 min-w-[240px]">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm">
            {completionPct}%
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-900 mb-1">
              <span>Profile Health</span>
              <span className="text-blue-600 font-mono">{completionPct}%</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {successNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl font-bold flex items-center space-x-2 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-xs rounded-2xl font-bold flex items-center space-x-2 animate-fade-in shadow-xs">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Personal Demographics */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center space-x-2.5 pb-4 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Personal Demographics</h2>
              <p className="text-xs text-slate-500">Official patient identity used for booking and hospital admission</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Legal Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                placeholder="e.g. Jamie Bennett"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                disabled
                value={formData.email}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
                placeholder="email@example.com"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Managed via authentication credentials</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                placeholder="+1 555-0199"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Date of Birth</label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-Binary">Non-Binary</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Blood Group</label>
              <select
                value={formData.bloodGroup}
                onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold text-red-600"
              >
                <option value="">Select Blood Group</option>
                {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Address & Location */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center space-x-2.5 pb-4 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Residential Address</h2>
              <p className="text-xs text-slate-500">Helps match nearby facilities and emergency transit dispatch</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Street Address</label>
              <input
                type="text"
                value={formData.address.street}
                onChange={(e) =>
                  setFormData({ ...formData, address: { ...formData.address, street: e.target.value } })
                }
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                placeholder="742 Evergreen Terrace"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
              <input
                type="text"
                value={formData.address.city}
                onChange={(e) =>
                  setFormData({ ...formData, address: { ...formData.address, city: e.target.value } })
                }
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                placeholder="Springfield"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">State / Province</label>
              <input
                type="text"
                value={formData.address.state}
                onChange={(e) =>
                  setFormData({ ...formData, address: { ...formData.address, state: e.target.value } })
                }
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                placeholder="OR"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Emergency Contact */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center space-x-2.5 pb-4 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Emergency Contact Person</h2>
              <p className="text-xs text-slate-500">Contacted immediately by medical staff during critical admissions</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Contact Name</label>
              <input
                type="text"
                value={formData.emergencyContact.name}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    emergencyContact: { ...formData.emergencyContact, name: e.target.value },
                  })
                }
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                placeholder="e.g. Sarah Bennett"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Relationship</label>
              <input
                type="text"
                value={formData.emergencyContact.relationship}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    emergencyContact: { ...formData.emergencyContact, relationship: e.target.value },
                  })
                }
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                placeholder="e.g. Spouse / Parent / Sibling"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Emergency Phone Number</label>
              <input
                type="tel"
                value={formData.emergencyContact.phone}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    emergencyContact: { ...formData.emergencyContact, phone: e.target.value },
                  })
                }
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                placeholder="+1 555-0144"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Clinical Triage Records */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center space-x-2.5 pb-4 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Clinical Triage & Health Profile</h2>
              <p className="text-xs text-slate-500">Shared with verified attending doctors to avoid contraindications</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Allergies */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">Known Allergies</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={allergyInput}
                  onChange={(e) => setAllergyInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag(setAllergies, allergyInput, setAllergyInput);
                    }
                  }}
                  placeholder="e.g. Penicillin, Peanuts"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => handleAddTag(setAllergies, allergyInput, setAllergyInput)}
                  className="px-3 py-2 bg-amber-50 text-amber-800 hover:bg-amber-100 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 min-h-[38px] p-2 bg-slate-50 rounded-xl border border-slate-100">
                {allergies.map((all, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100/70 text-amber-900 border border-amber-200"
                  >
                    <span>{all}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(setAllergies, all)}
                      className="hover:text-amber-950 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {allergies.length === 0 && (
                  <span className="text-[11px] text-slate-400 italic">No allergies recorded</span>
                )}
              </div>
            </div>

            {/* Chronic Conditions */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">Chronic Conditions</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={conditionInput}
                  onChange={(e) => setConditionInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag(setChronicConditions, conditionInput, setConditionInput);
                    }
                  }}
                  placeholder="e.g. Asthma, Hypertension"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => handleAddTag(setChronicConditions, conditionInput, setConditionInput)}
                  className="px-3 py-2 bg-blue-50 text-blue-800 hover:bg-blue-100 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 min-h-[38px] p-2 bg-slate-50 rounded-xl border border-slate-100">
                {chronicConditions.map((cond, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100/70 text-blue-900 border border-blue-200"
                  >
                    <span>{cond}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(setChronicConditions, cond)}
                      className="hover:text-blue-950 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {chronicConditions.length === 0 && (
                  <span className="text-[11px] text-slate-400 italic">No chronic conditions listed</span>
                )}
              </div>
            </div>

            {/* Current Medications */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">Current Medications</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={medicationInput}
                  onChange={(e) => setMedicationInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag(setCurrentMedications, medicationInput, setMedicationInput);
                    }
                  }}
                  placeholder="e.g. Metformin 500mg"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => handleAddTag(setCurrentMedications, medicationInput, setMedicationInput)}
                  className="px-3 py-2 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 min-h-[38px] p-2 bg-slate-50 rounded-xl border border-slate-100">
                {currentMedications.map((med, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100/70 text-emerald-900 border border-emerald-200"
                  >
                    <span>{med}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(setCurrentMedications, med)}
                      className="hover:text-emerald-950 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {currentMedications.length === 0 && (
                  <span className="text-[11px] text-slate-400 italic">No active medications listed</span>
                )}
              </div>
            </div>
          </div>

          <div className="pt-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Medical Background & Clinical Notes
            </label>
            <textarea
              rows={3}
              value={formData.medicalNotes}
              onChange={(e) => setFormData({ ...formData, medicalNotes: e.target.value })}
              placeholder="Past surgeries, family medical history, or specific health instructions..."
              className="w-full text-xs p-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Bottom Save Action Bar */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-slate-400">
            Last updated records are synchronized with emergency dispatch and consultation desks.
          </p>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md active:scale-95 transition cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Records...' : 'Save Profile Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default PatientProfilePage;

