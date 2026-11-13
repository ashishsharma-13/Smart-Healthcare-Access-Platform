import React, { useState, useEffect, useCallback } from 'react';
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
  Trash2,
  Edit2,
  Star,
  ShieldCheck,
  ChevronRight,
  Eye,
  FileText,
  Lock,
  Globe,
  RefreshCw,
  Compass,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

export const PatientProfilePage = () => {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('demographics');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successNotice, setSuccessNotice] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // 1. Demographics & Physical
  const [demographics, setDemographics] = useState({
    name: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    bloodGroup: '',
    preferredLanguage: 'English',
    heightCm: '',
    weightKg: '',
    address: {
      street: '',
      city: '',
      state: '',
      postalCode: '',
    },
    locationCoordinates: [0, 0],
    profileCompleteness: 0,
  });

  // 2. Emergency Contacts
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [contactForm, setContactForm] = useState({
    name: '',
    relationship: 'SPOUSE',
    phone: '',
    alternatePhone: '',
    email: '',
    isPrimary: false,
    notes: '',
  });

  // 3. Medical Conditions
  const [conditions, setConditions] = useState([]);
  const [conditionModalOpen, setConditionModalOpen] = useState(false);
  const [editingCondition, setEditingCondition] = useState(null);
  const [conditionForm, setConditionForm] = useState({
    conditionName: '',
    diagnosisDate: '',
    status: 'ACTIVE',
    source: 'PATIENT_REPORTED',
    notes: '',
  });

  // 4. Allergies
  const [allergies, setAllergies] = useState([]);
  const [allergyModalOpen, setAllergyModalOpen] = useState(false);
  const [editingAllergy, setEditingAllergy] = useState(null);
  const [allergyForm, setAllergyForm] = useState({
    allergyType: 'DRUG',
    substance: '',
    reaction: '',
    severity: 'MODERATE',
    source: 'PATIENT_REPORTED',
    notes: '',
  });

  // 5. Medications
  const [medications, setMedications] = useState([]);
  const [medicationModalOpen, setMedicationModalOpen] = useState(false);
  const [editingMedication, setEditingMedication] = useState(null);
  const [medicationForm, setMedicationForm] = useState({
    medicationName: '',
    dosage: '',
    frequency: '',
    startDate: '',
    endDate: '',
    status: 'ACTIVE',
    source: 'PATIENT_REPORTED',
    prescribedBy: '',
    notes: '',
  });

  // 6. Medical History
  const [historyList, setHistoryList] = useState([]);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [editingHistory, setEditingHistory] = useState(null);
  const [historyForm, setHistoryForm] = useState({
    category: 'SURGERY',
    title: '',
    eventDate: '',
    approximateYear: '',
    facility: '',
    source: 'PATIENT_REPORTED',
    notes: '',
  });

  // 7. Consents
  const [consents, setConsents] = useState([]);

  // 8. Pre-flight summary
  const [preflightSummary, setPreflightSummary] = useState(null);

  // Fetch all profile details
  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      const [
        profRes,
        contactsRes,
        condsRes,
        allergiesRes,
        medsRes,
        histRes,
        consentsRes,
        summaryRes,
      ] = await Promise.allSettled([
        api.get('/patients/me/profile'),
        api.get('/patients/me/emergency-contacts'),
        api.get('/patients/me/medical-conditions'),
        api.get('/patients/me/allergies'),
        api.get('/patients/me/medications'),
        api.get('/patients/me/medical-history'),
        api.get('/patients/me/consents'),
        api.get('/emergency/profile-summary'),
      ]);

      if (profRes.status === 'fulfilled' && profRes.value.data?.data) {
        const p = profRes.value.data.data;
        setDemographics({
          name: p.user?.name || user?.name || '',
          email: p.user?.email || user?.email || '',
          phone: p.user?.phone || user?.phone || '',
          dateOfBirth: p.dateOfBirth || '',
          gender: p.gender || '',
          bloodGroup: p.bloodGroup || '',
          preferredLanguage: p.preferredLanguage || 'English',
          heightCm: p.heightCm || '',
          weightKg: p.weightKg || '',
          address: {
            street: p.address?.street || '',
            city: p.address?.city || '',
            state: p.address?.state || '',
            postalCode: p.address?.postalCode || '',
          },
          locationCoordinates: p.locationCoordinates || [0, 0],
          profileCompleteness: p.profileCompleteness || 0,
        });
      }

      if (contactsRes.status === 'fulfilled' && contactsRes.value.data?.data) {
        setEmergencyContacts(contactsRes.value.data.data);
      }
      if (condsRes.status === 'fulfilled' && condsRes.value.data?.data) {
        setConditions(condsRes.value.data.data);
      }
      if (allergiesRes.status === 'fulfilled' && allergiesRes.value.data?.data) {
        setAllergies(allergiesRes.value.data.data);
      }
      if (medsRes.status === 'fulfilled' && medsRes.value.data?.data) {
        setMedications(medsRes.value.data.data);
      }
      if (histRes.status === 'fulfilled' && histRes.value.data?.data) {
        setHistoryList(histRes.value.data.data);
      }
      if (consentsRes.status === 'fulfilled' && consentsRes.value.data?.data) {
        setConsents(consentsRes.value.data.data);
      }
      if (summaryRes.status === 'fulfilled' && summaryRes.value.data?.data) {
        setPreflightSummary(summaryRes.value.data.data);
      }
    } catch (err) {
      console.error('Error fetching patient profile data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Save Demographics
  const handleSaveDemographics = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setSuccessNotice('');
      setErrorMessage('');

      const payload = {
        name: demographics.name,
        phone: demographics.phone,
        dateOfBirth: demographics.dateOfBirth,
        gender: demographics.gender,
        bloodGroup: demographics.bloodGroup,
        preferredLanguage: demographics.preferredLanguage,
        heightCm: demographics.heightCm ? Number(demographics.heightCm) : null,
        weightKg: demographics.weightKg ? Number(demographics.weightKg) : null,
        address: demographics.address,
        locationCoordinates: demographics.locationCoordinates,
      };

      const res = await api.put('/patients/me/profile', payload);
      if (res.data?.success) {
        setSuccessNotice('Demographics and physical attributes saved successfully.');
        if (res.data.data?.profileCompleteness !== undefined) {
          setDemographics((prev) => ({
            ...prev,
            profileCompleteness: res.data.data.profileCompleteness,
          }));
        }
        if (res.data.data?.user) {
          updateUser(res.data.data.user);
        }
        setTimeout(() => setSuccessNotice(''), 4000);
      }
    } catch (err) {
      console.error('Save error:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to save demographics.');
    } finally {
      setSaving(false);
    }
  };

  // Get current geolocation
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setDemographics((prev) => ({
          ...prev,
          locationCoordinates: [longitude, latitude],
        }));
        setSuccessNotice(`GPS Coordinates detected: [${longitude.toFixed(4)}, ${latitude.toFixed(4)}]`);
        setTimeout(() => setSuccessNotice(''), 4000);
      },
      (err) => {
        setErrorMessage(`Failed to get location: ${err.message}`);
      }
    );
  };

  // Emergency Contact Handlers
  const handleSaveContact = async (e) => {
    e.preventDefault();
    try {
      if (editingContact) {
        await api.put(`/patients/me/emergency-contacts/${editingContact._id}`, contactForm);
      } else {
        await api.post('/patients/me/emergency-contacts', contactForm);
      }
      setContactModalOpen(false);
      setEditingContact(null);
      setContactForm({
        name: '',
        relationship: 'SPOUSE',
        phone: '',
        alternatePhone: '',
        email: '',
        isPrimary: false,
        notes: '',
      });
      const res = await api.get('/patients/me/emergency-contacts');
      setEmergencyContacts(res.data?.data || []);
      setSuccessNotice('Emergency contact saved.');
      setTimeout(() => setSuccessNotice(''), 3000);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to save emergency contact.');
    }
  };

  const handleDeleteContact = async (id) => {
    if (!window.confirm('Delete this emergency contact?')) return;
    try {
      await api.delete(`/patients/me/emergency-contacts/${id}`);
      const res = await api.get('/patients/me/emergency-contacts');
      setEmergencyContacts(res.data?.data || []);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to delete contact.');
    }
  };

  // Medical Conditions Handlers
  const handleSaveCondition = async (e) => {
    e.preventDefault();
    try {
      if (editingCondition) {
        await api.put(`/patients/me/medical-conditions/${editingCondition._id}`, conditionForm);
      } else {
        await api.post('/patients/me/medical-conditions', conditionForm);
      }
      setConditionModalOpen(false);
      setEditingCondition(null);
      setConditionForm({
        conditionName: '',
        diagnosisDate: '',
        status: 'ACTIVE',
        source: 'PATIENT_REPORTED',
        notes: '',
      });
      const res = await api.get('/patients/me/medical-conditions');
      setConditions(res.data?.data || []);
      setSuccessNotice('Medical condition recorded.');
      setTimeout(() => setSuccessNotice(''), 3000);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to save condition.');
    }
  };

  const handleDeleteCondition = async (id) => {
    if (!window.confirm('Delete this medical condition record?')) return;
    try {
      await api.delete(`/patients/me/medical-conditions/${id}`);
      const res = await api.get('/patients/me/medical-conditions');
      setConditions(res.data?.data || []);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to delete condition.');
    }
  };

  // Allergies Handlers
  const handleSaveAllergy = async (e) => {
    e.preventDefault();
    try {
      if (editingAllergy) {
        await api.put(`/patients/me/allergies/${editingAllergy._id}`, allergyForm);
      } else {
        await api.post('/patients/me/allergies', allergyForm);
      }
      setAllergyModalOpen(false);
      setEditingAllergy(null);
      setAllergyForm({
        allergyType: 'DRUG',
        substance: '',
        reaction: '',
        severity: 'MODERATE',
        source: 'PATIENT_REPORTED',
        notes: '',
      });
      const res = await api.get('/patients/me/allergies');
      setAllergies(res.data?.data || []);
      setSuccessNotice('Allergy profile updated.');
      setTimeout(() => setSuccessNotice(''), 3000);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to save allergy.');
    }
  };

  const handleDeleteAllergy = async (id) => {
    if (!window.confirm('Delete this allergy entry?')) return;
    try {
      await api.delete(`/patients/me/allergies/${id}`);
      const res = await api.get('/patients/me/allergies');
      setAllergies(res.data?.data || []);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to delete allergy.');
    }
  };

  // Medications Handlers
  const handleSaveMedication = async (e) => {
    e.preventDefault();
    try {
      if (editingMedication) {
        await api.put(`/patients/me/medications/${editingMedication._id}`, medicationForm);
      } else {
        await api.post('/patients/me/medications', medicationForm);
      }
      setMedicationModalOpen(false);
      setEditingMedication(null);
      setMedicationForm({
        medicationName: '',
        dosage: '',
        frequency: '',
        startDate: '',
        endDate: '',
        status: 'ACTIVE',
        source: 'PATIENT_REPORTED',
        prescribedBy: '',
        notes: '',
      });
      const res = await api.get('/patients/me/medications');
      setMedications(res.data?.data || []);
      setSuccessNotice('Medication updated.');
      setTimeout(() => setSuccessNotice(''), 3000);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to save medication.');
    }
  };

  const handleDeleteMedication = async (id) => {
    if (!window.confirm('Delete this medication record?')) return;
    try {
      await api.delete(`/patients/me/medications/${id}`);
      const res = await api.get('/patients/me/medications');
      setMedications(res.data?.data || []);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to delete medication.');
    }
  };

  // Medical History Handlers
  const handleSaveHistory = async (e) => {
    e.preventDefault();
    try {
      if (editingHistory) {
        await api.put(`/patients/me/medical-history/${editingHistory._id}`, historyForm);
      } else {
        await api.post('/patients/me/medical-history', historyForm);
      }
      setHistoryModalOpen(false);
      setEditingHistory(null);
      setHistoryForm({
        category: 'SURGERY',
        title: '',
        eventDate: '',
        approximateYear: '',
        facility: '',
        source: 'PATIENT_REPORTED',
        notes: '',
      });
      const res = await api.get('/patients/me/medical-history');
      setHistoryList(res.data?.data || []);
      setSuccessNotice('Medical history record saved.');
      setTimeout(() => setSuccessNotice(''), 3000);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to save medical history.');
    }
  };

  const handleDeleteHistory = async (id) => {
    if (!window.confirm('Delete this history record?')) return;
    try {
      await api.delete(`/patients/me/medical-history/${id}`);
      const res = await api.get('/patients/me/medical-history');
      setHistoryList(res.data?.data || []);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to delete record.');
    }
  };

  // Consents & Privacy Handlers
  const handleToggleConsent = async (purpose, currentStatus) => {
    try {
      const newStatus = currentStatus === 'GRANTED' ? 'REVOKED' : 'GRANTED';
      await api.post('/patients/me/consents', {
        purpose,
        status: newStatus,
        policyVersion: '1.0',
      });
      const res = await api.get('/patients/me/consents');
      setConsents(res.data?.data || []);
      setSuccessNotice(`Consent preference for ${purpose.replace(/_/g, ' ')} updated to ${newStatus}.`);
      setTimeout(() => setSuccessNotice(''), 4000);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to update consent.');
    }
  };

  // Helper badge color
  const getSeverityBadge = (sev) => {
    switch (sev) {
      case 'LIFE_THREATENING':
        return 'bg-red-100 text-red-800 border-red-300 font-black';
      case 'SEVERE':
        return 'bg-orange-100 text-orange-800 border-orange-300 font-bold';
      case 'MODERATE':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusBadge = (st) => {
    switch (st) {
      case 'ACTIVE':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'CHRONIC':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'MANAGED':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'RESOLVED':
      case 'COMPLETED':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'DISCONTINUED':
        return 'bg-rose-100 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20">
      {/* Top Banner / Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-1.5 text-xs text-slate-400 mb-1">
            <span>Patient Portal</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-blue-600 font-bold">Profile & Health Records</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Patient Health Profile & Privacy
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your personal demographics, emergency contacts, medical history, and consent scopes.
          </p>
        </div>

        {/* Profile Completeness Gauge */}
        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs flex items-center space-x-4 min-w-[240px]">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm">
            {demographics.profileCompleteness}%
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-900 mb-1">
              <span>Profile Completeness</span>
              <span className="text-blue-600 font-mono">{demographics.profileCompleteness}%</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${demographics.profileCompleteness}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
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

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        {[
          { id: 'demographics', label: 'Demographics', icon: User },
          { id: 'contacts', label: `Emergency Contacts (${emergencyContacts.length})`, icon: Phone },
          { id: 'conditions', label: `Conditions (${conditions.length})`, icon: Activity },
          { id: 'allergies', label: `Allergies (${allergies.length})`, icon: ShieldAlert },
          { id: 'medications', label: `Medications (${medications.length})`, icon: Pill },
          { id: 'history', label: `History (${historyList.length})`, icon: FileText },
          { id: 'consents', label: 'Privacy & Consents', icon: Lock },
          { id: 'preflight', label: 'Emergency Summary Preview', icon: Heart },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DEMOGRAPHICS & PHYSICAL ATTRIBUTES */}
      {/* ========================================================================= */}
      {activeTab === 'demographics' && (
        <form onSubmit={handleSaveDemographics} className="space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center space-x-2.5 pb-4 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Personal Demographics & Physical Stats</h2>
                <p className="text-xs text-slate-500">Official patient identity for clinical admissions and triage</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  value={demographics.name}
                  onChange={(e) => setDemographics({ ...demographics, name: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="e.g. Rohan Sharma"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  disabled
                  value={demographics.email}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
                  placeholder="patient@shap.org"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Managed via account security</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Primary Phone Number</label>
                <input
                  type="tel"
                  value={demographics.phone}
                  onChange={(e) => setDemographics({ ...demographics, phone: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="+91 98111 22334"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={demographics.dateOfBirth ? demographics.dateOfBirth.substring(0, 10) : ''}
                  onChange={(e) => setDemographics({ ...demographics, dateOfBirth: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
                <select
                  value={demographics.gender}
                  onChange={(e) => setDemographics({ ...demographics, gender: e.target.value })}
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
                  value={demographics.bloodGroup}
                  onChange={(e) => setDemographics({ ...demographics, bloodGroup: e.target.value })}
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

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Preferred Language</label>
                <input
                  type="text"
                  value={demographics.preferredLanguage}
                  onChange={(e) => setDemographics({ ...demographics, preferredLanguage: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="e.g. English, Hindi, Spanish"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Height (cm)</label>
                <input
                  type="number"
                  min="30"
                  max="250"
                  value={demographics.heightCm}
                  onChange={(e) => setDemographics({ ...demographics, heightCm: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="e.g. 175"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Weight (kg)</label>
                <input
                  type="number"
                  min="2"
                  max="300"
                  step="0.1"
                  value={demographics.weightKg}
                  onChange={(e) => setDemographics({ ...demographics, weightKg: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="e.g. 72.5"
                />
              </div>
            </div>
          </div>

          {/* Residential Address & Location Coordinates */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Residential Address & GPS Coordinates</h2>
                  <p className="text-xs text-slate-500">
                    Used for nearest facility matching and emergency dispatch
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDetectLocation}
                className="text-xs flex items-center space-x-1.5"
              >
                <Compass className="w-3.5 h-3.5 text-blue-600" />
                <span>Auto-Detect GPS</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Street Address</label>
                <input
                  type="text"
                  value={demographics.address.street}
                  onChange={(e) =>
                    setDemographics({
                      ...demographics,
                      address: { ...demographics.address, street: e.target.value },
                    })
                  }
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="Flat 402, Lotus Towers, Ring Road"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  value={demographics.address.city}
                  onChange={(e) =>
                    setDemographics({
                      ...demographics,
                      address: { ...demographics.address, city: e.target.value },
                    })
                  }
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="New Delhi"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">State / Province</label>
                <input
                  type="text"
                  value={demographics.address.state}
                  onChange={(e) =>
                    setDemographics({
                      ...demographics,
                      address: { ...demographics.address, state: e.target.value },
                    })
                  }
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="Delhi"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Postal Code</label>
                <input
                  type="text"
                  value={demographics.address.postalCode}
                  onChange={(e) =>
                    setDemographics({
                      ...demographics,
                      address: { ...demographics.address, postalCode: e.target.value },
                    })
                  }
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="110001"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">GPS Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={demographics.locationCoordinates[0] || ''}
                  onChange={(e) =>
                    setDemographics({
                      ...demographics,
                      locationCoordinates: [
                        parseFloat(e.target.value) || 0,
                        demographics.locationCoordinates[1] || 0,
                      ],
                    })
                  }
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="77.2090"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">GPS Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={demographics.locationCoordinates[1] || ''}
                  onChange={(e) =>
                    setDemographics({
                      ...demographics,
                      locationCoordinates: [
                        demographics.locationCoordinates[0] || 0,
                        parseFloat(e.target.value) || 0,
                      ],
                    })
                  }
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="28.6139"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving} className="px-6 py-2.5 flex items-center space-x-2">
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Demographics'}</span>
            </Button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: EMERGENCY CONTACTS */}
      {/* ========================================================================= */}
      {activeTab === 'contacts' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Emergency Contacts</h2>
              <p className="text-xs text-slate-500">
                Designate primary and alternate contacts. Contacts receive transit updates; medical records are not exposed to contacts.
              </p>
            </div>
            <Button
              onClick={() => {
                setEditingContact(null);
                setContactForm({
                  name: '',
                  relationship: 'SPOUSE',
                  phone: '',
                  alternatePhone: '',
                  email: '',
                  isPrimary: emergencyContacts.length === 0,
                  notes: '',
                });
                setContactModalOpen(true);
              }}
              className="text-xs flex items-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Emergency Contact</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {emergencyContacts.map((c) => (
              <div
                key={c._id}
                className={`p-5 rounded-2xl border transition bg-white shadow-xs relative ${
                  c.isPrimary ? 'border-amber-300 ring-2 ring-amber-400/20' : 'border-slate-200/80'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-slate-900">{c.name}</span>
                      {c.isPrimary && (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                          <span>PRIMARY</span>
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 font-medium">{c.relationship}</span>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => {
                        setEditingContact(c);
                        setContactForm({
                          name: c.name,
                          relationship: c.relationship,
                          phone: c.phone,
                          alternatePhone: c.alternatePhone || '',
                          email: c.email || '',
                          isPrimary: c.isPrimary,
                          notes: c.notes || '',
                        });
                        setContactModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteContact(c._id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center space-x-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono">{c.phone}</span>
                    {c.alternatePhone && (
                      <span className="text-slate-400 font-mono">/ {c.alternatePhone}</span>
                    )}
                  </div>
                  {c.email && (
                    <div className="flex items-center space-x-2 text-slate-500">
                      <span>Email:</span>
                      <span>{c.email}</span>
                    </div>
                  )}
                  {c.notes && (
                    <div className="text-[11px] text-slate-400 italic pt-1">{c.notes}</div>
                  )}
                </div>
              </div>
            ))}

            {emergencyContacts.length === 0 && (
              <div className="md:col-span-2 text-center p-8 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                <Phone className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">No emergency contacts configured</p>
                <p className="text-xs text-slate-400 mt-1">
                  Adding at least one emergency contact guarantees immediate family coordination during transit.
                </p>
              </div>
            )}
          </div>

          {/* Modal Add/Edit Contact */}
          {contactModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
                <h3 className="text-base font-bold text-slate-900">
                  {editingContact ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
                </h3>
                <form onSubmit={handleSaveContact} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Contact Name *</label>
                    <input
                      type="text"
                      required
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                      placeholder="e.g. Sunita Sharma"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Relationship</label>
                      <select
                        value={contactForm.relationship}
                        onChange={(e) =>
                          setContactForm({ ...contactForm, relationship: e.target.value })
                        }
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white"
                      >
                        {['SPOUSE', 'PARENT', 'CHILD', 'SIBLING', 'RELATIVE', 'FRIEND', 'OTHER'].map(
                          (r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number *</label>
                      <input
                        type="tel"
                        required
                        value={contactForm.phone}
                        onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                        placeholder="+91 98111 99991"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Alt Phone</label>
                      <input
                        type="tel"
                        value={contactForm.alternatePhone}
                        onChange={(e) =>
                          setContactForm({ ...contactForm, alternatePhone: e.target.value })
                        }
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="flex items-center space-x-2 pt-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={contactForm.isPrimary}
                        onChange={(e) =>
                          setContactForm({ ...contactForm, isPrimary: e.target.checked })
                        }
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-xs font-bold text-slate-800">
                        Designate as Primary Emergency Contact
                      </span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Notes</label>
                    <textarea
                      rows={2}
                      value={contactForm.notes}
                      onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                      placeholder="e.g. Lives nearby; has house keys"
                    />
                  </div>
                  <div className="flex justify-end space-x-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setContactModalOpen(false)}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="text-xs">
                      Save Contact
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MEDICAL CONDITIONS */}
      {/* ========================================================================= */}
      {activeTab === 'conditions' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Medical Conditions & Diagnoses</h2>
              <p className="text-xs text-slate-500">
                Track diagnosed conditions with clear status and clinical source attribution.
              </p>
            </div>
            <Button
              onClick={() => {
                setEditingCondition(null);
                setConditionForm({
                  conditionName: '',
                  diagnosisDate: '',
                  status: 'ACTIVE',
                  source: 'PATIENT_REPORTED',
                  notes: '',
                });
                setConditionModalOpen(true);
              }}
              className="text-xs flex items-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Condition</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {conditions.map((c) => (
              <div
                key={c._id}
                className="p-5 rounded-2xl border border-slate-200/80 bg-white shadow-xs relative space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{c.conditionName}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${getStatusBadge(
                          c.status
                        )}`}
                      >
                        {c.status}
                      </span>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-mono">
                        {c.source.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => {
                        setEditingCondition(c);
                        setConditionForm({
                          conditionName: c.conditionName,
                          diagnosisDate: c.diagnosisDate ? c.diagnosisDate.substring(0, 10) : '',
                          status: c.status,
                          source: c.source,
                          notes: c.notes || '',
                        });
                        setConditionModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteCondition(c._id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {c.diagnosisDate && (
                  <p className="text-xs text-slate-500">
                    Diagnosed: {new Date(c.diagnosisDate).toLocaleDateString()}
                  </p>
                )}
                {c.notes && <p className="text-xs text-slate-600 italic">{c.notes}</p>}
              </div>
            ))}

            {conditions.length === 0 && (
              <div className="md:col-span-2 text-center p-8 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                <Activity className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">No medical conditions recorded</p>
                <p className="text-xs text-slate-400 mt-1">
                  Add past or active medical conditions to prevent contraindications during emergency stabilization.
                </p>
              </div>
            )}
          </div>

          {/* Modal Condition */}
          {conditionModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
                <h3 className="text-base font-bold text-slate-900">
                  {editingCondition ? 'Edit Condition' : 'Record Medical Condition'}
                </h3>
                <form onSubmit={handleSaveCondition} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Condition / Diagnosis Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={conditionForm.conditionName}
                      onChange={(e) =>
                        setConditionForm({ ...conditionForm, conditionName: e.target.value })
                      }
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                      placeholder="e.g. Type 2 Diabetes, Hypertension"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                      <select
                        value={conditionForm.status}
                        onChange={(e) =>
                          setConditionForm({ ...conditionForm, status: e.target.value })
                        }
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white"
                      >
                        {['ACTIVE', 'MANAGED', 'RESOLVED', 'CHRONIC'].map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Source</label>
                      <select
                        value={conditionForm.source}
                        onChange={(e) =>
                          setConditionForm({ ...conditionForm, source: e.target.value })
                        }
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white"
                      >
                        {['PATIENT_REPORTED', 'PROVIDER_CONFIRMED', 'CLINICAL_DISCHARGE'].map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Diagnosis Date
                    </label>
                    <input
                      type="date"
                      value={conditionForm.diagnosisDate}
                      onChange={(e) =>
                        setConditionForm({ ...conditionForm, diagnosisDate: e.target.value })
                      }
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Notes</label>
                    <textarea
                      rows={2}
                      value={conditionForm.notes}
                      onChange={(e) =>
                        setConditionForm({ ...conditionForm, notes: e.target.value })
                      }
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                      placeholder="e.g. Monitored quarterly by endocrinologist"
                    />
                  </div>
                  <div className="flex justify-end space-x-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setConditionModalOpen(false)}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="text-xs">
                      Save Condition
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: ALLERGIES & ADVERSE REACTIONS */}
      {/* ========================================================================= */}
      {activeTab === 'allergies' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Allergies & Adverse Drug Reactions</h2>
              <p className="text-xs text-slate-500">
                Severe and life-threatening allergies are prioritized and transmitted during emergency beep dispatch.
              </p>
            </div>
            <Button
              onClick={() => {
                setEditingAllergy(null);
                setAllergyForm({
                  allergyType: 'DRUG',
                  substance: '',
                  reaction: '',
                  severity: 'MODERATE',
                  source: 'PATIENT_REPORTED',
                  notes: '',
                });
                setAllergyModalOpen(true);
              }}
              className="text-xs flex items-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Allergy</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allergies.map((a) => (
              <div
                key={a._id}
                className={`p-5 rounded-2xl border transition bg-white shadow-xs relative space-y-2 ${
                  a.severity === 'LIFE_THREATENING' || a.severity === 'SEVERE'
                    ? 'border-red-200 ring-2 ring-red-400/10'
                    : 'border-slate-200/80'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{a.substance}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] border ${getSeverityBadge(
                          a.severity
                        )}`}
                      >
                        {a.severity}
                      </span>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-mono">
                        {a.allergyType}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => {
                        setEditingAllergy(a);
                        setAllergyForm({
                          allergyType: a.allergyType,
                          substance: a.substance,
                          reaction: a.reaction || '',
                          severity: a.severity,
                          source: a.source,
                          notes: a.notes || '',
                        });
                        setAllergyModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteAllergy(a._id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {a.reaction && (
                  <p className="text-xs text-slate-700 font-medium">Reaction: {a.reaction}</p>
                )}
                {a.notes && <p className="text-xs text-slate-500 italic">{a.notes}</p>}
              </div>
            ))}

            {allergies.length === 0 && (
              <div className="md:col-span-2 text-center p-8 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                <ShieldAlert className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">No known allergies recorded</p>
                <p className="text-xs text-slate-400 mt-1">
                  Add drug or environmental allergies to avoid adverse medication reactions.
                </p>
              </div>
            )}
          </div>

          {/* Modal Allergy */}
          {allergyModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
                <h3 className="text-base font-bold text-slate-900">
                  {editingAllergy ? 'Edit Allergy Record' : 'Record New Allergy'}
                </h3>
                <form onSubmit={handleSaveAllergy} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Substance / Allergen Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={allergyForm.substance}
                      onChange={(e) =>
                        setAllergyForm({ ...allergyForm, substance: e.target.value })
                      }
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                      placeholder="e.g. Penicillin, Peanuts, Latex"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                      <select
                        value={allergyForm.allergyType}
                        onChange={(e) =>
                          setAllergyForm({ ...allergyForm, allergyType: e.target.value })
                        }
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white"
                      >
                        {['DRUG', 'FOOD', 'ENVIRONMENTAL', 'OTHER'].map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Severity *</label>
                      <select
                        value={allergyForm.severity}
                        onChange={(e) =>
                          setAllergyForm({ ...allergyForm, severity: e.target.value })
                        }
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold"
                      >
                        {['MILD', 'MODERATE', 'SEVERE', 'LIFE_THREATENING'].map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Known Reaction
                    </label>
                    <input
                      type="text"
                      value={allergyForm.reaction}
                      onChange={(e) =>
                        setAllergyForm({ ...allergyForm, reaction: e.target.value })
                      }
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                      placeholder="e.g. Anaphylaxis, hives, bronchospasm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Clinical Notes</label>
                    <textarea
                      rows={2}
                      value={allergyForm.notes}
                      onChange={(e) =>
                        setAllergyForm({ ...allergyForm, notes: e.target.value })
                      }
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                      placeholder="e.g. Carry EpiPen at all times"
                    />
                  </div>
                  <div className="flex justify-end space-x-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setAllergyModalOpen(false)}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="text-xs">
                      Save Allergy
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: MEDICATIONS */}
      {/* ========================================================================= */}
      {activeTab === 'medications' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Current & Past Medications</h2>
              <p className="text-xs text-slate-500">
                Track prescriptions, dosages, and active treatment schedules.
              </p>
            </div>
            <Button
              onClick={() => {
                setEditingMedication(null);
                setMedicationForm({
                  medicationName: '',
                  dosage: '',
                  frequency: '',
                  startDate: '',
                  endDate: '',
                  status: 'ACTIVE',
                  source: 'PATIENT_REPORTED',
                  prescribedBy: '',
                  notes: '',
                });
                setMedicationModalOpen(true);
              }}
              className="text-xs flex items-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Medication</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {medications.map((m) => (
              <div
                key={m._id}
                className="p-5 rounded-2xl border border-slate-200/80 bg-white shadow-xs relative space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{m.medicationName}</h3>
                    <p className="text-xs text-slate-600 font-medium">
                      {m.dosage} • {m.frequency}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${getStatusBadge(
                          m.status
                        )}`}
                      >
                        {m.status}
                      </span>
                      {m.prescribedBy && (
                        <span className="text-[10px] text-slate-500 italic">
                          Rx: {m.prescribedBy}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => {
                        setEditingMedication(m);
                        setMedicationForm({
                          medicationName: m.medicationName,
                          dosage: m.dosage || '',
                          frequency: m.frequency || '',
                          startDate: m.startDate ? m.startDate.substring(0, 10) : '',
                          endDate: m.endDate ? m.endDate.substring(0, 10) : '',
                          status: m.status,
                          source: m.source,
                          prescribedBy: m.prescribedBy || '',
                          notes: m.notes || '',
                        });
                        setMedicationModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteMedication(m._id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {m.notes && <p className="text-xs text-slate-500 italic pt-1">{m.notes}</p>}
              </div>
            ))}

            {medications.length === 0 && (
              <div className="md:col-span-2 text-center p-8 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                <Pill className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">No active medications registered</p>
                <p className="text-xs text-slate-400 mt-1">
                  Add current daily prescriptions and dosages to assist clinical triage.
                </p>
              </div>
            )}
          </div>

          {/* Modal Medication */}
          {medicationModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
                <h3 className="text-base font-bold text-slate-900">
                  {editingMedication ? 'Edit Medication' : 'Add Medication'}
                </h3>
                <form onSubmit={handleSaveMedication} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Medication Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={medicationForm.medicationName}
                      onChange={(e) =>
                        setMedicationForm({ ...medicationForm, medicationName: e.target.value })
                      }
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                      placeholder="e.g. Atorvastatin, Metformin"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Dosage</label>
                      <input
                        type="text"
                        value={medicationForm.dosage}
                        onChange={(e) =>
                          setMedicationForm({ ...medicationForm, dosage: e.target.value })
                        }
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                        placeholder="e.g. 20 mg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Frequency</label>
                      <input
                        type="text"
                        value={medicationForm.frequency}
                        onChange={(e) =>
                          setMedicationForm({ ...medicationForm, frequency: e.target.value })
                        }
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                        placeholder="e.g. Once daily at bedtime"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                      <select
                        value={medicationForm.status}
                        onChange={(e) =>
                          setMedicationForm({ ...medicationForm, status: e.target.value })
                        }
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white"
                      >
                        {['ACTIVE', 'DISCONTINUED', 'COMPLETED'].map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Prescribing Doctor</label>
                      <input
                        type="text"
                        value={medicationForm.prescribedBy}
                        onChange={(e) =>
                          setMedicationForm({ ...medicationForm, prescribedBy: e.target.value })
                        }
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                        placeholder="e.g. Dr. Priya Sharma"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Notes</label>
                    <textarea
                      rows={2}
                      value={medicationForm.notes}
                      onChange={(e) =>
                        setMedicationForm({ ...medicationForm, notes: e.target.value })
                      }
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                      placeholder="Special instructions or side-effects"
                    />
                  </div>
                  <div className="flex justify-end space-x-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setMedicationModalOpen(false)}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="text-xs">
                      Save Medication
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: MEDICAL HISTORY */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Medical & Surgical History</h2>
              <p className="text-xs text-slate-500">
                Log past surgeries, hospitalizations, clinical procedures, and major illnesses.
              </p>
            </div>
            <Button
              onClick={() => {
                setEditingHistory(null);
                setHistoryForm({
                  category: 'SURGERY',
                  title: '',
                  eventDate: '',
                  approximateYear: '',
                  facility: '',
                  source: 'PATIENT_REPORTED',
                  notes: '',
                });
                setHistoryModalOpen(true);
              }}
              className="text-xs flex items-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add History Entry</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {historyList.map((h) => (
              <div
                key={h._id}
                className="p-5 rounded-2xl border border-slate-200/80 bg-white shadow-xs relative space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{h.title}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        {h.category}
                      </span>
                      {h.approximateYear && (
                        <span className="text-[10px] text-slate-500">Year: {h.approximateYear}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => {
                        setEditingHistory(h);
                        setHistoryForm({
                          category: h.category,
                          title: h.title,
                          eventDate: h.eventDate ? h.eventDate.substring(0, 10) : '',
                          approximateYear: h.approximateYear || '',
                          facility: h.facility || '',
                          source: h.source,
                          notes: h.notes || '',
                        });
                        setHistoryModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteHistory(h._id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {h.facility && <p className="text-xs text-slate-600">Facility: {h.facility}</p>}
                {h.notes && <p className="text-xs text-slate-500 italic">{h.notes}</p>}
              </div>
            ))}

            {historyList.length === 0 && (
              <div className="md:col-span-2 text-center p-8 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">No medical history recorded</p>
                <p className="text-xs text-slate-400 mt-1">
                  Add prior surgeries or hospital admissions to inform clinical decisions.
                </p>
              </div>
            )}
          </div>

          {/* Modal History */}
          {historyModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
                <h3 className="text-base font-bold text-slate-900">
                  {editingHistory ? 'Edit History Record' : 'Add History Record'}
                </h3>
                <form onSubmit={handleSaveHistory} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Procedure / Event Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={historyForm.title}
                      onChange={(e) =>
                        setHistoryForm({ ...historyForm, title: e.target.value })
                      }
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                      placeholder="e.g. Laparoscopic Appendectomy"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                      <select
                        value={historyForm.category}
                        onChange={(e) =>
                          setHistoryForm({ ...historyForm, category: e.target.value })
                        }
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white"
                      >
                        {['SURGERY', 'HOSPITALIZATION', 'PROCEDURE', 'PAST_ILLNESS', 'OTHER'].map(
                          (c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Approx Year</label>
                      <input
                        type="number"
                        min="1940"
                        max="2030"
                        value={historyForm.approximateYear}
                        onChange={(e) =>
                          setHistoryForm({ ...historyForm, approximateYear: e.target.value })
                        }
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                        placeholder="e.g. 2019"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Hospital / Facility</label>
                    <input
                      type="text"
                      value={historyForm.facility}
                      onChange={(e) =>
                        setHistoryForm({ ...historyForm, facility: e.target.value })
                      }
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                      placeholder="e.g. St. Jude General Hospital"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Clinical Notes</label>
                    <textarea
                      rows={2}
                      value={historyForm.notes}
                      onChange={(e) =>
                        setHistoryForm({ ...historyForm, notes: e.target.value })
                      }
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                      placeholder="e.g. Uncomplicated recovery"
                    />
                  </div>
                  <div className="flex justify-end space-x-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setHistoryModalOpen(false)}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="text-xs">
                      Save History
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: PRIVACY & PURPOSE-BASED CONSENTS */}
      {/* ========================================================================= */}
      {activeTab === 'consents' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center space-x-2.5 pb-4 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Purpose-Based Data Sharing Consents</h2>
                <p className="text-xs text-slate-500">
                  Granular controls governed under healthcare privacy principles. Revoke or grant at any time.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {[
                {
                  purpose: 'EMERGENCY_COORDINATION',
                  title: 'Emergency Medical Coordination & Triage',
                  desc: 'Permits sharing minimum-necessary health snapshot (blood group, severe allergies, active medications) strictly with confirmed destination emergency hospitals and attending clinicians.',
                  isCritical: true,
                },
                {
                  purpose: 'REGULAR_HEALTHCARE_SHARING',
                  title: 'Routine Healthcare & Consultations',
                  desc: 'Allows verified doctors at appointment clinics to review clinical history and chronic conditions before consultations.',
                  isCritical: false,
                },
                {
                  purpose: 'MEDICAL_DOCUMENT_SHARING',
                  title: 'Diagnostic Reports & Discharge Summaries',
                  desc: 'Enables sharing attached laboratory reports and imaging documents with authorized providers.',
                  isCritical: false,
                },
                {
                  purpose: 'EMERGENCY_CONTACT_NOTIFICATION',
                  title: 'Emergency Contact Dispatch Alerts',
                  desc: 'Sends automated SMS / notifications to your primary emergency contact when an emergency transit is confirmed.',
                  isCritical: false,
                },
              ].map((item) => {
                const consentRec = consents.find((c) => c.purpose === item.purpose);
                const isGranted = consentRec?.status === 'GRANTED';

                return (
                  <div
                    key={item.purpose}
                    className="p-5 rounded-2xl border border-slate-200/80 bg-white hover:border-slate-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 max-w-2xl">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-slate-900">{item.title}</span>
                        {item.isCritical && (
                          <span className="text-[10px] font-black bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                            RECOMMENDED
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isGranted
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {isGranted ? 'ACTIVE CONSENT' : 'NOT GRANTED'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{item.desc}</p>
                      {consentRec && (
                        <p className="text-[10px] text-slate-400 font-mono">
                          Policy v{consentRec.policyVersion || '1.0'} • Updated:{' '}
                          {new Date(consentRec.updatedAt || consentRec.createdAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 flex items-center space-x-3">
                      <Button
                        type="button"
                        variant={isGranted ? 'destructive' : 'default'}
                        size="sm"
                        onClick={() => handleToggleConsent(item.purpose, consentRec?.status)}
                        className="text-xs"
                      >
                        {isGranted ? 'Revoke Consent' : 'Grant Consent'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: EMERGENCY SUMMARY PREVIEW CARD */}
      {/* ========================================================================= */}
      {activeTab === 'preflight' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-slate-900 to-blue-950 text-white rounded-2xl p-6 sm:p-8 shadow-lg space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center font-black">
                  <Heart className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Emergency Pre-Flight Medical Snapshot</h2>
                  <p className="text-xs text-slate-400">
                    Live preview of minimum-necessary data provided to destination trauma centers
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAllData}
                className="text-xs text-white border-white/20 hover:bg-white/10"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                <span>Refresh Live</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                  Blood Group
                </span>
                <span className="text-2xl font-black text-red-400 font-mono">
                  {preflightSummary?.bloodGroup || demographics.bloodGroup || 'UNKNOWN'}
                </span>
              </div>

              <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                  Primary Contact
                </span>
                <span className="text-sm font-bold text-slate-100 block truncate">
                  {preflightSummary?.primaryEmergencyContact?.name ||
                    emergencyContacts.find((c) => c.isPrimary)?.name ||
                    'None Designated'}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {preflightSummary?.primaryEmergencyContact?.phone ||
                    emergencyContacts.find((c) => c.isPrimary)?.phone ||
                    '—'}
                </span>
              </div>

              <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                  Critical Allergies
                </span>
                <span className="text-2xl font-black text-amber-400 font-mono">
                  {preflightSummary?.allergies?.length ||
                    allergies.filter((a) => a.severity === 'LIFE_THREATENING' || a.severity === 'SEVERE').length}
                </span>
              </div>

              <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                  Active Conditions
                </span>
                <span className="text-2xl font-black text-blue-400 font-mono">
                  {preflightSummary?.conditions?.length ||
                    conditions.filter((c) => c.status === 'ACTIVE' || c.status === 'CHRONIC').length}
                </span>
              </div>
            </div>

            {/* Safety & Protocol Banner */}
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-2 text-xs text-slate-300">
              <div className="flex items-center space-x-2 text-amber-400 font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>Patient Safety Invariant Enforced</span>
              </div>
              <p>
                Incomplete medical profiles or missing records will <strong>never</strong> block or delay emergency dispatch.
                The platform securely transmits the minimum-necessary dataset solely to the confirmed destination healthcare
                facility and attending clinicians. Raw records are strictly shielded from standard platform administrators.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientProfilePage;
