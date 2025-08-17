const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if admin still exists and is active
    const admin = await Admin.findById(decoded.adminId).select('-password');
    
    if (!admin) {
      return res.status(401).json({ error: 'Invalid token - admin not found' });
    }
    
    if (!admin.isActive) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }
    
    if (admin.isLocked) {
      return res.status(401).json({ error: 'Account is temporarily locked' });
    }
    
    // Add admin info to request
    req.admin = admin;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication error' });
  }
};

// Middleware to check specific permissions
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!req.admin.permissions[permission]) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
};

// Middleware to check role-based access
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(req.admin.role)) {
      return res.status(403).json({ error: 'Insufficient role permissions' });
    }
    
    next();
  };
};

// Middleware to check if admin can manage other admins (only COO can manage admins)
const canManageAdmins = (req, res, next) => {
  if (!req.admin) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (req.admin.role !== 'COO') {
    return res.status(403).json({ error: 'Only COO (Chief Operating Officer) can manage admin accounts' });
  }
  
  next();
};

// Middleware to check if admin can delete suggestions
const canDeleteSuggestions = (req, res, next) => {
  if (!req.admin) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (!req.admin.permissions.deleteSuggestions) {
    return res.status(403).json({ error: 'Insufficient permissions to delete suggestions' });
  }
  
  next();
};

// Middleware to log admin actions (for audit purposes)
const logAdminAction = (action) => {
  return (req, res, next) => {
    next();
  };
};

module.exports = {
  authenticateToken,
  requirePermission,
  requireRole,
  canManageAdmins,
  canDeleteSuggestions,
  logAdminAction
};
