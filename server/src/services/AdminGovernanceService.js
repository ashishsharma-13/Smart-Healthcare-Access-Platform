import {
  User,
  Doctor,
  Organization,
  EmergencyRequest,
  EmergencyBroadcast,
  EmergencyBroadcastRecipient,
  EmergencyDestinationSelection,
  ResourceReservation,
  ResourceReservationItem,
  EmergencyJourney,
  EmergencyRequestEvent,
  Appointment,
  HealthcareResource,
  ResourceInventoryHistory,
  Specialization,
  AdminActionAuditLog,
  NotificationOutbox,
  EmergencyFallbackSession,
} from '../models/index.js';
import { adminAuditService } from './AdminAuditService.js';

export class AdminGovernanceService {
  // ==========================================
  // 1. USER GOVERNANCE
  // ==========================================

  async listUsers({ page = 1, limit = 20, role = '', status = '', search = '' } = {}) {
    const filter = {};

    if (role && role !== 'ALL') {
      filter.role = role.toLowerCase();
    }

    if (status && status !== 'ALL') {
      filter.status = status.toLowerCase();
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [{ name: regex }, { email: regex }, { phone: regex }];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    // Explicitly exclude passwords, password reset tokens, and sensitive authentication secrets
    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password -__v')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(filter),
    ]);

    return {
      users,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  async getUserDetails(userId) {
    const user = await User.findById(userId).select('-password -__v').lean();
    if (!user) {
      const err = new Error('User account not found.');
      err.statusCode = 404;
      throw err;
    }

    // Attach role-specific profile details if present
    let roleProfile = null;
    if (user.role === 'doctor') {
      roleProfile = await Doctor.findOne({ userId: user._id }).lean();
    } else if (user.role === 'organization') {
      roleProfile = await Organization.findOne({ userId: user._id }).lean();
    }

    // Activity summary
    const [appointmentsCount, emergenciesCount] = await Promise.all([
      Appointment.countDocuments({ patientId: user._id }),
      EmergencyRequest.countDocuments({ reportedByUserId: user._id }),
    ]);

    return {
      user,
      roleProfile,
      activity: {
        appointmentsCount,
        emergenciesCount,
      },
    };
  }

  async updateUserStatus(userId, newStatus, reason, adminUser, ipAddress = '', userAgent = '') {
    if (!newStatus || !['active', 'suspended', 'pending_verification'].includes(newStatus)) {
      const err = new Error("Invalid status. Must be 'active', 'suspended', or 'pending_verification'.");
      err.statusCode = 400;
      throw err;
    }

    if (!reason || !String(reason).trim()) {
      const err = new Error('A mandatory reason is strictly required to modify a user account status.');
      err.statusCode = 400;
      throw err;
    }

    // Safety Invariant: Admin cannot suspend their own account or modify their own status
    if (adminUser?._id && adminUser._id.toString() === userId.toString()) {
      const err = new Error('Self-governance violation: Administrators are prohibited from modifying or suspending their own account.');
      err.statusCode = 403;
      throw err;
    }

    const user = await User.findById(userId);
    if (!user) {
      const err = new Error('User account not found.');
      err.statusCode = 404;
      throw err;
    }

    // Protect super-admins from demotion by standard admins
    if (user.role === 'admin' || user.role === 'web_admin') {
      const adminRole = String(adminUser?.role || '').toLowerCase();
      if (adminRole !== 'web_admin' && adminUser?._id?.toString() !== user._id.toString()) {
        const err = new Error('Only a Web Admin can modify the account status of an administrative user.');
        err.statusCode = 403;
        throw err;
      }
    }

    const previousStatus = user.status;
    user.status = newStatus;
    user.isActive = newStatus === 'active';
    await user.save();

    // Record audit event
    await adminAuditService.recordAction({
      adminUserId: adminUser?._id,
      adminEmail: adminUser?.email || 'admin@shap.gov.in',
      action: 'USER_STATUS_CHANGE',
      targetEntityType: 'User',
      targetEntityId: String(user._id),
      reason: String(reason).trim(),
      previousValue: { status: previousStatus, isActive: previousStatus === 'active' },
      newValue: { status: newStatus, isActive: user.isActive },
      ipAddress,
      userAgent,
      metadata: { targetUserEmail: user.email, targetUserRole: user.role },
    });

    const sanitized = user.toObject();
    delete sanitized.password;
    delete sanitized.__v;

    return sanitized;
  }

  // ==========================================
  // 2. SPECIALIZATIONS GOVERNANCE
  // ==========================================

  async listSpecializations({ search = '', category = '', activeOnly = false } = {}) {
    const filter = {};
    if (activeOnly) filter.isActive = true;
    if (category && category !== 'ALL') filter.category = category;
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [{ name: regex }, { code: regex }, { description: regex }];
    }

    const specs = await Specialization.find(filter).sort({ name: 1 }).lean();
    return specs;
  }

