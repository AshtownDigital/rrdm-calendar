/**
 * Impacted Areas Model
 * Handles database operations for impacted areas using Prisma
 */
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const prisma = new PrismaClient();

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
  const existingArea = await prisma.impactedArea.findFirst({
    where: {
      name: areaData.name
    }
  });
  
  if (existingArea) {
    throw new Error(`Impacted area with name '${areaData.name}' already exists`);
  }
  
  // Create the impacted area
  const impactedArea = await prisma.impactedArea.create({
    data: {
      id: uuidv4(),
      name: areaData.name,
      description: areaData.description || '',
      order: areaData.order,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });
  
  // For backward compatibility, also create in BcrConfigs
  try {
    // Get next record number for BcrConfigs
    const lastArea = await prisma.bcrConfigs.findFirst({
      where: { type: 'impactArea' },
      orderBy: {
        recordNumber: 'desc'
      }
    });
    
    const recordNumber = lastArea ? lastArea.recordNumber + 1 : 1;
    
    await prisma.bcrConfigs.create({
      data: {
        id: impactedArea.id, // Use the same ID for consistency
        type: 'impactArea',
        recordNumber,
        name: areaData.name,
        description: areaData.description || '',
        value: areaData.name.toLowerCase().replace(/\s+/g, '_'),
        displayOrder: areaData.order
      }
    });
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
    const impactedAreas = await prisma.impactedArea.findMany({
      orderBy: {
        order: 'asc'
      }
    });
    
    return impactedAreas;
  } catch (error) {
    console.error('Error getting impacted areas:', error);
    // Fallback to BcrConfigs for backward compatibility
    try {
      const legacyAreas = await prisma.bcrConfigs.findMany({
        where: { type: 'impactArea' },
        orderBy: {
          displayOrder: 'asc'
        }
      });
      
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
    const impactedArea = await prisma.impactedArea.findUnique({
      where: { id }
    });
    
    return impactedArea;
  } catch (error) {
    console.error('Error getting impacted area by ID:', error);
    // Fallback to BcrConfigs for backward compatibility
    try {
      const legacyArea = await prisma.bcrConfigs.findFirst({
        where: {
          id,
          type: 'impactArea'
        }
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
  const existingArea = await prisma.impactedArea.findFirst({
    where: {
      name: areaData.name,
      id: { not: id }
    }
  });
  
  if (existingArea) {
    throw new Error(`Impacted area with name '${areaData.name}' already exists`);
  }
  
  // Update the impacted area
  const updatedArea = await prisma.impactedArea.update({
    where: { id },
    data: {
      name: areaData.name,
      description: areaData.description || '',
      order: areaData.order,
      updatedAt: new Date()
    }
  });
  
  // Update in BcrConfigs for backward compatibility
  try {
    await prisma.bcrConfigs.updateMany({
      where: { 
        id,
        type: 'impactArea'
      },
      data: {
        name: areaData.name,
        description: areaData.description || '',
        value: areaData.name.toLowerCase().replace(/\s+/g, '_'),
        displayOrder: areaData.order
      }
    });
  } catch (error) {
    console.warn('Could not update backward compatibility record in BcrConfigs:', error);
  }
  
  return updatedArea;
};

/**
 * Delete an impacted area
 * @param {string} id - The impacted area ID
 * @returns {Promise<Object>} - The deleted impacted area
 */
const deleteImpactedArea = async (id) => {
  // Check if the area is in use
  const submissions = await prisma.submission.findMany({
    where: {
      impactAreas: {
        has: id
      }
    }
  });
  
  const bcrs = await prisma.bcr.findMany({
    where: {
      impactedAreas: {
        has: id
      }
    }
  });
  
  if (submissions.length > 0 || bcrs.length > 0) {
    throw new Error('Cannot delete impacted area that is in use');
  }
  
  // Delete the impacted area
  const deletedArea = await prisma.impactedArea.delete({
    where: { id }
  });
  
  // Delete from BcrConfigs for backward compatibility
  try {
    await prisma.bcrConfigs.deleteMany({
      where: { 
        id,
        type: 'impactArea'
      }
    });
  } catch (error) {
    console.warn('Could not delete backward compatibility record in BcrConfigs:', error);
  }
  
  return deletedArea;
};

module.exports = {
  createImpactedArea,
  getAllImpactedAreas,
  getImpactedAreaById,
  updateImpactedArea,
  deleteImpactedArea
};
