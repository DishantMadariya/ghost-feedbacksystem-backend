const mongoose = require('mongoose');

const subcategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Subcategory name is required'],
    trim: true,
    maxlength: [100, 'Subcategory name cannot exceed 100 characters']
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category reference is required'],
    index: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for suggestions count
subcategorySchema.virtual('suggestionsCount', {
  ref: 'Suggestion',
  localField: '_id',
  foreignField: 'subcategory',
  count: true
});

// Compound index for unique subcategory names within a category
subcategorySchema.index({ category: 1, name: 1 }, { unique: true });
subcategorySchema.index({ isActive: 1, order: 1 });

// Pre-save middleware for data sanitization
subcategorySchema.pre('save', function(next) {
  if (this.name) {
    this.name = this.name.trim().replace(/\s+/g, ' ');
  }
  
  if (this.description) {
    this.description = this.description.trim().replace(/\s+/g, ' ');
  }
  
  next();
});

module.exports = mongoose.model('Subcategory', subcategorySchema);
