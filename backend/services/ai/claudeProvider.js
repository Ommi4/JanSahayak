/**
 * JanSahayak - Claude AI Provider (Anthropic)
 * Placeholder architecture for Anthropic Claude integration.
 * Fails gracefully and safely when ANTHROPIC_API_KEY is not configured.
 */

class ClaudeUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ClaudeUnavailableError';
    this.statusCode = 503;
  }
}

/**
 * Checks if Claude provider is properly configured
 */
const isConfigured = () => {
  const key = process.env.ANTHROPIC_API_KEY;
  return Boolean(key && key.trim().length > 0 && !key.startsWith('change_this'));
};

/**
 * Generate response using Claude API
 * Throws ClaudeUnavailableError if key is missing or provider cannot be reached.
 */
const generateResponse = async ({ message, user = null, conversation = null, language = 'en' }) => {
  if (!isConfigured()) {
    throw new ClaudeUnavailableError(
      'Anthropic Claude API is not configured. Please set ANTHROPIC_API_KEY or switch to AI_MODE=fallback.'
    );
  }

  // When a valid key is provided in future phases, the Anthropic SDK call will happen here.
  // Currently, the prompt adheres to safe fallback protocol.
  throw new ClaudeUnavailableError(
    'Claude provider is currently in setup mode. Please use AI_MODE=fallback.'
  );
};

module.exports = {
  generateResponse,
  isConfigured,
  ClaudeUnavailableError,
};
