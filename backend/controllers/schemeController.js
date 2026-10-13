const schemeService = require('../services/schemeService');

// @desc    Get all active schemes with optional filters
// @route   GET /api/schemes
// @access  Public
const getSchemes = async (req, res, next) => {
  try {
    const { category, state, search, isActive } = req.query;
    const schemes = await schemeService.getAllSchemes({ category, state, search, isActive });

    res.status(200).json({
      success: true,
      count: schemes.length,
      data: schemes,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single scheme by ID
// @route   GET /api/schemes/:id
// @access  Public
const getSchemeById = async (req, res, next) => {
  try {
    const scheme = await schemeService.getSchemeById(req.params.id);

    res.status(200).json({
      success: true,
      data: scheme,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

// @desc    Check eligibility for a specific scheme
// @route   POST /api/schemes/:id/eligibility
// @access  Public
const checkEligibility = async (req, res, next) => {
  try {
    const userProfile = req.body || {};
    const result = await schemeService.evaluateSchemeEligibility(req.params.id, userProfile);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

module.exports = {
  getSchemes,
  getSchemeById,
  checkEligibility,
};
