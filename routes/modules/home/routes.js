/**
 * Home Module Routes
 * Handles the application's landing page and navigation
 */
const express = require('express');
const router = express.Router();
const homeController = require('../../../controllers/modules/home/controller');

// Home page route (landing page)
router.get('/', homeController.index);

module.exports = router;
