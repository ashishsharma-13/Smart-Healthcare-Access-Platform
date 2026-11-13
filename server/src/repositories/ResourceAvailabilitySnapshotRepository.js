import { ResourceAvailabilitySnapshot } from '../models/ResourceAvailabilitySnapshot.js';

export class ResourceAvailabilitySnapshotRepository {
  async captureSnapshot(data) {
    const snapshot = new ResourceAvailabilitySnapshot(data);
    return await snapshot.save();
  }

  async findByResource(resourceId, limit = 20) {
    return await ResourceAvailabilitySnapshot.find({ resourceId })
      .sort({ capturedAt: -1 })
      .limit(limit)
      .exec();
  }

  async findLatestForOrganization(organizationId) {
    return await ResourceAvailabilitySnapshot.aggregate([
      { $match: { organizationId } },
      { $sort: { capturedAt: -1 } },
      {
        $group: {
          _id: '$resourceId',
          latest: { $first: '$$ROOT' },
        },
      },
      { $replaceRoot: { newRoot: '$latest' } },
    ]);
  }
}

export const resourceAvailabilitySnapshotRepository = new ResourceAvailabilitySnapshotRepository();

