import { healthcareResourceService } from '../services/HealthcareResourceService.js';
import { resourceHistoryService } from '../services/ResourceHistoryService.js';
import { resourceAvailabilityService } from '../services/ResourceAvailabilityService.js';
import { organizationRepository } from '../repositories/OrganizationRepository.js';

export class HealthcareResourceController {
  async _getOrg(req) {
    if (req.user?.role === 'organization') {
      const org = await organizationRepository.findByUserId(req.user._id);
      if (!org) {
        const err = new Error('Organization profile not found for this user account.');
        err.status = 404;
        throw err;
      }
      return org;
    }
    // If admin or internal
    if (req.query.organizationId || req.body?.organizationId) {
      const org = await organizationRepository.findById(req.query.organizationId || req.body?.organizationId);
      if (!org) {
        const err = new Error('Target organization not found.');
        err.status = 404;
        throw err;
      }
      return org;
    }
    const err = new Error('Organization context required.');
    err.status = 400;
    throw err;
  }

  async registerResource(req, res, next) {
    try {
      const org = await this._getOrg(req);
      const data = {
        ...req.body,
        organizationId: org._id,
      };
      const resource = await healthcareResourceService.registerResource(data, req.user._id);
      res.status(201).json({
        success: true,
        message: 'Resource registered successfully in organization inventory.',
        data: resource,
      });
    } catch (err) {
      next(err);
    }
  }

  async getMyResources(req, res, next) {
    try {
      const org = await this._getOrg(req);
      const resources = await healthcareResourceService.getResources(org._id, req.query);
      res.json({
        success: true,
        count: resources.length,
        data: resources,
      });
    } catch (err) {
      next(err);
    }
  }

  async getOrganizationSummary(req, res, next) {
    try {
      const org = await this._getOrg(req);
      const summary = await healthcareResourceService.getOrganizationSummary(org._id);
      res.json({
        success: true,
        data: summary,
      });
    } catch (err) {
      next(err);
    }
  }

  async getResourceById(req, res, next) {
    try {
      const org = await this._getOrg(req);
      const resource = await healthcareResourceService.getResourceById(
        req.params.resourceId,
        org._id,
        req.user?.role
      );
      res.json({
        success: true,
        data: resource,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateResource(req, res, next) {
    try {
      const org = await this._getOrg(req);
      const updated = await healthcareResourceService.updateResource(
        req.params.resourceId,
        org._id,
        req.user._id,
        req.body
      );
      res.json({
        success: true,
        message: 'Resource configuration updated successfully.',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateCapacity(req, res, next) {
    try {
      const org = await this._getOrg(req);
      const updated = await healthcareResourceService.updateCapacity(
        req.params.resourceId,
        org._id,
        req.user._id,
        req.body
      );
      res.json({
        success: true,
        message: 'Resource capacity updated successfully.',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateOperationalStatus(req, res, next) {
    try {
      const org = await this._getOrg(req);
      const updated = await healthcareResourceService.updateOperationalStatus(
        req.params.resourceId,
        org._id,
        req.user._id,
        req.body
      );
      res.json({
        success: true,
        message: 'Operational status updated successfully.',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async adjustAvailability(req, res, next) {
    try {
      const org = await this._getOrg(req);
      const updated = await healthcareResourceService.adjustAvailability(
        req.params.resourceId,
        org._id,
        req.user._id,
        req.body
      );
      res.json({
        success: true,
        message: 'Resource availability adjusted successfully.',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async getResourceHistory(req, res, next) {
    try {
      const org = await this._getOrg(req);
      const resource = await healthcareResourceService.getResourceById(
        req.params.resourceId,
        org._id,
        req.user?.role
      );
      const limit = parseInt(req.query.limit, 10) || 50;
      const skip = parseInt(req.query.skip, 10) || 0;
      const result = await resourceHistoryService.getResourceHistory(resource._id, { limit, skip });
      res.json({
        success: true,
        count: result.records.length,
        total: result.total,
        data: result.records,
      });
    } catch (err) {
      next(err);
    }
  }

  async reconcileResource(req, res, next) {
    try {
      const org = await this._getOrg(req);
      const resource = await healthcareResourceService.getResourceById(
        req.params.resourceId,
        org._id,
        req.user?.role
      );
      const result = await healthcareResourceService.reconcileResource(resource._id, req.user._id, req.body);
      res.json({
        success: true,
        message: result.reconciled
          ? 'Resource reconciled and discrepancies corrected.'
          : 'Resource reconciled; no discrepancies detected.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async reconcileAll(req, res, next) {
    try {
      const org = await this._getOrg(req);
      const result = await healthcareResourceService.reconcileOrganization(org._id, req.user._id, req.body);
      res.json({
        success: true,
        message: `Organization reconciliation completed. ${result.discrepancyCount} discrepancies evaluated, ${result.reconciledCount} reconciled.`,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteResource(req, res, next) {
    try {
      const org = await this._getOrg(req);
      const result = await healthcareResourceService.deleteResource(
        req.params.resourceId,
        org._id,
        req.user._id
      );
      res.json({
        success: true,
        message: result.message,
      });
    } catch (err) {
      next(err);
    }
  }

  async getMonitoringTelemetry(req, res, next) {
    try {
      const telemetry = await healthcareResourceService.getMonitoringTelemetry();
      res.json({
        success: true,
        data: telemetry,
      });
    } catch (err) {
      next(err);
    }
  }

  async getInternalOrgResources(req, res, next) {
    try {
      const resources = await healthcareResourceService.getResources(req.params.organizationId, req.query);
      res.json({
        success: true,
        count: resources.length,
        data: resources,
      });
    } catch (err) {
      next(err);
    }
  }

  async getInternalResourceAvailability(req, res, next) {
    try {
      const qty = parseInt(req.query.quantity, 10) || 1;
      const result = await resourceAvailabilityService.validateResourceAvailability(
        req.params.resourceId,
        qty
      );
      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const healthcareResourceController = new HealthcareResourceController();

