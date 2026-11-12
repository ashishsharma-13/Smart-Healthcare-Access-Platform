import crypto from 'crypto';
import QRCode from 'qrcode';
import { appointmentRepository } from '../repositories/AppointmentRepository.js';
import { doctorRepository } from '../repositories/DoctorRepository.js';
import { organizationRepository } from '../repositories/OrganizationRepository.js';
import { doctorAffiliationRepository } from '../repositories/DoctorAffiliationRepository.js';

export class AppointmentService {
  /**
   * Generates standard time slots for a given doctor on a date.
   * Checks database for booked slots to accurately return availability.
   */
  async getAvailableSlots(doctorId, dateString) {
    const doctor = await doctorRepository.findById(doctorId);
    if (!doctor) throw new Error('Doctor not found');

    const defaultSlots = [
      '09:00 AM',
      '09:30 AM',
      '10:00 AM',
      '10:30 AM',
      '11:00 AM',
      '11:30 AM',
      '02:00 PM',
      '02:30 PM',
      '03:00 PM',
      '03:30 PM',
      '04:00 PM',
      '04:30 PM',
    ];

    const existingAppointments = await appointmentRepository.listForDoctor(doctorId, dateString);
    const bookedTimes = new Set(
      existingAppointments
        .filter((a) => a.status === 'booked' || a.status === 'rescheduled')
        .map((a) => a.slotTime)
    );

    return defaultSlots.map((time) => ({
      time,
      isAvailable: !bookedTimes.has(time),
    }));
  }

  async bookAppointment({ patientId, doctorId, organizationId, slotDate, slotTime, patientNotes }) {
    // 1. Verify doctor exists and is verified
    const doctor = await doctorRepository.findById(doctorId);
    if (!doctor || doctor.verificationStatus !== 'verified') {
      throw new Error('Doctor is not available or not verified.');
    }

    // Resolve organizationId if omitted
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

    // 2. Validate organization
    const org = await organizationRepository.findById(targetOrgId);
    if (!org) {
      throw new Error('Healthcare facility not found.');
    }

    // 3. Verify active doctor-organization affiliation
    const activeAffiliation = await doctorAffiliationRepository.findActiveAffiliation(doctor._id, org._id);
    if (!activeAffiliation) {
      throw new Error('Doctor is not actively affiliated with this healthcare facility. New appointment bookings require an active affiliation.');
    }

    // 4. Prevent double booking concurrency check
    const existing = await appointmentRepository.findBySlot(doctor._id, slotDate, slotTime);
    if (existing) {
      throw new Error('This appointment slot has already been booked. Please choose another time.');
    }

    const aptNum = `#AP-${Math.floor(1000 + Math.random() * 9000)}`;
    const qrToken = `PASS-${crypto.randomBytes(12).toString('hex')}`;

    try {
      const appointment = await appointmentRepository.create({
        appointmentNumber: aptNum,
        patientId,
        doctorId: doctor._id,
        organizationId: org._id,
        slotDate,
        slotTime,
        patientNotes,
        qrToken,
        status: 'booked',
      });

      // Generate visual QR code for appointment pass
      const qrPassData = JSON.stringify({
        token: qrToken,
        appointmentNumber: aptNum,
        doctor: doctor.userId?.name,
        slotDate,
        slotTime,
        hospital: org.name,
      });
      const qrPassUrl = await QRCode.toDataURL(qrPassData);

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

  async rescheduleAppointment(appointmentId, patientId, { newDate, newTime }) {
    const appointment = await appointmentRepository.findById(appointmentId);
    if (!appointment) throw new Error('Appointment not found');

    if (appointment.status === 'cancelled') {
      throw new Error('Cannot reschedule a cancelled appointment');
    }

    const doctorId = appointment.doctorId?._id || appointment.doctorId;
    const conflict = await appointmentRepository.findBySlot(doctorId, newDate, newTime);
    if (conflict && conflict._id.toString() !== appointment._id.toString()) {
      throw new Error('Selected new slot is already booked.');
    }

    return await appointmentRepository.updateById(appointment._id, {
      slotDate: newDate,
      slotTime: newTime,
      status: 'rescheduled',
    });
  }

  async cancelAppointment(appointmentId, patientOrDoctorId, reason = '') {
    const appointment = await appointmentRepository.findById(appointmentId);
    if (!appointment) throw new Error('Appointment not found');

    return await appointmentRepository.updateById(appointment._id, {
      status: 'cancelled',
      cancellationReason: reason || 'Cancelled by user',
    });
  }

  async completeAppointment(appointmentId, notes = '') {
    const appointment = await appointmentRepository.findById(appointmentId);
    if (!appointment) throw new Error('Appointment not found');

    return await appointmentRepository.updateById(appointment._id, {
      status: 'completed',
      clinicalNotes: notes || 'Consultation completed',
    });
  }
}

export const appointmentService = new AppointmentService();

