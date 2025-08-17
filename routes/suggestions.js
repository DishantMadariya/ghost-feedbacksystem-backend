const express = require('express');
const router = express.Router();
const Suggestion = require('../models/Suggestion');
const Category = require('../models/Category');
const Subcategory = require('../models/Subcategory');
const { validateSuggestionSubmission, sanitizeInputs } = require('../middleware/validation');

// Get categories and subcategories (public endpoint)
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .populate({
        path: 'subcategories',
        match: { isActive: true },
        select: 'name description order',
        options: { sort: { order: 1 } }
      })
      .sort({ order: 1 });
    
    // Transform data to match the expected format
    const categoriesMap = {};
    categories.forEach(category => {
      categoriesMap[category.name] = category.subcategories.map(sub => sub.name);
    });
    
    res.json({ categories: categoriesMap });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Submit anonymous suggestion (public endpoint)
router.post('/submit', validateSuggestionSubmission, async (req, res) => {
  try {
    const { category, subcategory, suggestionText } = req.body;
    
    // Find category and subcategory IDs by name
    const categoryDoc = await Category.findOne({ name: category, isActive: true });
    if (!categoryDoc) {
      return res.status(400).json({ error: 'Invalid category selected' });
    }
    
    const subcategoryDoc = await Subcategory.findOne({ 
      name: subcategory, 
      category: categoryDoc._id,
      isActive: true 
    });
    if (!subcategoryDoc) {
      return res.status(400).json({ error: 'Invalid subcategory selected' });
    }
    
    // Create new suggestion with references
    const suggestion = new Suggestion({
      category: categoryDoc._id,
      subcategory: subcategoryDoc._id,
      suggestionText,
      status: 'Pending',
      priority: 'Medium'
    });
    
    await suggestion.save();
    
    // Return success message only (no data)
    res.status(201).json({
      success: true,
      message: '✅ Your suggestion has been submitted successfully.'
    });
    
  } catch (error) {
    console.error('Suggestion submission error:', error);
    res.status(500).json({
      error: 'Failed to submit suggestion. Please try again.'
    });
  }
});

// Get suggestion statistics (public endpoint for transparency)
router.get('/stats', async (req, res) => {
  try {
    const [categoryStats, statusStats, totalCount] = await Promise.all([
      Suggestion.getCategoryStats(),
      Suggestion.getStatusStats(),
      Suggestion.countDocuments()
    ]);
    
    res.json({
      totalSuggestions: totalCount,
      categoryBreakdown: categoryStats,
      statusBreakdown: statusStats,
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Stats retrieval error:', error);
    res.status(500).json({
      error: 'Failed to retrieve statistics'
    });
  }
});

// Get recent suggestions count by category (public endpoint)
router.get('/recent', async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentStats = await Suggestion.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    res.json({
      period: 'Last 30 days',
      categoryStats: recentStats,
      totalRecent: recentStats.reduce((sum, stat) => sum + stat.count, 0)
    });
    
  } catch (error) {
    console.error('Recent stats error:', error);
    res.status(500).json({
      error: 'Failed to retrieve recent statistics'
    });
  }
});

// Health check for suggestions service
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Suggestions API',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
