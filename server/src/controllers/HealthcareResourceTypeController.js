import { healthcareResourceTypeService } from '../services/HealthcareResourceTypeService.js';

export class HealthcareResourceTypeController {
  async listActive(req, res, next) {
    try {
      const types = await healthcareResourceTypeService.listActive();
      res.json({
        success: true,
        count: types.length,
        data: types,
      });
    } catch (err) {
      next(err);
    }
  }

  async listAll(req, res, next) {
    try {
      const types = await healthcareResourceTypeService.listAll(req.query);
      res.json({
        success: true,
        count: types.length,
        data: types,
      });
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const type = await healthcareResourceTypeService.getById(req.params.id);
      res.json({
        success: true,
        data: type,
      });
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const created = await healthcareResourceTypeService.create(req.body);
      res.status(201).json({
        success: true,
        message: 'Healthcare resource type created successfully.',
        data: created,
      });
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const updated = await healthcareResourceTypeService.update(req.params.id, req.body);
      res.json({
        success: true,
        message: 'Healthcare resource type updated successfully.',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async toggleStatus(req, res, next) {
    try {
      const updated = await healthcareResourceTypeService.toggleStatus(req.params.id, req.body.active);
      res.json({
        success: true,
        message: `Resource type is now ${updated.active ? 'active' : 'inactive'}.`,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const healthcareResourceTypeController = new HealthcareResourceTypeController();

