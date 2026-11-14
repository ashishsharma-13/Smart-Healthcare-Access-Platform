import mongoose from 'mongoose';
import {
  Feedback,
  Appointment,
  EmergencyRequest,
  Doctor,
  Organization,
} from '../models/index.js';

export class FeedbackService {
  /**
   * Submit patient feedback after completed appointment or emergency treatment
   */
  async createFeedback(patientUserId, payload = {}) {
    const {
      rating,
      careQualityRating,
      waitTimeRating,
      staffBehaviorRating,
      cleanlinessRating,
      comments = '',
      tags = [],
      isAnonymous = false,
      appointmentId,
      emergencyRequestId,
    } = payload;

    const numRating = Number(rating);
    if (!numRating || isNaN(numRating) || numRating < 1 || numRating > 5) {
      const err = new Error('Rating must be a number between 1 and 5 stars.');
      err.statusCode = 400;
      throw err;
    }

    let feedbackType = '';
    let appointment = null;
    let emergency = null;
    let doctorId = null;
    let organizationId = null;

    if (appointmentId) {
      feedbackType = 'APPOINTMENT';
      appointment = await Appointment.findById(appointmentId);
      if (!appointment) {
        const err = new Error('Appointment not found.');
        err.statusCode = 404;
        throw err;
      }

      // Verify that this appointment belongs to the logged-in patient
      if (String(appointment.patientId) !== String(patientUserId)) {
        const err = new Error('Unauthorized: You can only provide feedback for your own consultations.');
        err.statusCode = 403;
        throw err;
      }

      // Check duplicate feedback
      const existing = await Feedback.findOne({
        patientId: patientUserId,
        appointmentId: appointment._id,
      });
      if (existing) {
        const err = new Error('Feedback has already been submitted for this appointment.');
        err.statusCode = 400;
        throw err;
      }

      doctorId = appointment.doctorId;
      organizationId = appointment.organizationId;
    } else if (emergencyRequestId) {
      feedbackType = 'EMERGENCY';
      emergency = await EmergencyRequest.findOne({
        $or: [
          ...(mongoose.Types.ObjectId.isValid(emergencyRequestId) ? [{ _id: emergencyRequestId }] : []),
          { emergencyRequestId },
          { requestCode: emergencyRequestId },
        ],
      });

      if (!emergency) {
        const err = new Error('Emergency treatment record not found.');
        err.statusCode = 404;
        throw err;
      }

      // Verify that this emergency request belongs to the logged-in patient
      const isOwner =
        String(emergency.patientId) === String(patientUserId) ||
        (emergency.reportedByUserId && String(emergency.reportedByUserId) === String(patientUserId));

      if (!isOwner) {
        const err = new Error('Unauthorized: You can only provide feedback for your own emergency treatment.');
        err.statusCode = 403;
        throw err;
      }

      // Check duplicate feedback
      const existing = await Feedback.findOne({
        patientId: patientUserId,
        emergencyRequestId: emergency._id,
      });
      if (existing) {
        const err = new Error('Feedback has already been submitted for this emergency treatment.');
        err.statusCode = 400;
        throw err;
      }

      organizationId = emergency.selectedOrganizationId || payload.organizationId;
    } else {
      const err = new Error('Either appointmentId or emergencyRequestId is required to submit feedback.');
      err.statusCode = 400;
      throw err;
    }

    if (!organizationId) {
      const err = new Error('Healthcare facility destination is required for feedback.');
      err.statusCode = 400;
      throw err;
    }

    // Create the feedback record
    const feedback = await Feedback.create({
      patientId: patientUserId,
      feedbackType,
      appointmentId: appointment?._id || null,
      emergencyRequestId: emergency?._id || null,
      doctorId: doctorId || null,
      organizationId,
      rating: numRating,
      careQualityRating: Number(careQualityRating) || numRating,
      waitTimeRating: Number(waitTimeRating) || numRating,
      staffBehaviorRating: Number(staffBehaviorRating) || numRating,
      cleanlinessRating: Number(cleanlinessRating) || numRating,
      comments: comments.trim(),
      tags: Array.isArray(tags) ? tags : [],
      isAnonymous: Boolean(isAnonymous),
      status: 'SUBMITTED',
    });

    // Dynamically update the Organization aggregate rating and review count
    let updatedOrg = null;
    const orgFeedbacks = await Feedback.find({ organizationId });
    if (orgFeedbacks.length > 0) {
      const avgRating = orgFeedbacks.reduce((sum, f) => sum + f.rating, 0) / orgFeedbacks.length;
      updatedOrg = await Organization.findByIdAndUpdate(
        organizationId,
        {
          rating: Math.round(avgRating * 10) / 10,
          totalReviews: orgFeedbacks.length,
        },
        { new: true }
      );
    }

    // Dynamically update Doctor aggregate rating and review count if consultation
    let updatedDoc = null;
    if (doctorId) {
      const docFeedbacks = await Feedback.find({ doctorId });
      if (docFeedbacks.length > 0) {
        const avgDocRating = docFeedbacks.reduce((sum, f) => sum + f.rating, 0) / docFeedbacks.length;
        updatedDoc = await Doctor.findByIdAndUpdate(
          doctorId,
          {
            rating: Math.round(avgDocRating * 10) / 10,
            totalReviews: docFeedbacks.length,
          },
          { new: true }
        );
      }
    }

    return {
      feedback,
      organization: updatedOrg
        ? { _id: updatedOrg._id, name: updatedOrg.name, rating: updatedOrg.rating, totalReviews: updatedOrg.totalReviews }
        : null,
      doctor: updatedDoc
        ? { _id: updatedDoc._id, rating: updatedDoc.rating, totalReviews: updatedDoc.totalReviews }
        : null,
    };
  }

