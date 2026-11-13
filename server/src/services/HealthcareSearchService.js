import mongoose from 'mongoose';
import {
  Doctor,
  Organization,
  DoctorAffiliation,
  DoctorSchedule,
  Appointment,
  Specialization,
  SearchHistory,
  SavedHealthcareProvider,
  User,
} from '../models/index.js';

/**
 * Calculates straight-line distance between two geographic coordinates using the Haversine formula.
 * @param {number} lat1 Latitude of origin point
 * @param {number} lon1 Longitude of origin point
 * @param {number} lat2 Latitude of destination point
 * @param {number} lon2 Longitude of destination point
 * @returns {number|null} Distance in kilometers rounded to 1 decimal place, or null if coordinates are invalid.
 */
export const calculateHaversineDistanceKm = (lat1, lon1, lat2, lon2) => {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const numLat1 = Number(lat1);
  const numLon1 = Number(lon1);
  const numLat2 = Number(lat2);
  const numLon2 = Number(lon2);
  if (isNaN(numLat1) || isNaN(numLon1) || isNaN(numLat2) || isNaN(numLon2)) return null;

  const R = 6371; // Earth's mean radius in km
  const dLat = ((numLat2 - numLat1) * Math.PI) / 180;
  const dLon = ((numLon2 - numLon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((numLat1 * Math.PI) / 180) *
      Math.cos((numLat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

export class HealthcareSearchService {
  /**
   * Search doctors with multi-attribute filtering, location distance computation,
   * multiple affiliations support, and strict verification filtering.
   */
  async searchDoctors(queryParams = {}, userContext = null) {
    const {
      search,
      q,
      name,
      specialization,
      qualification,
      experienceYears,
      minExperience,
      organizationId,
      affiliation,
      isAvailable,
      availableOnly,
      verifiedOnly = 'true',
      lat,
      lng,
      radiusKm,
      sortBy = 'rating',
      page = 1,
      limit = 10,
    } = queryParams;

    const queryTerm = (search || q || name || '').trim();
    const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

    // 1. Base Doctor filter
    const doctorFilter = {};

    // In normal patient discovery, show verified doctors only
    const shouldFilterVerified = verifiedOnly === 'true' || verifiedOnly === true || !isDev;
    if (shouldFilterVerified) {
      doctorFilter.verificationStatus = { $in: ['verified', 'VERIFIED'] };
    }

    if (specialization && specialization !== 'All' && specialization !== 'All Specialties') {
      doctorFilter.specialization = { $regex: new RegExp(specialization.trim(), 'i') };
    }

    if (qualification && qualification.trim()) {
      doctorFilter.qualifications = { $regex: new RegExp(qualification.trim(), 'i') };
    }

    const expMin = minExperience != null ? Number(minExperience) : experienceYears != null ? Number(experienceYears) : null;
    if (expMin != null && !isNaN(expMin)) {
      doctorFilter.experienceYears = { $gte: expMin };
    }

    const reqAvailable = availableOnly === 'true' || availableOnly === true || isAvailable === 'true' || isAvailable === true;
    if (reqAvailable) {
      doctorFilter.isAvailableForAppointments = true;
    }

    // 2. Fetch doctors matching base criteria
    let doctors = await Doctor.find(doctorFilter)
      .populate('userId', 'name email phone avatar')
      .populate('currentPresence.organizationId', 'name address')
      .exec();

    // Text search on doctor's name, qualifications, or bio
    if (queryTerm) {
      const qLower = queryTerm.toLowerCase();
      doctors = doctors.filter((doc) => {
        const docName = doc.userId?.name?.toLowerCase() || '';
        const docBio = doc.bio?.toLowerCase() || '';
        const docSpec = doc.specialization?.toLowerCase() || '';
        const docQuals = (doc.qualifications || []).join(' ').toLowerCase();
        return (
          docName.includes(qLower) ||
          docBio.includes(qLower) ||
          docSpec.includes(qLower) ||
          docQuals.includes(qLower)
        );
      });
    }

    // 3. Attach active affiliations & compute geographic distances
    const targetOrgId = organizationId || affiliation;
    const originLat = lat != null && lat !== '' ? Number(lat) : null;
    const originLng = lng != null && lng !== '' ? Number(lng) : null;
    const hasCoordinates = originLat != null && originLng != null && !isNaN(originLat) && !isNaN(originLng);
    const maxRadius = radiusKm != null && radiusKm !== '' ? Number(radiusKm) : null;

    const enrichedDoctors = await Promise.all(
      doctors.map(async (doc) => {
        const affiliations = await DoctorAffiliation.find({
          doctorId: doc._id,
          status: { $in: ['ACTIVE', 'approved', 'ACCEPTED'] },
        })
          .populate('organizationId', 'name orgType address operatingAddress location contactNumber verificationStatus')
          .lean()
          .exec();

        // Calculate distance to each affiliated organization
        let minDistanceKm = null;
        const activeAffiliations = affiliations.map((aff) => {
          const org = aff.organizationId;
          let distanceKm = null;
          if (hasCoordinates && org?.location?.coordinates?.length === 2) {
            const orgLng = org.location.coordinates[0];
            const orgLat = org.location.coordinates[1];
            distanceKm = calculateHaversineDistanceKm(originLat, originLng, orgLat, orgLng);
            if (distanceKm != null) {
              if (minDistanceKm == null || distanceKm < minDistanceKm) {
                minDistanceKm = distanceKm;
              }
            }
          }
          return {
            affiliationId: aff.affiliationId || String(aff._id),
            organizationId: org?._id,
            organizationName: org?.name || 'Affiliated Hospital',
            orgType: org?.orgType || 'hospital',
            department: aff.department || 'General Medicine',
            designation: aff.designation || 'Consultant',
            affiliationType: aff.affiliationType || 'VISITING',
            address: org?.operatingAddress?.city
              ? `${org.operatingAddress.city}, ${org.operatingAddress.state || ''}`
              : org?.address?.city || '',
            distanceKm,
            coordinates: org?.location?.coordinates || null,
          };
        });

        // Current presence details (sanitized, strictly from verified check-in, never schedule)
        const isPresent = Boolean(doc.currentPresence?.isPresent);
        const presenceOrgName = doc.currentPresence?.organizationId?.name || null;
        const presenceOrgId = doc.currentPresence?.organizationId?._id || null;

        return {
          _id: doc._id,
          doctorUniqueId: doc.doctorUniqueId,
          name: doc.userId?.name || 'Dr. Medical Specialist',
          email: doc.userId?.email,
          phone: doc.userId?.phone,
          avatar: doc.userId?.avatar,
          specialization: doc.specialization,
          qualifications: doc.qualifications || [],
          experienceYears: doc.experienceYears || 0,
          consultationFee: doc.consultationFee || 500,
          bio: doc.bio || '',
          languages: doc.languages || ['English', 'Hindi'],
          workingHours: doc.workingHours || 'Mon–Fri · 9:00 AM–4:00 PM',
          rating: doc.rating || 4.8,
          totalReviews: doc.totalReviews || 12,
          verificationStatus: doc.verificationStatus,
          isAvailableForAppointments: Boolean(doc.isAvailableForAppointments),
          isAvailableForEmergency: Boolean(doc.isAvailableForEmergency),
          // Verified on-site presence (strictly from QR presence log, never inferred from schedule)
          currentPresence: {
            isPresent,
            organizationName: isPresent ? presenceOrgName : null,
            organizationId: isPresent ? presenceOrgId : null,
          },
          activeAffiliations,
          distanceKm: minDistanceKm,
          distanceNote: 'Straight-line distance (approximate); actual travel time may vary based on route and traffic.',
        };
      })
    );

    // 4. Filter by specific organization affiliation if requested
    let filteredDoctors = enrichedDoctors;
    if (targetOrgId) {
      filteredDoctors = filteredDoctors.filter((doc) =>
        doc.activeAffiliations.some(
          (aff) => String(aff.organizationId) === String(targetOrgId)
        )
      );
    }

    // 5. Filter by radius if coordinates and radius provided
    if (hasCoordinates && maxRadius != null && !isNaN(maxRadius)) {
      filteredDoctors = filteredDoctors.filter(
        (doc) => doc.distanceKm != null && doc.distanceKm <= maxRadius
      );
    }

    // 6. Sorting
    filteredDoctors.sort((a, b) => {
      if (sortBy === 'distance' && hasCoordinates) {
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        return a.distanceKm - b.distanceKm;
      }
      if (sortBy === 'experience') {
        return (b.experienceYears || 0) - (a.experienceYears || 0);
      }
      if (sortBy === 'next_available') {
        if (a.isAvailableForAppointments !== b.isAvailableForAppointments) {
          return a.isAvailableForAppointments ? -1 : 1;
        }
        return (b.rating || 0) - (a.rating || 0);
      }
      if (sortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      }
      // default: rating desc
      return (b.rating || 0) - (a.rating || 0);
    });

    // 7. Pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const total = filteredDoctors.length;
    const totalPages = Math.ceil(total / limitNum) || 1;
    const startIndex = (pageNum - 1) * limitNum;
    const paginated = filteredDoctors.slice(startIndex, startIndex + limitNum);

    // Asynchronously log search history
    if (userContext?.userId || queryTerm || specialization) {
      this.recordSearchHistory(userContext?.userId, {
        searchType: 'DOCTOR',
        queryText: queryTerm,
        filters: {
          specialization,
          minExperience: expMin,
          distanceKm: maxRadius,
          availableOnly: reqAvailable,
          verifiedOnly: shouldFilterVerified,
        },
        coordinates: hasCoordinates ? { latitude: originLat, longitude: originLng } : null,
        resultCount: total,
      }).catch(() => {});
    }

    return {
      success: true,
      count: paginated.length,
      total,
      page: pageNum,
      totalPages,
      data: paginated,
    };
  }

  /**
   * Search organizations with facility type, specializations, registered capabilities,
   * and geographic radius filtering.
   */
  async searchOrganizations(queryParams = {}, userContext = null) {
    const {
      search,
      q,
      name,
      type,
      orgType,
      specialization,
      capability,
      emergencyOnly,
      verifiedOnly = 'true',
      lat,
      lng,
      radiusKm,
      sortBy = 'distance',
      page = 1,
      limit = 10,
    } = queryParams;

    const queryTerm = (search || q || name || '').trim();
    const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

    const filter = {};

    const shouldFilterVerified = verifiedOnly === 'true' || verifiedOnly === true || !isDev;
    if (shouldFilterVerified) {
      filter.verificationStatus = { $in: ['verified', 'VERIFIED'] };
    }

    const facilityType = type || orgType;
    if (facilityType && facilityType !== 'all') {
      filter.orgType = facilityType;
    }

    if (emergencyOnly === 'true' || emergencyOnly === true) {
      filter.emergencyCapable = true;
    }

    if (specialization && specialization !== 'All' && specialization !== 'All Specialties') {
      filter.specializations = { $regex: new RegExp(specialization.trim(), 'i') };
    }

    if (capability && capability.trim()) {
      filter.healthcareCapabilities = { $regex: new RegExp(capability.trim(), 'i') };
    }

    // Text query on organization name, legalName, or city
    if (queryTerm) {
      filter.$or = [
        { name: { $regex: queryTerm, $options: 'i' } },
        { legalName: { $regex: queryTerm, $options: 'i' } },
        { 'address.city': { $regex: queryTerm, $options: 'i' } },
        { 'operatingAddress.city': { $regex: queryTerm, $options: 'i' } },
        { 'operatingAddress.locality': { $regex: queryTerm, $options: 'i' } },
      ];
    }

    let organizations = await Organization.find(filter)
      .populate('userId', 'name email phone')
      .lean()
      .exec();

    const originLat = lat != null && lat !== '' ? Number(lat) : null;
    const originLng = lng != null && lng !== '' ? Number(lng) : null;
    const hasCoordinates = originLat != null && originLng != null && !isNaN(originLat) && !isNaN(originLng);
    const maxRadius = radiusKm != null && radiusKm !== '' ? Number(radiusKm) : null;

    // Enriched organizations with distance and sanitized data
    let enriched = organizations.map((org) => {
      let distanceKm = null;
      if (hasCoordinates && org.location?.coordinates?.length === 2) {
        const orgLng = org.location.coordinates[0];
        const orgLat = org.location.coordinates[1];
        distanceKm = calculateHaversineDistanceKm(originLat, originLng, orgLat, orgLng);
      }

      // Sanitize sensitive internal verification data
      delete org.licenseDocumentUrl;
      delete org.registrationCertificateUrl;
      delete org.taxIdDocumentUrl;
      delete org.verificationNotes;
      delete org.rejectionReason;

      return {
        ...org,
        distanceKm,
        distanceNote: 'Straight-line distance (approximate); travel time may vary based on route and traffic conditions.',
        disclaimer:
          'Registered healthcare capabilities represent registered facility infrastructure and clinical equipment, not guaranteed live resource or bed vacancy.',
      };
    });

    // Distance radius filter
    if (hasCoordinates && maxRadius != null && !isNaN(maxRadius)) {
      enriched = enriched.filter((org) => org.distanceKm != null && org.distanceKm <= maxRadius);
    }

    // Sorting
    enriched.sort((a, b) => {
      if (sortBy === 'distance' && hasCoordinates) {
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        return a.distanceKm - b.distanceKm;
      }
      if (sortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      }
      // default: rating desc
      return (b.rating || 0) - (a.rating || 0);
    });

    // Pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const total = enriched.length;
    const totalPages = Math.ceil(total / limitNum) || 1;
    const startIndex = (pageNum - 1) * limitNum;
    const paginated = enriched.slice(startIndex, startIndex + limitNum);

    // Asynchronously log search history
    if (userContext?.userId || queryTerm || facilityType) {
      this.recordSearchHistory(userContext?.userId, {
        searchType: 'ORGANIZATION',
        queryText: queryTerm,
        filters: {
          orgType: facilityType,
          specialization,
          capability,
          distanceKm: maxRadius,
          emergencyOnly: filter.emergencyCapable === true,
          verifiedOnly: shouldFilterVerified,
        },
        coordinates: hasCoordinates ? { latitude: originLat, longitude: originLng } : null,
        resultCount: total,
      }).catch(() => {});
    }

    return {
      success: true,
      count: paginated.length,
      total,
      page: pageNum,
      totalPages,
      data: paginated,
    };
  }

  /**
   * Find nearby healthcare organizations using distance calculation
   */
  async getNearbyOrganizations(lat, lng, radiusKm = 10, orgType = null, limit = 20) {
    const originLat = Number(lat);
    const originLng = Number(lng);
    if (isNaN(originLat) || isNaN(originLng)) {
      throw new Error('Valid latitude and longitude coordinates are required.');
    }
    const maxRadius = Math.max(1, Math.min(100, Number(radiusKm) || 10));

    const filter = {
      verificationStatus: { $in: ['verified', 'VERIFIED'] },
    };
    if (orgType && orgType !== 'all') {
      filter.orgType = orgType;
    }

    const organizations = await Organization.find(filter)
      .populate('userId', 'name email phone')
      .lean()
      .exec();

    const nearby = organizations
      .map((org) => {
        let distanceKm = null;
        if (org.location?.coordinates?.length === 2) {
          const orgLng = org.location.coordinates[0];
          const orgLat = org.location.coordinates[1];
          distanceKm = calculateHaversineDistanceKm(originLat, originLng, orgLat, orgLng);
        }
        return {
          _id: org._id,
          name: org.name,
          orgType: org.orgType,
          address: org.operatingAddress || org.address,
          location: org.location,
          contactNumber: org.contactNumber,
          emergencyCapable: org.emergencyCapable,
          specializations: org.specializations || [],
          healthcareCapabilities: org.healthcareCapabilities || [],
          rating: org.rating || 4.7,
          distanceKm,
          distanceNote: 'Straight-line distance (approximate); travel time may vary based on route and traffic.',
          disclaimer:
            'Registered capabilities reflect registered facilities and services, not live availability.',
        };
      })
      .filter((org) => org.distanceKm != null && org.distanceKm <= maxRadius)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, Math.min(50, Number(limit) || 20));

    return {
      success: true,
      count: nearby.length,
      origin: { latitude: originLat, longitude: originLng },
      radiusKm: maxRadius,
      data: nearby,
    };
  }

  /**
   * Detailed Doctor Profile for public/patient discovery
   */
  async getDoctorProfile(doctorId) {
    let doctor = null;
    if (mongoose.Types.ObjectId.isValid(doctorId)) {
      doctor = await Doctor.findById(doctorId)
        .populate('userId', 'name email phone avatar')
        .populate('currentPresence.organizationId', 'name address location')
        .exec();
    }
    if (!doctor) {
      doctor = await Doctor.findOne({ doctorUniqueId: doctorId })
        .populate('userId', 'name email phone avatar')
        .populate('currentPresence.organizationId', 'name address location')
        .exec();
    }
    if (!doctor) {
      throw new Error('Doctor profile not found.');
    }

    const affiliations = await DoctorAffiliation.find({
      doctorId: doctor._id,
      status: { $in: ['ACTIVE', 'approved', 'ACCEPTED'] },
    })
      .populate('organizationId', 'name orgType address operatingAddress location contactNumber officialEmail verificationStatus')
      .lean()
      .exec();

    const isPresent = Boolean(doctor.currentPresence?.isPresent);

    return {
      _id: doctor._id,
      doctorUniqueId: doctor.doctorUniqueId,
      name: doctor.userId?.name || 'Dr. Medical Specialist',
      email: doctor.userId?.email,
      phone: doctor.userId?.phone,
      avatar: doctor.userId?.avatar,
      specialization: doctor.specialization,
      qualifications: doctor.qualifications || [],
      qualificationsDetailed: doctor.qualificationsDetailed || [],
      experienceYears: doctor.experienceYears || 0,
      consultationFee: doctor.consultationFee || 500,
      bio: doctor.bio || '',
      languages: doctor.languages || ['English', 'Hindi'],
      workingHours: doctor.workingHours || 'Mon–Fri · 9:00 AM–4:00 PM',
      rating: doctor.rating || 4.8,
      totalReviews: doctor.totalReviews || 12,
      verificationStatus: doctor.verificationStatus,
      isAvailableForAppointments: Boolean(doctor.isAvailableForAppointments),
      isAvailableForEmergency: Boolean(doctor.isAvailableForEmergency),
      currentPresence: {
        isPresent,
        organizationName: isPresent ? doctor.currentPresence?.organizationId?.name : null,
        organizationId: isPresent ? doctor.currentPresence?.organizationId?._id : null,
      },
      activeAffiliations: affiliations.map((aff) => ({
        affiliationId: aff.affiliationId || String(aff._id),
        organizationId: aff.organizationId?._id,
        organizationName: aff.organizationId?.name || 'Affiliated Hospital',
        orgType: aff.organizationId?.orgType || 'hospital',
        department: aff.department || 'General Medicine',
        designation: aff.designation || 'Consultant',
        affiliationType: aff.affiliationType || 'VISITING',
        address: aff.organizationId?.operatingAddress || aff.organizationId?.address,
        location: aff.organizationId?.location,
        contactNumber: aff.organizationId?.contactNumber,
      })),
      disclaimers: {
        presenceNotice:
          'Doctor presence is verified strictly on-site via secure QR check-in records and is never inferred from schedule alone.',
        availabilityNotice:
          'Appointment availability indicates consultation slot booking eligibility and is distinct from emergency readiness.',
      },
    };
  }

  /**
   * Detailed Doctor Availability and Slots for appointment booking,
   * strictly separating planned schedule, booking slots, emergency availability, and verified presence.
   */
  async getDoctorAvailability(doctorId, organizationId = null, dateStr = null) {
    let doctor = null;
    if (mongoose.Types.ObjectId.isValid(doctorId)) {
      doctor = await Doctor.findById(doctorId).exec();
    }
    if (!doctor) {
      doctor = await Doctor.findOne({ doctorUniqueId: doctorId }).exec();
    }
    if (!doctor) {
      throw new Error('Doctor not found.');
    }

    const queryDate = dateStr ? new Date(dateStr) : new Date();
    const dayOfWeek = queryDate.getDay(); // 0 = Sun, 1 = Mon ...
    const dateFormatted = queryDate.toISOString().split('T')[0];

    // Find planned schedule
    const scheduleFilter = {
      doctorId: doctor._id,
      isActive: true,
    };
    if (organizationId && mongoose.Types.ObjectId.isValid(organizationId)) {
      scheduleFilter.organizationId = organizationId;
    }

    const schedules = await DoctorSchedule.find(scheduleFilter).lean().exec();

    // Check if doctor has planned working hours for today
    let matchingDaySchedule = null;
    for (const sch of schedules) {
      if (sch.weeklySchedule && Array.isArray(sch.weeklySchedule)) {
        const found = sch.weeklySchedule.find((d) => d.dayOfWeek === dayOfWeek && d.isActive);
        if (found) {
          matchingDaySchedule = { ...found, organizationId: sch.organizationId };
          break;
        }
      }
    }

    // Default clinic hours if no schedule explicitly defined
    const startTimeStr = matchingDaySchedule?.startTime || '09:00';
    const endTimeStr = matchingDaySchedule?.endTime || '17:00';

    // Existing booked appointments for this doctor on this day
    const bookedAppointments = await Appointment.find({
      doctorId: doctor._id,
      appointmentDate: {
        $gte: new Date(`${dateFormatted}T00:00:00.000Z`),
        $lte: new Date(`${dateFormatted}T23:59:59.999Z`),
      },
      status: { $nin: ['CANCELLED', 'REJECTED'] },
    }).lean().exec();

    const bookedTimes = new Set(bookedAppointments.map((a) => a.appointmentTime));

    // Generate 30-min candidate slots
    const [startH, startM] = startTimeStr.split(':').map(Number);
    const [endH, endM] = endTimeStr.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    const availableSlots = [];
    for (let m = startMinutes; m < endMinutes; m += 30) {
      const hStr = String(Math.floor(m / 60)).padStart(2, '0');
      const mStr = String(m % 60).padStart(2, '0');
      const timeSlot = `${hStr}:${mStr}`;
      const isBooked = bookedTimes.has(timeSlot);
      availableSlots.push({
        time: timeSlot,
        available: !isBooked && Boolean(doctor.isAvailableForAppointments),
      });
    }

    // Check verified physical presence (strictly from QR check-in, never inferred from schedule)
    const isPresent = Boolean(doctor.currentPresence?.isPresent);
    const onSiteOrgId = doctor.currentPresence?.organizationId;
    const isOnSiteAtOrg = organizationId
      ? isPresent && String(onSiteOrgId) === String(organizationId)
      : isPresent;

    return {
      doctorId: doctor._id,
      doctorUniqueId: doctor.doctorUniqueId,
      date: dateFormatted,
      dayOfWeek,
      isAvailableForAppointments: Boolean(doctor.isAvailableForAppointments),
      isAvailableForEmergency: Boolean(doctor.isAvailableForEmergency),
      // Crucial requirement: verified presence is independent of schedule
      isCurrentlyOnSite: isOnSiteAtOrg,
      verifiedPresenceStatus: isPresent ? 'ON_SITE_VERIFIED' : 'NOT_CHECKED_IN',
      plannedHours: {
        startTime: startTimeStr,
        endTime: endTimeStr,
      },
      availableSlots,
      disclaimers: {
        scheduleRule:
          'Doctor schedule indicates planned clinic hours and does not guarantee verified physical on-site presence.',
        presenceRule:
          'Doctor presence comes exclusively from verified QR check-in/out logs; schedule alone is never treated as presence.',
        emergencySeparation:
          'Emergency availability indicates acute emergency dispatch eligibility and is strictly separated from outpatient appointment booking.',
      },
    };
  }

  /**
   * Detailed Organization Profile for public/patient discovery
   */
  async getOrganizationProfile(orgId) {
    let org = null;
    if (mongoose.Types.ObjectId.isValid(orgId)) {
      org = await Organization.findById(orgId).populate('userId', 'name email phone').lean().exec();
    }
    if (!org) {
      org = await Organization.findOne({ uniqueOrganizationCode: orgId })
        .populate('userId', 'name email phone')
        .lean()
        .exec();
    }
    if (!org) {
      throw new Error('Healthcare organization not found.');
    }

    // Sanitize
    delete org.licenseDocumentUrl;
    delete org.registrationCertificateUrl;
    delete org.taxIdDocumentUrl;
    delete org.verificationNotes;
    delete org.rejectionReason;

    // Active affiliated doctors
    const affiliations = await DoctorAffiliation.find({
      organizationId: org._id,
      status: { $in: ['ACTIVE', 'approved', 'ACCEPTED'] },
    })
      .populate('doctorId')
      .lean()
      .exec();

    const affiliatedDoctors = affiliations
      .filter((aff) => aff.doctorId)
      .map((aff) => {
        const doc = aff.doctorId;
        return {
          doctorId: doc._id,
          doctorUniqueId: doc.doctorUniqueId,
          specialization: doc.specialization,
          experienceYears: doc.experienceYears,
          department: aff.department,
          designation: aff.designation,
          affiliationType: aff.affiliationType,
          isAvailableForAppointments: Boolean(doc.isAvailableForAppointments),
          rating: doc.rating,
        };
      });

    return {
      ...org,
      affiliatedDoctorsCount: affiliatedDoctors.length,
      affiliatedDoctors,
      disclaimer:
        'Registered healthcare capabilities represent registered facility infrastructure and clinical equipment, not guaranteed live resource or bed vacancy.',
    };
  }

  /**
   * Affiliated doctors for a specific organization
   */
  async getOrganizationDoctors(orgId) {
    let org = null;
    if (mongoose.Types.ObjectId.isValid(orgId)) {
      org = await Organization.findById(orgId).exec();
    }
    if (!org) {
      org = await Organization.findOne({ uniqueOrganizationCode: orgId }).exec();
    }
    if (!org) {
      throw new Error('Organization not found.');
    }

    const affiliations = await DoctorAffiliation.find({
      organizationId: org._id,
      status: { $in: ['ACTIVE', 'approved', 'ACCEPTED'] },
    })
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name email phone avatar' },
      })
      .lean()
      .exec();

    const doctors = affiliations
      .filter((aff) => aff.doctorId && aff.doctorId.verificationStatus === 'verified')
      .map((aff) => {
        const doc = aff.doctorId;
        return {
          doctorId: doc._id,
          doctorUniqueId: doc.doctorUniqueId,
          name: doc.userId?.name || 'Dr. Medical Specialist',
          avatar: doc.userId?.avatar,
          specialization: doc.specialization,
          qualifications: doc.qualifications || [],
          experienceYears: doc.experienceYears || 0,
          consultationFee: doc.consultationFee || 500,
          department: aff.department || 'General Medicine',
          designation: aff.designation || 'Consultant',
          affiliationType: aff.affiliationType || 'VISITING',
          isAvailableForAppointments: Boolean(doc.isAvailableForAppointments),
          rating: doc.rating || 4.8,
        };
      });

    return {
      success: true,
      count: doctors.length,
      organizationId: org._id,
      organizationName: org.name,
      data: doctors,
    };
  }

  /**
   * Specializations offered by organization and its affiliated doctors
   */
  async getOrganizationSpecializations(orgId) {
    let org = null;
    if (mongoose.Types.ObjectId.isValid(orgId)) {
      org = await Organization.findById(orgId).exec();
    }
    if (!org) {
      org = await Organization.findOne({ uniqueOrganizationCode: orgId }).exec();
    }
    if (!org) {
      throw new Error('Organization not found.');
    }

    const orgSpecs = new Set(org.specializations || []);

    const affiliations = await DoctorAffiliation.find({
      organizationId: org._id,
      status: { $in: ['ACTIVE', 'approved', 'ACCEPTED'] },
    })
      .populate('doctorId', 'specialization')
      .lean()
      .exec();

    affiliations.forEach((aff) => {
      if (aff.doctorId?.specialization) {
        orgSpecs.add(aff.doctorId.specialization);
      }
    });

    return {
      success: true,
      organizationId: org._id,
      organizationName: org.name,
      specializations: Array.from(orgSpecs),
    };
  }

  /**
   * Registered healthcare capabilities for an organization with mandatory disclaimer
   */
  async getOrganizationCapabilities(orgId) {
    let org = null;
    if (mongoose.Types.ObjectId.isValid(orgId)) {
      org = await Organization.findById(orgId).exec();
    }
    if (!org) {
      org = await Organization.findOne({ uniqueOrganizationCode: orgId }).exec();
    }
    if (!org) {
      throw new Error('Organization not found.');
    }

    return {
      success: true,
      organizationId: org._id,
      organizationName: org.name,
      emergencyCapable: Boolean(org.emergencyCapable),
      emergencyContactPhone: org.emergencyContactPhone || org.contactNumber || '',
      registeredCapabilities: org.healthcareCapabilities || [],
      facilities: org.facilities || [],
      disclaimer:
        'Registered healthcare capabilities represent registered facility infrastructure and clinical equipment, not guaranteed live resource or bed vacancy.',
    };
  }

  /**
   * Search History operations
   */
  async recordSearchHistory(userId, searchData) {
    try {
      const entry = new SearchHistory({
        userId: userId || null,
        searchType: searchData.searchType || 'ALL',
        queryText: searchData.queryText || '',
        filters: searchData.filters || {},
        coordinates: searchData.coordinates || null,
        resultCount: searchData.resultCount || 0,
      });
      await entry.save();
      return entry;
    } catch (err) {
      return null;
    }
  }

  async getSearchHistory(userId) {
    if (!userId) return [];
    return await SearchHistory.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean()
      .exec();
  }

  async clearSearchHistory(userId) {
    if (!userId) return { success: true, deletedCount: 0 };
    const res = await SearchHistory.deleteMany({ userId });
    return { success: true, deletedCount: res.deletedCount };
  }

  /**
   * Saved / Bookmarked Healthcare Providers
   */
  async saveProvider(userId, providerType, providerId, notes = '') {
    if (!userId) throw new Error('Authentication required to save providers.');
    const typeUpper = String(providerType).toUpperCase();
    if (!['DOCTOR', 'ORGANIZATION'].includes(typeUpper)) {
      throw new Error('Provider type must be DOCTOR or ORGANIZATION.');
    }

    const payload = {
      userId,
      providerType: typeUpper,
      notes: notes || '',
    };
    if (typeUpper === 'DOCTOR') {
      payload.doctorId = providerId;
    } else {
      payload.organizationId = providerId;
    }

    // Upsert to prevent duplicate bookmark errors
    const saved = await SavedHealthcareProvider.findOneAndUpdate(
      {
        userId,
        providerType: typeUpper,
        doctorId: payload.doctorId,
        organizationId: payload.organizationId,
      },
      { $set: payload },
      { upsert: true, new: true }
    );

    return saved;
  }

  async getSavedProviders(userId) {
    if (!userId) return [];
    const items = await SavedHealthcareProvider.find({ userId })
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name email phone avatar' },
      })
      .populate('organizationId', 'name orgType address operatingAddress location contactNumber verificationStatus rating')
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return items.map((item) => {
      if (item.providerType === 'DOCTOR' && item.doctorId) {
        return {
          savedId: item.savedId || String(item._id),
          providerType: 'DOCTOR',
          providerId: item.doctorId._id,
          name: item.doctorId.userId?.name || 'Dr. Medical Specialist',
          specialization: item.doctorId.specialization,
          experienceYears: item.doctorId.experienceYears,
          rating: item.doctorId.rating,
          notes: item.notes,
          savedAt: item.createdAt,
        };
      }
      if (item.providerType === 'ORGANIZATION' && item.organizationId) {
        return {
          savedId: item.savedId || String(item._id),
          providerType: 'ORGANIZATION',
          providerId: item.organizationId._id,
          name: item.organizationId.name,
          orgType: item.organizationId.orgType,
          address: item.organizationId.operatingAddress || item.organizationId.address,
          rating: item.organizationId.rating,
          notes: item.notes,
          savedAt: item.createdAt,
        };
      }
      return item;
    });
  }

  async removeSavedProvider(userId, savedIdOrProviderId) {
    if (!userId) throw new Error('Authentication required.');
    const query = {
      userId,
      $or: [
        { savedId: savedIdOrProviderId },
        ...(mongoose.Types.ObjectId.isValid(savedIdOrProviderId)
          ? [
              { _id: savedIdOrProviderId },
              { doctorId: savedIdOrProviderId },
              { organizationId: savedIdOrProviderId },
            ]
          : []),
      ],
    };
    const res = await SavedHealthcareProvider.deleteOne(query);
    return { success: true, deletedCount: res.deletedCount };
  }
}

export const healthcareSearchService = new HealthcareSearchService();

