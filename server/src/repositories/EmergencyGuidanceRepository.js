import { EmergencyGuidance } from '../models/index.js';

export class EmergencyGuidanceRepository {
  async findApprovedByCategoryId(categoryId) {
    return await EmergencyGuidance.findOne({
      categoryId,
      reviewStatus: 'APPROVED',
      active: true,
    })
      .populate('categoryId', 'categoryName slug icon')
      .populate('reviewedBy', 'name email role')
      .sort({ version: -1 })
      .exec();
  }

  async listAllGuidance(filter = {}) {
    return await EmergencyGuidance.find(filter)
      .populate('categoryId', 'categoryName slug icon')
      .populate('reviewedBy', 'name email role')
      .sort({ updatedAt: -1 })
      .exec();
  }

  async findById(id) {
    return await EmergencyGuidance.findById(id)
      .populate('categoryId', 'categoryName slug icon')
      .populate('reviewedBy', 'name email role')
      .exec();
  }

  async createGuidance(data) {
    const guidance = new EmergencyGuidance(data);
    return await guidance.save();
  }

  async updateGuidance(id, data) {
    return await EmergencyGuidance.findByIdAndUpdate(id, { $set: data }, { new: true })
      .populate('categoryId', 'categoryName slug icon')
      .populate('reviewedBy', 'name email role')
      .exec();
  }

  async approveGuidance(id, reviewerUserId) {
    return await EmergencyGuidance.findByIdAndUpdate(
      id,
      {
        $set: {
          reviewStatus: 'APPROVED',
          reviewedBy: reviewerUserId,
          reviewedAt: new Date(),
          active: true,
        },
      },
      { new: true }
    )
      .populate('categoryId', 'categoryName slug icon')
      .populate('reviewedBy', 'name email role')
      .exec();
  }
}

export const emergencyGuidanceRepository = new EmergencyGuidanceRepository();

