const mongoose = require('mongoose');
const Scheme = require('../models/Scheme');
const { evaluateEligibility, validateUserProfile } = require('./eligibilityService');

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

class BadRequestError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BadRequestError';
    this.statusCode = 400;
  }
}

/**
 * Retrieves all schemes with optional query filtering
 * @param {Object} queryFilters - { category, state, search, isActive }
 */
const getAllSchemes = async (queryFilters = {}) => {
  const query = {};

  // Active filter (default true)
  if (queryFilters.isActive !== undefined) {
    query.isActive = queryFilters.isActive === 'true' || queryFilters.isActive === true;
  } else {
    query.isActive = true;
  }

  // Category filter
  if (queryFilters.category && queryFilters.category.trim() !== '') {
    query.category = { $regex: new RegExp(`^${queryFilters.category.trim()}$`, 'i') };
  }

  // State filter: if specified, matches that state or 'All'
  if (queryFilters.state && queryFilters.state.trim() !== '') {
    const requestedState = queryFilters.state.trim();
    if (requestedState.toLowerCase() !== 'all') {
      query.$or = [
        { state: { $regex: new RegExp(`^${requestedState}$`, 'i') } },
        { state: { $regex: /^all$/i } },
        { state: { $regex: /^national$/i } },
      ];
    }
  }

  // Search keyword filter
  if (queryFilters.search && queryFilters.search.trim() !== '') {
    const term = queryFilters.search.trim();
    const searchRegex = { $regex: term, $options: 'i' };
    const searchQuery = [
      { schemeName: searchRegex },
      { description: searchRegex },
      { department: searchRegex },
      { category: searchRegex },
      { beneficiary: searchRegex },
    ];

    if (query.$or) {
      query.$and = [{ $or: query.$or }, { $or: searchQuery }];
      delete query.$or;
    } else {
      query.$or = searchQuery;
    }
  }

  const schemes = await Scheme.find(query).sort({ schemeName: 1 });
  return schemes;
};

/**
 * Retrieves a single scheme by its MongoDB ObjectId
 * @param {String} id 
 */
const getSchemeById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new BadRequestError(`Invalid scheme ID format: ${id}`);
  }

  const scheme = await Scheme.findById(id);
  if (!scheme) {
    throw new NotFoundError(`Scheme not found with ID: ${id}`);
  }

  return scheme;
};

/**
 * Evaluates citizen eligibility for a specific scheme
 * @param {String} schemeId 
 * @param {Object} userProfile 
 */
const evaluateSchemeEligibility = async (schemeId, userProfile) => {
  const scheme = await getSchemeById(schemeId);
  validateUserProfile(userProfile);

  const evaluation = evaluateEligibility(userProfile, scheme);

  return {
    schemeId: scheme._id,
    schemeName: scheme.schemeName,
    ...evaluation,
  };
};

module.exports = {
  getAllSchemes,
  getSchemeById,
  evaluateSchemeEligibility,
  NotFoundError,
  BadRequestError,
};
