import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Building2,
  ShieldCheck,
  MapPin,
  Phone,
  Mail,
  Globe,
  FileText,
  Save,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Award,
  Stethoscope,
  Users,
  QrCode,
  Lock,
  ExternalLink,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Toast } from '../../components/ui/Toast';
import { TableSkeleton } from '../../components/ui/Skeleton';

export const OrganizationProfilePage = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ type: '', message: '' });

  // Form Fields
  const [name, setName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [orgType, setOrgType] = useState('hospital');
  const [website, setWebsite] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [medicalDirectorName, setMedicalDirectorName] = useState('');
  const [medicalDirectorRegNumber, setMedicalDirectorRegNumber] = useState('');
  const [authorizedSignatoryName, setAuthorizedSignatoryName] = useState('');
  const [authorizedSignatoryDesignation, setAuthorizedSignatoryDesignation] = useState('');

  // Registered Address Fields
  const [registeredStreet, setRegisteredStreet] = useState('');
  const [registeredLocality, setRegisteredLocality] = useState('');
  const [registeredCity, setRegisteredCity] = useState('');
  const [registeredState, setRegisteredState] = useState('');
  const [registeredPinCode, setRegisteredPinCode] = useState('');

  // Operating Address Fields
  const [isSameAsRegistered, setIsSameAsRegistered] = useState(true);
  const [operatingStreet, setOperatingStreet] = useState('');
  const [operatingLocality, setOperatingLocality] = useState('');
  const [operatingCity, setOperatingCity] = useState('');
  const [operatingState, setOperatingState] = useState('');
  const [operatingPinCode, setOperatingPinCode] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/organizations/portal/me');
      if (res.data?.success) {
        const org = res.data.data;
        setProfile(org);

        setName(org.name || '');
        setLegalName(org.legalName || org.name || '');
        setOrgType(org.orgType || 'hospital');
        setWebsite(org.website || '');
        setContactEmail(org.contactEmail || org.officialEmail || org.userId?.email || '');
        setContactPhone(org.contactPhone || org.officialPhone || org.userId?.phone || '');
        setMedicalDirectorName(org.medicalDirectorName || '');
        setMedicalDirectorRegNumber(org.medicalDirectorRegNumber || '');
        setAuthorizedSignatoryName(org.authorizedSignatoryName || '');
        setAuthorizedSignatoryDesignation(org.authorizedSignatoryDesignation || '');

        // Address
        const reg = org.registeredAddress || org.address || {};
        setRegisteredStreet(reg.streetName || reg.street || '');
        setRegisteredLocality(reg.locality || '');
        setRegisteredCity(reg.city || '');
        setRegisteredState(reg.state || '');
        setRegisteredPinCode(reg.pinCode || reg.postalCode || '');

        const op = org.operatingAddress || {};
        setIsSameAsRegistered(op.isSameAsRegistered ?? true);
        setOperatingStreet(op.streetName || '');
        setOperatingLocality(op.locality || '');
        setOperatingCity(op.city || '');
        setOperatingState(op.state || '');
        setOperatingPinCode(op.pinCode || '');

        if (org.location?.coordinates && org.location.coordinates.length === 2) {
          setLongitude(org.location.coordinates[0]);
          setLatitude(org.location.coordinates[1]);
        }
      }
    } catch (err) {
      console.error('Error fetching organization profile', err);
      setToast({ type: 'error', message: 'Could not load organization profile details.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setToast({ type: '', message: '' });

      // 1. Update basic profile
      const updateData = {
        name,
        legalName,
        orgType,
        website,
        contactEmail,
        contactPhone,
        medicalDirectorName,
        medicalDirectorRegNumber,
        authorizedSignatoryName,
        authorizedSignatoryDesignation,
      };

      await api.put('/organizations/me', updateData).catch(async () => {
        // Fallback to update portal
        await api.put('/organizations/portal/profile', updateData);
      });

      // 2. Update address & coordinates if provided
      const addressPayload = {
        registeredAddress: {
          streetName: registeredStreet,
          locality: registeredLocality,
          city: registeredCity,
          state: registeredState,
          pinCode: registeredPinCode,
        },
        operatingAddress: {
          isSameAsRegistered,
          streetName: isSameAsRegistered ? registeredStreet : operatingStreet,
          locality: isSameAsRegistered ? registeredLocality : operatingLocality,
          city: isSameAsRegistered ? registeredCity : operatingCity,
          state: isSameAsRegistered ? registeredState : operatingState,
          pinCode: isSameAsRegistered ? registeredPinCode : operatingPinCode,
        },
      };

      if (latitude && longitude) {
        addressPayload.latitude = parseFloat(latitude);
        addressPayload.longitude = parseFloat(longitude);
      }

      await api.put('/organizations/portal/address', addressPayload).catch(() => {});

      setToast({ type: 'success', message: 'Organization profile updated successfully!' });
      await fetchProfile();
    } catch (err) {
      console.error('Error updating organization profile', err);
      setToast({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to update organization profile.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 pb-12">
        <TableSkeleton rows={5} cols={3} />
      </div>
    );
  }

  const isVerified = profile?.verificationStatus === 'verified' || profile?.verificationStatus === 'APPROVED';

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Toast Alert */}
      {toast.message && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast({ type: '', message: '' })}
        />
      )}

      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={isVerified ? 'presence' : 'warning'} size="xs" dot>
              {isVerified ? 'VERIFIED HEALTHCARE FACILITY' : 'ACCREDITATION IN PROGRESS'}
            </Badge>
            {profile?.uniqueOrganizationCode && (
              <span className="text-[11px] font-mono font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                {profile.uniqueOrganizationCode}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Organization Profile & Credential Settings
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your hospital or clinic's official information, operating address, clinical leadership, and accreditation registry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/organization/qr-code">
            <Button variant="outline" size="sm" icon={QrCode}>
              Reception QR Stand
            </Button>
          </Link>
          <Link to="/organization/doctors">
            <Button variant="outline" size="sm" icon={Users}>
              Medical Staff
            </Button>
          </Link>
        </div>
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Section 1: Official Identification & Accreditation Dossier */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Accreditation & Regulatory Identity
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Unique Organization ID
              </span>
              <p className="font-mono font-bold text-slate-900 text-sm">
                {profile?.uniqueOrganizationCode || 'ORG-UNASSIGNED'}
              </p>
              <span className="text-[10px] text-slate-500">Government Health Registry</span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Application Reference
              </span>
              <p className="font-mono font-bold text-slate-900 text-sm">
                {profile?.applicationReference || 'APP-REF-PENDING'}
              </p>
              <span className="text-[10px] text-slate-500">Ministry Compliance Record</span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Medical Establishment License #
              </span>
              <p className="font-mono font-bold text-slate-900 text-sm">
                {profile?.registrationNumber || 'Pending'}
              </p>
              <span className="text-[10px] text-slate-500">State Health Department</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Display Facility Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Apex Metro Trauma & Heart Hospital"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Legal Entity Name *</label>
              <input
                type="text"
                required
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="e.g. Apex Healthcare Limited"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Healthcare Classification</label>
              <select
                value={orgType}
                onChange={(e) => setOrgType(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="hospital">Multispecialty / General Hospital</option>
                <option value="clinic">Outpatient Clinic / Primary Care</option>
                <option value="specialty_center">Specialty Super-Specialty Center</option>
                <option value="fallback_facility">Emergency Surge / Fallback Facility</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Official Website URL</label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://hospital.example.com"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Contact & Clinical Governance Leadership */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Mail className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Contact & Clinical Leadership
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Official Contact Email *</label>
              <input
                type="email"
                required
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="reception@hospital.com"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Emergency & Triage Phone *</label>
              <input
                type="tel"
                required
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Medical Superintendent / Director</label>
              <input
                type="text"
                value={medicalDirectorName}
                onChange={(e) => setMedicalDirectorName(e.target.value)}
                placeholder="Dr. Full Name"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Director Medical Council Reg #</label>
              <input
                type="text"
                value={medicalDirectorRegNumber}
                onChange={(e) => setMedicalDirectorRegNumber(e.target.value)}
                placeholder="e.g. MCI-2004-9876"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Authorized Signatory Name</label>
              <input
                type="text"
                value={authorizedSignatoryName}
                onChange={(e) => setAuthorizedSignatoryName(e.target.value)}
                placeholder="Chief Executive / Officer"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Signatory Clinical Designation</label>
              <input
                type="text"
                value={authorizedSignatoryDesignation}
                onChange={(e) => setAuthorizedSignatoryDesignation(e.target.value)}
                placeholder="e.g. Medical Superintendent"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Registered & Operating Physical Site Addresses */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <MapPin className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Facility Address & Operating Telemetry
            </h2>
          </div>

          {/* Registered Legal Address */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Official Registered Address
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs text-slate-600 font-medium">Street / Building Address *</label>
                <input
                  type="text"
                  required
                  value={registeredStreet}
                  onChange={(e) => setRegisteredStreet(e.target.value)}
                  placeholder="Building No, Street Name, Block"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-600 font-medium">Locality / Area</label>
                <input
                  type="text"
                  value={registeredLocality}
                  onChange={(e) => setRegisteredLocality(e.target.value)}
                  placeholder="Area / Sector"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-600 font-medium">City *</label>
                <input
                  type="text"
                  required
                  value={registeredCity}
                  onChange={(e) => setRegisteredCity(e.target.value)}
                  placeholder="City"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-600 font-medium">State *</label>
                <input
                  type="text"
                  required
                  value={registeredState}
                  onChange={(e) => setRegisteredState(e.target.value)}
                  placeholder="State"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-600 font-medium">PIN Code *</label>
                <input
                  type="text"
                  required
                  value={registeredPinCode}
                  onChange={(e) => setRegisteredPinCode(e.target.value)}
                  placeholder="6-digit PIN code"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Operating Address Checkbox */}
          <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
            <input
              type="checkbox"
              id="same-addr"
              checked={isSameAsRegistered}
              onChange={(e) => setIsSameAsRegistered(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="same-addr" className="text-xs font-bold text-slate-800 cursor-pointer">
              Physical Operating Site (Ambulance Destination) is identical to Registered Address
            </label>
          </div>

          {!isSameAsRegistered && (
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                Operating Site Physical Address
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs text-slate-600 font-medium">Operating Street / Wing</label>
                  <input
                    type="text"
                    value={operatingStreet}
                    onChange={(e) => setOperatingStreet(e.target.value)}
                    placeholder="Operating Building & Street"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-600 font-medium">Locality</label>
                  <input
                    type="text"
                    value={operatingLocality}
                    onChange={(e) => setOperatingLocality(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-600 font-medium">City</label>
                  <input
                    type="text"
                    value={operatingCity}
                    onChange={(e) => setOperatingCity(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-600 font-medium">State</label>
                  <input
                    type="text"
                    value={operatingState}
                    onChange={(e) => setOperatingState(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-600 font-medium">PIN Code</label>
                  <input
                    type="text"
                    value={operatingPinCode}
                    onChange={(e) => setOperatingPinCode(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* GPS Coordinates */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <span className="text-xs font-bold text-slate-800 block">
              Emergency Dispatch GPS Coordinates
            </span>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-mono">Latitude (e.g. 28.6139)</label>
                <input
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="28.6139"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-mono">Longitude (e.g. 77.2090)</label>
                <input
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="77.2090"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Save Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link to="/organization/dashboard">
            <Button variant="outline" size="md">
              Back to Operations Desk
            </Button>
          </Link>

          <Button
            type="submit"
            variant="primary"
            size="md"
            icon={Save}
            loading={saving}
            className="font-bold uppercase tracking-wider"
          >
            {saving ? 'Saving Changes...' : 'Save Organization Profile'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default OrganizationProfilePage;