  /**
   * Get all feedbacks submitted by a patient
   */
  async getPatientFeedbacks(patientUserId) {
    const list = await Feedback.find({ patientId: patientUserId })
      .populate('organizationId', 'name address operatingAddress location rating')
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name avatar' },
        select: 'specialization rating',
      })
      .populate('appointmentId', 'appointmentNumber slotDate slotTime status')
      .populate('emergencyRequestId', 'emergencyRequestId requestCode emergencyType severity status createdAt')
      .sort({ createdAt: -1 })
      .lean();

    return list;
  }

  /**
   * Check whether feedback has already been submitted for a target visit
   */
  async checkFeedbackStatus(patientUserId, type, targetId) {
    const normType = (type || '').toUpperCase();
    const filter = { patientId: patientUserId };

    if (normType === 'APPOINTMENT') {
      filter.appointmentId = targetId;
    } else if (normType === 'EMERGENCY') {
      if (mongoose.Types.ObjectId.isValid(targetId)) {
        filter.emergencyRequestId = targetId;
      } else {
        const emg = await EmergencyRequest.findOne({
          $or: [{ emergencyRequestId: targetId }, { requestCode: targetId }],
        }).select('_id');
        filter.emergencyRequestId = emg?._id || targetId;
      }
    } else {
      return { hasSubmitted: false, feedback: null };
    }

    const fb = await Feedback.findOne(filter).lean();
    return {
      hasSubmitted: Boolean(fb),
      feedback: fb || null,
    };
  }

  /**
   * Public/Authenticated feedback reviews for an organization
   */
  async getOrganizationFeedbacks(organizationId, page = 1, limit = 10) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

    const total = await Feedback.countDocuments({ organizationId, status: { $in: ['SUBMITTED', 'VERIFIED'] } });
    const list = await Feedback.find({ organizationId, status: { $in: ['SUBMITTED', 'VERIFIED'] } })
      .populate('patientId', 'name avatar')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    // Sanitize anonymous reviews
    const sanitized = list.map((item) => ({
      ...item,
      patientName: item.isAnonymous ? 'Verified Patient' : item.patientId?.name || 'Verified Patient',
      patientAvatar: item.isAnonymous ? null : item.patientId?.avatar || null,
      patientId: undefined,
    }));

    return {
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      data: sanitized,
    };
  }

  /**
   * Public/Authenticated feedback reviews for a doctor
   */
  async getDoctorFeedbacks(doctorId, page = 1, limit = 10) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

    const total = await Feedback.countDocuments({ doctorId, status: { $in: ['SUBMITTED', 'VERIFIED'] } });
    const list = await Feedback.find({ doctorId, status: { $in: ['SUBMITTED', 'VERIFIED'] } })
      .populate('patientId', 'name avatar')
      .populate('organizationId', 'name')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    const sanitized = list.map((item) => ({
      ...item,
      patientName: item.isAnonymous ? 'Verified Patient' : item.patientId?.name || 'Verified Patient',
      patientAvatar: item.isAnonymous ? null : item.patientId?.avatar || null,
      patientId: undefined,
    }));

    return {
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      data: sanitized,
    };
  }
}

export const feedbackService = new FeedbackService();
