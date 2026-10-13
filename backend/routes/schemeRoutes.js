const express = require('express');
const router = express.Router();
const {
  getSchemes,
  getSchemeById,
  checkEligibility,
} = require('../controllers/schemeController');

router.get('/', getSchemes);
router.get('/:id', getSchemeById);
router.post('/:id/eligibility', checkEligibility);

module.exports = router;
