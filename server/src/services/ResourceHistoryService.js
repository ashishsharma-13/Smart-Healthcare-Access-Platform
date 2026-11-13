import { resourceInventoryHistoryRepository } from '../repositories/ResourceInventoryHistoryRepository.js';

export class ResourceHistoryService {
  /**
   * Log an immutable change into the resource inventory history.
   *
   * @param {Object} entry
   * @param {ObjectId|string} entry.resourceId
   * @param {ObjectId|string} entry.organizationId
   * @param {ObjectId|string} [entry.changedByUserId]
   * @param {string} entry.changeType
   * @param {Object} [entry.previousQuantity]
   * @param {Object} [entry.newQuantity]
   * @param {number} [entry.quantityDelta]
   * @param {string} [entry.previousStatus]
   * @param {string} [entry.newStatus]
   * @param {string} [entry.reason]
   * @param {Object} [entry.metadata]
   */
  async logChange({
    resourceId,
    organizationId,
    changedByUserId = null,
    changeType,
    previousQuantity = {},
    newQuantity = {},
    quantityDelta = 0,
    previousStatus = null,
    newStatus = null,
    reason = '',
    metadata = {},
  }) {
    return await resourceInventoryHistoryRepository.recordChange({
      resourceId,
      organizationId,
      changedByUserId,
      changeType,
      previousQuantity: {
        total: previousQuantity.totalQuantity ?? previousQuantity.total ?? 0,
        available: previousQuantity.availableQuantity ?? previousQuantity.available ?? 0,
        reserved: previousQuantity.reservedQuantity ?? previousQuantity.reserved ?? 0,
        allocated: previousQuantity.allocatedQuantity ?? previousQuantity.allocated ?? 0,
        unavailable: previousQuantity.unavailableQuantity ?? previousQuantity.unavailable ?? 0,
      },
      newQuantity: {
        total: newQuantity.totalQuantity ?? newQuantity.total ?? 0,
        available: newQuantity.availableQuantity ?? newQuantity.available ?? 0,
        reserved: newQuantity.reservedQuantity ?? newQuantity.reserved ?? 0,
        allocated: newQuantity.allocatedQuantity ?? newQuantity.allocated ?? 0,
        unavailable: newQuantity.unavailableQuantity ?? newQuantity.unavailable ?? 0,
      },
      quantityDelta,
      previousStatus,
      newStatus,
      reason,
      metadata,
      timestamp: new Date(),
    });
  }

  async getResourceHistory(resourceId, { limit = 50, skip = 0 } = {}) {
    const records = await resourceInventoryHistoryRepository.findByResource(resourceId, { limit, skip });
    const total = await resourceInventoryHistoryRepository.countByResource(resourceId);
    return { records, total };
  }

  async getOrganizationHistory(organizationId, { limit = 50, skip = 0, changeType = null } = {}) {
    const records = await resourceInventoryHistoryRepository.findByOrganization(organizationId, {
      limit,
      skip,
      changeType,
    });
    return { records };
  }
}

export const resourceHistoryService = new ResourceHistoryService();

