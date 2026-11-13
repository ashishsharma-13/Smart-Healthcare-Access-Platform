import crypto from 'crypto';
import { PlatformConfiguration, ConfigurationChangeHistory } from '../models/index.js';
import { adminAuditService } from './AdminAuditService.js';

export const DEFAULT_PLATFORM_CONFIGS = [
  {
    configKey: 'EMERGENCY_BROADCAST_RADIUS_KM',
    configName: 'Initial Emergency Broadcast Radius',
    configGroup: 'EMERGENCY',
    value: 5,
    valueType: 'NUMBER',
    unit: 'km',
    description: 'Initial search radius in kilometers for finding participating organizations.',
    defaultValue: 5,
    minValue: 1,
    maxValue: 25,
    isEditable: true,
  },
  {
    configKey: 'EMERGENCY_RESPONSE_TIMEOUT_SECONDS',
    configName: 'Emergency Beep Response Window',
    configGroup: 'EMERGENCY',
    value: 30,
    valueType: 'NUMBER',
    unit: 'seconds',
    description: 'Time window allowed for organizations to accept an Emergency Beep broadcast.',
    defaultValue: 30,
    minValue: 10,
    maxValue: 120,
    isEditable: true,
  },
  {
    configKey: 'RESERVATION_EXPIRY_MINUTES',
    configName: 'Temporary Resource Hold Expiry',
    configGroup: 'RESOURCES',
    value: 15,
    valueType: 'NUMBER',
    unit: 'minutes',
    description: 'Temporary reservation hold duration before resources are released if patient has not begun en-route journey.',
    defaultValue: 15,
    minValue: 5,
    maxValue: 60,
    isEditable: true,
  },
  {
    configKey: 'MAX_SEARCH_RADIUS_KM',
    configName: 'Maximum Geographic Search Expansion',
    configGroup: 'EMERGENCY',
    value: 80,
    valueType: 'NUMBER',
    unit: 'km',
    description: 'Maximum regional boundary radius for expanding emergency candidate discovery before fallback.',
    defaultValue: 80,
    minValue: 20,
    maxValue: 150,
    isEditable: true,
  },
  {
    configKey: 'AUTO_FALLBACK_ENABLED',
    configName: 'Automatic Emergency Fallback & Recovery',
    configGroup: 'EMERGENCY',
    value: true,
    valueType: 'BOOLEAN',
    unit: '',
    description: 'Whether the system automatically triggers fallback routing when all organizations decline or timeout.',
    defaultValue: true,
    isEditable: true,
  },
  {
    configKey: 'MATCHING_CLINICAL_WEIGHT',
    configName: 'Matching Algorithm: Clinical Score Weight',
    configGroup: 'EMERGENCY',
    value: 0.6,
    valueType: 'NUMBER',
    unit: 'ratio',
    description: 'Weight assigned to clinical capability match in emergency ranking (0.0 to 1.0).',
    defaultValue: 0.6,
    minValue: 0.1,
    maxValue: 0.9,
    isEditable: true,
  },
  {
    configKey: 'MATCHING_DISTANCE_WEIGHT',
    configName: 'Matching Algorithm: Proximity Weight',
    configGroup: 'EMERGENCY',
    value: 0.4,
    valueType: 'NUMBER',
    unit: 'ratio',
    description: 'Weight assigned to geographic proximity in emergency ranking (0.0 to 1.0).',
    defaultValue: 0.4,
    minValue: 0.1,
    maxValue: 0.9,
    isEditable: true,
  },
  {
    configKey: 'MAX_APPOINTMENT_SLOTS_PER_DAY',
    configName: 'Max Daily Appointment Slots Per Physician',
    configGroup: 'APPOINTMENTS',
    value: 40,
    valueType: 'NUMBER',
    unit: 'slots',
    description: 'Maximum permitted consultation slots per practitioner per working schedule day.',
    defaultValue: 40,
    minValue: 10,
    maxValue: 100,
    isEditable: true,
  },
  {
    configKey: 'SYSTEM_MAINTENANCE_MODE',
    configName: 'Platform Maintenance Mode',
    configGroup: 'SYSTEM',
    value: false,
    valueType: 'BOOLEAN',
    unit: '',
    description: 'Restricts non-emergency patient and public traffic when system updates are being deployed.',
    defaultValue: false,
    isEditable: true,
  },
];

