import crypto from 'crypto';
import QRCode from 'qrcode';
import { appointmentRepository } from '../repositories/AppointmentRepository.js';
import { appointmentStatusHistoryRepository } from '../repositories/AppointmentStatusHistoryRepository.js';
import { appointmentNotificationService } from './AppointmentNotificationService.js';
import { doctorRepository } from '../repositories/DoctorRepository.js';
import { organizationRepository } from '../repositories/OrganizationRepository.js';
import { doctorAffiliationRepository } from '../repositories/DoctorAffiliationRepository.js';
import { doctorScheduleService, timeToMinutes } from './DoctorScheduleService.js';
import { doctorLeaveRepository } from '../repositories/DoctorLeaveRepository.js';
import { organizationHolidayRepository } from '../repositories/OrganizationHolidayRepository.js';
import { userRepository } from '../repositories/UserRepository.js';

export class AppointmentService {
  /**
   * Generates dynamic appointment slots for a given doctor on a date.
   * Checks doctor schedule, breaks, approved leave, organization holidays, and booked slots.
   */
  async getAvailableSlots(doctorId, dateString, organizationId = null) {
    return await doctorScheduleService.generateAvailableSlots({
      doctorId,
      dateString,
      organizationId,
    });
  }

  /**
   * Helper to parse slot date and slot time into startAt and endAt UTC dates
   */
  parseSlotTimestamps(slotDate, slotTime, durationMinutes = 30) {
    try {
      const minutes = timeToMinutes(slotTime);
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      const startAt = new Date(`${slotDate}T${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00Z`);
      const endAt = new Date(startAt.getTime() + durationMinutes * 60000);
      return { startAt, endAt };
    } catch {
      return { startAt: new Date(), endAt: new Date() };
    }
  }

