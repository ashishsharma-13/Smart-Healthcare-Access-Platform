import { doctorScheduleRepository } from '../repositories/DoctorScheduleRepository.js';
import { doctorLeaveRepository } from '../repositories/DoctorLeaveRepository.js';
import { organizationHolidayRepository } from '../repositories/OrganizationHolidayRepository.js';
import { emergencyAvailabilityRepository } from '../repositories/EmergencyAvailabilityRepository.js';
import { doctorRepository } from '../repositories/DoctorRepository.js';
import { organizationRepository } from '../repositories/OrganizationRepository.js';
import { doctorAffiliationRepository } from '../repositories/DoctorAffiliationRepository.js';
import { appointmentRepository } from '../repositories/AppointmentRepository.js';
import { DoctorSchedule, Appointment, DoctorLeave, OrganizationHoliday, EmergencyAvailability, Doctor } from '../models/index.js';

// Helper to convert time strings ("09:00", "09:30 AM", "14:00", "02:30 PM") to minutes from midnight
export const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const clean = timeStr.trim();
  const is12Hour = /am|pm/i.test(clean);

  if (is12Hour) {
    const parts = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!parts) return 0;
    let hours = parseInt(parts[1], 10);
    const minutes = parseInt(parts[2], 10);
    const period = (parts[3] || '').toUpperCase();

    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  } else {
    const [h, m] = clean.split(':').map((n) => parseInt(n, 10));
    return (h || 0) * 60 + (m || 0);
  }
};

// Helper to format minutes from midnight back to 12-hour AM/PM string ("09:00 AM")
export const minutesTo12Hour = (totalMinutes) => {
  let hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const hStr = hours < 10 ? `0${hours}` : `${hours}`;
  const mStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
  return `${hStr}:${mStr} ${period}`;
};

export class DoctorScheduleService {
  /**
   * Conflict Detection Engine
   * Validates that the doctor does not have overlapping working periods
   * across multiple active affiliation schedules.
   */
  async detectScheduleConflicts({ doctorId, proposedDays, effectiveFrom, effectiveUntil, excludeScheduleId = null, excludeAffiliationId = null }) {
    const activeSchedules = await doctorScheduleRepository.listActiveSchedulesForDoctor(doctorId);

    const fromDate = effectiveFrom ? new Date(effectiveFrom) : new Date();
    const untilDate = effectiveUntil ? new Date(effectiveUntil) : null;

    for (const other of activeSchedules) {
      if (excludeScheduleId && other._id.toString() === excludeScheduleId.toString()) {
        continue;
      }
      if (excludeAffiliationId) {
        const otherAffId = other.affiliationId?._id ? other.affiliationId._id.toString() : other.affiliationId?.toString();
        if (otherAffId === excludeAffiliationId.toString()) {
          continue;
        }
      }

      // Check effective date range overlap
      const otherFrom = other.effectiveFrom ? new Date(other.effectiveFrom) : new Date(0);
      const otherUntil = other.effectiveUntil ? new Date(other.effectiveUntil) : null;

      const dateOverlap =
        (!untilDate || !otherFrom || untilDate >= otherFrom) &&
        (!otherUntil || fromDate <= otherUntil);

      if (!dateOverlap) continue;

      // Check each day of week for working hour overlap
      for (const proposedDay of proposedDays) {
        if (!proposedDay.isActive) continue;

        const matchingOtherDay = other.scheduleDays?.find(
          (d) => d.dayOfWeek === proposedDay.dayOfWeek && d.isActive !== false
        );

        if (matchingOtherDay) {
          const propStart = timeToMinutes(proposedDay.startTime);
          const propEnd = timeToMinutes(proposedDay.endTime);
          const otherStart = timeToMinutes(matchingOtherDay.startTime);
          const otherEnd = timeToMinutes(matchingOtherDay.endTime);

          const timeOverlap = Math.max(propStart, otherStart) < Math.min(propEnd, otherEnd);

          if (timeOverlap) {
            const daysNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const dayName = daysNames[proposedDay.dayOfWeek] || `Day ${proposedDay.dayOfWeek}`;
            const orgName = other.organizationId?.name || other.organizationId?.legalName || 'another healthcare facility';

            throw new Error(
              `Schedule conflict detected: You already have an active working schedule on ${dayName} (${matchingOtherDay.startTime} - ${matchingOtherDay.endTime}) at ${orgName}. Overlapping working periods across affiliations are prohibited.`
            );
          }
        }
      }
    }
  }

