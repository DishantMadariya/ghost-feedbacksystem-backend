const { body, validationResult } = require('express-validator');

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

// Validation rules for suggestion submission
const validateSuggestionSubmission = [
  body('category')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Category must be between 2 and 100 characters'),
  
  body('subcategory')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Subcategory must be between 2 and 100 characters'),
  
  body('suggestionText')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Suggestion text must be between 10 and 2000 characters')
    .matches(/^[a-zA-Z0-9\s\-.,!?@#$%^&*()_+={}\[\]|\\:;"'<>\/]+$/)
    .withMessage('Suggestion text contains invalid characters'),
  
  handleValidationErrors
];

// Validation rules for admin login
const validateAdminLogin = [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .isLength({ min: 1 })
    .withMessage('Password is required'),
  
  handleValidationErrors
];

// Validation rules for admin creation/update
const validateAdminData = [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .optional()
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  
  body('role')
    .trim()
    .isIn(['HR', 'CEO', 'COO', 'CTO', 'CFO', 'CCO', 'CPO'])
    .withMessage('Invalid role selected'),
  
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name can only contain letters and spaces'),
  
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name can only contain letters and spaces'),
  

  
  body('permissions')
    .optional()
    .isObject()
    .withMessage('Permissions must be an object'),
  
  body('permissions.viewAnalytics')
    .optional()
    .isBoolean()
    .withMessage('viewAnalytics permission must be a boolean'),
  
  body('permissions.viewSuggestions')
    .optional()
    .isBoolean()
    .withMessage('viewSuggestions permission must be a boolean'),
  
  body('permissions.manageSuggestions')
    .optional()
    .isBoolean()
    .withMessage('manageSuggestions permission must be a boolean'),
  
  body('permissions.manageAdmins')
    .optional()
    .isBoolean()
    .withMessage('manageAdmins permission must be a boolean'),
  
  body('permissions.exportData')
    .optional()
    .isBoolean()
    .withMessage('exportData permission must be a boolean'),
  
  handleValidationErrors
];

// Validation rules for suggestion update
const validateSuggestionUpdate = [
  body('status')
    .optional()
    .isIn(['Pending', 'Reviewed', 'Resolved', 'Escalated'])
    .withMessage('Invalid status selected'),
  
  body('reply')
    .optional()
    .custom((value) => {
      // If no value or empty string, allow it
      if (!value || value === '' || value.trim() === '') {
        return true;
      }
      
      // Trim the value for length check
      const trimmedValue = value.trim();
      
      // Check length
      if (trimmedValue.length > 1000) {
        throw new Error('Reply cannot exceed 1000 characters');
      }
      
      // If value exists, validate against regex
      const regex = /^[a-zA-Z0-9\s\-.,!?@#$%^&*()_+={}\[\]|\\:;"'<>\/]+$/;
      if (!regex.test(trimmedValue)) {
        throw new Error('Reply contains invalid characters');
      }
      
      return true;
    }),
  
  body('priority')
    .optional()
    .isIn(['Low', 'Medium', 'High', 'Critical'])
    .withMessage('Invalid priority selected'),
  
  body('assignedTo')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Assigned to cannot exceed 100 characters'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be between 1 and 50 characters'),
  
  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be between 1 and 50 characters')
    .matches(/^[a-zA-Z0-9\s\-]+$/)
    .withMessage('Tags can only contain letters, numbers, spaces, and hyphens'),
  
  handleValidationErrors
];

// Custom business logic validation for suggestion updates (informational only)
const validateSuggestionUpdateBusinessLogic = (req, res, next) => {
  const { status, reply, assignedTo } = req.body;
  const originalSuggestion = req.originalSuggestion; // This will be set by the route handler
  
  if (!originalSuggestion) {
    return next(); // Skip validation if no original suggestion (e.g., during testing)
  }
  
  // Log recommendations for audit purposes (but don't block)
  const recommendations = [];
  
  // Check if status is being changed
  if (status && status !== originalSuggestion.status && !reply?.trim()) {
    recommendations.push({
      field: 'reply',
      message: 'Reply recommended when changing suggestion status for better context'
    });
  }
  
  // Check if assignment is being changed
  if (assignedTo && assignedTo !== originalSuggestion.assignedTo && !reply?.trim()) {
    recommendations.push({
      field: 'reply',
      message: 'Reply recommended when reassigning suggestion for better communication trail'
    });
  }

  // Always proceed - these are just recommendations
  next();
};

// Validation rules for export parameters
const validateExportParams = [
  body('format')
    .optional()
    .isIn(['csv', 'excel'])
    .withMessage('Export format must be either csv or excel'),
  
  body('filters')
    .optional()
    .isObject()
    .withMessage('Filters must be an object'),
  
  body('filters.category')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Category filter must be between 2 and 100 characters'),
  
  body('filters.status')
    .optional()
    .isIn(['Pending', 'Reviewed', 'Resolved', 'Escalated'])
    .withMessage('Invalid status filter'),
  
  body('filters.startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO date'),
  
  body('filters.endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO date'),
  
  handleValidationErrors
];

// Sanitization middleware for XSS prevention
const sanitizeInputs = (req, res, next) => {
  // Skip sanitization for admin creation/update to prevent interference with name fields
  if (req.path.includes('/admins') && (req.method === 'POST' || req.method === 'PUT')) {
    return next();
  }
  
  // Skip sanitization for suggestion creation and updates to preserve natural text
  if (req.path.includes('/suggestions') && (req.method === 'POST' || req.method === 'PUT')) {
    return next();
  }
  
  // Recursively sanitize all string inputs
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      return obj
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/\//g, '&#x2F;');
      // Removed apostrophe sanitization to preserve natural text
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    
    if (typeof obj === 'object' && obj !== null) {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitize(value);
      }
      return sanitized;
    }
    
    return obj;
  };
  
  // Sanitize request body, query, and params
  if (req.body) req.body = sanitize(req.body);
  if (req.query) req.query = sanitize(req.query);
  if (req.params) req.params = sanitize(req.params);
  
  next();
};

module.exports = {
  validateSuggestionSubmission,
  validateAdminLogin,
  validateAdminData,
  validateSuggestionUpdate,
  validateSuggestionUpdateBusinessLogic,
  validateExportParams,
  sanitizeInputs,
  handleValidationErrors
};