  /**
   * Book an Appointment
   */
  async bookAppointment({
    patientId,
    doctorId,
    organizationId,
    affiliationId,
    facilityId,
    slotDate,
    slotTime,
    patientNotes = '',
    reason = '',
  }) {
    if (!patientId) {
      throw new Error('Patient identity is required.');
    }
    if (!doctorId || !slotDate || !slotTime) {
      throw new Error('Doctor ID, slot date, and slot time are required.');
    }

    // 1. Verify doctor exists, is verified and active
    const doctor = await doctorRepository.findById(doctorId);
    if (!doctor || doctor.verificationStatus !== 'verified') {
      throw new Error('Doctor is not available or not verified.');
    }

    // 2. Resolve target organization
    let targetOrgId = organizationId;
    if (!targetOrgId) {
      if (doctor.currentPresence?.organizationId?._id) {
        targetOrgId = doctor.currentPresence.organizationId._id;
      } else if (doctor.currentPresence?.organizationId) {
        targetOrgId = doctor.currentPresence.organizationId;
      } else {
        const activeAffs = await doctorAffiliationRepository.listByDoctor(doctor._id, {
          status: { $in: ['ACTIVE', 'approved'] },
        });
        if (activeAffs && activeAffs.length > 0) {
          targetOrgId = activeAffs[0].organizationId?._id || activeAffs[0].organizationId;
        }
      }
    }

    const org = await organizationRepository.findById(targetOrgId);
    if (!org) {
      throw new Error('Healthcare facility not found.');
    }
    if (org.verificationStatus !== 'verified') {
      throw new Error('Healthcare facility is not verified for patient appointments.');
    }

    // 3. Verify active doctor-organization affiliation
    let activeAffiliation = null;
    if (affiliationId) {
      const aff = await doctorAffiliationRepository.findById(affiliationId);
      if (!aff) {
        throw new Error('Specified doctor affiliation record was not found.');
      }
      const affDocId = aff.doctorId?._id ? aff.doctorId._id.toString() : aff.doctorId.toString();
      const affOrgId = aff.organizationId?._id ? aff.organizationId._id.toString() : aff.organizationId.toString();
      const affStatus = (aff.status || '').toUpperCase();
      if (affDocId !== doctor._id.toString() || affOrgId !== org._id.toString()) {
        throw new Error('Affiliation record does not match the selected doctor and organization.');
      }
      if (affStatus !== 'ACTIVE' && affStatus !== 'APPROVED') {
        throw new Error(
          `Doctor is not actively affiliated with this healthcare facility. Affiliation status is '${aff.status}'.`
        );
      }
      activeAffiliation = aff;
    } else {
      activeAffiliation = await doctorAffiliationRepository.findActiveAffiliation(doctor._id, org._id);
      if (!activeAffiliation) {
        throw new Error(
          'Doctor is not actively affiliated with this healthcare facility. New appointment bookings require an active affiliation.'
        );
      }
    }

    // 4. Check Organization Holiday
    const holiday = await organizationHolidayRepository.findByDate(org._id, slotDate);
    if (holiday) {
      throw new Error(`Healthcare facility is closed on ${slotDate} for official holiday: ${holiday.description}`);
    }

    // 5. Check Doctor Leave
    const approvedLeaves = await doctorLeaveRepository.findLeavesForDoctorAndDate(doctor._id, slotDate);
    const hasFullDayLeave = approvedLeaves.some((l) => l.isFullDay !== false);
    if (hasFullDayLeave) {
      throw new Error(`Doctor is on approved leave on ${slotDate}. Please select another date.`);
    }

    // 6. Check Doctor candidate slot availability
    const candidateSlots = await doctorScheduleService.generateAvailableSlots({
      doctorId: doctor._id,
      dateString: slotDate,
      organizationId: org._id,
    });

    if (candidateSlots && candidateSlots.length > 0) {
      const matchingSlot = candidateSlots.find((s) => s.time === slotTime);
      if (matchingSlot && !matchingSlot.isAvailable) {
        throw new Error(
          `Selected appointment slot is not available (${matchingSlot.reason || 'Unavailable'}).`
        );
      }
    }

    // 7. Prevent Doctor overlapping appointments across ANY affiliated hospital
    const doctorConflict = await appointmentRepository.findDoctorConflictingAppointment(
      doctor._id,
      slotDate,
      slotTime
    );
    if (doctorConflict) {
      throw new Error(
        `Doctor already has an active consultation booked. This slot has already been booked at ${doctorConflict.organizationId?.name || 'another healthcare facility'} at this time.`
      );
    }

    // 8. Prevent Patient overlapping appointments
    const patientConflict = await appointmentRepository.findPatientConflictingAppointment(
      patientId,
      slotDate,
      slotTime
    );
    if (patientConflict) {
      throw new Error(
        `You already have an appointment booked with ${patientConflict.doctorId?.userId?.name || 'a doctor'} at this date and time.`
      );
    }

    // 9. Concurrency slot check
    const existing = await appointmentRepository.findBySlot(doctor._id, slotDate, slotTime);
    if (existing) {
      throw new Error('This appointment slot has already been booked. Please choose another time.');
    }

    const aptNum = `#AP-${Math.floor(1000 + Math.random() * 9000)}`;
    const qrToken = `PASS-${crypto.randomBytes(12).toString('hex')}`;
    const consultationReason = reason || patientNotes || 'General consultation';
    const { startAt, endAt } = this.parseSlotTimestamps(slotDate, slotTime);

    try {
      const appointment = await appointmentRepository.create({
        appointmentNumber: aptNum,
        appointmentId: aptNum,
        patientId,
        doctorId: doctor._id,
        organizationId: org._id,
        affiliationId: activeAffiliation._id,
        facilityId: facilityId || activeAffiliation.facilityId || null,
        slotDate,
        slotTime,
        startAt,
        endAt,
        patientNotes: consultationReason,
        reason: consultationReason,
        qrToken,
        status: 'CONFIRMED',
      });

      // 10. Record initial status history
      await appointmentStatusHistoryRepository.create({
        appointmentId: appointment._id,
        previousStatus: null,
        newStatus: 'CONFIRMED',
        changedBy: patientId,
        reason: 'Initial Booking',
      });

      // 11. Generate visual QR pass
      const qrPassData = JSON.stringify({
        token: qrToken,
        appointmentNumber: aptNum,
        doctor: doctor.userId?.name || doctor.name,
        slotDate,
        slotTime,
        hospital: org.name,
      });
      const qrPassUrl = await QRCode.toDataURL(qrPassData);

      // 12. Dispatch Notifications
      const docName = doctor.userId?.name || 'Doctor';
      const patient = await userRepository.findById(patientId);
      const patientName = patient?.name || 'Patient';

      await appointmentNotificationService.notify({
        appointmentId: appointment._id,
        recipientId: patientId,
        notificationType: 'BOOKING_CONFIRMATION',
        message: `Your appointment ${aptNum} with Dr. ${docName} at ${org.name} on ${slotDate} at ${slotTime} is confirmed.`,
      });

      if (doctor.userId?._id || doctor.userId) {
        const docUserId = doctor.userId?._id || doctor.userId;
        await appointmentNotificationService.notify({
          appointmentId: appointment._id,
          recipientId: docUserId,
          notificationType: 'BOOKING_CONFIRMATION',
          message: `New appointment ${aptNum} booked by ${patientName} on ${slotDate} at ${slotTime} (${org.name}).`,
        });
      }

      return {
        appointment,
        qrPassUrl,
      };
    } catch (err) {
      if (err.code === 11000) {
        throw new Error('Concurrency conflict: The selected slot was just reserved by another patient.');
      }
      throw err;
    }
  }

