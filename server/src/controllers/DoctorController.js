import { doctorRepository } from '../repositories/DoctorRepository.js';
import { doctorService } from '../services/DoctorService.js';
import { User } from '../models/User.js';

export class DoctorController {
  async searchDoctors(req, res, next) {
    try {
      const doctors = await doctorRepository.searchDoctors(req.query);
      res.json({
        success: true,
        count: doctors.length,
        data: doctors,
      });
    } catch (err) {
      next(err);
    }
  }

  async getDoctorById(req, res, next) {
    try {
      const doctor = await doctorRepository.findById(req.params.id);
      if (!doctor) {
        return res.status(404).json({ success: false, message: 'Doctor not found' });
      }
      res.json({ success: true, data: doctor });
    } catch (err) {
      next(err);
    }
  }

  async getMyDoctorProfile(req, res, next) {
    try {
      const doctor = await doctorRepository.findByUserId(req.user._id);
      if (!doctor) {
        return res.status(404).json({ success: false, message: 'Doctor profile not found' });
      }
      res.json({ success: true, data: doctor });
    } catch (err) {
      next(err);
    }
  }

  async updateMyDoctorProfile(req, res, next) {
    try {
      const doctor = await doctorRepository.findByUserId(req.user._id);
      if (!doctor) {
        return res.status(404).json({ success: false, message: 'Doctor profile not found' });
      }

      const {
        name,
        phone,
        specialization,
        qualifications,
        experienceYears,
        consultationFee,
        bio,
        licenseNumber,
        languages,
        workingHours,
        isAvailableForAppointments,
        isAvailableForEmergency,
      } = req.body;

      if (name || phone) {
        const userUpdate = {};
        if (name && name.trim()) userUpdate.name = name.trim();
        if (phone && phone.trim()) userUpdate.phone = phone.trim();
        await User.findByIdAndUpdate(req.user._id, userUpdate);
      }

      const doctorUpdate = {};
      if (specialization !== undefined) doctorUpdate.specialization = specialization;
      if (qualifications !== undefined) {
        doctorUpdate.qualifications = Array.isArray(qualifications)
          ? qualifications
          : typeof qualifications === 'string'
          ? qualifications.split(',').map((s) => s.trim()).filter(Boolean)
          : [];
      }
      if (experienceYears !== undefined) doctorUpdate.experienceYears = Number(experienceYears);
      if (consultationFee !== undefined) doctorUpdate.consultationFee = Number(consultationFee);
      if (bio !== undefined) doctorUpdate.bio = bio;
      if (licenseNumber !== undefined) doctorUpdate.licenseNumber = licenseNumber;
      if (languages !== undefined) {
        doctorUpdate.languages = Array.isArray(languages)
          ? languages
          : typeof languages === 'string'
          ? languages.split(',').map((s) => s.trim()).filter(Boolean)
          : [];
      }
      if (workingHours !== undefined) doctorUpdate.workingHours = workingHours;
      if (isAvailableForAppointments !== undefined) doctorUpdate.isAvailableForAppointments = Boolean(isAvailableForAppointments);
      if (isAvailableForEmergency !== undefined) doctorUpdate.isAvailableForEmergency = Boolean(isAvailableForEmergency);

      const updated = await doctorRepository.updateById(doctor._id, doctorUpdate);
      res.json({
        success: true,
        message: 'Doctor profile updated successfully',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async getQrCredential(req, res, next) {
    try {
      const doctor = await doctorRepository.findByUserId(req.user._id);
      if (!doctor) {
        return res.status(404).json({ success: false, message: 'Doctor profile not found' });
      }
      const qrData = await doctorService.getQrCredential(doctor._id);
      res.json({ success: true, data: qrData });
    } catch (err) {
      next(err);
    }
  }

  async checkIn(req, res, next) {
    try {
      const { orgQrCheckinCode } = req.body;
      if (!orgQrCheckinCode) {
        return res.status(400).json({ success: false, message: 'Organization QR check-in code is required' });
      }
      const doctor = await doctorRepository.findByUserId(req.user._id);
      if (!doctor) {
        return res.status(404).json({ success: false, message: 'Doctor profile not found' });
      }

      const result = await doctorService.checkIn(doctor._id, orgQrCheckinCode);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async checkOut(req, res, next) {
    try {
      const doctor = await doctorRepository.findByUserId(req.user._id);
      if (!doctor) {
        return res.status(404).json({ success: false, message: 'Doctor profile not found' });
      }
      const result = await doctorService.checkOut(doctor._id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async updateAvailability(req, res, next) {
    try {
      const doctor = await doctorRepository.findByUserId(req.user._id);
      if (!doctor) {
        return res.status(404).json({ success: false, message: 'Doctor profile not found' });
      }
      const updated = await doctorService.updateAvailability(doctor._id, req.body);
      res.json({
        success: true,
        message: 'Doctor availability updated',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async getPresenceHistory(req, res, next) {
    try {
      const doctor = await doctorRepository.findByUserId(req.user._id);
      if (!doctor) {
        return res.status(404).json({ success: false, message: 'Doctor profile not found' });
      }
      const history = await doctorService.getPresenceHistory(doctor._id);
      res.json({ success: true, data: history });
    } catch (err) {
      next(err);
    }
  }
}

export const doctorController = new DoctorController();

