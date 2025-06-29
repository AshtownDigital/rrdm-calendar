/**
 * Impacted Areas Model
 * Handles database operations for impacted areas using MongoDB
 */
const { v4: uuidv4 } = require('uuid');

// Import MongoDB models
const ImpactedArea = require('../ImpactedArea');
const BcrConfig = require('../BcrConfig');
const Submission = require('../Submission');
const Bcr = require('../Bcr');

/**
 * Create a new impacted area
 * @param {Object} areaData - The impacted area data
 * @returns {Promise<Object>} - The created impacted area
 */
const createImpactedArea = async (areaData) => {
  // Validate area data
  if (!areaData.name) throw new Error('Name is required');
  if (areaData.order === undefined) throw new Error('Order is required');
  
  // Check if name is unique
  const existingArea = await ImpactedArea.findOne({
    name: areaData.name
  });
  
  if (existingArea) {
    throw new Error(`Impacted area with name '${areaData.name}' already exists`);
  }
  
  // Create the impacted area
  const impactedArea = new ImpactedArea({
    name: areaData.name,
    value: areaData.name.toLowerCase().replace(/\s+/g, '_'),
    description: areaData.description || '',
    order: areaData.order,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  await impactedArea.save();
  
  // For backward compatibility, also create in BcrConfigs
  try {
    // Get next record number for BcrConfigs
    const lastArea = await BcrConfig.findOne(
      { type: 'impactArea' },
      {},
      { sort: { 'recordNumber': -1 } }
    );
    
    const recordNumber = lastArea ? lastArea.recordNumber + 1 : 1;
    
    const bcrConfig = new BcrConfig({
      type: 'impactArea',
      recordNumber,
      name: areaData.name,
      description: areaData.description || '',
      value: areaData.name.toLowerCase().replace(/\s+/g, '_'),
      displayOrder: areaData.order
    });
    
    await bcrConfig.save();
  } catch (error) {
    console.warn('Could not create backward compatibility record in BcrConfigs:', error);
  }
  
  return impactedArea;
};

/**
 * Get all impacted areas
 * @returns {Promise<Array>} - Array of impacted areas
 */
const getAllImpactedAreas = async () => {
  try {
    const impactedAreas = await ImpactedArea.find({})
      .sort({ order: 1 });
    
    return impactedAreas;
  } catch (error) {
    console.error('Error getting impacted areas:', error);
    // Fallback to BcrConfigs for backward compatibility
    try {
      const legacyAreas = await BcrConfig.find({ type: 'impactArea' })
        .sort({ displayOrder: 1 });
      
      return legacyAreas;
    } catch (fallbackError) {
      console.error('Fallback error getting impacted areas:', fallbackError);
      return [];
    }
  }
};

/**
 * Get an impacted area by ID
 * @param {string} id - The impacted area ID
 * @returns {Promise<Object>} - The impacted area
 */
const getImpactedAreaById = async (id) => {
  try {
    const impactedArea = await ImpactedArea.findById(id);
    
    return impactedArea;
  } catch (error) {
    console.error('Error getting impacted area by ID:', error);
    // Fallback to BcrConfigs for backward compatibility
    try {
      const legacyArea = await BcrConfig.findOne({
        _id: id,
        type: 'impactArea'
      });
      
      return legacyArea;
    } catch (fallbackError) {
      console.error('Fallback error getting impacted area by ID:', fallbackError);
      return null;
    }
  }
};

/**
 * Update an impacted area
 * @param {string} id - The impacted area ID
 * @param {Object} areaData - The updated impacted area data
 * @returns {Promise<Object>} - The updated impacted area
 */
const updateImpactedArea = async (id, areaData) => {
  // Validate area data
  if (!areaData.name) throw new Error('Name is required');
  if (areaData.order === undefined) throw new Error('Order is required');
  
  // Check if name is unique (excluding this area)
  const existingArea = await ImpactedArea.findOne({
    name: areaData.name,
    _id: { $ne: id }
  });
  
  if (existingArea) {
    throw new Error(`Impacted area with name '${areaData.name}' already exists`);
  }
  
  // Update the impacted area
  const impactedArea = await ImpactedArea.findById(id);
  
  if (!impactedArea) {
    throw new Error(`Impacted area with ID '${id}' not found`);
  }
  
  impactedArea.name = areaData.name;
  impactedArea.value = areaData.name.toLowerCase().replace(/\s+/g, '_');
  impactedArea.description = areaData.description || '';
  impactedArea.order = areaData.order;
  impactedArea.updatedAt = new Date();
  
  await impactedArea.save();
  
  // Update in BcrConfigs for backward compatibility
  try {
    await BcrConfig.updateMany(
      { 
        _id: id,
        type: 'impactArea'
      },
      {
        $set: {
          name: areaData.name,
          description: areaData.description || '',
          value: areaData.name.toLowerCase().replace(/\s+/g, '_'),
          displayOrder: areaData.order
        }
      }
    );
  } catch (error) {
    console.warn('Could not update backward compatibility record in BcrConfigs:', error);
  }
  
  return impactedArea;
};

/**
 * Delete an impacted area
 * @param {string} id - The impacted area ID
 * @returns {Promise<Object>} - The deleted impacted area
 */
const deleteImpactedArea = async (id) => {
  // Check if the area is in use
  const submissions = await Submission.find({
    impactAreas: id
  });
  
  const bcrs = await Bcr.find({
    impactedAreas: id
  });
  
  if (submissions.length > 0 || bcrs.length > 0) {
    throw new Error('Cannot delete impacted area that is in use');
  }
  
  // Find the impacted area
  const impactedArea = await ImpactedArea.findById(id);
  
  if (!impactedArea) {
    throw new Error(`Impacted area with ID '${id}' not found`);
  }
  
  // Delete the impacted area
  await ImpactedArea.findByIdAndDelete(id);
  
  // Delete from BcrConfigs for backward compatibility
  try {
    await BcrConfig.deleteMany({
      _id: id,
      type: 'impactArea'
    });
  } catch (error) {
    console.warn('Could not delete backward compatibility record in BcrConfigs:', error);
  }
  
  return impactedArea;
};

module.exports = {
  createImpactedArea,
  getAllImpactedAreas,
  getImpactedAreaById,
  updateImpactedArea,
  deleteImpactedArea
};
