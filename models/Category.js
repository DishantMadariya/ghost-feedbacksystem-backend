const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    unique: true,
    trim: true,
    maxlength: [100, 'Category name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  icon: {
    type: String,
    trim: true,
    maxlength: [50, 'Icon name cannot exceed 50 characters']
  },
  color: {
    type: String,
    trim: true,
    maxlength: [20, 'Color cannot exceed 20 characters'],
    default: 'ghost'
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

// Virtual for subcategories
categorySchema.virtual('subcategories', {
  ref: 'Subcategory',
  localField: '_id',
  foreignField: 'category'
});

// Virtual for subcategories count
categorySchema.virtual('subcategoriesCount', {
  ref: 'Subcategory',
  localField: '_id',
  foreignField: 'category',
  count: true
});

// Indexes
categorySchema.index({ name: 1 });
categorySchema.index({ isActive: 1, order: 1 });

// Pre-save middleware for data sanitization
categorySchema.pre('save', function(next) {
  if (this.name) {
    this.name = this.name.trim().replace(/\s+/g, ' ');
  }
  
  if (this.description) {
    this.description = this.description.trim().replace(/\s+/g, ' ');
  }
  
  next();
});

module.exports = mongoose.model('Category', categorySchema);
