import mongoose from 'mongoose';
import { EmergencyCapability } from '../models/EmergencyCapability.js';
import { EmergencyCategoryCapability } from '../models/EmergencyCategoryCapability.js';
import { OrganizationEmergencyCapability } from '../models/OrganizationEmergencyCapability.js';

export class EmergencyCapabilityRepository {
  async findAll({ activeOnly = true } = {}) {
    const filter = activeOnly ? { active: true } : {};
    return await EmergencyCapability.find(filter).sort({ capabilityCode: 1 }).exec();
  }

  async findByCode(capabilityCode) {
    if (!capabilityCode) return null;
    return await EmergencyCapability.findOne({ capabilityCode: capabilityCode.toUpperCase() }).exec();
  }

  async findById(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    return await EmergencyCapability.findById(id).exec();
  }

  async upsertCapability(data) {
    const { capabilityCode, ...rest } = data;
    return await EmergencyCapability.findOneAndUpdate(
      { capabilityCode: capabilityCode.toUpperCase() },
      { $set: { capabilityCode: capabilityCode.toUpperCase(), ...rest } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).exec();
  }

  async getCategoryCapabilities(categoryId) {
    if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) return [];
    return await EmergencyCategoryCapability.find({ categoryId, active: true })
      .populate('capabilityId')
      .sort({ requirementType: 1, priority: 1 })
      .exec();
  }

  async getCategoryCapabilitiesBySlug(categorySlug) {
    const { EmergencyCategory } = await import('../models/EmergencyCategory.js');
    if (!categorySlug) return [];
    const category = await EmergencyCategory.findOne({ slug: categorySlug.toLowerCase() }).exec();
    if (!category) return [];
    return this.getCategoryCapabilities(category._id);
  }

  async upsertCategoryCapability(data) {
    const { categoryId, capabilityId, ...rest } = data;
    return await EmergencyCategoryCapability.findOneAndUpdate(
      { categoryId, capabilityId },
      { $set: { categoryId, capabilityId, ...rest } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).exec();
  }

  async getOrganizationCapabilities(organizationId) {
    if (!organizationId || !mongoose.Types.ObjectId.isValid(organizationId)) return [];
    return await OrganizationEmergencyCapability.find({ organizationId })
      .populate('capabilityId')
      .exec();
  }

  async upsertOrganizationCapability(data) {
    const { organizationId, capabilityId, ...rest } = data;
    return await OrganizationEmergencyCapability.findOneAndUpdate(
      { organizationId, capabilityId },
      { $set: { organizationId, capabilityId, ...rest } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).exec();
  }

  async removeOrganizationCapability(organizationId, capabilityId) {
    return await OrganizationEmergencyCapability.findOneAndDelete({ organizationId, capabilityId }).exec();
  }
}

export const emergencyCapabilityRepository = new EmergencyCapabilityRepository();

