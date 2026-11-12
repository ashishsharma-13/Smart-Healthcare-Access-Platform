import { doctorScheduleService } from '../services/DoctorScheduleService.js';

export class DoctorScheduleController {
  async createSchedule(req, res, next) {
    try {
      const {
        affiliationId,
        scheduleType,
        specificDate,
        effectiveFrom,
        effectiveUntil,
        timezone,
        scheduleDays,
        appointmentAvailability,
        breaks,
      } = req.body;

      if (!affiliationId) {
        return res.status(400).json({ success: false, message: 'affiliationId is required.' });
      }

      const schedule = await doctorScheduleService.createSchedule({
        doctorUserId: req.user._id,
        affiliationId,
        scheduleType,
        specificDate,
        effectiveFrom,
        effectiveUntil,
        timezone,
        scheduleDays,
        appointmentAvailability,
        breaks,
      });

      res.status(201).json({
        success: true,
        message: 'Doctor schedule published successfully.',
        data: schedule,
      });
    } catch (err) {
      next(err);
    }
  }

  async getMySchedules(req, res, next) {
    try {
      const filter = {};
      if (req.query.affiliationId) filter.affiliationId = req.query.affiliationId;
      if (req.query.status) filter.status = req.query.status.toUpperCase();

      const schedules = await doctorScheduleService.getDoctorSchedules(req.user._id, filter);
      res.json({
        success: true,
        count: schedules.length,
        data: schedules,
      });
    } catch (err) {
      next(err);
    }
  }

  async getScheduleById(req, res, next) {
    try {
      const schedule = await doctorScheduleService.getScheduleById(req.params.id, req.user._id);
      res.json({
        success: true,
        data: schedule,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateSchedule(req, res, next) {
    try {
      const updated = await doctorScheduleService.updateSchedule({
        scheduleId: req.params.id,
        doctorUserId: req.user._id,
        updateData: req.body,
      });

      res.json({
        success: true,
        message: 'Doctor schedule updated successfully.',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async deactivateSchedule(req, res, next) {
    try {
      const deactivated = await doctorScheduleService.deactivateSchedule({
        scheduleId: req.params.id,
        doctorUserId: req.user._id,
      });

      res.json({
        success: true,
        message: 'Doctor schedule deactivated successfully.',
        data: deactivated,
      });
    } catch (err) {
      next(err);
    }
  }

  async configureAppointmentAvailability(req, res, next) {
    try {
      const { scheduleId, ...availabilityData } = req.body;
      const updated = await doctorScheduleService.configureAppointmentAvailability({
        doctorUserId: req.user._id,
        scheduleId,
        availabilityData,
      });

      res.json({
        success: true,
        message: 'Appointment availability rules saved successfully.',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async setEmergencyAvailability(req, res, next) {
    try {
      const {
        affiliationId,
        participationStatus,
        startDatetime,
        endDatetime,
        emergencyCapabilities,
        notes,
      } = req.body;

      if (!affiliationId) {
        return res.status(400).json({ success: false, message: 'affiliationId is required.' });
      }

      const record = await doctorScheduleService.setEmergencyAvailability({
        doctorUserId: req.user._id,
        affiliationId,
        participationStatus: participationStatus !== false,
        startDatetime,
        endDatetime,
        emergencyCapabilities,
        notes,
      });

      res.json({
        success: true,
        message: 'Emergency availability status saved and published to matching service.',
        data: record,
      });
    } catch (err) {
      next(err);
    }
  }

  async getEmergencyAvailability(req, res, next) {
    try {
      const records = await doctorScheduleService.getEmergencyAvailability(req.user._id);
      res.json({
        success: true,
        count: records.length,
        data: records,
      });
    } catch (err) {
      next(err);
    }
  }

  async addBreak(req, res, next) {
    try {
      const { scheduleId, ...breakData } = req.body;
      const updated = await doctorScheduleService.addDoctorBreak({
        doctorUserId: req.user._id,
        scheduleId,
        breakData,
      });

      res.status(201).json({
        success: true,
        message: 'Break period added to doctor schedule successfully.',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async requestLeave(req, res, next) {
    try {
      const { startDate, endDate, leaveType, reason, isFullDay, startTime, endTime } = req.body;
      if (!startDate || !endDate) {
        return res.status(400).json({ success: false, message: 'startDate and endDate are required.' });
      }

      const result = await doctorScheduleService.requestDoctorLeave({
        doctorUserId: req.user._id,
        startDate,
        endDate,
        leaveType,
        reason,
        isFullDay,
        startTime,
        endTime,
      });

      res.status(201).json({
        success: true,
        message: result.hasConflicts
          ? `Leave registered with ${result.conflictCount} existing appointment conflict(s) queued for resolution.`
          : 'Doctor leave registered successfully.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getLeaves(req, res, next) {
    try {
      const leaves = await doctorScheduleService.getDoctorLeaves(req.user._id);
      res.json({
        success: true,
        count: leaves.length,
        data: leaves,
      });
    } catch (err) {
      next(err);
    }
  }

  async declareHoliday(req, res, next) {
    try {
      const { holidayDate, description, facilityId } = req.body;
      if (!holidayDate || !description) {
        return res.status(400).json({ success: false, message: 'holidayDate and description are required.' });
      }

      const holiday = await doctorScheduleService.declareOrganizationHoliday({
        orgUserId: req.user._id,
        holidayDate,
        description,
        facilityId,
      });

      res.status(201).json({
        success: true,
        message: 'Organization holiday declared successfully.',
        data: holiday,
      });
    } catch (err) {
      next(err);
    }
  }

  async getAvailableSlots(req, res, next) {
    try {
      const { doctorId, date, organizationId } = req.query;
      if (!doctorId || !date) {
        return res.status(400).json({ success: false, message: 'doctorId and date query parameters are required.' });
      }

      const slots = await doctorScheduleService.generateAvailableSlots({
        doctorId,
        dateString: date,
        organizationId,
      });

      res.json({
        success: true,
        count: slots.length,
        data: slots,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const doctorScheduleController = new DoctorScheduleController();

