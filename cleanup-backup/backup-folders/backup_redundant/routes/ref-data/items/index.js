/**
 * Reference Data Items Routes
 */
const express = require('express');
const router = express.Router();
const { itemsController } = require('../../../controllers/reference-data');

// Items list route
router.get('/', itemsController.listItems);

// Item values route
router.get('/:id/values', itemsController.viewItemValues);

// Item history route
router.get('/:id/history', itemsController.viewItemHistory);

// Add reference data item form route
router.get('/add', itemsController.showAddItemForm);

// Process add reference data item form submission
router.post('/add', itemsController.processAddItem);

module.exports = router;
