const mongoose = require('mongoose');
const Category = require('../models/Category');
const Subcategory = require('../models/Subcategory');

const categoriesData = [
  {
    name: 'Project & Development',
    description: 'Suggestions related to project management, development processes, and technical improvements',
    icon: 'code',
    color: 'primary',
    order: 1,
    subcategories: [
      'Code Quality & Standards',
      'Development Tools & Infrastructure',
      'Project Planning & Estimation',
      'Testing & Quality Assurance',
      'Deployment & DevOps',
      'Documentation & Knowledge Sharing',
      'Performance & Optimization',
      'Security & Compliance'
    ]
  },
  {
    name: 'Management & Leadership',
    description: 'Suggestions for improving management practices, leadership skills, and organizational structure',
    icon: 'users',
    color: 'success',
    order: 2,
    subcategories: [
      'Team Management',
      'Communication & Transparency',
      'Decision Making Process',
      'Goal Setting & KPIs',
      'Conflict Resolution',
      'Mentoring & Coaching',
      'Strategic Planning',
      'Change Management'
    ]
  },
  {
    name: 'Team & Collaboration',
    description: 'Suggestions to enhance team dynamics, collaboration tools, and interpersonal relationships',
    icon: 'handshake',
    color: 'warning',
    order: 3,
    subcategories: [
      'Team Building Activities',
      'Collaboration Tools & Platforms',
      'Cross-functional Communication',
      'Remote Work & Virtual Teams',
      'Meeting Efficiency',
      'Knowledge Sharing',
      'Team Recognition & Rewards',
      'Conflict Prevention'
    ]
  },
  {
    name: 'Workplace Environment',
    description: 'Suggestions for improving physical workspace, office culture, and work-life balance',
    icon: 'home',
    color: 'ghost',
    order: 4,
    subcategories: [
      'Office Layout & Design',
      'Ergonomics & Health',
      'Noise & Distraction Management',
      'Lighting & Temperature',
      'Break Areas & Amenities',
      'Work-Life Balance',
      'Flexible Work Arrangements',
      'Wellness Programs'
    ]
  },
  {
    name: 'Career & Learning',
    description: 'Suggestions for professional development, training programs, and career growth opportunities',
    icon: 'graduation-cap',
    color: 'primary',
    order: 5,
    subcategories: [
      'Training & Workshops',
      'Skill Development Programs',
      'Certification Support',
      'Conference & Event Attendance',
      'Mentorship Programs',
      'Career Path Planning',
      'Learning Resources',
      'Performance Feedback'
    ]
  },
  {
    name: 'HR & Policy',
    description: 'Suggestions for improving HR processes, company policies, and employee benefits',
    icon: 'user-check',
    color: 'success',
    order: 6,
    subcategories: [
      'Recruitment & Onboarding',
      'Performance Management',
      'Compensation & Benefits',
      'Leave & Time-off Policies',
      'Employee Recognition',
      'Diversity & Inclusion',
      'Health & Safety',
      'Grievance Procedures'
    ]
  },
  {
    name: 'Innovation & New Ideas',
    description: 'Suggestions for new products, services, processes, and innovative approaches',
    icon: 'lightbulb',
    color: 'warning',
    order: 7,
    subcategories: [
      'Product Innovation',
      'Process Improvements',
      'Technology Adoption',
      'Market Opportunities',
      'Customer Experience',
      'Sustainability Initiatives',
      'Creative Solutions',
      'Future Trends'
    ]
  }
];

async function seedCategories(force = false) {
  try {
    // Check if categories already exist (simple check without SeederStatus)
    if (!force) {
      const existingCategories = await Category.countDocuments();
      if (existingCategories > 0) {
        const categories = await Category.find();
        const totalSubcategories = await Subcategory.countDocuments();
        return { 
          categories, 
          totalSubcategories,
          skipped: true 
        };
      }
    }
    
    // Clear existing data if force is true
    if (force) {
      await Category.deleteMany({});
      await Subcategory.deleteMany({});
    }
    
    const createdCategories = [];
    
    // Create categories
    for (const categoryData of categoriesData) {
      const { subcategories, ...categoryFields } = categoryData;
      
      const category = new Category(categoryFields);
      const savedCategory = await category.save();
      createdCategories.push(savedCategory);
      
      // Create subcategories for this category
      for (let i = 0; i < subcategories.length; i++) {
        const subcategory = new Subcategory({
          name: subcategories[i],
          category: savedCategory._id,
          order: i + 1
        });
        
        await subcategory.save();
      }
    }
    
    // Get total subcategories count
    const totalSubcategories = await Subcategory.countDocuments();
    
    return { categories: createdCategories, totalSubcategories };
    
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

async function getCategoriesWithSubcategories() {
  try {
    const categories = await Category.find({ isActive: true })
      .populate({
        path: 'subcategories',
        match: { isActive: true },
        select: 'name description order',
        options: { sort: { order: 1 } }
      })
      .sort({ order: 1 });
    
    return categories;
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
}

// Export functions for use in other parts of the application
module.exports = {
  seedCategories,
  getCategoriesWithSubcategories
};

// Run seeder if this file is executed directly
if (require.main === module) {
  // Connect to MongoDB and run seeder
  const connectDB = require('../config/database');
  
  connectDB()
    .then(() => {
      console.log('🔌 Connected to MongoDB');
      return seedCategories();
    })
    .then(() => {
      console.log('✅ Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}
