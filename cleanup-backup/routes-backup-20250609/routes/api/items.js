/**
 * API Reference Data Items Routes
 */
const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../../middleware/auth');
const { itemsController } = require('../../controllers/api');

// Apply authentication middleware to all routes
router.use(ensureAuthenticated);

// Define routes
router.get('/', itemsController.getItems);
router.get('/ref-item/:refItemId', itemsController.getItemById);
router.get('/ref-item/:refItemId/values', itemsController.getItemValues);

module.exports = {
  router,
  getItems: itemsController.getItems,
  getItemById: itemsController.getItemById,
  getItemValues: itemsController.getItemValues
};
