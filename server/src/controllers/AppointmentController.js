import { appointmentService } from '../services/AppointmentService.js';
import { appointmentRepository } from '../repositories/AppointmentRepository.js';
import { doctorRepository } from '../repositories/DoctorRepository.js';
import { organizationRepository } from '../repositories/OrganizationRepository.js';

export class AppointmentController {
  /**
   * GET /api/appointments/available-slots
   */
  async getAvailableSlots(req, res, next) {
    try {
      const doctorId = req.params?.doctorId || req.query?.doctorId;
      const date = req.query?.date; // YYYY-MM-DD
      const organizationId = req.query?.organizationId;

      if (!doctorId || !date) {
        return res.status(400).json({
          success: false,
          message: 'Doctor ID and Date (YYYY-MM-DD) parameters are required.',
        });
      }

      const slots = await appointmentService.getAvailableSlots(doctorId, date, organizationId);
      res.json({ success: true, count: slots.length, data: slots });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/appointments/book and POST /api/appointments
   */
  async bookAppointment(req, res, next) {
    try {
      const {
        doctorId,
        organizationId,
        affiliationId,
        facilityId,
        slotDate,
        slotTime,
        patientNotes,
        reason,
      } = req.body;

      const result = await appointmentService.bookAppointment({
        patientId: req.user._id,
        doctorId,
        organizationId,
        affiliationId,
        facilityId,
        slotDate,
        slotTime,
        patientNotes,
        reason,
      });

      res.status(201).json({
        success: true,
        message: 'Appointment booked successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/appointments/my
   */
  async getMyAppointments(req, res, next) {
    try {
      let appointments = [];
      const userRole = req.user.role;

      if (userRole === 'patient') {
        appointments = await appointmentRepository.listForPatient(req.user._id, {
          status: req.query?.status,
        });
      } else if (userRole === 'doctor') {
        const doctor = await doctorRepository.findByUserId(req.user._id);
        if (doctor) {
          appointments = await appointmentRepository.listForDoctor(doctor._id, {
            date: req.query?.date,
            status: req.query?.status,
            organizationId: req.query?.organizationId,
          });
        }
      } else if (userRole === 'organization' || userRole === 'hospital') {
        const org = await organizationRepository.findByUserId(req.user._id);
        if (org) {
          appointments = await appointmentRepository.listForOrganization(org._id, {
            doctorId: req.query?.doctorId,
            date: req.query?.date,
            status: req.query?.status,
          });
        }
      }

      res.json({ success: true, count: appointments.length, data: appointments });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/appointments/:id
   */
  async getAppointmentById(req, res, next) {
    try {
      const result = await appointmentService.getAppointmentDetails(req.params.id, req.user);
      res.json({ success: true, data: result });
    } catch (err) {
      if (err.message && err.message.includes('Unauthorized')) {
        return res.status(403).json({ success: false, message: err.message });
      }
      if (err.message && err.message.includes('not found')) {
        return res.status(404).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  /**
   * POST/PUT/PATCH /api/appointments/:id/reschedule
   */
  async rescheduleAppointment(req, res, next) {
    try {
      const newDate = req.body?.newDate || req.body?.newSlotDate;
      const newTime = req.body?.newTime || req.body?.newSlotTime;
      const reason = req.body?.reason || req.body?.rescheduleReason || '';

      const updated = await appointmentService.rescheduleAppointment(req.params.id, req.user._id, {
        newDate,
        newTime,
        reason,
      });

      res.json({
        success: true,
        message: 'Appointment rescheduled successfully',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST/PUT/PATCH /api/appointments/:id/cancel
   */
  async cancelAppointment(req, res, next) {
    try {
      const defaultReason = req.user?.role === 'doctor' ? 'Cancelled by doctor' : 'Cancelled by patient';
      const reason = req.body?.reason || req.body?.cancellationReason || defaultReason;
      const callArgs = [req.params.id, req.user._id, reason];
      if (req.user?.role) {
        callArgs.push(req.user.role);
      }
      const updated = await appointmentService.cancelAppointment(...callArgs);

      res.json({
        success: true,
        message: 'Appointment cancelled successfully',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST/PUT /api/appointments/:id/complete and POST /api/doctors/me/appointments/:id/complete
   */
  async completeAppointment(req, res, next) {
    try {
      const notes = req.body?.clinicalNotes || req.body?.notes || 'Consultation completed';
      const updated = await appointmentService.completeAppointment(req.params.id, notes, req.user._id);

      res.json({
        success: true,
        message: 'Consultation marked as completed',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/appointments/:id/no-show and POST /api/doctors/me/appointments/:id/no-show
   */
  async markNoShow(req, res, next) {
    try {
      const notes = req.body?.notes || req.body?.reason || 'Patient No-Show';
      const updated = await appointmentService.markNoShow(req.params.id, notes, req.user._id);

      res.json({
        success: true,
        message: 'Appointment marked as no-show',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  // Doctor Specific Handlers
  async getDoctorAppointments(req, res, next) {
    try {
      const doctor = await doctorRepository.findByUserId(req.user._id);
      if (!doctor) return res.status(404).json({ success: false, message: 'Doctor profile not found.' });

      const appointments = await appointmentRepository.listForDoctor(doctor._id, {
        date: req.query?.date,
        status: req.query?.status,
        organizationId: req.query?.organizationId,
      });

      res.json({ success: true, count: appointments.length, data: appointments });
    } catch (err) {
      next(err);
    }
  }

  // Organization Specific Handlers
  async getOrganizationAppointments(req, res, next) {
    try {
      const org = await organizationRepository.findByUserId(req.user._id);
      if (!org) return res.status(404).json({ success: false, message: 'Organization profile not found.' });

      const appointments = await appointmentRepository.listForOrganization(org._id, {
        doctorId: req.query?.doctorId,
        date: req.query?.date,
        status: req.query?.status,
      });

      res.json({ success: true, count: appointments.length, data: appointments });
    } catch (err) {
      next(err);
    }
  }

  async getOrganizationAppointmentSummary(req, res, next) {
    try {
      const summary = await appointmentService.getOrganizationAppointmentSummary(req.user._id);
      res.json({ success: true, data: summary });
    } catch (err) {
      next(err);
    }
  }

  // Admin Specific Handlers
  async getAdminAppointments(req, res, next) {
    try {
      const filter = {};
      if (req.query?.status) filter.status = req.query.status;
      if (req.query?.doctorId) filter.doctorId = req.query.doctorId;
      if (req.query?.organizationId) filter.organizationId = req.query.organizationId;
      if (req.query?.patientId) filter.patientId = req.query.patientId;
      if (req.query?.date) filter.slotDate = req.query.date;

      const page = parseInt(req.query?.page, 10) || 1;
      const limit = parseInt(req.query?.limit, 10) || 50;
      const skip = (page - 1) * limit;

      const appointments = await appointmentRepository.listAll(filter, { limit, skip });
      const total = await appointmentRepository.count(filter);

      res.json({
        success: true,
        count: appointments.length,
        total,
        page,
        totalPages: Math.ceil(total / limit) || 1,
        data: appointments,
      });
    } catch (err) {
      next(err);
    }
  }

  async getAdminAppointmentReports(req, res, next) {
    try {
      const reports = await appointmentService.getAdminAppointmentReports();
      res.json({ success: true, data: reports });
    } catch (err) {
      next(err);
    }
  }
}

export const appointmentController = new AppointmentController();
