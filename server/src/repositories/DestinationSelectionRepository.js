import mongoose from 'mongoose';
import { EmergencyDestinationSelection } from '../models/index.js';

export class DestinationSelectionRepository {
  async createSelection(data) {
    const selection = new EmergencyDestinationSelection(data);
    return await selection.save();
  }

  async findSelectionById(idOrCode) {
    const query = mongoose.Types.ObjectId.isValid(idOrCode)
      ? { $or: [{ _id: idOrCode }, { selectionId: idOrCode }] }
      : { selectionId: idOrCode };

    return await EmergencyDestinationSelection.findOne(query)
      .populate('emergencyRequestId')
      .populate('organizationId', 'name operatingAddress address uniqueOrganizationCode emergencyContactPhone verificationStatus')
      .populate('selectedBy', 'firstName lastName email phoneNumber')
      .exec();
  }

  async findActiveSelectionForRequest(emergencyRequestId) {
    return await EmergencyDestinationSelection.findOne({
      emergencyRequestId,
      selectionStatus: { $in: ['PENDING_CONFIRMATION', 'CONFIRMED'] },
    })
      .populate('organizationId', 'name operatingAddress address uniqueOrganizationCode emergencyContactPhone verificationStatus')
      .populate('selectedBy', 'firstName lastName email phoneNumber')
      .sort({ createdAt: -1 })
      .exec();
  }

  async supersedeExistingSelections(emergencyRequestId) {
    return await EmergencyDestinationSelection.updateMany(
      {
        emergencyRequestId,
        selectionStatus: { $in: ['PENDING_CONFIRMATION'] },
      },
      {
        $set: {
          selectionStatus: 'SUPERSEDED',
          failureReason: 'SUPERSEDED_BY_NEW_SELECTION',
        },
      }
    ).exec();
  }

  async updateSelectionStatus(idOrCode, selectionStatus, extraFields = {}) {
    const query = mongoose.Types.ObjectId.isValid(idOrCode)
      ? { $or: [{ _id: idOrCode }, { selectionId: idOrCode }] }
      : { selectionId: idOrCode };

    return await EmergencyDestinationSelection.findOneAndUpdate(
      query,
      {
        $set: {
          selectionStatus,
          ...extraFields,
        },
      },
      { new: true }
    )
      .populate('emergencyRequestId')
      .populate('organizationId', 'name operatingAddress address uniqueOrganizationCode emergencyContactPhone verificationStatus')
      .exec();
  }

  async listPendingForOrg(organizationId) {
    return await EmergencyDestinationSelection.find({
      organizationId,
      selectionStatus: 'PENDING_CONFIRMATION',
    })
      .populate({
        path: 'emergencyRequestId',
        populate: [
          { path: 'patientId', select: 'firstName lastName email phoneNumber' },
          { path: 'emergencyCategoryId', select: 'categoryName description' },
        ],
      })
      .populate('selectedBy', 'firstName lastName email phoneNumber')
      .sort({ createdAt: -1 })
      .exec();
  }

  async listSelectionsForOrg(organizationId, filters = {}) {
    return await EmergencyDestinationSelection.find({
      organizationId,
      ...filters,
    })
      .populate({
        path: 'emergencyRequestId',
        populate: [
          { path: 'patientId', select: 'firstName lastName email phoneNumber' },
          { path: 'emergencyCategoryId', select: 'categoryName description' },
        ],
      })
      .populate('selectedBy', 'firstName lastName email phoneNumber')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getSelectionHistory(emergencyRequestId) {
    return await EmergencyDestinationSelection.find({ emergencyRequestId })
      .populate('organizationId', 'name operatingAddress address uniqueOrganizationCode emergencyContactPhone')
      .sort({ createdAt: -1 })
      .exec();
  }
}

export const destinationSelectionRepository = new DestinationSelectionRepository();

