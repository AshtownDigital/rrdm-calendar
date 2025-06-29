/**
 * Home Module Routes
 * Handles the application's landing page and navigation
 */
const express = require('express');
const router = express.Router();
const homeController = require('../../../controllers/homeController');

// Home page route (landing page)
router.get('/', homeController.index);

module.exports = router;