  /**
   * Reschedule an Appointment
   */
  async rescheduleAppointment(appointmentId, actorUserId, { newDate, newTime, reason = '' }) {
    if (!newDate || !newTime) {
      throw new Error('New date and time slot are required for rescheduling.');
    }

    const appointment = await appointmentRepository.findById(appointmentId);
    if (!appointment) throw new Error('Appointment not found');

    const currentStatus = (appointment.status || '').toUpperCase();
    if (currentStatus === 'CANCELLED') {
      throw new Error('Cannot reschedule a cancelled appointment');
    }
    if (currentStatus === 'COMPLETED') {
      throw new Error('Cannot reschedule a completed appointment');
    }

    const doctorId = appointment.doctorId?._id || appointment.doctorId;
    const organizationId = appointment.organizationId?._id || appointment.organizationId;
    const patientId = appointment.patientId?._id || appointment.patientId;

    // Check holiday on new date
    const holiday = await organizationHolidayRepository.findByDate(organizationId, newDate);
    if (holiday) {
      throw new Error(`Cannot reschedule: Healthcare facility is closed on ${newDate} for ${holiday.description}`);
    }

    // Check doctor leave on new date
    const leaves = await doctorLeaveRepository.findLeavesForDoctorAndDate(doctorId, newDate);
    if (leaves.some((l) => l.isFullDay !== false)) {
      throw new Error(`Cannot reschedule: Doctor is on approved leave on ${newDate}.`);
    }

    // Check doctor cross-facility conflict on new slot
    const doctorConflict = await appointmentRepository.findDoctorConflictingAppointment(
      doctorId,
      newDate,
      newTime,
      appointment._id
    );
    if (doctorConflict) {
      throw new Error('Selected replacement slot is already booked for this doctor.');
    }

    // Check patient conflict on new slot
    const patientConflict = await appointmentRepository.findPatientConflictingAppointment(
      patientId,
      newDate,
      newTime,
      appointment._id
    );
    if (patientConflict) {
      throw new Error('You already have another appointment booked at this replacement date and time.');
    }

    // Check if slot is taken
    const conflict = await appointmentRepository.findBySlot(doctorId, newDate, newTime);
    if (conflict && conflict._id.toString() !== appointment._id.toString()) {
      throw new Error('Selected new slot is already booked.');
    }

    const { startAt, endAt } = this.parseSlotTimestamps(newDate, newTime);
    const rescheduleReason = reason || 'Appointment rescheduled';

    // 1. Mark original appointment RESCHEDULED
    const updatedOriginal = await appointmentRepository.updateById(appointment._id, {
      status: 'RESCHEDULED',
    });

    await appointmentStatusHistoryRepository.create({
      appointmentId: appointment._id,
      previousStatus: appointment.status,
      newStatus: 'RESCHEDULED',
      changedBy: actorUserId,
      reason: `Rescheduled to ${newDate} at ${newTime}. ${rescheduleReason}`,
    });

    // 2. Create replacement appointment linked via rescheduledFromId
    const aptNum = `#AP-${Math.floor(1000 + Math.random() * 9000)}`;
    const qrToken = `PASS-${crypto.randomBytes(12).toString('hex')}`;

    const replacement = await appointmentRepository.create({
      appointmentNumber: aptNum,
      appointmentId: aptNum,
      patientId,
      doctorId,
      organizationId,
      affiliationId: appointment.affiliationId?._id || appointment.affiliationId,
      facilityId: appointment.facilityId?._id || appointment.facilityId,
      slotDate: newDate,
      slotTime: newTime,
      startAt,
      endAt,
      patientNotes: appointment.patientNotes || appointment.reason,
      reason: appointment.reason || appointment.patientNotes,
      status: 'CONFIRMED',
      qrToken,
      rescheduledFromId: appointment._id,
    });

    await appointmentStatusHistoryRepository.create({
      appointmentId: replacement._id,
      previousStatus: null,
      newStatus: 'CONFIRMED',
      changedBy: actorUserId,
      reason: `Rescheduled from ${appointment.appointmentNumber || appointment.appointmentId}`,
    });

    // Generate new QR code pass
    const qrPassData = JSON.stringify({
      token: qrToken,
      appointmentNumber: aptNum,
      slotDate: newDate,
      slotTime: newTime,
    });
    const qrPassUrl = await QRCode.toDataURL(qrPassData);

    // 3. Dispatch Notifications
    await appointmentNotificationService.notify({
      appointmentId: replacement._id,
      recipientId: patientId,
      notificationType: 'RESCHEDULE',
      message: `Your appointment ${appointment.appointmentNumber} has been rescheduled to ${newDate} at ${newTime} (New Ref: ${aptNum}).`,
    });

    const doc = await doctorRepository.findById(doctorId);
    if (doc?.userId?._id || doc?.userId) {
      await appointmentNotificationService.notify({
        appointmentId: replacement._id,
        recipientId: doc.userId?._id || doc.userId,
        notificationType: 'RESCHEDULE',
        message: `Appointment ${appointment.appointmentNumber} was rescheduled to ${newDate} at ${newTime}.`,
      });
    }

    return {
      ...replacement.toObject(),
      qrPassUrl,
      originalAppointment: updatedOriginal,
    };
  }

