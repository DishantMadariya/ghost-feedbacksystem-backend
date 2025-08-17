const mongoose = require('mongoose');

const suggestionSchema = new mongoose.Schema({
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category is required'],
    index: true
  },
  subcategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subcategory',
    required: [true, 'Subcategory is required'],
    index: true
  },
  suggestionText: {
    type: String,
    required: [true, 'Suggestion text is required'],
    trim: true,
    minlength: [10, 'Suggestion must be at least 10 characters long'],
    maxlength: [2000, 'Suggestion cannot exceed 2000 characters']
  },
  status: {
    type: String,
    enum: ['Pending', 'Reviewed', 'Resolved', 'Escalated'],
    default: 'Pending',
    index: true
  },
  reply: {
    type: String,
    trim: true,
    maxlength: [1000, 'Reply cannot exceed 1000 characters'],
    default: ''
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  assignedTo: {
    type: String,
    trim: true,
    maxlength: 100
  },
  estimatedResolutionDate: {
    type: Date
  },
  actualResolutionDate: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for time since creation
suggestionSchema.virtual('timeSinceCreation').get(function() {
  return Date.now() - this.createdAt;
});

// Virtual for time since last update
suggestionSchema.virtual('timeSinceUpdate').get(function() {
  return Date.now() - this.updatedAt;
});

// Indexes for better query performance
suggestionSchema.index({ createdAt: -1 });
suggestionSchema.index({ updatedAt: -1 });
suggestionSchema.index({ category: 1, subcategory: 1 });
suggestionSchema.index({ status: 1, createdAt: -1 });
suggestionSchema.index({ priority: 1, status: 1 });

// Pre-save middleware for data sanitization
suggestionSchema.pre('save', function(next) {
  // Sanitize text inputs
  if (this.suggestionText) {
    this.suggestionText = this.suggestionText.trim().replace(/\s+/g, ' ');
  }
  
  if (this.reply) {
    this.reply = this.reply.trim().replace(/\s+/g, ' ');
  }
  
  next();
});

// Static method to get category statistics
suggestionSchema.statics.getCategoryStats = function() {
  return this.aggregate([
    {
      $lookup: {
        from: 'categories',
        localField: 'category',
        foreignField: '_id',
        as: 'categoryInfo'
      }
    },
    {
      $unwind: '$categoryInfo'
    },
    {
      $group: {
        _id: '$categoryInfo.name',
        categoryId: { $first: '$category' },
        count: { $sum: 1 },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] } },
        reviewed: { $sum: { $cond: [{ $eq: ['$status', 'Reviewed'] }, 1, 0] } },
        resolved: { $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] } },
        escalated: { $sum: { $cond: [{ $eq: ['$status', 'Escalated'] }, 1, 0] } }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// Static method to get status statistics
suggestionSchema.statics.getStatusStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

module.exports = mongoose.model('Suggestion', suggestionSchema);
