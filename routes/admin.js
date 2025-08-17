const express = require('express');
const router = express.Router();
const Suggestion = require('../models/Suggestion');
const Admin = require('../models/Admin');
const Category = require('../models/Category');
const Subcategory = require('../models/Subcategory');
const { 
  authenticateToken, 
  requirePermission, 
  canManageAdmins, 
  canDeleteSuggestions,
  logAdminAction 
} = require('../middleware/auth');
const { 
  validateSuggestionUpdate, 
  validateSuggestionUpdateBusinessLogic,
  validateExportParams, 
  validateAdminData,
  sanitizeInputs 
} = require('../middleware/validation');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

// Apply authentication to all admin routes
router.use(authenticateToken);

// Get all suggestions with pagination and filtering
router.get('/suggestions', requirePermission('viewSuggestions'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      subcategory,
      status,
      priority,
      startDate,
      endDate,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    // Build filter object
    const filter = {};
    
    if (category) {
      // Find category ID by name
      const categoryDoc = await Category.findOne({ name: category, isActive: true });
      if (categoryDoc) {
        filter.category = categoryDoc._id;
      }
    }
    
    if (subcategory) {
      // Find subcategory ID by name
      const subcategoryDoc = await Subcategory.findOne({ name: subcategory, isActive: true });
      if (subcategoryDoc) {
        filter.subcategory = subcategoryDoc._id;
      }
    }
    
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    if (search) {
      filter.$or = [
        { suggestionText: { $regex: search, $options: 'i' } },
        { reply: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [suggestions, total] = await Promise.all([
      Suggestion.find(filter)
        .populate('category', 'name')
        .populate('subcategory', 'name')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .select('-__v'),
      Suggestion.countDocuments(filter)
    ]);
    
    const totalPages = Math.ceil(total / parseInt(limit));
    
    res.json({
      suggestions,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        itemsPerPage: parseInt(limit),
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    });
    
  } catch (error) {
    console.error('Get suggestions error:', error);
    res.status(500).json({ error: 'Failed to retrieve suggestions' });
  }
});

// Get suggestion by ID
router.get('/suggestions/:id', requirePermission('viewSuggestions'), async (req, res) => {
  try {
    const suggestion = await Suggestion.findById(req.params.id)
      .populate('category', 'name description')
      .populate('subcategory', 'name description');
    
    if (!suggestion) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }
    
    res.json({ suggestion });
    
  } catch (error) {
    console.error('Get suggestion error:', error);
    res.status(500).json({ error: 'Failed to retrieve suggestion' });
  }
});

// Update suggestion
router.put('/suggestions/:id', 
  requirePermission('editSuggestions'),
  validateSuggestionUpdate,
  async (req, res, next) => {
    try {
      // Fetch original suggestion for business logic validation
      const { id } = req.params;
      const originalSuggestion = await Suggestion.findById(id);
      
      if (!originalSuggestion) {
        return res.status(404).json({ error: 'Suggestion not found' });
      }
      
      // Attach original suggestion to request for validation middleware
      req.originalSuggestion = originalSuggestion;
      next();
    } catch (error) {
      console.error('Error fetching original suggestion:', error);
      res.status(500).json({ error: 'Failed to fetch suggestion for validation' });
    }
  },
  validateSuggestionUpdateBusinessLogic,
  logAdminAction('Update suggestion'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      // Add updatedAt timestamp
      updateData.updatedAt = new Date();
      
      // If status is being changed to Resolved, set actualResolutionDate
      if (updateData.status === 'Resolved' && !updateData.actualResolutionDate) {
        updateData.actualResolutionDate = new Date();
      }
      
      const suggestion = await Suggestion.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );
      
      if (!suggestion) {
        return res.status(404).json({ error: 'Suggestion not found' });
      }
      
      res.json({
        success: true,
        message: 'Suggestion updated successfully',
        suggestion
      });
      
    } catch (error) {
      console.error('Update suggestion error:', error);
      res.status(500).json({ error: 'Failed to update suggestion' });
    }
  }
);

