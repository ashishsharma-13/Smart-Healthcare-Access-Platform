import mongoose from 'mongoose';

const adminActionAuditLogSchema = new mongoose.Schema(
  {
    auditLogId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    adminUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    adminEmail: {
      type: String,
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
      enum: [
        'USER_STATUS_CHANGE',
        'DOCTOR_APPROVAL',
        'DOCTOR_REJECTION',
        'DOCTOR_CREDENTIAL_REISSUE',
        'ORGANIZATION_APPROVAL',
        'ORGANIZATION_REJECTION',
        'CONFIG_UPDATE',
        'SPECIALIZATION_CREATE',
        'SPECIALIZATION_UPDATE',
        'SPECIALIZATION_STATUS_CHANGE',
        'PRESENCE_CORRECTION',
        'REPORT_GENERATED',
        'REPORT_EXPORTED',
        'EMERGENCY_CATEGORY_CREATE',
        'EMERGENCY_CATEGORY_UPDATE',
        'EMERGENCY_GUIDANCE_APPROVAL',
        'EXTERNAL_FACILITY_REGISTERED',
        'RESOURCE_TYPE_CREATED',
        'RESOURCE_TYPE_STATUS_CHANGE',
        'SYSTEM_CONFIGURATION_MUTATION',
      ],
    },
    targetEntityType: {
      type: String,
      required: true,
      index: true,
      enum: [
        'User',
        'Doctor',
        'Organization',
        'PlatformConfiguration',
        'Specialization',
        'DoctorPresenceLog',
        'EmergencyRequest',
        'HealthcareResource',
        'HealthcareResourceType',
        'EmergencyCategory',
        'EmergencyGuidance',
        'ExternalHealthcareFacility',
        'Report',
      ],
    },
    targetEntityId: {
      type: String,
      required: true,
      index: true,
    },
    reason: {
      type: String,
      default: '',
    },
    previousValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    ipAddress: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for analytical queries
adminActionAuditLogSchema.index({ action: 1, timestamp: -1 });
adminActionAuditLogSchema.index({ targetEntityType: 1, targetEntityId: 1 });
adminActionAuditLogSchema.index({ adminUserId: 1, timestamp: -1 });

export const AdminActionAuditLog = mongoose.model(
  'AdminActionAuditLog',
  adminActionAuditLogSchema
);

