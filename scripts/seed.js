#!/usr/bin/env node

/**
 * Standalone seeding script
 * Usage: node scripts/seed.js [--force] [--skip-categories]
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { runAllSeeders } = require('../seeders');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  force: args.includes('--force'),
  skipCategories: args.includes('--skip-categories')
};

console.log('🌱 Ghost Feedback System - Database Seeding Script');
console.log('==================================================');
console.log(`Force mode: ${options.force ? 'ON' : 'OFF'}`);
console.log(`Skip categories: ${options.skipCategories ? 'ON' : 'OFF'}`);
console.log('');

async function main() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://dishantpatel1446:ghostSuggestion@cluster0.aiyxwut.mongodb.net/ghost-suggestion';
    console.log(`🔌 Connecting to MongoDB: ${mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');
    
    // Run seeders
    const results = await runAllSeeders(options);
    
    console.log('\n🎉 Seeding completed!');
    
    // Exit with appropriate code
    if (results.errors.length > 0) {
      console.log('⚠️  Some errors occurred during seeding');
      process.exit(1);
    } else {
      console.log('✅ All seeders completed successfully');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('❌ Fatal error during seeding:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️  Seeding interrupted by user');
  mongoose.connection.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️  Seeding terminated');
  mongoose.connection.close();
  process.exit(0);
});

// Run the main function
main();
