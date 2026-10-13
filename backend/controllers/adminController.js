const mongoose = require('mongoose');
const Scheme = require('../models/Scheme');
const User = require('../models/User');
const Conversation = require('../models/Conversation');

// Helper to validate URL
const isValidUrl = (string) => {
  if (!string || typeof string !== 'string') return false;
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
};

// @desc    Get dashboard summary metrics for administrator
// @route   GET /api/admin/dashboard
// @access  Private/Admin
const getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalSchemes,
      activeSchemes,
      inactiveSchemes,
      totalUsers,
      totalCitizens,
      totalConversations,
    ] = await Promise.all([
      Scheme.countDocuments({}),
      Scheme.countDocuments({ isActive: true }),
      Scheme.countDocuments({ isActive: false }),
      User.countDocuments({}),
      User.countDocuments({ role: { $ne: 'admin' } }),
      Conversation.countDocuments({}),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalSchemes,
        activeSchemes,
        inactiveSchemes,
        totalUsers,
        totalCitizens,
        totalConversations,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get safe list of registered citizens/users
// @route   GET /api/admin/users
// @access  Private/Admin
const getUsers = async (req, res, next) => {
  try {
    const { search, role } = req.query;
    const query = {};

    if (role) {
      query.role = role;
    }

    if (search && search.trim() !== '') {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      query.$or = [{ name: searchRegex }, { email: searchRegex }];
    }

    const users = await User.find(query)
      .select('-password -__v')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all schemes (active & inactive) with administrative filtering
// @route   GET /api/admin/schemes
// @access  Private/Admin
const getSchemes = async (req, res, next) => {
  try {
    const { category, state, search, isActive } = req.query;
    const query = {};

    if (isActive !== undefined && isActive !== '') {
      query.isActive = isActive === 'true' || isActive === true;
    }

    if (category && category.trim() !== '' && category.toLowerCase() !== 'all') {
      query.category = { $regex: new RegExp(`^${category.trim()}$`, 'i') };
    }

    if (state && state.trim() !== '' && state.toLowerCase() !== 'all') {
      query.$or = [
        { state: { $regex: new RegExp(`^${state.trim()}$`, 'i') } },
        { state: { $regex: /^all$/i } },
        { state: { $regex: /^national$/i } },
      ];
    }

    if (search && search.trim() !== '') {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
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

    const schemes = await Scheme.find(query).sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      count: schemes.length,
      data: schemes,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single scheme by ID (including inactive)
// @route   GET /api/admin/schemes/:id
// @access  Private/Admin
const getSchemeById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid scheme ID format: ${id}`,
      });
    }

    const scheme = await Scheme.findById(id);
    if (!scheme) {
      return res.status(404).json({
        success: false,
        message: `Scheme not found with ID: ${id}`,
      });
    }

    res.status(200).json({
      success: true,
      data: scheme,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new government scheme
// @route   POST /api/admin/schemes
// @access  Private/Admin
const createScheme = async (req, res, next) => {
  try {
    const {
      schemeName,
      department,
      category,
      beneficiary,
      state,
      description,
      benefits,
      eligibilityText,
      rules,
      documents,
      applicationProcess,
      officialWebsite,
      source,
      isActive,
    } = req.body;

    // Validation
    if (!schemeName || typeof schemeName !== 'string' || schemeName.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Scheme name is required and cannot be empty',
      });
    }

    if (!category || typeof category !== 'string' || category.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Category is required and cannot be empty',
      });
    }

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Description is required and cannot be empty',
      });
    }

    if (officialWebsite && !isValidUrl(officialWebsite)) {
      return res.status(400).json({
        success: false,
        message: 'Official portal website must be a valid HTTP or HTTPS URL',
      });
    }

    // Format array fields if passed as newline strings
    const parseList = (val) => {
      if (Array.isArray(val)) return val.map((s) => String(s).trim()).filter(Boolean);
      if (typeof val === 'string') return val.split('\n').map((s) => s.trim()).filter(Boolean);
      return [];
    };

    const newScheme = await Scheme.create({
      schemeName: schemeName.trim(),
      department: department ? department.trim() : 'Government of India',
      category: category.trim(),
      beneficiary: beneficiary ? beneficiary.trim() : 'Eligible Citizens',
      state: state ? state.trim() : 'All',
      description: description.trim(),
      benefits: parseList(benefits),
      eligibilityText: eligibilityText ? eligibilityText.trim() : '',
      rules: rules && typeof rules === 'object' ? rules : {},
      documents: parseList(documents),
      applicationProcess: parseList(applicationProcess),
      officialWebsite: officialWebsite ? officialWebsite.trim() : '',
      source: source ? source.trim() : 'Official Government Notification',
      lastVerifiedAt: new Date(),
      lastUpdated: new Date(),
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    res.status(201).json({
      success: true,
      message: 'Government scheme created successfully',
      data: newScheme,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update an existing scheme
// @route   PUT /api/admin/schemes/:id
// @access  Private/Admin
const updateScheme = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid scheme ID format: ${id}`,
      });
    }

    const scheme = await Scheme.findById(id);
    if (!scheme) {
      return res.status(404).json({
        success: false,
        message: `Scheme not found with ID: ${id}`,
      });
    }

    const {
      schemeName,
      department,
      category,
      beneficiary,
      state,
      description,
      benefits,
      eligibilityText,
      rules,
      documents,
      applicationProcess,
      officialWebsite,
      source,
      isActive,
    } = req.body;

    if (schemeName !== undefined) {
      if (!schemeName || typeof schemeName !== 'string' || schemeName.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Scheme name cannot be empty',
        });
      }
      scheme.schemeName = schemeName.trim();
    }

    if (category !== undefined) {
      if (!category || typeof category !== 'string' || category.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Category cannot be empty',
        });
      }
      scheme.category = category.trim();
    }

    if (description !== undefined) {
      if (!description || typeof description !== 'string' || description.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Description cannot be empty',
        });
      }
      scheme.description = description.trim();
    }

    if (officialWebsite !== undefined && officialWebsite !== '') {
      if (!isValidUrl(officialWebsite)) {
        return res.status(400).json({
          success: false,
          message: 'Official portal website must be a valid HTTP or HTTPS URL',
        });
      }
      scheme.officialWebsite = officialWebsite.trim();
    } else if (officialWebsite === '') {
      scheme.officialWebsite = '';
    }

    const parseList = (val) => {
      if (Array.isArray(val)) return val.map((s) => String(s).trim()).filter(Boolean);
      if (typeof val === 'string') return val.split('\n').map((s) => s.trim()).filter(Boolean);
      return [];
    };

    if (department !== undefined) scheme.department = department.trim();
    if (beneficiary !== undefined) scheme.beneficiary = beneficiary.trim();
    if (state !== undefined) scheme.state = state.trim();
    if (benefits !== undefined) scheme.benefits = parseList(benefits);
    if (eligibilityText !== undefined) scheme.eligibilityText = eligibilityText.trim();
    if (rules !== undefined) scheme.rules = typeof rules === 'object' ? rules : {};
    if (documents !== undefined) scheme.documents = parseList(documents);
    if (applicationProcess !== undefined) scheme.applicationProcess = parseList(applicationProcess);
    if (source !== undefined) scheme.source = source.trim();
    if (isActive !== undefined) scheme.isActive = Boolean(isActive);

    scheme.lastUpdated = new Date();
    scheme.lastVerifiedAt = new Date();

    await scheme.save();

    res.status(200).json({
      success: true,
      message: 'Scheme updated successfully',
      data: scheme,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle scheme active status
// @route   PATCH /api/admin/schemes/:id/status
// @access  Private/Admin
const toggleSchemeStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid scheme ID format: ${id}`,
      });
    }

    const scheme = await Scheme.findById(id);
    if (!scheme) {
      return res.status(404).json({
        success: false,
        message: `Scheme not found with ID: ${id}`,
      });
    }

    if (req.body.isActive !== undefined) {
      scheme.isActive = Boolean(req.body.isActive);
    } else {
      scheme.isActive = !scheme.isActive;
    }

    scheme.lastUpdated = new Date();
    await scheme.save();

    res.status(200).json({
      success: true,
      message: `Scheme ${scheme.isActive ? 'activated' : 'deactivated'} successfully`,
      data: scheme,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Deactivate scheme (soft delete)
// @route   DELETE /api/admin/schemes/:id
// @access  Private/Admin
const deleteScheme = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid scheme ID format: ${id}`,
      });
    }

    const scheme = await Scheme.findById(id);
    if (!scheme) {
      return res.status(404).json({
        success: false,
        message: `Scheme not found with ID: ${id}`,
      });
    }

    // Soft delete / deactivation
    scheme.isActive = false;
    scheme.lastUpdated = new Date();
    await scheme.save();

    res.status(200).json({
      success: true,
      message: 'Scheme deactivated successfully',
      data: scheme,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getUsers,
  getSchemes,
  getSchemeById,
  createScheme,
  updateScheme,
  toggleSchemeStatus,
  deleteScheme,
};
