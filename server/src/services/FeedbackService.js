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

      doctorId = appointment.doctorId?._id || appointment.doctorId;
      organizationId = appointment.organizationId?._id || appointment.organizationId;
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
    let resolvedOrg = null;
    if (mongoose.Types.ObjectId.isValid(organizationId)) {
      resolvedOrg = await Organization.findById(organizationId);
    }
    if (!resolvedOrg && organizationId) {
      resolvedOrg = await Organization.findOne({
        $or: [
          { registrationNumber: organizationId },
          { name: new RegExp(String(organizationId).replace(/-/g, ' '), 'i') },
        ],
      });
    }

    const targetOrgIds = [];
    if (resolvedOrg) {
      targetOrgIds.push(resolvedOrg._id);
    } else if (mongoose.Types.ObjectId.isValid(organizationId)) {
      targetOrgIds.push(new mongoose.Types.ObjectId(organizationId));
    }

    if (targetOrgIds.length === 0) {
      return {
        total: 0,
        page: 1,
        totalPages: 1,
        data: [],
        stats: {
          averageRating: 0,
          totalReviews: 0,
          careQualityAvg: 0,
          waitTimeAvg: 0,
          staffBehaviorAvg: 0,
          cleanlinessAvg: 0,
          distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        },
      };
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

    const filter = {
      organizationId: { $in: targetOrgIds },
      status: { $in: ['SUBMITTED', 'VERIFIED'] },
    };
    const allFeedbacks = await Feedback.find(filter).lean();
    const total = allFeedbacks.length;

    let stats = {
      averageRating: 0,
      totalReviews: total,
      careQualityAvg: 0,
      waitTimeAvg: 0,
      staffBehaviorAvg: 0,
      cleanlinessAvg: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };

    if (total > 0) {
      let sumRating = 0;
      let sumCare = 0;
      let sumWait = 0;
      let sumStaff = 0;
      let sumClean = 0;

      for (const f of allFeedbacks) {
        sumRating += f.rating || 0;
        sumCare += f.careQualityRating || f.rating || 0;
        sumWait += f.waitTimeRating || f.rating || 0;
        sumStaff += f.staffBehaviorRating || f.rating || 0;
        sumClean += f.cleanlinessRating || f.rating || 0;
        const rounded = Math.min(5, Math.max(1, Math.round(f.rating || 5)));
        stats.distribution[rounded] = (stats.distribution[rounded] || 0) + 1;
      }

      stats.averageRating = Math.round((sumRating / total) * 10) / 10;
      stats.careQualityAvg = Math.round((sumCare / total) * 10) / 10;
      stats.waitTimeAvg = Math.round((sumWait / total) * 10) / 10;
      stats.staffBehaviorAvg = Math.round((sumStaff / total) * 10) / 10;
      stats.cleanlinessAvg = Math.round((sumClean / total) * 10) / 10;
    }

    const list = await Feedback.find(filter)
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
      stats,
    };
  }

  /**
   * Public/Authenticated feedback reviews for a doctor
   */
  async getDoctorFeedbacks(doctorId, page = 1, limit = 10) {
    let resolvedDoctor = null;
    if (mongoose.Types.ObjectId.isValid(doctorId)) {
      resolvedDoctor = await Doctor.findById(doctorId);
      if (!resolvedDoctor) {
        resolvedDoctor = await Doctor.findOne({ userId: doctorId });
      }
    }
    if (!resolvedDoctor && doctorId) {
      resolvedDoctor = await Doctor.findOne({ doctorUniqueId: doctorId });
    }
    if (!resolvedDoctor && typeof doctorId === 'string' && doctorId.length > 2) {
      const allDocs = await Doctor.find().populate('userId', 'name').lean();
      const normQuery = doctorId.toLowerCase().replace(/^(dr\.|doc-)/i, '').replace(/-/g, ' ').trim();
      resolvedDoctor = allDocs.find((d) => {
        const name = (d.userId?.name || '').toLowerCase().replace(/^dr\.\s*/i, '').trim();
        return (
          d.doctorUniqueId?.toLowerCase() === doctorId.toLowerCase() ||
          (name && (name.includes(normQuery) || normQuery.includes(name)))
        );
      });
    }

    const targetDoctorIds = [];
    if (resolvedDoctor) {
      targetDoctorIds.push(resolvedDoctor._id);
      if (resolvedDoctor.userId) {
        targetDoctorIds.push(resolvedDoctor.userId?._id || resolvedDoctor.userId);
      }
    } else if (mongoose.Types.ObjectId.isValid(doctorId)) {
      targetDoctorIds.push(new mongoose.Types.ObjectId(doctorId));
    }

    if (targetDoctorIds.length === 0) {
      return {
        total: 0,
        page: 1,
        totalPages: 1,
        data: [],
        stats: {
          averageRating: 0,
          totalReviews: 0,
          careQualityAvg: 0,
          waitTimeAvg: 0,
          staffBehaviorAvg: 0,
          cleanlinessAvg: 0,
          distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        },
      };
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

    const filter = {
      doctorId: { $in: targetDoctorIds },
      status: { $in: ['SUBMITTED', 'VERIFIED'] },
    };
    const allFeedbacks = await Feedback.find(filter).lean();
    const total = allFeedbacks.length;

    let stats = {
      averageRating: 0,
      totalReviews: total,
      careQualityAvg: 0,
      waitTimeAvg: 0,
      staffBehaviorAvg: 0,
      cleanlinessAvg: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };

    if (total > 0) {
      let sumRating = 0;
      let sumCare = 0;
      let sumWait = 0;
      let sumStaff = 0;
      let sumClean = 0;

      for (const f of allFeedbacks) {
        sumRating += f.rating || 0;
        sumCare += f.careQualityRating || f.rating || 0;
        sumWait += f.waitTimeRating || f.rating || 0;
        sumStaff += f.staffBehaviorRating || f.rating || 0;
        sumClean += f.cleanlinessRating || f.rating || 0;
        const rounded = Math.min(5, Math.max(1, Math.round(f.rating || 5)));
        stats.distribution[rounded] = (stats.distribution[rounded] || 0) + 1;
      }

      stats.averageRating = Math.round((sumRating / total) * 10) / 10;
      stats.careQualityAvg = Math.round((sumCare / total) * 10) / 10;
      stats.waitTimeAvg = Math.round((sumWait / total) * 10) / 10;
      stats.staffBehaviorAvg = Math.round((sumStaff / total) * 10) / 10;
      stats.cleanlinessAvg = Math.round((sumClean / total) * 10) / 10;
    }

    const list = await Feedback.find(filter)
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
      stats,
    };
  }
}

export const feedbackService = new FeedbackService();