  /**
   * Create Doctor Schedule
   */
  async createSchedule({
    doctorUserId,
    affiliationId,
    scheduleType = 'WEEKLY_RECURRING',
    specificDate,
    effectiveFrom,
    effectiveUntil,
    timezone = 'UTC',
    scheduleDays = [],
    appointmentAvailability = {},
    breaks = [],
  }) {
    const doctor = await doctorRepository.findByUserId(doctorUserId);
    if (!doctor) throw new Error('Doctor profile not found.');

    const affiliation = await doctorAffiliationRepository.findById(affiliationId);
    if (!affiliation) throw new Error('Affiliation record not found.');

    const docIdStr = affiliation.doctorId?._id ? affiliation.doctorId._id.toString() : affiliation.doctorId.toString();
    if (docIdStr !== doctor._id.toString()) {
      throw new Error('Unauthorized: Doctor does not own this affiliation.');
    }

    const affStatus = (affiliation.status || '').toUpperCase();
    if (affStatus !== 'ACTIVE' && affStatus !== 'APPROVED') {
      throw new Error(`Cannot create a schedule for an affiliation with status '${affiliation.status}'. Active affiliation required.`);
    }

    // Validate effective dates
    if (effectiveFrom && effectiveUntil && new Date(effectiveFrom) > new Date(effectiveUntil)) {
      throw new Error('Invalid effective date range: effectiveFrom cannot be after effectiveUntil.');
    }

    // Perform Conflict Detection across other active affiliations' schedules
    await this.detectScheduleConflicts({
      doctorId: doctor._id,
      proposedDays: scheduleDays,
      effectiveFrom,
      effectiveUntil,
      excludeAffiliationId: affiliation._id,
    });

    // Deactivate previous active schedule for this affiliation so the new schedule takes effect
    await DoctorSchedule.updateMany(
      { doctorId: doctor._id, affiliationId: affiliation._id, status: 'ACTIVE' },
      { status: 'INACTIVE' }
    );

    const schedule = await doctorScheduleRepository.create({
      doctorId: doctor._id,
      organizationId: affiliation.organizationId._id || affiliation.organizationId,
      affiliationId: affiliation._id,
      facilityId: affiliation.facilityId?._id || affiliation.facilityId || null,
      scheduleType,
      specificDate: scheduleType === 'DATE_SPECIFIC' ? specificDate : undefined,
      effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
      effectiveUntil: effectiveUntil ? new Date(effectiveUntil) : undefined,
      timezone: timezone || 'UTC',
      status: 'ACTIVE',
      scheduleDays,
      appointmentAvailability,
      breaks,
    });

    return await doctorScheduleRepository.findById(schedule._id);
  }

  /**
   * Update Doctor Schedule
   */
  async updateSchedule({ scheduleId, doctorUserId, updateData }) {
    const doctor = await doctorRepository.findByUserId(doctorUserId);
    if (!doctor) throw new Error('Doctor profile not found.');

    const schedule = await doctorScheduleRepository.findById(scheduleId);
    if (!schedule) throw new Error('Schedule record not found.');

    const schedDocId = schedule.doctorId?._id ? schedule.doctorId._id.toString() : schedule.doctorId.toString();
    if (schedDocId !== doctor._id.toString()) {
      throw new Error('Unauthorized: Doctor does not own this schedule.');
    }

    if (updateData.scheduleDays) {
      await this.detectScheduleConflicts({
        doctorId: doctor._id,
        proposedDays: updateData.scheduleDays,
        effectiveFrom: updateData.effectiveFrom || schedule.effectiveFrom,
        effectiveUntil: updateData.effectiveUntil || schedule.effectiveUntil,
        excludeScheduleId: schedule._id,
      });
    }

    return await doctorScheduleRepository.updateById(schedule._id, updateData);
  }

  /**
   * Deactivate Doctor Schedule
   */
  async deactivateSchedule({ scheduleId, doctorUserId }) {
    const doctor = await doctorRepository.findByUserId(doctorUserId);
    if (!doctor) throw new Error('Doctor profile not found.');

    const schedule = await doctorScheduleRepository.findById(scheduleId);
    if (!schedule) throw new Error('Schedule record not found.');

    const schedDocId = schedule.doctorId?._id ? schedule.doctorId._id.toString() : schedule.doctorId.toString();
    if (schedDocId !== doctor._id.toString()) {
      throw new Error('Unauthorized: Doctor does not own this schedule.');
    }

    return await doctorScheduleRepository.deactivate(schedule._id);
  }