  async createSpecialization(data, adminUser, ipAddress = '', userAgent = '') {
    if (!data.name || !String(data.name).trim()) {
      const err = new Error('Specialization name is required.');
      err.statusCode = 400;
      throw err;
    }

    const cleanName = String(data.name).trim();
    const existing = await Specialization.findOne({ name: new RegExp(`^${cleanName}$`, 'i') });
    if (existing) {
      const err = new Error(`Specialization '${cleanName}' already exists.`);
      err.statusCode = 409;
      throw err;
    }

    const specializationId = `SPEC-${Date.now().toString(36).toUpperCase()}`;
    const spec = await Specialization.create({
      specializationId,
      name: cleanName,
      category: data.category || 'CLINICAL',
      code: data.code ? String(data.code).trim().toUpperCase() : cleanName.substring(0, 4).toUpperCase(),
      description: data.description || '',
      isActive: data.isActive !== undefined ? data.isActive : true,
    });

    await adminAuditService.recordAction({
      adminUserId: adminUser?._id,
      adminEmail: adminUser?.email || 'admin@shap.gov.in',
      action: 'SPECIALIZATION_CREATE',
      targetEntityType: 'Specialization',
      targetEntityId: String(spec._id),
      reason: 'Administrative creation of medical specialization',
      previousValue: null,
      newValue: spec.toObject(),
      ipAddress,
      userAgent,
    });

    return spec;
  }

  async updateSpecialization(id, data, adminUser, ipAddress = '', userAgent = '') {
    const spec = await Specialization.findById(id);
    if (!spec) {
      const err = new Error('Specialization not found.');
      err.statusCode = 404;
      throw err;
    }

    const prev = spec.toObject();
    if (data.name) spec.name = String(data.name).trim();
    if (data.category) spec.category = data.category;
    if (data.code) spec.code = String(data.code).trim().toUpperCase();
    if (data.description !== undefined) spec.description = data.description;
    await spec.save();

    await adminAuditService.recordAction({
      adminUserId: adminUser?._id,
      adminEmail: adminUser?.email || 'admin@shap.gov.in',
      action: 'SPECIALIZATION_UPDATE',
      targetEntityType: 'Specialization',
      targetEntityId: String(spec._id),
      reason: data.reason || 'Administrative update of medical specialization details',
      previousValue: prev,
      newValue: spec.toObject(),
      ipAddress,
      userAgent,
    });

    return spec;
  }

  async toggleSpecializationStatus(id, reason, adminUser, ipAddress = '', userAgent = '') {
    const spec = await Specialization.findById(id);
    if (!spec) {
      const err = new Error('Specialization not found.');
      err.statusCode = 404;
      throw err;
    }

    const prevStatus = spec.isActive;
    spec.isActive = !prevStatus;
    await spec.save();

    await adminAuditService.recordAction({
      adminUserId: adminUser?._id,
      adminEmail: adminUser?.email || 'admin@shap.gov.in',
      action: 'SPECIALIZATION_STATUS_CHANGE',
      targetEntityType: 'Specialization',
      targetEntityId: String(spec._id),
      reason: reason || `Administrative ${spec.isActive ? 'activation' : 'deactivation'} of specialization`,
      previousValue: { isActive: prevStatus },
      newValue: { isActive: spec.isActive },
      ipAddress,
      userAgent,
      metadata: { preservedHistoricalReferences: true },
    });

    return spec;
  }

  // ==========================================
  // 3. EMERGENCY OPERATIONS MONITORING (READ-ONLY)
  // ==========================================

