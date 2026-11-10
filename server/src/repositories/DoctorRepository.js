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

  async listPendingVerifications() {
    return await Doctor.find({ verificationStatus: 'pending' })
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 })
      .exec();
  }
}

export const doctorRepository = new DoctorRepository();

