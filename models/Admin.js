const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long']
  },
  role: {
    type: String,
    required: [true, 'Role is required'],
    enum: ['HR', 'CEO', 'COO', 'CTO', 'CFO', 'CCO', 'CPO'],
    default: 'HR'
  },
  firstName: {
    type: String,
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  lastLogin: {
    type: Date
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  },
  permissions: {
    viewSuggestions: { type: Boolean, default: true },
    editSuggestions: { type: Boolean, default: false },
    deleteSuggestions: { type: Boolean, default: false },
    manageSuggestions: { type: Boolean, default: false },
    manageAdmins: { type: Boolean, default: false },
    exportData: { type: Boolean, default: true },
    viewAnalytics: { type: Boolean, default: true }
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password;
      return ret;
    }
  },
  toObject: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password;
      return ret;
    }
  }
});

// Virtual for full name
adminSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for isLocked
adminSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Indexes
adminSchema.index({ email: 1 });
adminSchema.index({ role: 1 });
adminSchema.index({ isActive: 1 });

// Pre-save middleware to hash password
adminSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware for data sanitization
adminSchema.pre('save', function(next) {
  // Ensure at least one name field is provided
  if (!this.firstName && !this.lastName) {
    return next(new Error('At least one name field (firstName or lastName) is required'));
  }
  
  if (this.firstName) {
    this.firstName = this.firstName.trim().replace(/\s+/g, ' ');
  }
  
  if (this.lastName) {
    this.lastName = this.lastName.trim().replace(/\s+/g, ' ');
  }
  
  // Sync status with isActive
  if (this.isActive !== undefined) {
    this.status = this.isActive ? 'active' : 'inactive';
  }
  
  next();
});

// Instance method to compare password
adminSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to increment login attempts
adminSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  // Otherwise, increment
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 };
  }
  
  return this.updateOne(updates);
};

// Instance method to reset login attempts
adminSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Static method to find by email
adminSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find by email for login (includes password)
adminSchema.statics.findByEmailForLogin = function(email) {
  return this.findOne({ email: email.toLowerCase() }).select('+password');
};

// Static method to create default admin
adminSchema.statics.createDefaultAdmin = async function() {
  try {
    const defaultAdmin = await this.findOne({ email: process.env.DEFAULT_ADMIN_EMAIL });
    
    if (!defaultAdmin) {
      const admin = new this({
        email: process.env.DEFAULT_ADMIN_EMAIL,
        password: process.env.DEFAULT_ADMIN_PASSWORD,
        role: process.env.DEFAULT_ADMIN_ROLE || 'COO',
        firstName: 'Admin',
        lastName: 'User',
        permissions: {
          viewSuggestions: true,
          editSuggestions: true,
          deleteSuggestions: true,
          manageSuggestions: true,
          manageAdmins: true,
          exportData: true,
          viewAnalytics: true
        }
      });
      
      await admin.save();
      console.log('✅ Default admin user created');
    }
  } catch (error) {
    console.error('❌ Error creating default admin:', error);
  }
};

module.exports = mongoose.model('Admin', adminSchema);