  /**
   * Cancel an Appointment
   */
  async cancelAppointment(appointmentId, actorUserId, reason = '', actorRole = null) {
    const appointment = await appointmentRepository.findById(appointmentId);
    if (!appointment) throw new Error('Appointment not found');

    const currentStatus = (appointment.status || '').toUpperCase();
    if (currentStatus === 'CANCELLED') {
      throw new Error('Appointment is already cancelled');
    }
    if (currentStatus === 'COMPLETED') {
      throw new Error('Cannot cancel a completed appointment');
    }

    const cancellationReason = reason || 'Cancelled by user';

    const updated = await appointmentRepository.updateById(appointment._id, {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancelledBy: actorUserId,
      cancellationReason,
    });

    // Record Status History
    await appointmentStatusHistoryRepository.create({
      appointmentId: appointment._id,
      previousStatus: appointment.status,
      newStatus: 'CANCELLED',
      changedBy: actorUserId,
      reason: cancellationReason,
    });

    // Notifications
    const patientId = appointment.patientId?._id || appointment.patientId;
    const doc = appointment.doctorId;
    const org = appointment.organizationId;

    await appointmentNotificationService.notify({
      appointmentId: appointment._id,
      recipientId: patientId,
      notificationType: 'CANCELLATION',
      message: `Your appointment ${appointment.appointmentNumber} has been cancelled. Reason: ${cancellationReason}`,
    });

    if (doc?.userId?._id || doc?.userId) {
      await appointmentNotificationService.notify({
        appointmentId: appointment._id,
        recipientId: doc.userId?._id || doc.userId,
        notificationType: 'CANCELLATION',
        message: `Appointment ${appointment.appointmentNumber} on ${appointment.slotDate} was cancelled.`,
      });
    }

    return updated;
  }

  /**
   * Complete an Appointment
   */
  async completeAppointment(appointmentId, notes = '', actorUserId = null) {
    const appointment = await appointmentRepository.findById(appointmentId);
    if (!appointment) throw new Error('Appointment not found');

    const currentStatus = (appointment.status || '').toUpperCase();
    if (currentStatus === 'CANCELLED') {
      throw new Error('Cannot complete a cancelled appointment');
    }

    const clinicalNotes = notes || 'Consultation completed';

    const updated = await appointmentRepository.updateById(appointment._id, {
      status: 'COMPLETED',
      clinicalNotes,
    });

    await appointmentStatusHistoryRepository.create({
      appointmentId: appointment._id,
      previousStatus: appointment.status,
      newStatus: 'COMPLETED',
      changedBy: actorUserId || appointment.doctorId?.userId?._id || appointment.patientId?._id,
      reason: clinicalNotes,
    });

    const patientId = appointment.patientId?._id || appointment.patientId;
    await appointmentNotificationService.notify({
      appointmentId: appointment._id,
      recipientId: patientId,
      notificationType: 'COMPLETED',
      message: `Your consultation ${appointment.appointmentNumber} has been completed. Follow-up summary available in your health records.`,
    });

    return updated;
  }