export class PlatformConfigurationService {
  /**
   * Ensure default configurations are populated in DB.
   */
  async seedDefaultConfigurations() {
    for (const def of DEFAULT_PLATFORM_CONFIGS) {
      const exists = await PlatformConfiguration.findOne({ configKey: def.configKey });
      if (!exists) {
        await PlatformConfiguration.create(def);
      }
    }
  }

  /**
   * Retrieve all platform configurations grouped by category.
   */
  async getAllConfigurations() {
    await this.seedDefaultConfigurations();
    const configs = await PlatformConfiguration.find().sort({ configGroup: 1, configKey: 1 }).lean();
    return configs;
  }

  /**
   * Retrieve single configuration by key.
   */
  async getConfiguration(key) {
    const cleanKey = String(key || '').trim().toUpperCase();
    let config = await PlatformConfiguration.findOne({ configKey: cleanKey }).lean();
    if (!config) {
      const def = DEFAULT_PLATFORM_CONFIGS.find((d) => d.configKey === cleanKey);
      if (def) {
        config = await PlatformConfiguration.create(def);
      }
    }
    return config;
  }

  /**
   * Update a platform configuration with mandatory reason and history tracking.
   */
  async updateConfiguration(key, rawNewValue, changeReason, adminUser, ipAddress = '', userAgent = '') {
    const cleanKey = String(key || '').trim().toUpperCase();

    if (!changeReason || !String(changeReason).trim()) {
      const err = new Error('A mandatory change reason is required for platform configuration updates.');
      err.statusCode = 400;
      throw err;
    }

    const config = await PlatformConfiguration.findOne({ configKey: cleanKey });
    if (!config) {
      const err = new Error(`Platform configuration with key '${cleanKey}' not found.`);
      err.statusCode = 404;
      throw err;
    }

    if (!config.isEditable) {
      const err = new Error(`Configuration '${cleanKey}' is system-locked and cannot be modified.`);
      err.statusCode = 403;
      throw err;
    }

    // Parse and validate value according to valueType
    let parsedValue = rawNewValue;
    if (config.valueType === 'NUMBER') {
      parsedValue = Number(rawNewValue);
      if (isNaN(parsedValue)) {
        const err = new Error(`Configuration value for '${cleanKey}' must be a valid number.`);
        err.statusCode = 400;
        throw err;
      }
      if (config.minValue !== undefined && parsedValue < config.minValue) {
        const err = new Error(`Value for '${cleanKey}' cannot be less than ${config.minValue}.`);
        err.statusCode = 400;
        throw err;
      }
      if (config.maxValue !== undefined && parsedValue > config.maxValue) {
        const err = new Error(`Value for '${cleanKey}' cannot exceed ${config.maxValue}.`);
        err.statusCode = 400;
        throw err;
      }
    } else if (config.valueType === 'BOOLEAN') {
      parsedValue = Boolean(rawNewValue === true || rawNewValue === 'true' || rawNewValue === 1 || rawNewValue === '1');
    }

    const previousValue = config.value;
    config.value = parsedValue;
    config.lastUpdatedBy = adminUser?._id;
    config.lastUpdatedByEmail = adminUser?.email || 'admin@shap.gov.in';
    await config.save();

    // Create history entry
    const historyId = `CFG-HIST-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    await ConfigurationChangeHistory.create({
      historyId,
      configKey: cleanKey,
      previousValue,
      newValue: parsedValue,
      changeReason: String(changeReason).trim(),
      changedBy: adminUser?._id,
      changedByEmail: adminUser?.email || 'admin@shap.gov.in',
      ipAddress,
      timestamp: new Date(),
    });

    // Record audit event
    await adminAuditService.recordAction({
      adminUserId: adminUser?._id,
      adminEmail: adminUser?.email || 'admin@shap.gov.in',
      action: 'CONFIG_UPDATE',
      targetEntityType: 'PlatformConfiguration',
      targetEntityId: cleanKey,
      reason: changeReason,
      previousValue,
      newValue: parsedValue,
      ipAddress,
      userAgent,
      metadata: { configKey: cleanKey, configGroup: config.configGroup },
    });

    return config;
  }

  /**
   * Fetch configuration change audit history.
   */
  async getConfigurationHistory(key) {
    const cleanKey = String(key || '').trim().toUpperCase();
    const history = await ConfigurationChangeHistory.find({ configKey: cleanKey })
      .sort({ timestamp: -1 })
      .lean();
    return history;
  }
}

export const platformConfigurationService = new PlatformConfigurationService();

