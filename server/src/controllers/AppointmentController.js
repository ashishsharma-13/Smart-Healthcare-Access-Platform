import { appointmentService } from '../services/AppointmentService.js';
import { appointmentRepository } from '../repositories/AppointmentRepository.js';
import { doctorRepository } from '../repositories/DoctorRepository.js';
import { organizationRepository } from '../repositories/OrganizationRepository.js';

export class AppointmentController {
  async getAvailableSlots(req, res, next) {
    try {
      const { doctorId } = req.params;
      const { date } = req.query; // YYYY-MM-DD
      if (!date) {
        return res.status(400).json({ success: false, message: 'Date parameter is required (YYYY-MM-DD)' });
      }

      const slots = await appointmentService.getAvailableSlots(doctorId, date);
      res.json({ success: true, data: slots });
    } catch (err) {
      next(err);
    }
  }

  async bookAppointment(req, res, next) {
    try {
      const { doctorId, organizationId, slotDate, slotTime, patientNotes } = req.body;
      const result = await appointmentService.bookAppointment({
        patientId: req.user._id,
        doctorId,
        organizationId,
        slotDate,
        slotTime,
        patientNotes,
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

  async getMyAppointments(req, res, next) {
    try {
      let appointments = [];
      if (req.user.role === 'patient') {
        appointments = await appointmentRepository.listForPatient(req.user._id);
      } else if (req.user.role === 'doctor') {
        const doctor = await doctorRepository.findByUserId(req.user._id);
        if (doctor) {
          appointments = await appointmentRepository.listForDoctor(doctor._id, req.query.date);
        }
      } else if (req.user.role === 'organization') {
        const org = await organizationRepository.findByUserId(req.user._id);
        if (org) {
          appointments = await appointmentRepository.listForOrganization(org._id);
        }
      }

      res.json({ success: true, count: appointments.length, data: appointments });
    } catch (err) {
      next(err);
    }
  }

  async getAppointmentById(req, res, next) {
    try {
      const appointment = await appointmentRepository.findById(req.params.id);
      if (!appointment) {
        return res.status(404).json({ success: false, message: 'Appointment not found' });
      }
      res.json({ success: true, data: appointment });
    } catch (err) {
      next(err);
    }
  }

  async rescheduleAppointment(req, res, next) {
    try {
      const newDate = req.body?.newDate || req.body?.newSlotDate;
      const newTime = req.body?.newTime || req.body?.newSlotTime;
      const updated = await appointmentService.rescheduleAppointment(req.params.id, req.user._id, {
        newDate,
        newTime,
      });
      res.json({ success: true, message: 'Appointment rescheduled successfully', data: updated });
    } catch (err) {
      next(err);
    }
  }

  async cancelAppointment(req, res, next) {
    try {
      const reason = req.body?.reason || req.body?.cancellationReason || 'Cancelled by patient';
      const updated = await appointmentService.cancelAppointment(req.params.id, req.user._id, reason);
      res.json({ success: true, message: 'Appointment cancelled successfully', data: updated });
    } catch (err) {
      next(err);
    }
  }
}

export const appointmentController = new AppointmentController();
