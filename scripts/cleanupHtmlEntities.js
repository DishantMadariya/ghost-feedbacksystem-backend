const mongoose = require('mongoose');
const Suggestion = require('../models/Suggestion');
require('dotenv').config();

// Function to decode HTML entities
const decodeHtmlEntities = (text) => {
  if (typeof text !== 'string') return text;
  
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
};

// Function to clean up HTML entities in suggestions
const cleanupHtmlEntities = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    // Find all suggestions with HTML entities
    const suggestions = await Suggestion.find({
      $or: [
        { suggestionText: { $regex: /&[a-zA-Z0-9#]+;/ } },
        { reply: { $regex: /&[a-zA-Z0-9#]+;/ } }
      ]
    });
    if (suggestions.length === 0) {
      return;
    }
    
    // Clean up each suggestion
    let updatedCount = 0;
    for (const suggestion of suggestions) {
      let needsUpdate = false;
      
      // Clean suggestion text
      if (suggestion.suggestionText) {
        const cleanedText = decodeHtmlEntities(suggestion.suggestionText);
        if (cleanedText !== suggestion.suggestionText) {
          suggestion.suggestionText = cleanedText;
          needsUpdate = true;
        }
      }
      
      // Clean reply text
      if (suggestion.reply) {
        const cleanedReply = decodeHtmlEntities(suggestion.reply);
        if (cleanedReply !== suggestion.reply) {
          suggestion.reply = cleanedReply;
          needsUpdate = true;
        }
      }
      
      // Save if updated
      if (needsUpdate) {
        await suggestion.save();
        updatedCount++;
      }
    }
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
};

// Run cleanup if this script is executed directly
if (require.main === module) {
  cleanupHtmlEntities()
    .then(() => {
      console.log('✨ Script execution completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script execution failed:', error);
      process.exit(1);
    });
}

module.exports = { cleanupHtmlEntities, decodeHtmlEntities };