  /**
   * List Doctor Schedules
   */
  async getDoctorSchedules(doctorUserId, filter = {}) {
    const doctor = await doctorRepository.findByUserId(doctorUserId);
    if (!doctor) throw new Error('Doctor profile not found.');
    return await doctorScheduleRepository.listByDoctor(doctor._id, filter);
  }

  /**
   * Get Schedule By ID
   */
  async getScheduleById(scheduleId, doctorUserId) {
    const doctor = await doctorRepository.findByUserId(doctorUserId);
    if (!doctor) throw new Error('Doctor profile not found.');

    const schedule = await doctorScheduleRepository.findById(scheduleId);
    if (!schedule) throw new Error('Schedule not found.');

    const schedDocId = schedule.doctorId?._id ? schedule.doctorId._id.toString() : schedule.doctorId.toString();
    if (schedDocId !== doctor._id.toString()) {
      throw new Error('Unauthorized access to schedule.');
    }

    return schedule;
  }

  /**
   * Configure Appointment Availability Rules
   */
  async configureAppointmentAvailability({ doctorUserId, scheduleId, availabilityData }) {
    const doctor = await doctorRepository.findByUserId(doctorUserId);
    if (!doctor) throw new Error('Doctor profile not found.');

    let targetSchedule;
    if (scheduleId) {
      targetSchedule = await doctorScheduleRepository.findById(scheduleId);
    } else {
      const schedules = await doctorScheduleRepository.listByDoctor(doctor._id, { status: 'ACTIVE' });
      targetSchedule = schedules[0];
    }

    if (!targetSchedule) {
      throw new Error('No active schedule found to configure appointment availability.');
    }

    const updated = await doctorScheduleRepository.updateById(targetSchedule._id, {
      appointmentAvailability: {
        ...targetSchedule.appointmentAvailability?.toObject?.() || {},
        ...availabilityData,
      },
    });

    return updated;
  }

  /**
   * Add Doctor Break to Schedule
   */
  async addDoctorBreak({ doctorUserId, scheduleId, breakData }) {
    const doctor = await doctorRepository.findByUserId(doctorUserId);
    if (!doctor) throw new Error('Doctor profile not found.');

    let targetSchedule;
    if (scheduleId) {
      targetSchedule = await doctorScheduleRepository.findById(scheduleId);
    } else {
      const schedules = await doctorScheduleRepository.listByDoctor(doctor._id, { status: 'ACTIVE' });
      targetSchedule = schedules[0];
    }

    if (!targetSchedule) throw new Error('No active schedule found for break configuration.');

    const schedDocId = targetSchedule.doctorId?._id ? targetSchedule.doctorId._id.toString() : targetSchedule.doctorId.toString();
    if (schedDocId !== doctor._id.toString()) {
      throw new Error('Unauthorized: Doctor does not own this schedule.');
    }

    return await doctorScheduleRepository.addBreak(targetSchedule._id, breakData);
  }

  /**
   * Request Doctor Leave
   * Validates whether any booked appointments exist during the leave period.
   */
  async requestDoctorLeave({
    doctorUserId,
    startDate,
    endDate,
    leaveType = 'VACATION',
    reason = '',
    isFullDay = true,
    startTime,
    endTime,
  }) {
    const doctor = await doctorRepository.findByUserId(doctorUserId);
    if (!doctor) throw new Error('Doctor profile not found.');

    if (new Date(startDate) > new Date(endDate)) {
      throw new Error('Invalid leave dates: startDate cannot be after endDate.');
    }

    // Check for existing booked appointments
    const existingAppointments = await Appointment.find({
      doctorId: doctor._id,
      slotDate: { $gte: startDate, $lte: endDate },
      status: { $in: ['booked', 'rescheduled'] },
    }).populate('patientId', 'name email phone');

    // Create the leave record
    const leave = await doctorLeaveRepository.create({
      doctorId: doctor._id,
      startDate,
      endDate,
      startDatetime: new Date(startDate),
      endDatetime: new Date(endDate),
      leaveType,
      reason,
      isFullDay,
      startTime,
      endTime,
      status: 'APPROVED',
    });

    return {
      leave,
      hasConflicts: existingAppointments.length > 0,
      conflictCount: existingAppointments.length,
      affectedAppointments: existingAppointments.map((a) => ({
        appointmentId: a._id,
        appointmentNumber: a.appointmentNumber,
        slotDate: a.slotDate,
        slotTime: a.slotTime,
        patientName: a.patientId?.name,
      })),
    };
  }

