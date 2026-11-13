import { ResourceInventoryHistory } from '../models/ResourceInventoryHistory.js';

export class ResourceInventoryHistoryRepository {
  async recordChange(data) {
    const history = new ResourceInventoryHistory(data);
    return await history.save();
  }

  async findByResource(resourceId, { limit = 50, skip = 0 } = {}) {
    return await ResourceInventoryHistory.find({ resourceId })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .populate('changedByUserId', 'name email role')
      .exec();
  }

  async findByOrganization(organizationId, { limit = 50, skip = 0, changeType = null } = {}) {
    const query = { organizationId };
    if (changeType) query.changeType = changeType;

    return await ResourceInventoryHistory.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .populate('resourceId', 'resourceName resourceType resourceId')
      .populate('changedByUserId', 'name email role')
      .exec();
  }

  async countByResource(resourceId) {
    return await ResourceInventoryHistory.countDocuments({ resourceId }).exec();
  }
}

export const resourceInventoryHistoryRepository = new ResourceInventoryHistoryRepository();

