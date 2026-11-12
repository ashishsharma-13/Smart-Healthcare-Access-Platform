import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { OrganizationAddressSection } from '../components/organization/OrganizationAddressSection';
import {
  Plus,
  Activity,
  User,
  Stethoscope,
  Building2,
  Mail,
  Phone,
  Lock,
  ShieldCheck,
  ArrowRight,
  X,
  FileCheck,
  Building,
  CheckCircle,
  Copy,
  Check,
  FileText,
  UploadCloud,
  Award,
  Briefcase,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Toast } from '../components/ui/Toast';
import { Badge } from '../components/ui/Badge';

export const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  // Form Fields
  const [role, setRole] = useState('patient');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [specialization, setSpecialization] = useState('General Physician');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [qualifications, setQualifications] = useState('MBBS, MD');
  const [experienceYears, setExperienceYears] = useState('7');
  const [consultationFee, setConsultationFee] = useState('800');
  const [issuingAuthority, setIssuingAuthority] = useState('National Medical Commission');
  const [registrationJurisdiction, setRegistrationJurisdiction] = useState('Delhi');
  const [registrationYear, setRegistrationYear] = useState('2018');
  const [bio, setBio] = useState('');
  const [regDocName, setRegDocName] = useState('Medical_Registration_Certificate.pdf');
  const [degreeDocName, setDegreeDocName] = useState('Degree_Certificate.pdf');
  const [idDocName, setIdDocName] = useState('Government_ID.pdf');
  const [submissionSuccessModal, setSubmissionSuccessModal] = useState(false);
  const [submittedAppRef, setSubmittedAppRef] = useState('');
  const [copiedRef, setCopiedRef] = useState(false);
  const [orgType, setOrgType] = useState('hospital');
  const [regNumber, setRegNumber] = useState('');
  const [orgLegalName, setOrgLegalName] = useState('');
  const [orgWebsite, setOrgWebsite] = useState('');
  const [orgDescription, setOrgDescription] = useState('');
  const [repName, setRepName] = useState('');
  const [repEmail, setRepEmail] = useState('');
  const [repPhone, setRepPhone] = useState('');
  const [repDesignation, setRepDesignation] = useState('Medical Superintendent');
  const [orgCapabilities, setOrgCapabilities] = useState(['Emergency Services', 'ICU', 'Diagnostic Imaging']);
  const [orgSpecializations, setOrgSpecializations] = useState(['General Medicine', 'Cardiology', 'Emergency Medicine']);
  const [orgRegDocName, setOrgRegDocName] = useState('Hospital_Establishment_License.pdf');
  const [orgPermitDocName, setOrgPermitDocName] = useState('Municipal_Operating_Permit.pdf');
  const [orgAuthDocName, setOrgAuthDocName] = useState('Representative_Authorization.pdf');

  // Organization Address States
  const [registeredAddress, setRegisteredAddress] = useState({
    buildingNumber: '',
    streetName: '',
    locality: '',
    landmark: '',
    city: '',
    district: '',
    state: '',
    pinCode: '',
    country: 'India',
  });

  const [operatingAddress, setOperatingAddress] = useState({
    buildingNumber: '',
    streetName: '',
    locality: '',
    landmark: '',
    city: '',
    district: '',
    state: '',
    pinCode: '',
    country: 'India',
    isSameAsRegistered: true,
  });

  const [isSameAsRegistered, setIsSameAsRegistered] = useState(true);
  const [latitude, setLatitude] = useState(28.6139);
  const [longitude, setLongitude] = useState(77.2090);

  // Step 1 States
  const [error, setError] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);

  // Step 2 Modal States
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpTarget, setOtpTarget] = useState('');
  const [otpType, setOtpType] = useState('email');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [modalError, setModalError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resendingOtp, setResendingOtp] = useState(false);

  // Step 1: Validate & Send OTP -> Open Modal
  const handleContinueToVerification = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const cleanPhone = phone.trim();

    if (!trimmedName) {
      setError(role === 'organization' ? 'Please enter hospital / facility name.' : 'Please enter your full name.');
      return;
    }

    if (!trimmedEmail && !cleanPhone) {
      setError('Please provide at least one contact method (email or phone).');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (role === 'doctor' && !licenseNumber.trim()) {
      setError('Please enter your NMC doctor license / registration number.');
      return;
    }

    if (role === 'organization') {
      if (!regNumber.trim()) {
        setError('Please enter your facility registration number.');
        return;
      }
      if (
        !registeredAddress.buildingNumber?.trim() ||
        !registeredAddress.streetName?.trim() ||
        !registeredAddress.locality?.trim() ||
        !registeredAddress.city?.trim() ||
        !registeredAddress.state?.trim()
      ) {
        setError('Please complete the required Registered Address fields (Building #, Street Name, Locality, City, State).');
        return;
      }
      if (!registeredAddress.pinCode || !/^\d{6}$/.test(registeredAddress.pinCode.trim())) {
        setError('Registered Address PIN Code must be exactly 6 digits.');
        return;
      }

      if (!isSameAsRegistered) {
        if (
          !operatingAddress.buildingNumber?.trim() ||
          !operatingAddress.streetName?.trim() ||
          !operatingAddress.locality?.trim() ||
          !operatingAddress.city?.trim() ||
          !operatingAddress.state?.trim()
        ) {
          setError('Please complete the required Operating Address fields (Building #, Street Name, Locality, City, State).');
          return;
        }
        if (!operatingAddress.pinCode || !/^\d{6}$/.test(operatingAddress.pinCode.trim())) {
          setError('Operating Address PIN Code must be exactly 6 digits.');
          return;
        }
      }

      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        setError('Physical operating GPS coordinates must have Latitude between -90 and 90, and Longitude between -180 and 180.');
        return;
      }
    }

    const targetType = trimmedEmail ? 'email' : 'phone';
    const targetVal = targetType === 'email' ? trimmedEmail : cleanPhone;

    setOtpType(targetType);
    setOtpTarget(targetVal);
    setSendingOtp(true);

    try {
      const res = await api.post('/auth/send-otp', { target: targetVal, type: targetType });
      setDevOtp(res.data.devOtp || '');
      setOtp('');
      setModalError('');
      setOtpModalOpen(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send verification code.');
    } finally {
      setSendingOtp(false);
    }
  };

  // Step 2: Verify OTP -> Register User -> Redirect
  const handleVerifyAndRegister = async (e) => {
    if (e) e.preventDefault();

    if (otp.length !== 6) {
      setModalError('Please enter the 6-digit verification code.');
      return;
    }

    setModalError('');
    setVerifying(true);

    try {
      // 1. Verify OTP
      await api.post('/auth/verify-otp', { target: otpTarget, otp });

      // 2. Register Account
      const payload = {
        name: name.trim(),
        password,
        role,
      };
      if (email.trim()) payload.email = email.trim();
      if (phone.trim()) payload.phone = phone.trim();

      if (role === 'doctor') {
        const docList = [];
        if (regDocName) {
          docList.push({
            documentType: 'medical_registration',
            documentName: regDocName,
            storageReference: 'https://storage.shap.health/docs/' + regDocName,
            fileSize: 1048576,
            mimeType: 'application/pdf',
          });
        }
        if (degreeDocName) {
          docList.push({
            documentType: 'qualification_degree',
            documentName: degreeDocName,
            storageReference: 'https://storage.shap.health/docs/' + degreeDocName,
            fileSize: 2097152,
            mimeType: 'application/pdf',
          });
        }
        if (idDocName) {
          docList.push({
            documentType: 'identity_proof',
            documentName: idDocName,
            storageReference: 'https://storage.shap.health/docs/' + idDocName,
            fileSize: 1048576,
            mimeType: 'application/pdf',
          });
        }

        payload.doctorDetails = {
          specialization,
          licenseNumber: licenseNumber.trim(),
          issuingAuthority: issuingAuthority.trim(),
          registrationJurisdiction: registrationJurisdiction.trim(),
          registrationYear: Number(registrationYear) || new Date().getFullYear(),
          qualifications: qualifications ? qualifications.split(',').map((q) => q.trim()).filter(Boolean) : ['MBBS'],
          experienceYears: Number(experienceYears) || 5,
          consultationFee: Number(consultationFee) || 800,
          bio: bio.trim(),
          documents: docList,
        };
      } else if (role === 'organization') {
        const finalOperatingAddress = isSameAsRegistered
          ? {
              buildingNumber: registeredAddress.buildingNumber?.trim() || '',
              streetName: registeredAddress.streetName?.trim() || '',
              locality: registeredAddress.locality?.trim() || '',
              landmark: registeredAddress.landmark?.trim() || '',
              city: registeredAddress.city?.trim() || '',
              district: registeredAddress.district?.trim() || '',
              state: registeredAddress.state?.trim() || '',
              pinCode: registeredAddress.pinCode?.trim() || '',
              country: registeredAddress.country || 'India',
              isSameAsRegistered: true,
            }
          : {
              buildingNumber: operatingAddress.buildingNumber?.trim() || '',
              streetName: operatingAddress.streetName?.trim() || '',
              locality: operatingAddress.locality?.trim() || '',
              landmark: operatingAddress.landmark?.trim() || '',
              city: operatingAddress.city?.trim() || '',
              district: operatingAddress.district?.trim() || '',
              state: operatingAddress.state?.trim() || '',
              pinCode: operatingAddress.pinCode?.trim() || '',
              country: operatingAddress.country || 'India',
              isSameAsRegistered: false,
            };

        const orgDocs = [];
        if (orgRegDocName) {
          orgDocs.push({
            documentType: 'establishment_registration',
            documentName: orgRegDocName,
            storageReference: 'https://storage.shap.health/docs/' + orgRegDocName,
            fileSize: 2097152,
            mimeType: 'application/pdf',
          });
        }
        if (orgPermitDocName) {
          orgDocs.push({
            documentType: 'operating_license',
            documentName: orgPermitDocName,
            storageReference: 'https://storage.shap.health/docs/' + orgPermitDocName,
            fileSize: 1048576,
            mimeType: 'application/pdf',
          });
        }
        if (orgAuthDocName) {
          orgDocs.push({
            documentType: 'representative_authorization',
            documentName: orgAuthDocName,
            storageReference: 'https://storage.shap.health/docs/' + orgAuthDocName,
            fileSize: 1048576,
            mimeType: 'application/pdf',
          });
        }

        payload.orgDetails = {
          name: name.trim(),
          legalName: orgLegalName.trim() || name.trim(),
          orgType,
          registrationNumber: regNumber.trim(),
          officialEmail: email.trim(),
          contactNumber: phone.trim(),
          website: orgWebsite.trim(),
          description: orgDescription.trim(),
          representative: {
            name: repName.trim() || name.trim(),
            email: repEmail.trim() || email.trim(),
            phone: repPhone.trim() || phone.trim(),
            designation: repDesignation.trim(),
          },
          healthcareCapabilities: orgCapabilities,
          specializations: orgSpecializations,
          documents: orgDocs,
          registeredAddress: {
            buildingNumber: registeredAddress.buildingNumber?.trim() || '',
            streetName: registeredAddress.streetName?.trim() || '',
            locality: registeredAddress.locality?.trim() || '',
            landmark: registeredAddress.landmark?.trim() || '',
            city: registeredAddress.city?.trim() || '',
            district: registeredAddress.district?.trim() || '',
            state: registeredAddress.state?.trim() || '',
            pinCode: registeredAddress.pinCode?.trim() || '',
            country: registeredAddress.country || 'India',
          },
          operatingAddress: finalOperatingAddress,
          location: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
          },
          coordinates: [parseFloat(longitude), parseFloat(latitude)],
        };
      }

      const registeredUser = await register(payload);

      // 3. Close modal & show application submission reference
      setOtpModalOpen(false);
      if (role === 'doctor') {
        const appRef = registeredUser?.profile?.applicationReference || 'DOC-APP-' + Math.floor(10000 + Math.random() * 90000);
        setSubmittedAppRef(appRef);
        setSubmissionSuccessModal(true);
      } else if (role === 'organization') {
        const appRef = registeredUser?.profile?.applicationReference || 'ORG-APP-' + Math.floor(10000 + Math.random() * 90000);
        setSubmittedAppRef(appRef);
        setSubmissionSuccessModal(true);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setModalError(err.response?.data?.message || err.message || 'Verification or registration failed.');
    } finally {
      setVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    setModalError('');
    setResendingOtp(true);
    try {
      const res = await api.post('/auth/send-otp', { target: otpTarget, type: otpType });
      setDevOtp(res.data.devOtp || '');
      setOtp('');
    } catch (err) {
      setModalError(err.response?.data?.message || 'Could not resend verification code.');
    } finally {
      setResendingOtp(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className={`${role === 'organization' ? 'max-w-3xl' : 'max-w-xl'} w-full bg-white border border-slate-200 p-6 sm:p-8 rounded-xl shadow-card space-y-6 transition-all duration-300`}>
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-[#0B4F9C] text-white flex items-center justify-center mx-auto shadow-xs">
            <Plus className="w-6 h-6 stroke-[3]" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Create your SHAP Account
          </h2>
          <p className="text-xs text-slate-500">
            Select your clinical role to initiate credentialed onboarding
          </p>
        </div>

        {/* 3-Tab Segmented Role Selector */}
        <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-lg border border-slate-200/60">
          <button
            type="button"
            onClick={() => setRole('patient')}
            className={`py-2 px-3 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
              role === 'patient'
                ? 'bg-white text-brand-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Patient</span>
          </button>

          <button
            type="button"
            onClick={() => setRole('doctor')}
            className={`py-2 px-3 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
              role === 'doctor'
                ? 'bg-white text-brand-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Practitioner</span>
          </button>

          <button
            type="button"
            onClick={() => setRole('organization')}
            className={`py-2 px-3 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
              role === 'organization'
                ? 'bg-white text-brand-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Facility</span>
          </button>
        </div>

        {/* Error notification */}
        {error && (
          <Toast type="error" message={error} onClose={() => setError('')} />
        )}

        {/* Step 1 Form */}
        <form onSubmit={handleContinueToVerification} className="space-y-4">
          <div>
            <label htmlFor="reg-name" className="block text-xs font-medium text-slate-700 mb-1">
              {role === 'organization' ? 'Health Facility / Hospital Name' : 'Full Name'}
            </label>
            <div className="relative">
              {role === 'organization' ? (
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              ) : (
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              )}
              <input
                id="reg-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  role === 'doctor'
                    ? 'Dr. Rajesh Sharma'
                    : role === 'organization'
                    ? 'Apex Metro Trauma & Heart Hospital'
                    : 'Sunita Verma'
                }
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="reg-email" className="block text-xs font-medium text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="reg-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-phone" className="block text-xs font-medium text-slate-700 mb-1">
                Phone Number (India +91)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="reg-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white font-mono"
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="reg-pwd" className="block text-xs font-medium text-slate-700 mb-1">
              Password (min. 6 characters)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="reg-pwd"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white font-mono"
              />
            </div>
          </div>

          {/* Doctor Professional & Medical Council Registration Fields */}
          {role === 'doctor' && (
            <div className="space-y-4 pt-3 border-t border-slate-200">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <Stethoscope className="w-4 h-4 text-brand-600" />
                <span>Professional Credentials</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="reg-spec" className="block text-xs font-medium text-slate-700 mb-1">
                    Primary Speciality *
                  </label>
                  <select
                    id="reg-spec"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white"
                  >
                    <option value="Cardiology">Cardiology</option>
                    <option value="Emergency Medicine">Emergency Medicine</option>
                    <option value="Neurology">Neurology</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="Orthopedics">Orthopedics</option>
                    <option value="General Physician">General Physician</option>
                    <option value="Dermatology">Dermatology</option>
                    <option value="Psychiatry">Psychiatry</option>
                    <option value="Oncology">Oncology</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="reg-qual" className="block text-xs font-medium text-slate-700 mb-1">
                    Qualifications & Degrees *
                  </label>
                  <input
                    id="reg-qual"
                    type="text"
                    required
                    value={qualifications}
                    onChange={(e) => setQualifications(e.target.value)}
                    placeholder="e.g. MBBS, MD (General Medicine)"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label htmlFor="reg-exp" className="block text-xs font-medium text-slate-700 mb-1">
                    Clinical Experience (Years) *
                  </label>
                  <input
                    id="reg-exp"
                    type="number"
                    min="0"
                    max="60"
                    required
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(e.target.value)}
                    placeholder="e.g. 8"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label htmlFor="reg-fee" className="block text-xs font-medium text-slate-700 mb-1">
                    Standard Consultation Fee (₹) *
                  </label>
                  <input
                    id="reg-fee"
                    type="number"
                    min="0"
                    step="50"
                    required
                    value={consultationFee}
                    onChange={(e) => setConsultationFee(e.target.value)}
                    placeholder="e.g. 800"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white"
                  />
                </div>
              </div>

              {/* Medical Council Registration Information */}
              <div className="pt-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  <Award className="w-4 h-4 text-brand-600" />
                  <span>Medical Council Registration</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="reg-license" className="block text-xs font-medium text-slate-700 mb-1">
                      NMC / State License Number *
                    </label>
                    <input
                      id="reg-license"
                      type="text"
                      required
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      placeholder="e.g. NMC-2018-94821"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white font-mono"
                    />
                  </div>

                  <div>
                    <label htmlFor="reg-auth" className="block text-xs font-medium text-slate-700 mb-1">
                      Issuing Medical Authority *
                    </label>
                    <input
                      id="reg-auth"
                      type="text"
                      required
                      value={issuingAuthority}
                      onChange={(e) => setIssuingAuthority(e.target.value)}
                      placeholder="e.g. National Medical Commission"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="reg-jur" className="block text-xs font-medium text-slate-700 mb-1">
                      Registration Jurisdiction / State *
                    </label>
                    <input
                      id="reg-jur"
                      type="text"
                      required
                      value={registrationJurisdiction}
                      onChange={(e) => setRegistrationJurisdiction(e.target.value)}
                      placeholder="e.g. Delhi, Maharashtra, Karnataka"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="reg-year" className="block text-xs font-medium text-slate-700 mb-1">
                      Registration Year *
                    </label>
                    <input
                      id="reg-year"
                      type="number"
                      min="1960"
                      max={new Date().getFullYear()}
                      required
                      value={registrationYear}
                      onChange={(e) => setRegistrationYear(e.target.value)}
                      placeholder="e.g. 2018"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Professional Biography */}
              <div>
                <label htmlFor="reg-bio" className="block text-xs font-medium text-slate-700 mb-1">
                  Professional Biography & Clinical Focus
                </label>
                <textarea
                  id="reg-bio"
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Summary of clinical experience, affiliations, or specialized procedures..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white resize-none"
                />
              </div>

              {/* Document Submission Section */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                    <FileCheck className="w-4 h-4 text-brand-600" />
                    <span>Required Verification Documents (PDF / Image)</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">Auto-scanned & encrypted</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* Doc 1: Medical Registration */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 hover:bg-slate-100/60 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-800">Medical Registration</span>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <p className="text-[10px] text-slate-500 truncate">{regDocName}</p>
                    <label className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-600 hover:text-brand-700 cursor-pointer">
                      <UploadCloud className="w-3 h-3" />
                      <span>{regDocName ? 'Change File' : 'Upload'}</span>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) setRegDocName(e.target.files[0].name);
                        }}
                      />
                    </label>
                  </div>

                  {/* Doc 2: Degree Certificate */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 hover:bg-slate-100/60 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-800">Degree Certificate</span>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <p className="text-[10px] text-slate-500 truncate">{degreeDocName}</p>
                    <label className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-600 hover:text-brand-700 cursor-pointer">
                      <UploadCloud className="w-3 h-3" />
                      <span>{degreeDocName ? 'Change File' : 'Upload'}</span>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) setDegreeDocName(e.target.files[0].name);
                        }}
                      />
                    </label>
                  </div>

                  {/* Doc 3: Government ID */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 hover:bg-slate-100/60 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-800">Govt ID / Card</span>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <p className="text-[10px] text-slate-500 truncate">{idDocName}</p>
                    <label className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-600 hover:text-brand-700 cursor-pointer">
                      <UploadCloud className="w-3 h-3" />
                      <span>{idDocName ? 'Change File' : 'Upload'}</span>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) setIdDocName(e.target.files[0].name);
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Organization Registration & Address Section */}
          {role === 'organization' && (
            <div className="space-y-4 pt-3 border-t border-slate-200">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <Building className="w-4 h-4 text-brand-600" />
                <span>Health Establishment Legal Details</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="reg-orgtype" className="block text-xs font-medium text-slate-700 mb-1">
                    Facility Classification *
                  </label>
                  <select
                    id="reg-orgtype"
                    value={orgType}
                    onChange={(e) => setOrgType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white"
                  >
                    <option value="hospital">Multi-Speciality Hospital</option>
                    <option value="specialty_center">Specialty Center</option>
                    <option value="clinic">Outpatient Day Clinic</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="reg-orgreg" className="block text-xs font-medium text-slate-700 mb-1">
                    Health Facility License # *
                  </label>
                  <input
                    id="reg-orgreg"
                    type="text"
                    required
                    value={regNumber}
                    onChange={(e) => setRegNumber(e.target.value)}
                    placeholder="e.g. HOSP-DEL-2024-001"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white font-mono"
                  />
                </div>

                <div>
                  <label htmlFor="reg-orglegal" className="block text-xs font-medium text-slate-700 mb-1">
                    Registered Legal Corporate Name
                  </label>
                  <input
                    id="reg-orglegal"
                    type="text"
                    value={orgLegalName}
                    onChange={(e) => setOrgLegalName(e.target.value)}
                    placeholder="e.g. Metro Healthcare Enterprises Pvt Ltd"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label htmlFor="reg-orgweb" className="block text-xs font-medium text-slate-700 mb-1">
                    Official Website URL
                  </label>
                  <input
                    id="reg-orgweb"
                    type="url"
                    value={orgWebsite}
                    onChange={(e) => setOrgWebsite(e.target.value)}
                    placeholder="https://hospital-domain.org"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white font-mono"
                  />
                </div>
              </div>

              {/* Authorized Representative Section */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  <User className="w-4 h-4 text-brand-600" />
                  <span>Authorized Representative (Medical Superintendent / Director)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="reg-repname" className="block text-xs font-medium text-slate-700 mb-1">
                      Representative Full Name
                    </label>
                    <input
                      id="reg-repname"
                      type="text"
                      value={repName}
                      onChange={(e) => setRepName(e.target.value)}
                      placeholder="e.g. Dr. Rajesh Sharma"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="reg-repdesig" className="block text-xs font-medium text-slate-700 mb-1">
                      Designation / Role
                    </label>
                    <input
                      id="reg-repdesig"
                      type="text"
                      value={repDesignation}
                      onChange={(e) => setRepDesignation(e.target.value)}
                      placeholder="e.g. Medical Superintendent"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Comprehensive Organization Address Section with Registered + Operating + GPS Map */}
              <OrganizationAddressSection
                registeredAddress={registeredAddress}
                setRegisteredAddress={setRegisteredAddress}
                operatingAddress={operatingAddress}
                setOperatingAddress={setOperatingAddress}
                isSameAsRegistered={isSameAsRegistered}
                setIsSameAsRegistered={setIsSameAsRegistered}
                latitude={latitude}
                setLatitude={setLatitude}
                longitude={longitude}
                setLongitude={setLongitude}
              />

              {/* Healthcare Capabilities & Equipment */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  <Activity className="w-4 h-4 text-brand-600" />
                  <span>Healthcare Infrastructure & Capabilities</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    'Emergency Services',
                    'ICU / Critical Care',
                    'NICU / PICU',
                    'Operation Theatres',
                    'Diagnostic Imaging',
                    '24/7 Ambulance Fleet',
                  ].map((cap, idx) => {
                    const isSelected = orgCapabilities.includes(cap);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setOrgCapabilities((prev) =>
                            isSelected ? prev.filter((c) => c !== cap) : [...prev, cap]
                          );
                        }}
                        className={`p-2.5 rounded-lg border text-xs font-medium text-left flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'bg-brand-50 border-brand-300 text-brand-900 font-semibold'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <span className="text-[11px]">{cap}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-brand-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Legal Establishment Verification Documents */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                    <FileCheck className="w-4 h-4 text-brand-600" />
                    <span>Establishment Verification Documents</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">Encrypted Storage</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* Doc 1: Establishment License */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 hover:bg-slate-100/60 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-800">Establishment License</span>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <p className="text-[10px] text-slate-500 truncate">{orgRegDocName}</p>
                    <label className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-600 hover:text-brand-700 cursor-pointer">
                      <UploadCloud className="w-3 h-3" />
                      <span>{orgRegDocName ? 'Change File' : 'Upload'}</span>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) setOrgRegDocName(e.target.files[0].name);
                        }}
                      />
                    </label>
                  </div>

                  {/* Doc 2: Operating Permit */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 hover:bg-slate-100/60 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-800">Operating Permit</span>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <p className="text-[10px] text-slate-500 truncate">{orgPermitDocName}</p>
                    <label className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-600 hover:text-brand-700 cursor-pointer">
                      <UploadCloud className="w-3 h-3" />
                      <span>{orgPermitDocName ? 'Change File' : 'Upload'}</span>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) setOrgPermitDocName(e.target.files[0].name);
                        }}
                      />
                    </label>
                  </div>

                  {/* Doc 3: Authorization Letter */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 hover:bg-slate-100/60 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-800">Rep Authorization</span>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <p className="text-[10px] text-slate-500 truncate">{orgAuthDocName}</p>
                    <label className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-600 hover:text-brand-700 cursor-pointer">
                      <UploadCloud className="w-3 h-3" />
                      <span>{orgAuthDocName ? 'Change File' : 'Upload'}</span>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) setOrgAuthDocName(e.target.files[0].name);
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={sendingOtp}
            className="w-full"
            icon={ArrowRight}
            iconPosition="right"
          >
            Continue to Verification (OTP)
          </Button>
        </form>

        {/* Footer info */}
        <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
          Already registered on SHAP?{' '}
          <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
            Sign In Instead
          </Link>
        </div>

      </div>

      {/* Step 2: 2-Step OTP Modal */}
      {otpModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
        >
          <div className="bg-white rounded-xl max-w-sm w-full p-6 space-y-4 shadow-modal border border-slate-200 relative">
            <button
              onClick={() => setOtpModalOpen(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center space-y-1">
              <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-2 border border-brand-200">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Verify Your Contact
              </h3>
              <p className="text-xs text-slate-500">
                We sent a 6-digit code to <br />
                <span className="font-semibold text-slate-900">{otpTarget}</span>
              </p>
            </div>

            {devOtp && (
              <div className="p-2 bg-amber-50 border border-amber-200 text-amber-800 rounded text-center text-xs font-mono">
                Evaluation Test Code: <span className="font-bold tracking-widest">{devOtp}</span>
              </div>
            )}

            {modalError && (
              <Toast type="error" message={modalError} onClose={() => setModalError('')} />
            )}

            <form onSubmit={handleVerifyAndRegister} className="space-y-4">
              <div>
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full py-2.5 text-center font-mono text-xl tracking-widest bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={verifying}
                className="w-full"
              >
                Verify & Create Account
              </Button>
            </form>

            <div className="text-center text-xs text-slate-500 pt-1">
              Didn't receive the code?{' '}
              <button
                type="button"
                disabled={resendingOtp}
                onClick={handleResendOtp}
                className="font-semibold text-brand-600 hover:text-brand-700 disabled:opacity-50"
              >
                {resendingOtp ? 'Sending...' : 'Resend Code'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Doctor Submission Success & Application Reference Modal */}
      {submissionSuccessModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        >
          <div className="bg-white rounded-xl max-w-md w-full p-6 sm:p-7 space-y-5 shadow-modal border border-slate-200">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle className="w-6 h-6 stroke-[2.5]" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {role === 'organization' ? 'Accreditation Dossier Submitted' : 'Application Successfully Submitted'}
              </h3>
              <p className="text-xs text-slate-500">
                {role === 'organization'
                  ? 'Your healthcare establishment registration has entered the administrative accreditation queue.'
                  : 'Your medical registration application has entered the administrative credentialing queue.'}
              </p>
            </div>

            {/* Application Reference ID Box */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Application Reference #
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  PENDING_VERIFICATION
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="font-mono text-base font-bold text-slate-900 tracking-wider">
                  {submittedAppRef}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (submittedAppRef) {
                      navigator.clipboard?.writeText(submittedAppRef);
                      setCopiedRef(true);
                      setTimeout(() => setCopiedRef(false), 2000);
                    }
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 rounded border border-brand-200 transition-colors"
                >
                  {copiedRef ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy ID</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* SLA and Next Steps */}
            <div className="space-y-2 text-xs text-slate-600 bg-blue-50/50 p-3.5 rounded-lg border border-blue-100">
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-[#0B4F9C] shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  {role === 'organization'
                    ? 'Clinical establishment licenses and operating permits are validated against municipal health authorities within 24 to 48 hours.'
                    : 'Medical council registrations and degree certificates are verified against national registry standards within 24 to 48 hours.'}
                </p>
              </div>
              <div className="flex items-start gap-2">
                <FileCheck className="w-4 h-4 text-[#0B4F9C] shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  {role === 'organization'
                    ? 'Upon accreditation, your unique Organization Code will be activated for emergency dispatch, trauma coordination, and verified physician affiliations.'
                    : 'Upon approval, your unique Doctor ID and cryptographically signed QR credential will be activated for patient booking and facility presence.'}
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="primary"
              size="md"
              className="w-full"
              onClick={() => {
                setSubmissionSuccessModal(false);
                navigate('/login?status=pending_verification');
              }}
            >
              Proceed to Sign In
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterPage;