  /**
   * Get Doctor Leaves
   */
  async getDoctorLeaves(doctorUserId) {
    const doctor = await doctorRepository.findByUserId(doctorUserId);
    if (!doctor) throw new Error('Doctor profile not found.');
    return await doctorLeaveRepository.listByDoctor(doctor._id);
  }

  /**
   * Declare Organization Holiday
   */
  async declareOrganizationHoliday({ orgUserId, holidayDate, description, facilityId }) {
    const organization = await organizationRepository.findByUserId(orgUserId);
    if (!organization) throw new Error('Organization profile not found.');

    const existing = await organizationHolidayRepository.findByDate(organization._id, holidayDate);
    if (existing) {
      throw new Error(`Holiday already declared for ${holidayDate}: ${existing.description}`);
    }

    return await organizationHolidayRepository.create({
      organizationId: organization._id,
      facilityId,
      holidayDate,
      description,
    });
  }

  /**
   * Configure Emergency Availability
   */
  async setEmergencyAvailability({
    doctorUserId,
    affiliationId,
    participationStatus = true,
    startDatetime,
    endDatetime,
    emergencyCapabilities = [],
    notes = '',
  }) {
    const doctor = await doctorRepository.findByUserId(doctorUserId);
    if (!doctor) throw new Error('Doctor profile not found.');

    const affiliation = await doctorAffiliationRepository.findById(affiliationId);
    if (!affiliation) throw new Error('Affiliation record not found.');

    const docIdStr = affiliation.doctorId?._id ? affiliation.doctorId._id.toString() : affiliation.doctorId.toString();
    if (docIdStr !== doctor._id.toString()) {
      throw new Error('Unauthorized: Doctor does not own this affiliation.');
    }

    const affStatus = (affiliation.status || '').toUpperCase();
    if (affStatus !== 'ACTIVE' && affStatus !== 'APPROVED') {
      throw new Error('Emergency availability requires an ACTIVE healthcare facility affiliation.');
    }

    let record = await emergencyAvailabilityRepository.findByAffiliation(affiliation._id);
    if (record) {
      record = await emergencyAvailabilityRepository.updateById(record._id, {
        participationStatus,
        startDatetime: startDatetime ? new Date(startDatetime) : new Date(),
        endDatetime: endDatetime ? new Date(endDatetime) : undefined,
        emergencyCapabilities,
        notes,
        status: participationStatus ? 'ON_DUTY' : 'OFF_DUTY',
      });
    } else {
      record = await emergencyAvailabilityRepository.create({
        doctorId: doctor._id,
        organizationId: affiliation.organizationId._id || affiliation.organizationId,
        affiliationId: affiliation._id,
        participationStatus,
        startDatetime: startDatetime ? new Date(startDatetime) : new Date(),
        endDatetime: endDatetime ? new Date(endDatetime) : undefined,
        emergencyCapabilities,
        notes,
        status: participationStatus ? 'ON_DUTY' : 'OFF_DUTY',
      });
    }

    // Update doctor document emergency participation flag
    await Doctor.findByIdAndUpdate(doctor._id, {
      isAvailableForEmergency: participationStatus,
    });

    return record;
  }

  /**
   * Get Emergency Availability
   */
  async getEmergencyAvailability(doctorUserId) {
    const doctor = await doctorRepository.findByUserId(doctorUserId);
    if (!doctor) throw new Error('Doctor profile not found.');
    return await emergencyAvailabilityRepository.listByDoctor(doctor._id);
  }

