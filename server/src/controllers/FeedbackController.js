import { feedbackService } from '../services/FeedbackService.js';

export class FeedbackController {
  async submitFeedback(req, res, next) {
    try {
      const patientUserId = req.user._id;
      const result = await feedbackService.createFeedback(patientUserId, req.body);
      res.status(201).json({
        success: true,
        message: 'Feedback submitted successfully. Thank you for rating your healthcare experience.',
        data: result.feedback,
        organization: result.organization,
        doctor: result.doctor,
      });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  async getMyFeedbacks(req, res, next) {
    try {
      const patientUserId = req.user._id;
      const feedbacks = await feedbackService.getPatientFeedbacks(patientUserId);
      res.json({
        success: true,
        count: feedbacks.length,
        data: feedbacks,
      });
    } catch (err) {
      next(err);
    }
  }

  async checkFeedbackStatus(req, res, next) {
    try {
      const patientUserId = req.user._id;
      const { type, id } = req.params;
      const status = await feedbackService.checkFeedbackStatus(patientUserId, type, id);
      res.json({
        success: true,
        ...status,
      });
    } catch (err) {
      next(err);
    }
  }

  async getOrganizationFeedbacks(req, res, next) {
    try {
      const { orgId } = req.params;
      const { page, limit } = req.query;
      const result = await feedbackService.getOrganizationFeedbacks(orgId, page, limit);
      res.json({
        success: true,
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getDoctorFeedbacks(req, res, next) {
    try {
      const { doctorId } = req.params;
      const { page, limit } = req.query;
      const result = await feedbackService.getDoctorFeedbacks(doctorId, page, limit);
      res.json({
        success: true,
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const feedbackController = new FeedbackController();
