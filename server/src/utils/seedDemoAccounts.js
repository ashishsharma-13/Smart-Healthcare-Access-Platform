import dotenv from 'dotenv';
import { connectDB, disconnectDB } from '../config/db.js';
import { Doctor, Organization, User } from '../models/index.js';

dotenv.config();

const demoPassword = 'ShapDemo@2026';

const patients = [
  { name: 'Aarav Mehta', email: 'aarav.mehta.demo@shap.health', phone: '+919800000501', city: 'New Delhi', state: 'Delhi' },
  { name: 'Ananya Iyer', email: 'ananya.iyer.demo@shap.health', phone: '+919800000502', city: 'Mumbai', state: 'Maharashtra' },
  { name: 'Rohan Sen', email: 'rohan.sen.demo@shap.health', phone: '+919800000503', city: 'Kolkata', state: 'West Bengal' },
  { name: 'Meera Nair', email: 'meera.nair.demo@shap.health', phone: '+919800000504', city: 'Bengaluru', state: 'Karnataka' },
  { name: 'Vikram Rao', email: 'vikram.rao.demo@shap.health', phone: '+919800000505', city: 'Chennai', state: 'Tamil Nadu' },
];

const doctors = [
  { name: 'Dr. Kavya Sharma', email: 'kavya.sharma.demo@shap.health', phone: '+919800000601', specialization: 'Cardiology', licenseNumber: 'DEMO-NMC-26001', city: 'New Delhi', state: 'Delhi' },
  { name: 'Dr. Arjun Kapoor', email: 'arjun.kapoor.demo@shap.health', phone: '+919800000602', specialization: 'Emergency Medicine', licenseNumber: 'DEMO-NMC-26002', city: 'Mumbai', state: 'Maharashtra' },
  { name: 'Dr. Sayan Mukherjee', email: 'sayan.mukherjee.demo@shap.health', phone: '+919800000603', specialization: 'General Medicine', licenseNumber: 'DEMO-NMC-26003', city: 'Kolkata', state: 'West Bengal' },
  { name: 'Dr. Nandini Rao', email: 'nandini.rao.demo@shap.health', phone: '+919800000604', specialization: 'Neurology', licenseNumber: 'DEMO-NMC-26004', city: 'Bengaluru', state: 'Karnataka' },
  { name: 'Dr. Harish Iyer', email: 'harish.iyer.demo@shap.health', phone: '+919800000605', specialization: 'Trauma Surgery', licenseNumber: 'DEMO-NMC-26005', city: 'Chennai', state: 'Tamil Nadu' },
];

const hospitals = [
  {
    name: 'Manipal Hospital Bengaluru Demo',
    email: 'manipal.bengaluru.demo@shap.health',
    phone: '+919800000704',
    registrationNumber: 'DEMO-HOSP-BLR-001',
    city: 'Bengaluru',
    state: 'Karnataka',
    pinCode: '560017',
    locality: 'Old Airport Road',
    streetName: '98 HAL Old Airport Road',
    coordinates: [77.6484, 12.9592],
    ownership: 'Private',
    orgType: 'hospital',
  },
  {
    name: 'Apollo Hospitals Chennai Demo',
    email: 'apollo.chennai.demo@shap.health',
    phone: '+919800000705',
    registrationNumber: 'DEMO-HOSP-CHE-001',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pinCode: '600006',
    locality: 'Greams Road',
    streetName: '21 Greams Lane',
    coordinates: [80.2550, 13.0636],
    ownership: 'Private',
    orgType: 'hospital',
  },
];

const legacyGovernmentHospitalEmails = [
  'aiims.delhi.demo@shap.health',
  'kem.mumbai.demo@shap.health',
  'mch.kolkata.demo@shap.health',
];

const admins = [
  { name: 'Ashish Sharma', email: 'ashish.sharma.admin@shap.health', phone: '+919800000801' },
  { name: 'Ajit Tiwari', email: 'ajit.tiwari.admin@shap.health', phone: '+919800000802' },
];

async function saveUser(data, role, extra = {}) {
  let user = await User.findOne({ email: data.email });
  if (!user) user = new User({ email: data.email });
  user.name = data.name;
  user.email = data.email;
  user.phone = data.phone;
  user.role = role;
  user.status = 'active';
  user.isActive = true;
  user.password = demoPassword;
  Object.assign(user, extra);
  await user.save();
  return user;
}

