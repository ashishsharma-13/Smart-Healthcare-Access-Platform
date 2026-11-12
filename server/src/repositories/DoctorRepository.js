import { Doctor } from '../models/index.js';

export class DoctorRepository {
  async findByUserId(userId) {
    return await Doctor.findOne({ userId }).populate('userId', 'name email phone avatar').populate('currentPresence.organizationId', 'name address').exec();
  }

  async findById(id) {
    return await Doctor.findById(id).populate('userId', 'name email phone avatar').populate('currentPresence.organizationId', 'name address location').exec();
  }

  async findByUniqueId(doctorUniqueId) {
    return await Doctor.findOne({ doctorUniqueId }).populate('userId', 'name email phone avatar').exec();
  }

  async findByQrToken(qrCredentialToken) {
    return await Doctor.findOne({ qrCredentialToken }).populate('userId', 'name email phone avatar').exec();
  }

  async create(doctorData) {
    const doc = new Doctor(doctorData);
    return await doc.save();
  }

  async updateById(id, updateData) {
    return await Doctor.findByIdAndUpdate(id, updateData, { new: true }).populate('userId', 'name email phone avatar').exec();
  }

  async searchDoctors(query = {}) {
    const filter = { verificationStatus: 'verified' };

    if (query.specialization && query.specialization !== 'all') {
      filter.specialization = new RegExp(query.specialization, 'i');
    }
    if (query.experienceYears) {
      filter.experienceYears = { $gte: Number(query.experienceYears) };
    }
    if (query.isAvailable !== undefined && query.isAvailable !== '') {
      filter.isAvailableForAppointments = query.isAvailable === 'true' || query.isAvailable === true;
    }

    return await Doctor.find(filter)
      .populate('userId', 'name email phone avatar')
      .populate('currentPresence.organizationId', 'name address')
      .sort({ rating: -1, experienceYears: -1 })
      .exec();
  }

  async findByLicenseNumber(licenseNumber) {
    return await Doctor.findOne({ licenseNumber: licenseNumber.trim() })
      .populate('userId', 'name email phone avatar')
      .exec();
  }

  async findByApplicationReference(applicationReference) {
    return await Doctor.findOne({ applicationReference })
      .populate('userId', 'name email phone avatar')
      .exec();
  }

  async listPendingVerifications() {
    return await Doctor.find({
      verificationStatus: { $in: ['pending', 'PENDING_VERIFICATION'] },
    })
      .populate('userId', 'name email phone avatar')
      .sort({ createdAt: -1 })
      .exec();
  }

  async listVerifiedDoctors() {
    return await Doctor.find({
      verificationStatus: { $in: ['verified', 'VERIFIED'] },
    })
      .populate('userId', 'name email phone avatar')
      .sort({ updatedAt: -1 })
      .exec();
  }

  async listRejectedDoctors() {
    return await Doctor.find({
      verificationStatus: { $in: ['rejected', 'REJECTED'] },
    })
      .populate('userId', 'name email phone avatar')
      .sort({ updatedAt: -1 })
      .exec();
  }
}

export const doctorRepository = new DoctorRepository();

