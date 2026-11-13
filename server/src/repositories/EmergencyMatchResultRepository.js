import mongoose from 'mongoose';
import { EmergencyMatchResult } from '../models/EmergencyMatchResult.js';

export class EmergencyMatchResultRepository {
  async upsertResult(data) {
    const { emergencyRequestId, organizationId, ...rest } = data;
    return await EmergencyMatchResult.findOneAndUpdate(
      { emergencyRequestId, organizationId },
      { $set: { emergencyRequestId, organizationId, ...rest } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).populate('organizationId', 'name operatingAddress location emergencyContactPhone phone').exec();
  }

  async findByRequest(emergencyRequestId) {
    if (!emergencyRequestId || !mongoose.Types.ObjectId.isValid(emergencyRequestId)) return [];
    return await EmergencyMatchResult.find({ emergencyRequestId })
      .populate('organizationId', 'name operatingAddress location emergencyContactPhone phone slug')
      .sort({ rank: 1, overallScore: -1 })
      .exec();
  }

  async findSuitableByRequest(emergencyRequestId) {
    if (!emergencyRequestId || !mongoose.Types.ObjectId.isValid(emergencyRequestId)) return [];
    return await EmergencyMatchResult.find({
      emergencyRequestId,
      suitabilityStatus: { $in: ['SUITABLE', 'FALLBACK'] },
    })
      .populate('organizationId', 'name operatingAddress location emergencyContactPhone phone slug')
      .sort({ rank: 1 })
      .exec();
  }

  async deleteByRequest(emergencyRequestId) {
    if (!emergencyRequestId) return;
    return await EmergencyMatchResult.deleteMany({ emergencyRequestId }).exec();
  }

  async hasActiveMatch(emergencyRequestId) {
    if (!emergencyRequestId) return false;
    const count = await EmergencyMatchResult.countDocuments({ emergencyRequestId });
    return count > 0;
  }
}

export const emergencyMatchResultRepository = new EmergencyMatchResultRepository();

