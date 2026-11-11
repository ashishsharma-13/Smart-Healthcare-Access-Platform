import { User } from '../models/index.js';

export class UserRepository {
  async findByEmail(email, includePassword = false) {
    const query = User.findOne({ email });
    if (includePassword) {
      query.select('+password');
    }
    return await query.exec();
  }

  async findById(id) {
    return await User.findById(id).exec();
  }

  async create(userData) {
    const user = new User(userData);
    return await user.save();
  }

  async updateById(id, updateData) {
    return await User.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }

  async listAll(filter = {}) {
    return await User.find(filter).sort({ createdAt: -1 }).exec();
  }

  async deleteById(id) {
    return await User.findByIdAndDelete(id).exec();
  }
}

export const userRepository = new UserRepository();

