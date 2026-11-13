import { healthcareResourceTypeRepository } from '../repositories/HealthcareResourceTypeRepository.js';

export const INITIAL_RESOURCE_TYPES = [
  {
    resourceTypeId: 'RTYPE-EMERGENCY-BED',
    typeName: 'Emergency Bed',
    category: 'beds',
    description: 'Acute emergency department observation and stabilization beds.',
    unitOfMeasure: 'beds',
    quantityTracked: true,
    active: true,
    displayOrder: 1,
  },
  {
    resourceTypeId: 'RTYPE-ICU-BED',
    typeName: 'ICU Bed',
    category: 'critical_care',
    description: 'Intensive Care Unit beds equipped with advanced hemodynamic monitoring.',
    unitOfMeasure: 'beds',
    quantityTracked: true,
    active: true,
    displayOrder: 2,
  },
  {
    resourceTypeId: 'RTYPE-CRITICAL-CARE-BED',
    typeName: 'Critical Care Bed',
    category: 'critical_care',
    description: 'High Dependency Unit (HDU) and step-down critical care beds.',
    unitOfMeasure: 'beds',
    quantityTracked: true,
    active: true,
    displayOrder: 3,
  },
  {
    resourceTypeId: 'RTYPE-VENTILATOR',
    typeName: 'Ventilator',
    category: 'critical_care',
    description: 'Invasive mechanical ventilation machines with oxygen flow control.',
    unitOfMeasure: 'machines',
    quantityTracked: true,
    active: true,
    displayOrder: 4,
  },
  {
    resourceTypeId: 'RTYPE-OPERATION-THEATRE',
    typeName: 'Operation Theatre',
    category: 'surgical',
    description: 'Equipped surgical suites for emergency and elective interventions.',
    unitOfMeasure: 'rooms',
    quantityTracked: true,
    active: true,
    displayOrder: 5,
  },
  {
    resourceTypeId: 'RTYPE-BLOOD-BANK',
    typeName: 'Blood Bank Unit',
    category: 'blood_bank',
    description: 'Emergency whole blood and packed red blood cell units reserved for trauma.',
    unitOfMeasure: 'units',
    quantityTracked: true,
    active: true,
    displayOrder: 6,
  },
  {
    resourceTypeId: 'RTYPE-CT-SCANNER',
    typeName: 'CT Scanner',
    category: 'imaging',
    description: 'Multi-slice Computed Tomography scanner for emergency trauma imaging.',
    unitOfMeasure: 'machines',
    quantityTracked: true,
    active: true,
    displayOrder: 7,
  },
  {
    resourceTypeId: 'RTYPE-XRAY',
    typeName: 'X-Ray Facility',
    category: 'imaging',
    description: 'Digital radiography machine for immediate skeletal and thoracic analysis.',
    unitOfMeasure: 'machines',
    quantityTracked: true,
    active: true,
    displayOrder: 8,
  },
  {
    resourceTypeId: 'RTYPE-ULTRASOUND',
    typeName: 'Ultrasound Facility',
    category: 'imaging',
    description: 'Point-of-Care Ultrasound (POCUS) / FAST scan machines.',
    unitOfMeasure: 'machines',
    quantityTracked: true,
    active: true,
    displayOrder: 9,
  },
  {
    resourceTypeId: 'RTYPE-LABORATORY',
    typeName: 'Laboratory Facility',
    category: 'laboratory',
    description: 'Stat clinical pathology, arterial blood gas, and toxicology testing slots.',
    unitOfMeasure: 'slots',
    quantityTracked: true,
    active: true,
    displayOrder: 10,
  },
  {
    resourceTypeId: 'RTYPE-OXYGEN-BED',
    typeName: 'Oxygen Bed',
    category: 'beds',
    description: 'Hospital bed with dedicated medical oxygen pipeline delivery.',
    unitOfMeasure: 'beds',
    quantityTracked: true,
    active: true,
    displayOrder: 11,
  },
];

export class HealthcareResourceTypeService {
  /**
   * Seed standard resource types if database is empty.
   */
  async seedDefaultTypesIfEmpty() {
    try {
      const count = await healthcareResourceTypeRepository.countDocuments();
      if (count === 0) {
        for (const typeData of INITIAL_RESOURCE_TYPES) {
          await healthcareResourceTypeRepository.create(typeData);
        }
      }
    } catch (err) {
      console.warn('[ResourceTypeService] Seeding warning:', err.message);
    }
  }

  async listActiveTypes() {
    await this.seedDefaultTypesIfEmpty();
    return await healthcareResourceTypeRepository.listActive();
  }

  async listAllTypes(filters = {}) {
    await this.seedDefaultTypesIfEmpty();
    return await healthcareResourceTypeRepository.listAll(filters);
  }

  async getTypeById(id) {
    let type = await healthcareResourceTypeRepository.findById(id);
    if (!type) {
      type = await healthcareResourceTypeRepository.findByResourceTypeId(id);
    }
    if (!type) {
      const err = new Error('Healthcare resource type not found');
      err.statusCode = 404;
      throw err;
    }
    return type;
  }

  async createType({ typeName, category = 'beds', description = '', unitOfMeasure = 'beds', quantityTracked = true }) {
    if (!typeName || !typeName.trim()) {
      const err = new Error('Resource typeName is required');
      err.statusCode = 400;
      throw err;
    }

    const existing = await healthcareResourceTypeRepository.findByTypeName(typeName);
    if (existing) {
      const err = new Error(`Resource type '${typeName}' already exists`);
      err.statusCode = 409;
      throw err;
    }

    const slug = typeName.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-');
    const resourceTypeId = `RTYPE-${slug}`;

    return await healthcareResourceTypeRepository.create({
      resourceTypeId,
      typeName: typeName.trim(),
      category,
      description: description.trim(),
      unitOfMeasure,
      quantityTracked: quantityTracked !== false,
      active: true,
    });
  }

  async updateType(id, updates) {
    const existing = await this.getTypeById(id);

    if (updates.typeName && updates.typeName.trim() !== existing.typeName) {
      const duplicate = await healthcareResourceTypeRepository.findByTypeName(updates.typeName);
      if (duplicate && duplicate._id.toString() !== existing._id.toString()) {
        const err = new Error(`Resource type '${updates.typeName}' already exists`);
        err.statusCode = 409;
        throw err;
      }
    }

    return await healthcareResourceTypeRepository.updateById(existing._id, updates);
  }

  async setTypeActiveStatus(id, active) {
    const existing = await this.getTypeById(id);
    return await healthcareResourceTypeRepository.updateById(existing._id, { active: Boolean(active) });
  }

  // Aliases for seamless interface compatibility
  async seedInitialTypes() {
    return await this.seedDefaultTypesIfEmpty();
  }

  async listActive() {
    return await this.listActiveTypes();
  }

  async listAll(filters = {}) {
    return await this.listAllTypes(filters);
  }

  async getById(id) {
    return await this.getTypeById(id);
  }

  async create(data) {
    return await this.createType(data);
  }

  async update(id, updates) {
    return await this.updateType(id, updates);
  }

  async toggleStatus(id, active) {
    return await this.setTypeActiveStatus(id, active);
  }
}

export const healthcareResourceTypeService = new HealthcareResourceTypeService();

