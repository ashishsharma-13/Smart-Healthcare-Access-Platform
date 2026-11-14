import dotenv from 'dotenv';
import { connectDB, disconnectDB } from '../config/db.js';
import {
  User,
  Organization,
  HealthcareResource,
  OrganizationEmergencyCapability,
  EmergencyCapability,
  Doctor,
  DoctorAffiliation,
} from '../models/index.js';
import { hyderabadHospitalsData } from './hyderabadHospitalsData.js';

dotenv.config();

export const seedHyderabadHospitals = async () => {
  console.log('[Hyderabad Seeder] Seeding 10 nearby hospitals around University of Hyderabad & Gachibowli...');

  const seededOrgs = [];

  for (const item of hyderabadHospitalsData) {
    // 1. Get or create Organization user account
    let orgUser = await User.findOne({ email: item.user.email });
    if (!orgUser) {
      orgUser = await User.create(item.user);
      console.log(`[Hyderabad Seeder] Created organization user: ${item.user.email}`);
    }

    // 2. Get or create Organization
    let org = await Organization.findOne({
      $or: [
        { registrationNumber: item.org.registrationNumber },
        { name: item.org.name },
      ],
    });

    if (!org) {
      org = await Organization.create({
        ...item.org,
        userId: orgUser._id,
      });
      console.log(`[Hyderabad Seeder] Created Hospital: ${org.name}`);
    } else {
      // Ensure physical location, address, and capabilities are updated
      org.location = item.org.location;
      org.operatingAddress = item.org.operatingAddress;
      org.registeredAddress = item.org.registeredAddress;
      org.address = item.org.address;
      org.facilities = item.org.facilities;
      org.specializations = item.org.specializations;
      org.healthcareCapabilities = item.org.healthcareCapabilities;
      org.emergencyCapable = item.org.emergencyCapable;
      org.emergencyContactPhone = item.org.emergencyContactPhone;
      org.verificationStatus = 'verified';
      await org.save();
      console.log(`[Hyderabad Seeder] Updated Hospital: ${org.name}`);
    }

    seededOrgs.push(org);

    // 3. Upsert Healthcare Resources
    for (const res of item.resources) {
      let existingRes = await HealthcareResource.findOne({
        organizationId: org._id,
        resourceType: res.resourceType,
      });
      if (!existingRes) {
        await HealthcareResource.create({
          organizationId: org._id,
          ...res,
        });
      } else {
        existingRes.totalCapacity = res.totalCapacity;
        existingRes.availableCapacity = res.availableCapacity;
        existingRes.occupiedCapacity = res.occupiedCapacity;
        existingRes.reservedCapacity = res.reservedCapacity || 0;
        await existingRes.save();
      }
    }

    // 4. Connect Emergency Capabilities
    const allCaps = await EmergencyCapability.find({});
    for (const cap of allCaps) {
      const existingCap = await OrganizationEmergencyCapability.findOne({
        organizationId: org._id,
        capabilityId: cap._id,
      });
      if (!existingCap) {
        await OrganizationEmergencyCapability.create({
          organizationId: org._id,
          capabilityId: cap._id,
          verificationStatus: 'VERIFIED',
          lastVerifiedAt: new Date(),
        });
      }
    }
  }

  // 5. Connect Doctors with Hyderabad hospitals for doctor discovery
  const doctors = await Doctor.find({ verificationStatus: { $in: ['verified', 'VERIFIED'] } }).limit(5);
  if (doctors.length > 0 && seededOrgs.length > 0) {
    const mainHydOrgs = seededOrgs.slice(0, 5);
    for (let i = 0; i < doctors.length; i++) {
      const doc = doctors[i];
      const targetOrg = mainHydOrgs[i % mainHydOrgs.length];
      const affId = `AFF-HYD-${doc.doctorUniqueId || i}-${targetOrg.registrationNumber}`;

      let aff = await DoctorAffiliation.findOne({
        doctorId: doc._id,
        organizationId: targetOrg._id,
      });
      if (!aff) {
        await DoctorAffiliation.create({
          affiliationId: affId,
          doctorId: doc._id,
          organizationId: targetOrg._id,
          department: doc.specialization || 'General Medicine',
          designation: 'Senior Consultant',
          affiliationType: 'VISITING',
          status: 'ACTIVE',
          canAdmitPatients: true,
          consultationFee: doc.consultationFee || 600,
          verifiedAt: new Date(),
        });
        console.log(`[Hyderabad Seeder] Affiliated doctor ${doc._id} with ${targetOrg.name}`);
      }
    }
  }

  console.log(`[Hyderabad Seeder] Successfully seeded ${seededOrgs.length} hospitals around Hyderabad!`);
  return seededOrgs;
};

// If run directly from CLI
if (process.argv[1]?.endsWith('seedHyderabadHospitals.js')) {
  (async () => {
    try {
      await connectDB();
      await seedHyderabadHospitals();
      await disconnectDB();
      process.exit(0);
    } catch (err) {
      console.error('[Hyderabad Seeder] Error:', err);
      process.exit(1);
    }
  })();
}
