/**
 * API Reference Data Items Controller
 * Handles API endpoints for reference data items
 */
const { prisma } = require('../../config/database');

/**
 * Get all reference data items
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getItems = async (req, res) => {
  try {
    const items = await prisma.referenceData.findMany();
    res.status(200).json(items);
  } catch (error) {
    console.error('Error fetching reference data items:', error);
    res.status(500).json({ error: 'Failed to fetch reference data items' });
  }
};

/**
 * Get a specific reference data item by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getItemById = async (req, res) => {
  try {
    const item = await prisma.referenceData.findUnique({
      where: { id: req.params.id }
    });
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
 * Get values for a specific reference data item
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getItemValues = async (req, res) => {
  try {
    const values = await prisma.referenceValue.findMany({
      where: { referenceDataId: req.params.id }
    });
    res.status(200).json(values);
  } catch (error) {
    console.error('Error fetching reference data values:', error);
    res.status(500).json({ error: 'Failed to fetch reference data values' });
  }
};

module.exports = {
  getItems,
  getItemById,
  getItemValues
};
