const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const { validateAdminLogin, validateAdminData, sanitizeInputs } = require('../middleware/validation');

// Admin login
router.post('/login', sanitizeInputs, validateAdminLogin, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find admin by email (including password for authentication)
    const admin = await Admin.findByEmailForLogin(email);
    
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check if account is locked
    if (admin.isLocked) {
      return res.status(423).json({ 
        error: 'Account is temporarily locked due to multiple failed login attempts. Please try again later.' 
      });
    }
    
    // Check if account is active
    if (!admin.isActive) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }
    
    // Verify password
    const isPasswordValid = await admin.comparePassword(password);
    
    if (!isPasswordValid) {
      // Increment login attempts
      await admin.incLoginAttempts();
      
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Reset login attempts on successful login
    await admin.resetLoginAttempts();
    
    // Update last login
    admin.lastLogin = new Date();
    await admin.save();
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        adminId: admin._id,
        email: admin.email,
        role: admin.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );
    
    // Return admin info and token
    res.json({
      success: true,
      message: 'Login successful',
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        role: admin.role,
        firstName: admin.firstName,
        lastName: admin.lastName,
        fullName: admin.fullName,
        permissions: admin.permissions
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// Verify token (for frontend token validation)
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if admin still exists and is active
    const admin = await Admin.findById(decoded.adminId).select('-password');
    
    if (!admin || !admin.isActive || admin.isLocked) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    res.json({
      valid: true,
      admin: {
        id: admin._id,
        email: admin.email,
        role: admin.role,
        firstName: admin.firstName,
        lastName: admin.lastName,
        fullName: admin.fullName,
        permissions: admin.permissions
      }
    });
    
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    console.error('Token verification error:', error);
    res.status(500).json({ error: 'Token verification failed' });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
    
    // Check if admin still exists and is active
    const admin = await Admin.findById(decoded.adminId).select('-password');
    
    if (!admin || !admin.isActive || admin.isLocked) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Generate new token
    const newToken = jwt.sign(
      { 
        adminId: admin._id,
        email: admin.email,
        role: admin.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );
    
    res.json({
      success: true,
      token: newToken,
      admin: {
        id: admin._id,
        email: admin.email,
        role: admin.role,
        firstName: admin.firstName,
        lastName: admin.lastName,
        fullName: admin.fullName,
        permissions: admin.permissions
      }
    });
    
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// Change password
router.post('/change-password', sanitizeInputs, async (req, res) => {
  try {
    const { token, currentPassword, newPassword } = req.body;
    
    if (!token || !currentPassword || !newPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(decoded.adminId).select('+password');
    
    if (!admin) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Verify current password
    const isCurrentPasswordValid = await admin.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    
    // Validate new password
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }
    
    // Update password
    admin.password = newPassword;
    await admin.save();
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
    
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Password change failed' });
  }
});

// Logout (client-side token removal)
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful. Please remove the token from your client.'
  });
});

// Get admin profile
router.get('/profile', async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(decoded.adminId).select('-password');
    
    if (!admin || !admin.isActive || admin.isLocked) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    res.json({
      admin: {
        id: admin._id,
        email: admin.email,
        role: admin.role,
        firstName: admin.firstName,
        lastName: admin.lastName,
        fullName: admin.fullName,
        permissions: admin.permissions,
        lastLogin: admin.lastLogin,
        createdAt: admin.createdAt
      }
    });
    
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    console.error('Profile retrieval error:', error);
    res.status(500).json({ error: 'Profile retrieval failed' });
  }
});

module.exports = router;
