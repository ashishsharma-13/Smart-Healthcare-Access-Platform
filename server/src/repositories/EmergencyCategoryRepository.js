import mongoose from 'mongoose';
import { EmergencyCategory } from '../models/index.js';

export class EmergencyCategoryRepository {
  async listActiveCategories() {
    return await EmergencyCategory.find({ active: true }).sort({ displayOrder: 1, categoryName: 1 }).exec();
  }

  async listAllCategories() {
    return await EmergencyCategory.find({}).sort({ displayOrder: 1, categoryName: 1 }).exec();
  }

  async findByIdOrSlug(idOrSlug) {
    if (!idOrSlug) return null;
    const str = String(idOrSlug).trim();
    const isObjectId = mongoose.Types.ObjectId.isValid(str) && str.length === 24;
    return await EmergencyCategory.findOne({
      $or: [
        ...(isObjectId ? [{ _id: str }] : []),
        { categoryId: str },
        { slug: str.toLowerCase() },
      ],
    }).exec();
  }

  async createCategory(data) {
    const cat = new EmergencyCategory(data);
    return await cat.save();
  }

  async updateCategory(id, data) {
    const str = String(id).trim();
    const isObjectId = mongoose.Types.ObjectId.isValid(str) && str.length === 24;
    return await EmergencyCategory.findOneAndUpdate(
      {
        $or: [
          ...(isObjectId ? [{ _id: str }] : []),
          { categoryId: str },
          { slug: str.toLowerCase() },
        ],
      },
      { $set: data },
      { new: true }
    ).exec();
  }
}

export const emergencyCategoryRepository = new EmergencyCategoryRepository();