  /**
   * Dynamic Candidate Slot Generation
   * Generates candidate appointment slots from active schedule and filters out:
   * 1. Breaks
   * 2. Doctor Leave
   * 3. Organization Holidays
   * 4. Already Booked / Rescheduled Appointments
   */
  async generateAvailableSlots({ doctorId, dateString, organizationId }) {
    const doctor = await doctorRepository.findById(doctorId);
    if (!doctor) throw new Error('Doctor not found.');

    // 1. Check Organization Holiday
    if (organizationId) {
      const holiday = await organizationHolidayRepository.findByDate(organizationId, dateString);
      if (holiday) {
        return []; // No slots available on official facility holidays
      }
    }

    // 2. Check Doctor Leave
    const approvedLeaves = await doctorLeaveRepository.findLeavesForDoctorAndDate(doctor._id, dateString);
    const hasFullDayLeave = approvedLeaves.some((l) => l.isFullDay !== false);
    if (hasFullDayLeave) {
      return []; // No slots available when doctor is on full-day leave
    }

    // 3. Date & Day of Week calculation
    const targetDate = new Date(`${dateString}T00:00:00Z`);
    const dayOfWeek = targetDate.getUTCDay(); // 0 = Sun, 1 = Mon...

    // 4. Find Applicable Schedule
    const scheduleFilter = { doctorId: doctor._id, status: 'ACTIVE' };
    if (organizationId) scheduleFilter.organizationId = organizationId;

    const schedules = await doctorScheduleRepository.listByDoctor(doctor._id, scheduleFilter);

    // Look for date-specific schedule first, then weekly recurring
    const dateSpecificSchedule = schedules.find(
      (s) => s.scheduleType === 'DATE_SPECIFIC' && s.specificDate === dateString
    );
    const activeSchedule = dateSpecificSchedule || schedules.find((s) => s.scheduleType === 'WEEKLY_RECURRING') || schedules[0];

    // If no schedule configured in DB, fallback to standard clinical outpatient hours
    if (!activeSchedule) {
      const defaultTimes = [
        '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
        '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM',
      ];
      const existingAppointments = await appointmentRepository.listForDoctor(doctor._id, dateString);
      const bookedTimes = new Set(
        existingAppointments
          .filter((a) => a.status === 'booked' || a.status === 'rescheduled')
          .map((a) => a.slotTime)
      );
      return defaultTimes.map((time) => ({
        time,
        isAvailable: !bookedTimes.has(time),
      }));
    }

    // Check if the day is configured
    const dayConfig = activeSchedule.scheduleDays?.find(
      (d) => d.dayOfWeek === dayOfWeek && d.isActive !== false
    );

    if (!dayConfig) {
      return []; // Doctor not scheduled on this day of week
    }

    // 5. Generate Candidate Slots
    const slotDuration = activeSchedule.appointmentAvailability?.slotDuration || 30;
    const bufferDuration = activeSchedule.appointmentAvailability?.bufferDuration || 0;
    const step = slotDuration + bufferDuration;

    const startMinutes = timeToMinutes(dayConfig.startTime);
    const endMinutes = timeToMinutes(dayConfig.endTime);

    const candidateSlots = [];
    for (let current = startMinutes; current + slotDuration <= endMinutes; current += step) {
      candidateSlots.push({
        startMin: current,
        endMin: current + slotDuration,
        time: minutesTo12Hour(current),
      });
    }

    // 6. Exclude Breaks
    const breaks = activeSchedule.breaks || [];
    const validBreaks = breaks.filter(
      (b) => b.dayOfWeek === undefined || b.dayOfWeek === null || b.dayOfWeek === dayOfWeek
    );

    // 7. Check Partial Day Leaves
    const partialLeaves = approvedLeaves.filter((l) => l.isFullDay === false);

    // 8. Fetch Existing Booked Appointments
    const existingAppointments = await appointmentRepository.listForDoctor(doctor._id, dateString);
    const bookedTimes = new Set(
      existingAppointments
        .filter((a) => a.status === 'booked' || a.status === 'rescheduled')
        .map((a) => a.slotTime)
    );

    // 9. Filter and Mark Availability
    return candidateSlots.map((slot) => {
      // Check break conflict
      const isBreak = validBreaks.some((b) => {
        const bStart = timeToMinutes(b.startTime);
        const bEnd = timeToMinutes(b.endTime);
        return Math.max(slot.startMin, bStart) < Math.min(slot.endMin, bEnd);
      });

      // Check partial leave conflict
      const isLeave = partialLeaves.some((l) => {
        if (!l.startTime || !l.endTime) return true;
        const lStart = timeToMinutes(l.startTime);
        const lEnd = timeToMinutes(l.endTime);
        return Math.max(slot.startMin, lStart) < Math.min(slot.endMin, lEnd);
      });

      const isBooked = bookedTimes.has(slot.time);

      return {
        time: slot.time,
        isAvailable: !isBreak && !isLeave && !isBooked,
        reason: isBooked ? 'Booked' : isBreak ? 'Break' : isLeave ? 'Doctor Leave' : undefined,
        durationMinutes: slotDuration,
      };
    });
  }
}

export const doctorScheduleService = new DoctorScheduleService();