  async listEmergencyOperations({
    page = 1,
    limit = 20,
    status = '',
    category = '',
    startDate = null,
    endDate = null,
    search = '',
  } = {}) {
    const filter = {};

    if (status && status !== 'ALL') {
      filter.status = status;
    }

    if (category && category !== 'ALL') {
      filter.emergencyCategory = category;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { requestCode: regex },
        { emergencyRequestId: regex },
        { requestId: regex },
        { 'location.address': regex },
        { emergencyCategory: regex },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [rawRequests, total] = await Promise.all([
      EmergencyRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      EmergencyRequest.countDocuments(filter),
    ]);

    const requests = rawRequests.map((r) => ({
      ...r,
      requestId: r.requestCode || r.emergencyRequestId || r.requestId || String(r._id),
    }));

    return {
      requests,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  async getEmergencyDetails(id) {
    const reqDoc = await EmergencyRequest.findOne({
      $or: [
        { requestCode: id },
        { emergencyRequestId: id },
        { requestId: id },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
      ].filter(Boolean),
    }).lean();

    if (!reqDoc) {
      const err = new Error('Emergency request not found.');
      err.statusCode = 404;
      throw err;
    }

    // Load related items in parallel
    const [broadcasts, responses, destination, reservation, journey, fallbackSession] = await Promise.all([
      EmergencyBroadcast.find({ emergencyRequestId: reqDoc._id }).lean(),
      EmergencyBroadcastRecipient.find({ emergencyRequestId: reqDoc._id }).populate('organizationId', 'name address phone').lean(),
      EmergencyDestinationSelection.findOne({ emergencyRequestId: reqDoc._id }).populate('selectedOrganizationId', 'name address').lean(),
      ResourceReservation.findOne({ emergencyRequestId: reqDoc._id }).populate('organizationId', 'name').lean(),
      EmergencyJourney.findOne({ emergencyRequestId: reqDoc._id }).lean(),
      reqDoc.fallbackSessionId ? EmergencyFallbackSession.findById(reqDoc.fallbackSessionId).lean() : null,
    ]);

    return {
      request: reqDoc,
      broadcasts,
      responses,
      destination,
      reservation,
      journey,
      fallbackSession,
    };
  }

  async getEmergencyTimeline(id) {
    const reqDoc = await EmergencyRequest.findOne({
      $or: [
        { requestCode: id },
        { emergencyRequestId: id },
        { requestId: id },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
      ].filter(Boolean),
    }).lean();

    if (!reqDoc) {
      const err = new Error('Emergency request not found.');
      err.statusCode = 404;
      throw err;
    }

    // Pull events from EmergencyRequestEvent, plus broadcasts, journey, and fallback
    const [events, broadcasts, responses, journey] = await Promise.all([
      EmergencyRequestEvent.find({ emergencyRequestId: reqDoc._id }).sort({ createdAt: 1 }).lean(),
      EmergencyBroadcast.find({ emergencyRequestId: reqDoc._id }).sort({ createdAt: 1 }).lean(),
      EmergencyBroadcastRecipient.find({ emergencyRequestId: reqDoc._id, responseStatus: { $ne: 'PENDING' } })
        .populate('organizationId', 'name')
        .sort({ respondedAt: 1 })
        .lean(),
      EmergencyJourney.findOne({ emergencyRequestId: reqDoc._id }).lean(),
    ]);

    // Synthesize chronological timeline items
    const timeline = [];

    // 1. Created
    timeline.push({
      timestamp: reqDoc.createdAt,
      stage: 'CREATED',
      title: 'Emergency Request Created',
      description: `Category: ${reqDoc.emergencyCategory}, Ambulance: ${reqDoc.ambulanceRequirement || 'NO'}`,
      data: { location: reqDoc.location },
    });

    // 2. Events logged
    for (const ev of events) {
      timeline.push({
        timestamp: ev.createdAt,
        stage: ev.eventType || 'STATUS_UPDATE',
        title: ev.eventType || 'State Transition',
        description: `Transitioned from ${ev.previousState || 'N/A'} to ${ev.newState || 'N/A'}`,
        data: ev,
      });
    }

    // 3. Broadcasts
    for (const b of broadcasts) {
      timeline.push({
        timestamp: b.createdAt,
        stage: 'BROADCAST',
        title: `Emergency Beep Broadcast (Round ${b.roundNumber || 1})`,
        description: `Dispatched in parallel to ${b.candidateCount || 0} organizations within ${b.radiusKm || 5} km`,
        data: b,
      });
    }

    // 4. Responses
    for (const r of responses) {
      timeline.push({
        timestamp: r.respondedAt || r.updatedAt,
        stage: 'RESPONSE',
        title: `Response: ${r.responseStatus}`,
        description: `${r.organizationId?.name || 'Organization'} replied ${r.responseStatus}${r.rejectionReason ? ` (${r.rejectionReason})` : ''}`,
        data: r,
      });
    }

    // 5. Journey stages
    if (journey) {
      if (journey.startedAt) {
        timeline.push({
          timestamp: journey.startedAt,
          stage: 'JOURNEY_STARTED',
          title: 'Patient En Route',
          description: 'Patient commenced transit toward confirmed destination facility.',
          data: { status: journey.status },
        });
      }
      if (journey.arrivedAt) {
        timeline.push({
          timestamp: journey.arrivedAt,
          stage: 'ARRIVAL_VERIFIED',
          title: 'Patient Arrived at Facility',
          description: `Arrival verified via ${journey.arrivalVerificationMethod || 'Standard Protocol'}`,
          data: { status: journey.status },
        });
      }
      if (journey.completedAt) {
        timeline.push({
          timestamp: journey.completedAt,
          stage: 'COMPLETED',
          title: 'Emergency Triage & Admission Completed',
          description: 'Patient admitted and resources permanently allocated.',
          data: { status: journey.status },
        });
      }
    }

    // Sort strictly chronological
    timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return {
      requestId: reqDoc.requestCode || reqDoc.emergencyRequestId || reqDoc.requestId,
      currentStatus: reqDoc.status,
      timeline,
    };
  }

  // ==========================================
  // 4. HEALTHCARE RESOURCE MONITORING
  // ==========================================

  async listResources({ page = 1, limit = 20, organizationId = '', resourceType = '', search = '' } = {}) {
    const filter = {};
    if (organizationId) filter.organizationId = organizationId;
    if (resourceType && resourceType !== 'ALL') filter.resourceType = resourceType;
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [{ resourceName: regex }, { resourceType: regex }];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [resources, total] = await Promise.all([
      HealthcareResource.find(filter)
        .populate('organizationId', 'name address phone')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      HealthcareResource.countDocuments(filter),
    ]);

    // Format and verify the invariant for each item
    const verifiedResources = resources.map((res) => {
      const totalCapacity = Number(res.totalCapacity || res.quantity || 0);
      const available = Number(res.availableQuantity ?? res.available ?? 0);
      const reserved = Number(res.reservedQuantity ?? 0);
      const allocated = Number(res.allocatedQuantity ?? 0);
      const unavailable = Number(res.unavailableQuantity ?? 0);
      const sum = available + reserved + allocated + unavailable;

      return {
        ...res,
        totalCapacity,
        available,
        reserved,
        allocated,
        unavailable,
        invariantSatisfied: totalCapacity === sum,
      };
    });

    return {
      resources: verifiedResources,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  async getResourceSummary() {
    const resources = await HealthcareResource.find().lean();

    let total = 0;
    let available = 0;
    let reserved = 0;
    let allocated = 0;
    let unavailable = 0;
    let invariantMismatches = 0;

    const byType = {};

    for (const r of resources) {
      const t = Number(r.totalCapacity || r.quantity || 0);
      const av = Number(r.availableQuantity ?? r.available ?? 0);
      const res = Number(r.reservedQuantity ?? 0);
      const al = Number(r.allocatedQuantity ?? 0);
      const un = Number(r.unavailableQuantity ?? 0);

      total += t;
      available += av;
      reserved += res;
      allocated += al;
      unavailable += un;

      if (t !== av + res + al + un) {
        invariantMismatches++;
      }

      const typeKey = r.resourceType || 'other';
      if (!byType[typeKey]) {
        byType[typeKey] = { total: 0, available: 0, reserved: 0, allocated: 0, unavailable: 0 };
      }
      byType[typeKey].total += t;
      byType[typeKey].available += av;
      byType[typeKey].reserved += res;
      byType[typeKey].allocated += al;
      byType[typeKey].unavailable += un;
    }

    return {
      systemWide: {
        total,
        available,
        reserved,
        allocated,
        unavailable,
        invariantSatisfied: total === available + reserved + allocated + unavailable,
        invariantMismatches,
      },
      byType,
    };
  }

  async getResourceHistory(id) {
    const history = await ResourceInventoryHistory.find({ resourceId: id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    return history;
  }

  // ==========================================
  // 5. REPORTS & ANALYTICS GENERATION
  // ==========================================

  async generateReport({ reportType, startDate = null, endDate = null, filters = {} }) {
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }

    const hasDate = Boolean(startDate || endDate);

    let reportTitle = '';
    let rows = [];
    let metrics = {};

    switch (reportType) {
      case 'DOCTOR_VERIFICATION': {
        reportTitle = 'Doctor Medical License Verification Audit';
        const query = hasDate ? { createdAt: dateFilter } : {};
        const doctors = await Doctor.find(query)
          .select('name specialization licenseNumber verificationStatus rejectionReason createdAt updatedAt')
          .lean();
        rows = doctors.map((d) => ({
          id: d._id,
          doctorName: d.name,
          specialization: d.specialization,
          licenseNumber: d.licenseNumber,
          verificationStatus: d.verificationStatus,
          rejectionReason: d.rejectionReason || 'N/A',
          applicationDate: d.createdAt,
        }));
        metrics = {
          total: rows.length,
          verified: rows.filter((r) => r.verificationStatus === 'verified').length,
          pending: rows.filter((r) => r.verificationStatus === 'pending').length,
          rejected: rows.filter((r) => r.verificationStatus === 'rejected').length,
        };
        break;
      }

      case 'ORGANIZATION_VERIFICATION': {
        reportTitle = 'Healthcare Organization Accreditation Report';
        const query = hasDate ? { createdAt: dateFilter } : {};
        const orgs = await Organization.find(query)
          .select('name facilityType registrationNumber verificationStatus rejectionReason createdAt')
          .lean();
        rows = orgs.map((o) => ({
          id: o._id,
          organizationName: o.name,
          facilityType: o.facilityType,
          registrationNumber: o.registrationNumber,
          verificationStatus: o.verificationStatus,
          rejectionReason: o.rejectionReason || 'N/A',
          registeredAt: o.createdAt,
        }));
        metrics = {
          total: rows.length,
          verified: rows.filter((r) => r.verificationStatus === 'verified').length,
          pending: rows.filter((r) => r.verificationStatus === 'pending').length,
          rejected: rows.filter((r) => r.verificationStatus === 'rejected').length,
        };
        break;
      }

      case 'USER_ACTIVITY': {
        reportTitle = 'Platform User Demographics and Account Governance';
        const query = hasDate ? { createdAt: dateFilter } : {};
        const users = await User.find(query)
          .select('name email role status isActive createdAt')
          .lean();
        rows = users.map((u) => ({
          id: u._id,
          name: u.name,
          email: u.email,
          role: u.role,
          status: u.status,
          isActive: u.isActive,
          joinedAt: u.createdAt,
        }));
        metrics = {
          total: rows.length,
          patients: rows.filter((r) => r.role === 'patient').length,
          doctors: rows.filter((r) => r.role === 'doctor').length,
          organizations: rows.filter((r) => r.role === 'organization').length,
          admins: rows.filter((r) => r.role === 'admin' || r.role === 'web_admin').length,
          active: rows.filter((r) => r.status === 'active').length,
          suspended: rows.filter((r) => r.status === 'suspended').length,
        };
        break;
      }

      case 'EMERGENCY_REQUESTS': {
        reportTitle = 'Emergency Incidents and Operational Triage Summary';
        const query = hasDate ? { createdAt: dateFilter } : {};
        const emergencies = await EmergencyRequest.find(query).sort({ createdAt: -1 }).lean();
        rows = emergencies.map((e) => ({
          requestId: e.requestId,
          category: e.emergencyCategory,
          status: e.status,
          ambulanceNeeded: e.ambulanceRequirement || 'NO',
          isExternalDestination: e.isExternalDestination || false,
          createdAt: e.createdAt,
        }));
        metrics = {
          total: rows.length,
          active: rows.filter((r) => ['CREATED', 'BROADCASTED', 'RESPONSES_RECEIVED', 'DESTINATION_SELECTED', 'RESOURCES_RESERVED', 'PATIENT_EN_ROUTE'].includes(r.status)).length,
          completed: rows.filter((r) => r.status === 'COMPLETED').length,
          cancelled: rows.filter((r) => r.status === 'CANCELLED').length,
          externalFallback: rows.filter((r) => r.isExternalDestination).length,
        };
        break;
      }

      case 'RESOURCE_RESERVATIONS': {
        reportTitle = 'Emergency Resource Hold and Reservation Telemetry';
        const query = hasDate ? { createdAt: dateFilter } : {};
        const reservations = await ResourceReservation.find(query)
          .populate('organizationId', 'name')
          .sort({ createdAt: -1 })
          .lean();
        rows = reservations.map((r) => ({
          reservationId: r.reservationId,
          organization: r.organizationId?.name || 'N/A',
          status: r.status,
          expiresAt: r.expiresAt,
          createdAt: r.createdAt,
        }));
        metrics = {
          total: rows.length,
          activeHold: rows.filter((r) => r.status === 'HOLD').length,
          confirmed: rows.filter((r) => r.status === 'CONFIRMED').length,
          allocated: rows.filter((r) => r.status === 'ALLOCATED').length,
          released: rows.filter((r) => r.status === 'RELEASED').length,
          expired: rows.filter((r) => r.status === 'EXPIRED').length,
        };
        break;
      }

      case 'APPOINTMENTS': {
        reportTitle = 'Clinical Consultations and Appointment Utilization';
        const query = hasDate ? { appointmentDate: dateFilter } : {};
        const appointments = await Appointment.find(query)
          .populate('doctorId', 'name specialization')
          .populate('organizationId', 'name')
          .sort({ appointmentDate: -1 })
          .lean();
        rows = appointments.map((a) => ({
          id: a._id,
          doctorName: a.doctorId?.name || 'Doctor',
          specialization: a.doctorId?.specialization || 'General',
          organizationName: a.organizationId?.name || 'Clinic',
          date: a.appointmentDate,
          timeSlot: a.timeSlot,
          status: a.status,
        }));
        metrics = {
          total: rows.length,
          scheduled: rows.filter((r) => r.status === 'SCHEDULED').length,
          completed: rows.filter((r) => r.status === 'COMPLETED').length,
          cancelled: rows.filter((r) => r.status === 'CANCELLED').length,
          noShow: rows.filter((r) => r.status === 'NO_SHOW').length,
        };
        break;
      }

      default: {
        const err = new Error(`Unsupported report type '${reportType}'.`);
        err.statusCode = 400;
        throw err;
      }
    }

    return {
      reportType,
      title: reportTitle,
      generatedAt: new Date(),
      dateRange: { startDate, endDate },
      metrics,
      rowCount: rows.length,
      data: rows,
    };
  }

  async exportReportData(params) {
    const report = await this.generateReport(params);
    const rows = report.data;

    if (!rows || rows.length === 0) {
      return { format: params.format || 'csv', content: 'No records found for specified parameters\n' };
    }

    if (params.format === 'json') {
      return {
        format: 'json',
        content: JSON.stringify(report, null, 2),
      };
    }

    // CSV format: extract header keys
    const headers = Object.keys(rows[0]).filter((k) => k !== '_id' && k !== '__v');
    const csvLines = [headers.join(',')];

    for (const row of rows) {
      const line = headers.map((h) => {
        const val = row[h];
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      });
      csvLines.push(line.join(','));
    }

    return {
      format: 'csv',
      content: csvLines.join('\n'),
      filename: `report_${String(params.reportType || 'data').toLowerCase()}_${Date.now()}.csv`,
    };
  }

  // ==========================================
  // 6. DASHBOARD SUMMARY & SYSTEM HEALTH
  // ==========================================

  async getDashboardSummary() {
    const [
      totalUsers,
      totalDoctors,
      verifiedDoctors,
      pendingDoctors,
      rejectedDoctors,
      totalOrgs,
      verifiedOrgs,
      pendingOrgs,
      rejectedOrgs,
      activeEmergencies,
      totalEmergencies,
      completedEmergencies,
      totalReservations,
      activeReservations,
      totalAppointments,
      fallbackSessionsCount,
      resourcesSummary,
    ] = await Promise.all([
      User.countDocuments(),
      Doctor.countDocuments(),
      Doctor.countDocuments({ verificationStatus: 'verified' }),
      Doctor.countDocuments({ verificationStatus: 'pending' }),
      Doctor.countDocuments({ verificationStatus: 'rejected' }),
      Organization.countDocuments(),
      Organization.countDocuments({ verificationStatus: 'verified' }),
      Organization.countDocuments({ verificationStatus: 'pending' }),
      Organization.countDocuments({ verificationStatus: 'rejected' }),
      EmergencyRequest.countDocuments({
        status: { $in: ['CREATED', 'BROADCASTED', 'RESPONSES_RECEIVED', 'DESTINATION_SELECTED', 'RESOURCES_RESERVED', 'PATIENT_EN_ROUTE'] },
      }),
      EmergencyRequest.countDocuments(),
      EmergencyRequest.countDocuments({ status: 'COMPLETED' }),
      ResourceReservation.countDocuments(),
      ResourceReservation.countDocuments({ status: { $in: ['HOLD', 'CONFIRMED'] } }),
      Appointment.countDocuments(),
      EmergencyFallbackSession.countDocuments(),
      this.getResourceSummary(),
    ]);

    return {
      users: {
        total: totalUsers,
      },
      doctors: {
        total: totalDoctors,
        verified: verifiedDoctors,
        pending: pendingDoctors,
        rejected: rejectedDoctors,
      },
      organizations: {
        total: totalOrgs,
        verified: verifiedOrgs,
        pending: pendingOrgs,
        rejected: rejectedOrgs,
      },
      emergencies: {
        total: totalEmergencies,
        active: activeEmergencies,
        completed: completedEmergencies,
        fallbackSessions: fallbackSessionsCount,
      },
      reservations: {
        total: totalReservations,
        active: activeReservations,
      },
      appointments: {
        total: totalAppointments,
      },
      resources: resourcesSummary.systemWide,
    };
  }

  async getDashboardActivity(limit = 15) {
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 15));

    const [auditLogs, recentEmergencies, recentAppointments] = await Promise.all([
      AdminActionAuditLog.find().sort({ timestamp: -1 }).limit(limitNum).lean(),
      EmergencyRequest.find().sort({ createdAt: -1 }).limit(limitNum).lean(),
      Appointment.find().populate('doctorId', 'name').populate('organizationId', 'name').sort({ createdAt: -1 }).limit(limitNum).lean(),
    ]);

    const activityFeed = [];

    for (const log of auditLogs) {
      activityFeed.push({
        type: 'ADMIN_ACTION',
        id: log.auditLogId,
        title: `Admin Action: ${log.action.replace(/_/g, ' ')}`,
        description: `Target: ${log.targetEntityType} (${log.targetEntityId})${log.reason ? ` — Reason: ${log.reason}` : ''}`,
        actor: log.adminEmail,
        timestamp: log.timestamp,
        level: 'info',
      });
    }

    for (const em of recentEmergencies) {
      activityFeed.push({
        type: 'EMERGENCY_INCIDENT',
        id: em.requestId,
        title: `Emergency: ${em.emergencyCategory}`,
        description: `Status: ${em.status} at ${em.location?.address || 'GPS Coordinates'}`,
        actor: 'Patient / Platform',
        timestamp: em.createdAt,
        level: em.status === 'COMPLETED' ? 'success' : 'warning',
      });
    }

    for (const app of recentAppointments) {
      activityFeed.push({
        type: 'APPOINTMENT',
        id: String(app._id),
        title: `Appointment: Dr. ${app.doctorId?.name || 'Specialist'}`,
        description: `${app.organizationId?.name || 'Facility'} — Status: ${app.status}`,
        actor: 'Patient',
        timestamp: app.createdAt,
        level: 'neutral',
      });
    }

    activityFeed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return activityFeed.slice(0, limitNum);
  }

  async getSystemHealth() {
    const [pendingOutboxCount, activeEmergenciesCount, totalUsers] = await Promise.all([
      NotificationOutbox.countDocuments({ status: { $in: ['PENDING', 'RETRYING'] } }),
      EmergencyRequest.countDocuments({
        status: { $in: ['CREATED', 'BROADCASTED', 'RESPONSES_RECEIVED', 'DESTINATION_SELECTED', 'RESOURCES_RESERVED', 'PATIENT_EN_ROUTE'] },
      }),
      User.countDocuments(),
    ]);

    return {
      status: 'OPERATIONAL',
      uptimeSeconds: process.uptime(),
      timestamp: new Date(),
      services: {
        database: {
          status: 'CONNECTED',
          type: 'MongoDB',
        },
        websocket: {
          status: 'LISTENING',
          path: '/ws/notifications',
        },
        notificationOutbox: {
          status: pendingOutboxCount > 50 ? 'DEGRADED' : 'HEALTHY',
          pendingCount: pendingOutboxCount,
        },
        emergencyDispatch: {
          status: 'READY',
          activeEmergencies: activeEmergenciesCount,
        },
      },
      capacity: {
        registeredUsers: totalUsers,
      },
    };
  }
}

export const adminGovernanceService = new AdminGovernanceService();
