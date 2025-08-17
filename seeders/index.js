const { seedCategories } = require('./categorySeeder');

/**
 * Main seeding function that runs all seeders
 * @param {Object} options - Seeding options
 * @param {boolean} options.force - Force re-seeding even if data exists
 * @param {boolean} options.skipCategories - Skip category seeding
 * @returns {Object} - Seeding results
 */
async function runAllSeeders(options = {}) {
  const {
    force = false,
    skipCategories = false
  } = options;

  const results = {
    categories: null,
    errors: [],
    warnings: []
  };

  console.log('🌱 Starting database seeding process...');

  // Seed categories
  if (!skipCategories) {
    try {
      console.log('📂 Seeding categories and subcategories...');
      results.categories = await seedCategories(force);
      
      if (results.categories.skipped) {
        console.log(`✅ Categories already exist (${results.categories.categories.length} categories, ${results.categories.totalSubcategories} subcategories)`);
      } else {
        console.log(`✅ Categories seeded successfully (${results.categories.categories.length} categories, ${results.categories.totalSubcategories} subcategories)`);
      }
    } catch (error) {
      const errorMsg = `Failed to seed categories: ${error.message}`;
      console.error(`❌ ${errorMsg}`);
      results.errors.push(errorMsg);
      results.warnings.push('Category seeding failed, but continuing with other operations');
    }
  } else {
    console.log('⏭️  Skipping category seeding');
  }

  // Summary
  console.log('\n📊 Seeding Summary:');
  if (results.errors.length > 0) {
    console.log(`❌ Errors: ${results.errors.length}`);
    results.errors.forEach(error => console.log(`   - ${error}`));
  }
  
  if (results.warnings.length > 0) {
    console.log(`⚠️  Warnings: ${results.warnings.length}`);
    results.warnings.forEach(warning => console.log(`   - ${warning}`));
  }
  
  if (results.errors.length === 0) {
    console.log('✅ All seeders completed successfully');
  } else {
    console.log('⚠️  Some seeders failed, but the process continued');
  }

  return results;
}

/**
 * Check if seeding is needed
 * @returns {boolean} - True if seeding is needed
 */
async function checkIfSeedingNeeded() {
  try {
    const Category = require('../models/Category');
    const count = await Category.countDocuments();
    return count === 0;
  } catch (error) {
    console.error('Error checking if seeding is needed:', error);
    return true; // Assume seeding is needed if we can't check
  }
}

module.exports = {
  runAllSeeders,
  checkIfSeedingNeeded
};