async function seedDemoAccounts() {
  // Remove only the government demo records created by the previous version.
  // Government facilities remain available through the external fallback directory.
  const legacyUsers = await User.find({
    email: { $in: legacyGovernmentHospitalEmails },
  }).select('_id');
  if (legacyUsers.length > 0) {
    const legacyIds = legacyUsers.map((user) => user._id);
    await Organization.deleteMany({ userId: { $in: legacyIds } });
    await User.deleteMany({ _id: { $in: legacyIds } });
  }

  const adminUsers = [];
  for (const admin of admins) {
    adminUsers.push(await saveUser(admin, 'admin'));
  }

  for (const patient of patients) {
    await saveUser(patient, 'patient', {
      gender: 'Prefer not to say',
      governmentIdDocument: {
        documentType: 'Aadhaar Card',
        documentName: `${patient.name} demo government ID`,
        storageReference: `demo://${patient.email}/government-id`,
        verificationStatus: 'VERIFIED',
      },
      address: {
        street: 'Demo residential address',
        city: patient.city,
        state: patient.state,
        postalCode: '000000',
      },
    });
  }

  for (const doctor of doctors) {
    const user = await saveUser(doctor, 'doctor', {
      address: { street: 'Demo professional address', city: doctor.city, state: doctor.state, postalCode: '000000' },
    });
    await Doctor.findOneAndUpdate(
      { userId: user._id },
      {
        $set: {
          specialization: doctor.specialization,
          qualifications: ['MBBS', 'MD'],
          experienceYears: 8,
          licenseNumber: doctor.licenseNumber,
          doctorUniqueId: `SHAP-DEMO-${doctor.licenseNumber.slice(-5)}`,
          issuingAuthority: 'National Medical Commission',
          registrationJurisdiction: doctor.state,
          verificationStatus: 'verified',
          verifiedAt: new Date(),
          verifiedBy: adminUsers[0]._id,
          consultationFee: 800,
          languages: ['English', 'Hindi'],
          isAvailableForAppointments: true,
          isAvailableForEmergency: true,
          bio: 'Demo clinician profile for SHAP workflow testing.',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  for (const hospital of hospitals) {
    const user = await saveUser(hospital, 'organization');
    const address = {
      buildingNumber: '',
      streetName: hospital.streetName,
      locality: hospital.locality,
      city: hospital.city,
      district: hospital.city,
      state: hospital.state,
      pinCode: hospital.pinCode,
      country: 'India',
    };
    await Organization.findOneAndUpdate(
      { userId: user._id },
      {
        $set: {
          name: hospital.name,
          orgType: hospital.orgType,
          registrationNumber: hospital.registrationNumber,
          legalName: hospital.name,
          officialEmail: hospital.email,
          contactNumber: hospital.phone,
          description: `${hospital.ownership} demo hospital account for SHAP discovery and emergency fallback testing.`,
          representative: { name: hospital.name, email: hospital.email, phone: hospital.phone, designation: 'Hospital Administrator' },
          healthcareCapabilities: ['Emergency medicine', 'Multi-specialty care', 'Trauma care'],
          specializations: ['Emergency medicine', 'Multi-specialty care'],
          verificationStatus: 'verified',
          verifiedAt: new Date(),
          verifiedBy: adminUsers[0]._id,
          registeredAddress: address,
          operatingAddress: { ...address, isSameAsRegistered: true },
          address: { street: hospital.streetName, city: hospital.city, state: hospital.state, postalCode: hospital.pinCode },
          location: { type: 'Point', coordinates: hospital.coordinates },
          isParticipating: true,
          emergencyCapable: true,
          emergencyContactPhone: hospital.phone,
          qrCheckinCode: `SHAP-ACCOUNT-${hospital.registrationNumber}`,
          facilities: ['Emergency Department', 'ICU', 'Trauma Care'],
          rating: 4.7,
          totalReviews: 125,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }

  console.log(`Seeded ${patients.length} patients, ${doctors.length} doctors, ${hospitals.length} hospitals, and ${admins.length} admins.`);
  console.log(`Demo password for all accounts: ${demoPassword}`);
  return { patients, doctors, hospitals, admins, password: demoPassword };
}

if (process.argv[1]?.endsWith('seedDemoAccounts.js')) {
  try {
    await connectDB();
    await seedDemoAccounts();
    await disconnectDB();
  } catch (error) {
    console.error('[Demo accounts] Seed failed:', error);
    process.exitCode = 1;
  }
}

export { admins, doctors, hospitals, patients, demoPassword, seedDemoAccounts };
