/**
 * API Reference Data Items Routes
 */
const express = require('express');
const router = express.Router();
const { ReferenceData, ReferenceValue } = require('../../models');
const { ensureAuthenticated } = require('../../middleware/auth');

/**
 * GET /api/items
 * Get all reference data items
 */
const getItems = async (req, res) => {
  try {
    const items = await ReferenceData.findAll();
    res.status(200).json(items);
  } catch (error) {
    console.error('Error fetching reference data items:', error);
    res.status(500).json({ error: 'Failed to fetch reference data items' });
  }
};

/**
 * GET /api/items/:id
 * Get a specific reference data item by ID
 */
const getItemById = async (req, res) => {
  try {
    const item = await ReferenceData.findByPk(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.status(200).json(item);
  } catch (error) {
    console.error('Error fetching reference data item:', error);
    res.status(500).json({ error: 'Failed to fetch reference data item' });
  }
};

/**
 * GET /api/items/:id/values
 * Get values for a specific reference data item
 */
const getItemValues = async (req, res) => {
  try {
    const values = await ReferenceValue.findAll({
      where: { referenceDataId: req.params.id }
    });
    res.status(200).json(values);
  } catch (error) {
    console.error('Error fetching reference data values:', error);
    res.status(500).json({ error: 'Failed to fetch reference data values' });
  }
};

// Apply authentication middleware to all routes
router.use(ensureAuthenticated);

// Define routes
router.get('/', getItems);
router.get('/:id', getItemById);
router.get('/:id/values', getItemValues);

module.exports = {
  router,
  getItems,
  getItemById,
  getItemValues
};