  /**
   * Mark Appointment as No-Show
   */
  async markNoShow(appointmentId, notes = '', actorUserId = null) {
    const appointment = await appointmentRepository.findById(appointmentId);
    if (!appointment) throw new Error('Appointment not found');

    const currentStatus = (appointment.status || '').toUpperCase();
    if (currentStatus === 'CANCELLED') {
      throw new Error('Cannot mark a cancelled appointment as no-show');
    }
    if (currentStatus === 'COMPLETED') {
      throw new Error('Cannot mark a completed appointment as no-show');
    }

    const updated = await appointmentRepository.updateById(appointment._id, {
      status: 'NO_SHOW',
      clinicalNotes: notes || 'Patient did not attend scheduled consultation.',
    });

    await appointmentStatusHistoryRepository.create({
      appointmentId: appointment._id,
      previousStatus: appointment.status,
      newStatus: 'NO_SHOW',
      changedBy: actorUserId || appointment.doctorId?.userId?._id || appointment.patientId?._id,
      reason: notes || 'Patient No-Show',
    });

    const patientId = appointment.patientId?._id || appointment.patientId;
    await appointmentNotificationService.notify({
      appointmentId: appointment._id,
      recipientId: patientId,
      notificationType: 'NO_SHOW',
      message: `You were marked as no-show for appointment ${appointment.appointmentNumber}. Please contact clinic support to rebook.`,
    });

    return updated;
  }

  /**
   * Get Appointment Details with Audit Trail & Notifications
   */
  async getAppointmentDetails(appointmentId, actorUser) {
    const appointment = await appointmentRepository.findById(appointmentId);
    if (!appointment) throw new Error('Appointment not found');

    // Enforce role-based access
    if (actorUser.role === 'patient') {
      const pId = appointment.patientId?._id ? appointment.patientId._id.toString() : appointment.patientId.toString();
      if (pId !== actorUser._id.toString()) {
        throw new Error('Unauthorized: Patients can only view their own appointments.');
      }
    } else if (actorUser.role === 'doctor') {
      const doctor = await doctorRepository.findByUserId(actorUser._id);
      if (!doctor) throw new Error('Doctor profile not found.');
      const docId = appointment.doctorId?._id ? appointment.doctorId._id.toString() : appointment.doctorId.toString();
      if (docId !== doctor._id.toString()) {
        throw new Error('Unauthorized: Doctors can only view appointments assigned to them.');
      }
    } else if (actorUser.role === 'organization') {
      const org = await organizationRepository.findByUserId(actorUser._id);
      if (!org) throw new Error('Organization profile not found.');
      const orgId = appointment.organizationId?._id ? appointment.organizationId._id.toString() : appointment.organizationId.toString();
      if (orgId !== org._id.toString()) {
        throw new Error('Unauthorized: Organizations can only view appointments hosted at their facility.');
      }
    }

    const statusHistory = await appointmentStatusHistoryRepository.listByAppointment(appointment._id);
    const notifications = await appointmentNotificationService.listNotificationsForAppointment(appointment._id);

    return {
      ...appointment.toObject(),
      statusHistory,
      notifications,
    };
  }

  /**
   * Organization appointment summary metrics
   */
  async getOrganizationAppointmentSummary(orgUserId) {
    const org = await organizationRepository.findByUserId(orgUserId);
    if (!org) throw new Error('Organization profile not found.');

    const all = await appointmentRepository.listForOrganization(org._id);
    const todayStr = new Date().toISOString().split('T')[0];

    const todayAppointments = all.filter((a) => a.slotDate === todayStr);
    const confirmed = all.filter((a) => (a.status || '').toUpperCase() === 'CONFIRMED' || a.status === 'booked');
    const completed = all.filter((a) => (a.status || '').toUpperCase() === 'COMPLETED');
    const cancelled = all.filter((a) => (a.status || '').toUpperCase() === 'CANCELLED');
    const noShow = all.filter((a) => (a.status || '').toUpperCase() === 'NO_SHOW');

    return {
      totalAppointments: all.length,
      todayAppointments: todayAppointments.length,
      confirmedAppointments: confirmed.length,
      completedAppointments: completed.length,
      cancelledAppointments: cancelled.length,
      noShowAppointments: noShow.length,
    };
  }

  /**
   * Admin appointment reporting
   */
  async getAdminAppointmentReports() {
    const total = await appointmentRepository.count({});
    const confirmed = await appointmentRepository.count({ status: { $in: ['CONFIRMED', 'booked'] } });
    const completed = await appointmentRepository.count({ status: { $in: ['COMPLETED', 'completed'] } });
    const cancelled = await appointmentRepository.count({ status: { $in: ['CANCELLED', 'cancelled'] } });
    const rescheduled = await appointmentRepository.count({ status: { $in: ['RESCHEDULED', 'rescheduled'] } });
    const noShow = await appointmentRepository.count({ status: { $in: ['NO_SHOW', 'no_show'] } });

    return {
      total,
      confirmed,
      completed,
      cancelled,
      rescheduled,
      noShow,
    };
  }
}

export const appointmentService = new AppointmentService();
