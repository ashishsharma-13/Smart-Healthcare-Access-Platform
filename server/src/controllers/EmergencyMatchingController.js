import mongoose from 'mongoose';
import { emergencyMatchingService } from '../services/EmergencyMatchingService.js';
import { emergencyMatchResultRepository } from '../repositories/EmergencyMatchResultRepository.js';
import { emergencyCapabilityRepository } from '../repositories/EmergencyCapabilityRepository.js';
import { EmergencyMatchingConfiguration } from '../models/EmergencyMatchingConfiguration.js';

export class EmergencyMatchingController {
  /**
   * POST /api/internal/emergency-matching/:requestId/evaluate
   * Triggers the full Module 9 matching pipeline for an emergency request.
   */
  async evaluate(req, res, next) {
    try {
      const { requestId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(requestId)) {
        return res.status(400).json({ success: false, message: 'Invalid request ID' });
      }

      const { EmergencyRequest } = await import('../models/EmergencyRequest.js');
      const emergencyRequest = await EmergencyRequest.findById(requestId).exec();
      if (!emergencyRequest) {
        return res.status(404).json({ success: false, message: 'Emergency request not found' });
      }

      // Duplicate prevention: if match results already exist and status is BROADCASTED, skip
      const alreadyMatched = await emergencyMatchResultRepository.hasActiveMatch(requestId);
      if (alreadyMatched && emergencyRequest.status === 'BROADCASTED') {
        const existing = await emergencyMatchResultRepository.findSuitableByRequest(requestId);
        return res.status(200).json({
          success: true,
          message: 'Matching already completed for this request',
          data: {
            alreadyMatched: true,
            results: existing,
            count: existing.length,
          },
        });
      }

      const result = await emergencyMatchingService.runMatchingForRequest(emergencyRequest, {
        allowBeep: true,
      });

      return res.status(200).json({
        success: true,
        message: `Matching complete: ${result.totalSuitable} suitable organizations found`,
        data: {
          totalSuitable: result.totalSuitable,
          totalFallback: result.totalFallback,
          radiusExpanded: result.radiusExpanded,
          searchRadiusKm: result.searchRadiusKm,
          results: result.storedResults,
          broadcastSent: result.broadcastResult ? result.broadcastResult.count : 0,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/internal/emergency-matching/:requestId/results
   * Returns stored matching results for a request.
   */
  async getResults(req, res, next) {
    try {
      const { requestId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(requestId)) {
        return res.status(400).json({ success: false, message: 'Invalid request ID' });
      }
      const results = await emergencyMatchResultRepository.findByRequest(requestId);
      const suitable = results.filter((r) => r.suitabilityStatus === 'SUITABLE');
      const fallback = results.filter((r) => r.suitabilityStatus === 'FALLBACK');
      return res.status(200).json({
        success: true,
        data: { results, suitable, fallback, count: results.length },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/internal/emergency-matching/:requestId/refresh
   * Re-runs matching (deletes old results and re-evaluates).
   */
  async refresh(req, res, next) {
    try {
      const { requestId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(requestId)) {
        return res.status(400).json({ success: false, message: 'Invalid request ID' });
      }
      const { EmergencyRequest } = await import('../models/EmergencyRequest.js');
      const emergencyRequest = await EmergencyRequest.findById(requestId).exec();
      if (!emergencyRequest) {
        return res.status(404).json({ success: false, message: 'Emergency request not found' });
      }
      await emergencyMatchResultRepository.deleteByRequest(requestId);
      const result = await emergencyMatchingService.runMatchingForRequest(emergencyRequest, {
        allowBeep: false,
      });
      return res.status(200).json({
        success: true,
        message: 'Matching refreshed',
        data: {
          totalSuitable: result.totalSuitable,
          totalFallback: result.totalFallback,
          results: result.storedResults,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/internal/emergency-matching/:requestId/status
   */
  async getStatus(req, res, next) {
    try {
      const { requestId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(requestId)) {
        return res.status(400).json({ success: false, message: 'Invalid request ID' });
      }
      const { EmergencyRequest } = await import('../models/EmergencyRequest.js');
      const req_ = await EmergencyRequest.findById(requestId).exec();
      const matched = await emergencyMatchResultRepository.hasActiveMatch(requestId);
      return res.status(200).json({
        success: true,
        data: {
          requestStatus: req_ ? req_.status : null,
          hasMatchResults: matched,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // ── Admin: Emergency Capabilities ───────────────────────────────────────

  async listCapabilities(req, res, next) {
    try {
      const caps = await emergencyCapabilityRepository.findAll({ activeOnly: false });
      return res.status(200).json({ success: true, data: caps, count: caps.length });
    } catch (err) {
      next(err);
    }
  }

  async createCapability(req, res, next) {
    try {
      const { capabilityCode, capabilityName, description, category } = req.body;
      if (!capabilityCode || !capabilityName) {
        return res.status(400).json({ success: false, message: 'capabilityCode and capabilityName are required' });
      }
      const cap = await emergencyCapabilityRepository.upsertCapability({
        capabilityCode, capabilityName, description, category,
      });
      return res.status(201).json({ success: true, data: cap, message: 'Capability created/updated' });
    } catch (err) {
      next(err);
    }
  }

  async updateCapability(req, res, next) {
    try {
      const { id } = req.params;
      const { EmergencyCapability } = await import('../models/EmergencyCapability.js');
      const updated = await EmergencyCapability.findByIdAndUpdate(id, { $set: req.body }, { new: true });
      if (!updated) return res.status(404).json({ success: false, message: 'Capability not found' });
      return res.status(200).json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  async createCategoryMapping(req, res, next) {
    try {
      const { categoryId, capabilityId, requirementType, priority } = req.body;
      if (!categoryId || !capabilityId) {
        return res.status(400).json({ success: false, message: 'categoryId and capabilityId are required' });
      }
      const mapping = await emergencyCapabilityRepository.upsertCategoryCapability({
        categoryId, capabilityId, requirementType: requirementType || 'OPTIONAL', priority: priority || 1,
      });
      return res.status(201).json({ success: true, data: mapping });
    } catch (err) {
      next(err);
    }
  }

  async getConfiguration(req, res, next) {
    try {
      const config = await EmergencyMatchingConfiguration.findOne({ active: true }).exec();
      return res.status(200).json({ success: true, data: config || { default: true } });
    } catch (err) {
      next(err);
    }
  }

  async updateConfiguration(req, res, next) {
    try {
      const config = await EmergencyMatchingConfiguration.findOneAndUpdate(
        { active: true },
        { $set: req.body },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      return res.status(200).json({ success: true, data: config });
    } catch (err) {
      next(err);
    }
  }

  async getAuditResults(req, res, next) {
    try {
      const { EmergencyMatchResult } = await import('../models/EmergencyMatchResult.js');
      const results = await EmergencyMatchResult.find({})
        .populate('emergencyRequestId', 'requestCode status createdAt')
        .populate('organizationId', 'name')
        .sort({ evaluatedAt: -1 })
        .limit(100)
        .exec();
      return res.status(200).json({ success: true, data: results, count: results.length });
    } catch (err) {
      next(err);
    }
  }

  // ── Organization: Emergency Capabilities ────────────────────────────────

  async getOrgCapabilities(req, res, next) {
    try {
      const orgId = req.organization?._id || req.user?.organizationId;
      if (!orgId) return res.status(400).json({ success: false, message: 'Organization not found' });
      const caps = await emergencyCapabilityRepository.getOrganizationCapabilities(orgId);
      return res.status(200).json({ success: true, data: caps, count: caps.length });
    } catch (err) {
      next(err);
    }
  }

  async updateOrgCapabilities(req, res, next) {
    try {
      const orgId = req.organization?._id || req.user?.organizationId;
      if (!orgId) return res.status(400).json({ success: false, message: 'Organization not found' });
      const { capabilities } = req.body; // Array of { capabilityId, verificationStatus }
      if (!Array.isArray(capabilities)) {
        return res.status(400).json({ success: false, message: 'capabilities array required' });
      }
      const results = [];
      for (const cap of capabilities) {
        const r = await emergencyCapabilityRepository.upsertOrganizationCapability({
          organizationId: orgId,
          capabilityId: cap.capabilityId,
          verificationStatus: cap.verificationStatus || 'SELF_DECLARED',
          notes: cap.notes || '',
        });
        results.push(r);
      }
      return res.status(200).json({ success: true, data: results, count: results.length });
    } catch (err) {
      next(err);
    }
  }
}

export const emergencyMatchingController = new EmergencyMatchingController();

