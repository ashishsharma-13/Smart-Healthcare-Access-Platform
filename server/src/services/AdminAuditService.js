import crypto from 'crypto';
import { AdminActionAuditLog } from '../models/index.js';

export class AdminAuditService {
  /**
   * Record an immutable administrative action audit log entry.
   */
  async recordAction({
    adminUserId,
    adminEmail,
    action,
    targetEntityType,
    targetEntityId,
    reason = '',
    previousValue = null,
    newValue = null,
    ipAddress = '',
    userAgent = '',
    metadata = {},
  }) {
    if (!adminUserId || !action || !targetEntityType || !targetEntityId) {
      throw new Error('Mandatory audit log fields are missing (adminUserId, action, targetEntityType, targetEntityId)');
    }

    const auditLogId = `AUD-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const logEntry = await AdminActionAuditLog.create({
      auditLogId,
      adminUserId,
      adminEmail: adminEmail || 'admin@shap.gov.in',
      action,
      targetEntityType,
      targetEntityId: String(targetEntityId),
      reason: String(reason || '').trim(),
      previousValue,
      newValue,
      ipAddress,
      userAgent,
      metadata,
      timestamp: new Date(),
    });

    return logEntry;
  }

  /**
   * Query audit logs with pagination and filters.
   */
  async getAuditLogs({
    page = 1,
    limit = 20,
    action = '',
    targetEntityType = '',
    targetEntityId = '',
    adminUserId = '',
    startDate = null,
    endDate = null,
    search = '',
  } = {}) {
    const filter = {};

    if (action && action !== 'ALL') {
      filter.action = action;
    }

    if (targetEntityType && targetEntityType !== 'ALL') {
      filter.targetEntityType = targetEntityType;
    }

    if (targetEntityId) {
      filter.targetEntityId = targetEntityId;
    }

    if (adminUserId) {
      filter.adminUserId = adminUserId;
    }

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) {
        filter.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.timestamp.$lte = end;
      }
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { auditLogId: regex },
        { adminEmail: regex },
        { reason: regex },
        { targetEntityId: regex },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      AdminActionAuditLog.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      AdminActionAuditLog.countDocuments(filter),
    ]);

    return {
      logs,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  /**
   * Fetch a single audit log by ID or auditLogId.
   */
  async getAuditLogById(id) {
    const log = await AdminActionAuditLog.findOne({
      $or: [{ auditLogId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }].filter(Boolean),
    }).lean();

    return log;
  }
}

export const adminAuditService = new AdminAuditService();

