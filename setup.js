// Setup script for Ghost Feedback System
require('dotenv').config();

// Set default environment variables if not present
if (!process.env.MONGODB_URI) {
  process.env.MONGODB_URI = 'mongodb+srv://dishantpatel1446:ghostSuggestion@cluster0.aiyxwut.mongodb.net/ghost-suggestion';
  console.log('🔧 Set default MongoDB URI:', process.env.MONGODB_URI);
}

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'ghost-feedback-system';
  console.log('🔧 Set default JWT secret');
}

if (!process.env.DEFAULT_ADMIN_EMAIL) {
  process.env.DEFAULT_ADMIN_EMAIL = 'admin@company.com';
  console.log('🔧 Set default admin email:', process.env.DEFAULT_ADMIN_EMAIL);
}

if (!process.env.DEFAULT_ADMIN_PASSWORD) {
  process.env.DEFAULT_ADMIN_PASSWORD = 'admin123';
  console.log('🔧 Set default admin password:', process.env.DEFAULT_ADMIN_PASSWORD);
}

if (!process.env.DEFAULT_ADMIN_ROLE) {
  process.env.DEFAULT_ADMIN_ROLE = 'HR';
  console.log('🔧 Set default admin role:', process.env.DEFAULT_ADMIN_ROLE);
}

console.log('\n🚀 Starting setup...\n');

// Now run the seeder
const { seedCategories } = require('./seeders/categorySeeder');
const connectDB = require('./config/database');

async function setup() {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('✅ Connected to MongoDB');
    
    // Run the seeder
    await seedCategories();
    console.log('✅ Setup completed successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

setup();
