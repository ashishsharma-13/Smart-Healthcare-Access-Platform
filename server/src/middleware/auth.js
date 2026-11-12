import jwt from 'jsonwebtoken';
import { userRepository } from '../repositories/UserRepository.js';
import { isTokenRevoked } from '../controllers/AuthController.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
    }

    const token = authHeader.split(' ')[1];

    if (isTokenRevoked(token)) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token has been revoked. Please sign in again.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'shap_super_secret_jwt_key_2025_access_health');

    const user = await userRepository.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid or deactivated user account.' });
    }

    if (!user.isActive || user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Account has been suspended or deactivated. Access denied.',
        code: 'ACCOUNT_SUSPENDED'
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired authentication token.' });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const expandedRoles = roles.flatMap((r) => {
      const lower = String(r).toLowerCase();
      if (lower === 'admin' || lower === 'web_admin') {
        return ['admin', 'web_admin'];
      }
      return [lower];
    });

    const userRole = String(req.user.role || '').toLowerCase();
    if (!expandedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access requires one of [${roles.join(', ')}] role.`,
      });
    }
    next();
  };
};

