import { OrganizationHoliday } from '../models/OrganizationHoliday.js';

export class OrganizationHolidayRepository {
  async create(data) {
    const holiday = new OrganizationHoliday(data);
    return await holiday.save();
  }

  async listByOrganization(organizationId, filter = {}) {
    const query = { organizationId, ...filter };
    return await OrganizationHoliday.find(query).sort({ holidayDate: 1 }).exec();
  }

  async findByDate(organizationId, holidayDate) {
    return await OrganizationHoliday.findOne({ organizationId, holidayDate }).exec();
  }

  async deleteById(id) {
    return await OrganizationHoliday.findByIdAndDelete(id).exec();
  }
}

export const organizationHolidayRepository = new OrganizationHolidayRepository();

