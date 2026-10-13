/**
 * JanSahayak - Unified AI Service Layer
 * Dispatches conversational requests to the configured provider (fallback or Claude).
 * Ensures deterministic evaluation and graceful fallbacks.
 */

const fallbackProvider = require('./fallbackProvider');
const claudeProvider = require('./claudeProvider');

const getActiveMode = () => {
  const mode = process.env.AI_MODE || 'fallback';
  return mode.toLowerCase().trim();
};

/**
 * Generate AI assistance response
 * @param {Object} context - { message, user, conversation, language }
 */
const generateResponse = async (context) => {
  const mode = getActiveMode();

  if (mode === 'claude') {
    try {
      const claudeRes = await claudeProvider.generateResponse(context);
      return {
        ...claudeRes,
        provider: 'claude',
      };
    } catch (error) {
      console.warn(`[AI Service] Claude provider error: ${error.message}. Failing gracefully.`);
      // If Claude fails or key is missing, throw so controller can handle or use fallback as fallback
      throw error;
    }
  }

  // Default: Fallback Provider
  const fallbackRes = await fallbackProvider.generateResponse(context);
  return {
    ...fallbackRes,
    provider: 'fallback',
  };
};

module.exports = {
  generateResponse,
  getActiveMode,
};
