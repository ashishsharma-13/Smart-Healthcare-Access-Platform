import { emergencyRepository } from '../repositories/EmergencyRepository.js';
import { emergencyCategoryRepository } from '../repositories/EmergencyCategoryRepository.js';
import { emergencyGuidanceRepository } from '../repositories/EmergencyGuidanceRepository.js';
import { notificationService } from './NotificationService.js';
import { User } from '../models/User.js';

export class EmergencyRequestService {
  /**
   * Retrieves active emergency categories for patients/public.
   */
  async getCategories(includeInactive = false) {
    if (includeInactive) {
      return await emergencyCategoryRepository.listAllCategories();
    }
    return await emergencyCategoryRepository.listActiveCategories();
  }

  /**
   * Retrieves medically approved guidance for a category.
   */
  async getGuidanceForCategory(categoryIdOrSlug) {
    const category = await emergencyCategoryRepository.findByIdOrSlug(categoryIdOrSlug);
    if (!category) {
      const err = new Error('Emergency category not found');
      err.statusCode = 404;
      throw err;
    }

    const guidance = await emergencyGuidanceRepository.findApprovedByCategoryId(category._id);
    return {
      category,
      guidance: guidance || null,
      available: !!guidance,
    };
  }

  /**
   * Creates an emergency request in CREATED status.
   * Step 4, Step 5, Step 6, Step 8, Step 9, Step 11 & Step 12.
   */
  async createEmergencyRequest({
    user,
    categoryId,
    categorySlug,
    categoryName,
    description = '',
    ambulanceRequirement = 'NO',
    latitude,
    longitude,
    address,
    locationAccuracy = null,
    locationSource = 'GPS',
    locationConfirmed = true,
    patientDetails = null,
    idempotencyKey = null,
  }) {
    if (!user || !user._id) {
      const err = new Error('Authentication required');
      err.statusCode = 401;
      throw err;
    }

    // 1. Validate Category
    let category = null;
    const catLookup = categoryId || categorySlug || categoryName;
    if (catLookup) {
      category = await emergencyCategoryRepository.findByIdOrSlug(catLookup);
    }

    if (!category) {
      const err = new Error('Invalid emergency category provided');
      err.statusCode = 400;
      throw err;
    }

    if (!category.active) {
      const err = new Error('Selected emergency category is currently inactive');
      err.statusCode = 400;
      throw err;
    }

    // 2. Validate Ambulance Requirement (YES, NO, ALREADY_ARRANGED)
    const normalizedAmbulance = String(ambulanceRequirement || 'NO').toUpperCase().trim();
    const validAmbulanceOptions = ['YES', 'NO', 'ALREADY_ARRANGED'];
    if (!validAmbulanceOptions.includes(normalizedAmbulance)) {
      const err = new Error('Invalid ambulance requirement. Must be YES, NO, or ALREADY_ARRANGED');
      err.statusCode = 400;
      throw err;
    }

    // 3. Validate Location Coordinates
    const parsedLat = parseFloat(latitude);
    const parsedLng = parseFloat(longitude);

    if (
      latitude === undefined ||
      latitude === null ||
      longitude === undefined ||
      longitude === null ||
      isNaN(parsedLat) ||
      isNaN(parsedLng) ||
      parsedLat < -90 ||
      parsedLat > 90 ||
      parsedLng < -180 ||
      parsedLng > 180
    ) {
      const err = new Error('Valid emergency location coordinates (latitude and longitude) are required');
      err.statusCode = 400;
      throw err;
    }

    const resolvedAddress = (address && address.trim()) || `GPS Location (${parsedLat.toFixed(5)}, ${parsedLng.toFixed(5)})`;
    const normalizedSource = locationSource && String(locationSource).toUpperCase() === 'MANUAL' ? 'MANUAL' : 'GPS';

    // 4. Idempotency / Duplicate Submission Check
    // If user made a request in the last 15 seconds with the same category and status CREATED
    const recentDuplicate = await emergencyRepository.listAllRequests({
      patientId: user._id,
      emergencyCategoryId: category._id,
      status: 'CREATED',
      createdAt: { $gte: new Date(Date.now() - 15 * 1000) },
    });

    if (recentDuplicate && recentDuplicate.length > 0) {
      return {
        isDuplicate: true,
        emergencyRequest: recentDuplicate[0],
        message: 'Existing emergency request found created recently',
      };
    }

    // 5. Build Request Record
    const requestCode = `EMG-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    const patientName = patientDetails?.name || user.name || 'Emergency Patient';
    const patientPhone = patientDetails?.phone || user.phone || '9999999999';

    const newRequestData = {
      requestCode,
      emergencyRequestId: requestCode,
      patientId: user._id,
      reportedByUserId: user._id,
      patientName,
      patientPhone,
      emergencyCategoryId: category._id,
      emergencyType: category.slug,
      description: (description || '').trim(),
      ambulanceRequirement: normalizedAmbulance,
      location: {
        type: 'Point',
        coordinates: [parsedLng, parsedLat],
      },
      latitude: parsedLat,
      longitude: parsedLng,
      address: resolvedAddress,
      locationAddress: resolvedAddress,
      locationAccuracy: locationAccuracy ? parseFloat(locationAccuracy) : (normalizedSource === 'GPS' ? 10 : null),
      locationSource: normalizedSource,
      locationConfirmed: !!locationConfirmed,
      locationSnapshot: {
        coordinates: [parsedLng, parsedLat],
        address: resolvedAddress,
        accuracy: locationAccuracy ? parseFloat(locationAccuracy) : (normalizedSource === 'GPS' ? 10 : null),
        source: normalizedSource,
        capturedAt: new Date(),
      },
      status: 'CREATED', // STRICT REQUIREMENT: module sets CREATED
      statusHistory: [
        {
          status: 'CREATED',
          timestamp: new Date(),
          notes: `Emergency request created via ${normalizedSource} location capture. Ambulance option: ${normalizedAmbulance}.`,
          updatedBy: user._id,
        },
      ],
    };

    const createdRequest = await emergencyRepository.createRequest(newRequestData);

    // Record Initial Event
    await emergencyRepository.createEvent({
      emergencyRequestId: createdRequest._id,
      eventType: 'REQUEST_CREATED',
      previousState: null,
      newState: 'CREATED',
      actorId: user._id,
      metadata: {
        category: category.categoryName,
        ambulanceRequirement: normalizedAmbulance,
        locationSource: normalizedSource,
        locationAccuracy: newRequestData.locationAccuracy,
      },
    });

    // Module 13 Notification Dispatch
    notificationService.createNotification({
      recipientUserId: user._id,
      emergencyRequestId: createdRequest._id,
      notificationType: 'EMERGENCY_REQUEST_CREATED',
      title: 'Emergency Request Initiated',
      message: `Emergency request ${createdRequest.emergencyRequestId || createdRequest.requestCode} recorded in CREATED state.`,
      priority: 'EMERGENCY',
      actionUrl: `/emergency/broadcast/${createdRequest._id}`,
    }).catch((e) => console.warn('[Notification Warning]', e.message));

    return {
      isDuplicate: false,
      emergencyRequest: createdRequest,
      message: 'Emergency request created successfully in CREATED state',
    };
  }

  /**
   * Retrieves requests belonging to the authenticated patient.
   */
  async getMyRequests(userId) {
    return await emergencyRepository.listRequestsForPatient(userId);
  }

  /**
   * Retrieves single emergency request with ownership/role check and event log.
   */
  async getRequestById(id, user) {
    const request = await emergencyRepository.findRequestById(id);
    if (!request) {
      const err = new Error('Emergency request not found');
      err.statusCode = 404;
      throw err;
    }

    // Role-based / ownership access validation
    if (user.role === 'patient') {
      const isOwner =
        (request.patientId && String(request.patientId._id || request.patientId) === String(user._id)) ||
        (request.reportedByUserId && String(request.reportedByUserId._id || request.reportedByUserId) === String(user._id));

      if (!isOwner) {
        const err = new Error('Access denied. You do not own this emergency request');
        err.statusCode = 403;
        throw err;
      }
    }

    const events = await emergencyRepository.getEventsForRequest(request._id);
    const broadcasts = await emergencyRepository.getBroadcastsForRequest(request._id);

    return {
      request,
      events,
      broadcasts,
    };
  }

  /**
   * Cancels an emergency request if not already completed.
   */
  async cancelRequest(id, user, reason = '') {
    const request = await emergencyRepository.findRequestById(id);
    if (!request) {
      const err = new Error('Emergency request not found');
      err.statusCode = 404;
      throw err;
    }

    if (user.role === 'patient') {
      const isOwner =
        (request.patientId && String(request.patientId._id || request.patientId) === String(user._id)) ||
        (request.reportedByUserId && String(request.reportedByUserId._id || request.reportedByUserId) === String(user._id));

      if (!isOwner) {
        const err = new Error('Access denied. You cannot cancel this emergency request');
        err.statusCode = 403;
        throw err;
      }
    }

    if (['COMPLETED', 'CANCELLED', 'ARRIVED'].includes(request.status)) {
      const err = new Error(`Cannot cancel an emergency request in ${request.status} status`);
      err.statusCode = 400;
      throw err;
    }

    const updated = await emergencyRepository.cancelEmergencyRequest(
      request._id,
      user._id,
      reason || 'Cancelled by user'
    );

    return updated;
  }

  // --- Admin Methods ---
  async adminListCategories() {
    return await emergencyCategoryRepository.listAllCategories();
  }

  async adminCreateCategory(adminUser, data) {
    if (!data.categoryName || !data.slug) {
      const err = new Error('categoryName and slug are required');
      err.statusCode = 400;
      throw err;
    }
    return await emergencyCategoryRepository.createCategory(data);
  }

  async adminUpdateCategory(adminUser, id, data) {
    const updated = await emergencyCategoryRepository.updateCategory(id, data);
    if (!updated) {
      const err = new Error('Emergency category not found');
      err.statusCode = 404;
      throw err;
    }
    return updated;
  }

  async adminListGuidance(filter = {}) {
    return await emergencyGuidanceRepository.listAllGuidance(filter);
  }

  async adminCreateGuidance(adminUser, data) {
    if (!data.categoryId || !data.title || !data.content) {
      const err = new Error('categoryId, title, and content are required');
      err.statusCode = 400;
      throw err;
    }
    return await emergencyGuidanceRepository.createGuidance({
      ...data,
      reviewedBy: adminUser._id,
      reviewedAt: new Date(),
    });
  }

  async adminUpdateGuidance(adminUser, id, data) {
    const updated = await emergencyGuidanceRepository.updateGuidance(id, data);
    if (!updated) {
      const err = new Error('Guidance record not found');
      err.statusCode = 404;
      throw err;
    }
    return updated;
  }

  async adminApproveGuidance(adminUser, id) {
    const approved = await emergencyGuidanceRepository.approveGuidance(id, adminUser._id);
    if (!approved) {
      const err = new Error('Guidance record not found');
      err.statusCode = 404;
      throw err;
    }
    return approved;
  }
}

export const emergencyRequestService = new EmergencyRequestService();

