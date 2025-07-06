/**
 * Data Gem Module Routes
 * Provides routing for Data Gem Viewer feature.
 */
const express = require('express');
const router = express.Router();
const dataGemController = require('../../../controllers/dataGemController');

// Categories list page
router.get('/categories', dataGemController.categories);

// Sections page for a specific markdown file
router.get('/sections', dataGemController.sections);

// Viewer page
router.get('/viewer', dataGemController.viewer);

module.exports = router;
