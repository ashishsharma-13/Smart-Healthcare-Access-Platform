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

    // 2. Validate organization
    const org = await organizationRepository.findById(organizationId);
    if (!org) {
      throw new Error('Healthcare facility not found.');
    }

    // 3. Verify active doctor-organization affiliation
    const activeAffiliation = await doctorAffiliationRepository.findActiveAffiliation(doctorId, organizationId);
    if (!activeAffiliation) {
      throw new Error('Doctor is not actively affiliated with this healthcare facility. New appointment bookings require an active affiliation.');
    }

    // 4. Prevent double booking concurrency check
    const existing = await appointmentRepository.findBySlot(doctorId, slotDate, slotTime);
    if (existing) {
      throw new Error('This appointment slot has already been booked. Please choose another time.');
    }

    const aptNum = `APT-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    const qrToken = `PASS-${crypto.randomBytes(12).toString('hex')}`;

    try {
      const appointment = await appointmentRepository.create({
        appointmentNumber: aptNum,
        patientId,
        doctorId,
        organizationId,
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

    if (appointment.patientId._id.toString() !== patientId.toString()) {
      throw new Error('Unauthorized to reschedule this appointment');
    }

    if (appointment.status === 'cancelled') {
      throw new Error('Cannot reschedule a cancelled appointment');
    }

    const conflict = await appointmentRepository.findBySlot(appointment.doctorId._id, newDate, newTime);
    if (conflict && conflict._id.toString() !== appointmentId.toString()) {
      throw new Error('Selected new slot is already booked.');
    }

    return await appointmentRepository.updateById(appointmentId, {
      slotDate: newDate,
      slotTime: newTime,
      status: 'rescheduled',
    });
  }

  async cancelAppointment(appointmentId, patientOrDoctorId, reason = '') {
    const appointment = await appointmentRepository.findById(appointmentId);
    if (!appointment) throw new Error('Appointment not found');

    return await appointmentRepository.updateById(appointmentId, {
      status: 'cancelled',
      cancellationReason: reason || 'Cancelled by user',
    });
  }
}

export const appointmentService = new AppointmentService();

