import { HealthcareResourceType } from '../models/HealthcareResourceType.js';

export class HealthcareResourceTypeRepository {
  async create(data) {
    const type = new HealthcareResourceType(data);
    return await type.save();
  }

  async findById(id) {
    return await HealthcareResourceType.findById(id).exec();
  }

  async findByResourceTypeId(resourceTypeId) {
    return await HealthcareResourceType.findOne({ resourceTypeId }).exec();
  }

  async findByTypeName(typeName) {
    return await HealthcareResourceType.findOne({
      typeName: { $regex: new RegExp(`^${typeName.trim()}$`, 'i') },
    }).exec();
  }

  async listActive() {
    return await HealthcareResourceType.find({ active: true })
      .sort({ category: 1, displayOrder: 1, typeName: 1 })
      .exec();
  }

  async listAll(filters = {}) {
    const query = {};
    if (filters.category) query.category = filters.category;
    if (filters.active !== undefined) query.active = filters.active;
    if (filters.search) {
      query.$or = [
        { typeName: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
      ];
    }
    return await HealthcareResourceType.find(query)
      .sort({ category: 1, displayOrder: 1, typeName: 1 })
      .exec();
  }

  async updateById(id, updates) {
    return await HealthcareResourceType.findByIdAndUpdate(id, { $set: updates }, { new: true }).exec();
  }

  async countDocuments(query = {}) {
    return await HealthcareResourceType.countDocuments(query).exec();
  }
}

export const healthcareResourceTypeRepository = new HealthcareResourceTypeRepository();