// Delete suggestion (only for admins with delete permission)
router.delete('/suggestions/:id', 
  canDeleteSuggestions,
  logAdminAction('Delete suggestion'),
  async (req, res) => {
    try {
      const suggestion = await Suggestion.findByIdAndDelete(req.params.id);
      
      if (!suggestion) {
        return res.status(404).json({ error: 'Suggestion not found' });
      }
      
      res.json({
        success: true,
        message: 'Suggestion deleted successfully'
      });
      
    } catch (error) {
      console.error('Delete suggestion error:', error);
      res.status(500).json({ error: 'Failed to delete suggestion' });
    }
  }
);

// Get dashboard statistics
router.get('/dashboard/stats', requirePermission('viewAnalytics'), async (req, res) => {
  try {
    const [
      totalSuggestions,
      categoryStats,
      statusStats,
      recentSuggestions,
      priorityStats
    ] = await Promise.all([
      Suggestion.countDocuments(),
      Suggestion.getCategoryStats(),
      Suggestion.getStatusStats(),
      Suggestion.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .select('category subcategory status createdAt'),
      Suggestion.aggregate([
        {
          $group: {
            _id: '$priority',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ])
    ]);
    
    // Calculate response rate
    const suggestionsWithReplies = await Suggestion.countDocuments({ reply: { $ne: '' } });
    const responseRate = totalSuggestions > 0 ? (suggestionsWithReplies / totalSuggestions * 100).toFixed(1) : 0;
    
    // Get monthly trend for last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyTrend = await Suggestion.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    
    res.json({
      totalSuggestions,
      responseRate: `${responseRate}%`,
      categoryStats,
      statusStats,
      priorityStats,
      recentSuggestions,
      monthlyTrend,
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to retrieve dashboard statistics' });
  }
});

// Export suggestions
router.post('/export', 
  requirePermission('exportData'),
  validateExportParams,
  logAdminAction('Export suggestions'),
  async (req, res) => {
    try {
      const { format = 'csv', filters = {} } = req.body;
      
      // Build filter object
      const filter = {};
      
      if (filters.category) filter.category = filters.category;
      if (filters.subcategory) filter.subcategory = filters.subcategory;
      if (filters.status) filter.status = filters.status;
      if (filters.priority) filter.priority = filters.priority;
      
      if (filters.startDate || filters.endDate) {
        filter.createdAt = {};
        if (filters.startDate) filter.createdAt.$gte = new Date(filters.startDate);
        if (filters.endDate) filter.createdAt.$lte = new Date(filters.endDate);
      }
      
      // Get suggestions
      const suggestions = await Suggestion.find(filter)
        .sort({ createdAt: -1 })
        .select('-__v');
      
      if (format === 'csv') {
        // Export as CSV
        const csvWriter = createCsvWriter({
          path: 'suggestions_export.csv',
          header: [
            { id: 'category', title: 'Category' },
            { id: 'subcategory', title: 'Subcategory' },
            { id: 'suggestionText', title: 'Suggestion' },
            { id: 'status', title: 'Status' },
            { id: 'priority', title: 'Priority' },
            { id: 'reply', title: 'Reply' },
            { id: 'createdAt', title: 'Created Date' },
            { id: 'updatedAt', title: 'Last Updated' }
          ]
        });
        
        await csvWriter.writeRecords(suggestions);
        
        res.download('suggestions_export.csv', 'suggestions_export.csv', (err) => {
          if (err) {
            console.error('Download error:', err);
          }
          // Clean up file after download
          fs.unlinkSync('suggestions_export.csv');
        });
        
      } else if (format === 'excel') {
        // Export as Excel
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Suggestions');
        
        // Add headers
        worksheet.columns = [
          { header: 'Category', key: 'category', width: 20 },
          { header: 'Subcategory', key: 'subcategory', width: 25 },
          { header: 'Suggestion', key: 'suggestionText', width: 40 },
          { header: 'Status', key: 'status', width: 15 },
          { header: 'Priority', key: 'priority', width: 15 },
          { header: 'Reply', key: 'reply', width: 30 },
          { header: 'Created Date', key: 'createdAt', width: 20 },
          { header: 'Last Updated', key: 'updatedAt', width: 20 }
        ];
        
        // Add data
        suggestions.forEach(suggestion => {
          worksheet.addRow({
            category: suggestion.category,
            subcategory: suggestion.subcategory,
            suggestionText: suggestion.suggestionText,
            status: suggestion.status,
            priority: suggestion.priority,
            reply: suggestion.reply || '',
            createdAt: suggestion.createdAt.toLocaleDateString(),
            updatedAt: suggestion.updatedAt.toLocaleDateString()
          });
        });
        
        // Style headers
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' }
        };
        
        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=suggestions_export.xlsx');
        
        // Write to response
        await workbook.xlsx.write(res);
        res.end();
      }
      
    } catch (error) {
      console.error('Export error:', error);
      res.status(500).json({ error: 'Failed to export suggestions' });
    }
  }
);

// Get admin list (only for HR and CEO)
router.get('/admins', canManageAdmins, async (req, res) => {
  try {
    const admins = await Admin.find()
      .select('-password')
      .sort({ createdAt: -1 });
    
    res.json({ admins });
    
  } catch (error) {
    console.error('Get admins error:', error);
    res.status(500).json({ error: 'Failed to retrieve admin list' });
  }
});

// Get admin names for assignment (accessible to all admins)
router.get('/admins/names', requirePermission('viewSuggestions'), async (req, res) => {
  try {
    const admins = await Admin.find({ isActive: true })
      .select('firstName lastName role email')
      .sort({ firstName: 1, lastName: 1 });
    
    const adminNames = admins.map(admin => ({
      _id: admin._id,
      name: `${admin.firstName} ${admin.lastName}`,
      role: admin.role,
      email: admin.email
    }));
    
    res.json({ admins: adminNames });
    
  } catch (error) {
    console.error('Get admin names error:', error);
    res.status(500).json({ error: 'Failed to retrieve admin names' });
  }
});

// Create new admin (only for HR and CEO)
router.post('/admins', 
  canManageAdmins,
  sanitizeInputs,
  validateAdminData,
  logAdminAction('Create admin'),
  async (req, res) => {
    try {
      const { email, password, role, firstName, lastName, permissions } = req.body;
      // Check if admin already exists
      const existingAdmin = await Admin.findByEmail(email);
      if (existingAdmin) {
        return res.status(400).json({ error: 'Admin with this email already exists' });
      }
      
      // Create new admin
      const admin = new Admin({
        email,
        password,
        role,
        firstName,
        lastName,
        permissions
      });
      
      await admin.save();
      
      // Remove password from response
      const adminResponse = admin.toObject();
      delete adminResponse.password;
      
      res.status(201).json({
        success: true,
        message: 'Admin created successfully',
        admin: adminResponse
      });
      
    } catch (error) {
      console.error('Create admin error:', error);
      res.status(500).json({ error: 'Failed to create admin' });
    }
  }
);

// Update admin (only for HR and CEO)
router.put('/admins/:id', 
  canManageAdmins,
  sanitizeInputs,
  validateAdminData,
  logAdminAction('Update admin'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      // Don't allow updating own role to prevent privilege escalation
      if (req.admin._id.toString() === id && updateData.role) {
        return res.status(400).json({ error: 'You cannot change your own role' });
      }
      
      const admin = await Admin.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      ).select('-password');
      
      if (!admin) {
        return res.status(404).json({ error: 'Admin not found' });
      }
      
      res.json({
        success: true,
        message: 'Admin updated successfully',
        admin
      });
      
    } catch (error) {
      console.error('Update admin error:', error);
      res.status(500).json({ error: 'Failed to update admin' });
    }
  }
);

// Deactivate/Activate admin (only for HR and CEO)
router.patch('/admins/:id/status', 
  canManageAdmins,
  logAdminAction('Toggle admin status'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      
      // Don't allow deactivating own account
      if (req.admin._id.toString() === id) {
        return res.status(400).json({ error: 'You cannot deactivate your own account' });
      }
      
      const admin = await Admin.findByIdAndUpdate(
        id,
        { isActive },
        { new: true }
      ).select('-password');
      
      if (!admin) {
        return res.status(404).json({ error: 'Admin not found' });
      }
      
      res.json({
        success: true,
        message: `Admin ${isActive ? 'activated' : 'deactivated'} successfully`,
        admin
      });
      
    } catch (error) {
      console.error('Toggle admin status error:', error);
      res.status(500).json({ error: 'Failed to update admin status' });
    }
  }
);

module.exports = router;
