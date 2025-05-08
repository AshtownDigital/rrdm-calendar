/**
 * Example Controller with Enhanced Error Handling
 * 
 * This file demonstrates how to implement the comprehensive error handling
 * throughout the application, especially for database operations and API endpoints.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { 
  handleDatabaseError, 
  handleApiError, 
  handleWebError, 
  createError, 
  ErrorTypes,
  asyncHandler 
} = require('../utils/error-handler');

/**
 * Example of database error handling in an API endpoint
 */
const getItemById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      throw createError('Item ID is required', ErrorTypes.VALIDATION);
    }
    
    const item = await prisma.items.findUnique({
      where: { id }
    });
    
    if (!item) {
      throw createError('Item not found', ErrorTypes.NOT_FOUND);
    }
    
    return res.json({
      success: true,
      data: item
    });
  } catch (error) {
    // If it's already a typed error from createError, pass it through
    if (error.type) {
      return handleApiError(error, res);
    }
    
    // Otherwise, it's likely a database error that needs special handling
    const dbError = handleDatabaseError(error, { includeStack: process.env.NODE_ENV !== 'production' });
    return handleApiError(dbError, res);
  }
});

/**
 * Example of error handling in a web route (HTML response)
 */
const displayItemDetails = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      throw createError('Item ID is required', ErrorTypes.VALIDATION);
    }
    
    const item = await prisma.items.findUnique({
      where: { id }
    });
    
    if (!item) {
      throw createError('Item not found', ErrorTypes.NOT_FOUND);
    }
    
    return res.render('items/details', { 
      title: `Item: ${item.name}`,
      item 
    });
  } catch (error) {
    // If it's already a typed error from createError, pass it through
    if (error.type) {
      return handleWebError(error, req, res);
    }
    
    // Otherwise, it's likely a database error that needs special handling
    const dbError = handleDatabaseError(error, { includeStack: process.env.NODE_ENV !== 'production' });
    return handleWebError(dbError, req, res);
  }
});

/**
 * Example of transaction with error handling
 */
const createItemWithRelations = asyncHandler(async (req, res) => {
  try {
    const { name, description, categoryId, tags } = req.body;
    
    // Validate input
    if (!name || !categoryId) {
      throw createError('Name and category are required', ErrorTypes.VALIDATION);
    }
    
    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Create the item
      const item = await tx.items.create({
        data: {
          name,
          description,
          categoryId
        }
      });
      
      // Create tag relationships if provided
      if (tags && Array.isArray(tags) && tags.length > 0) {
        await tx.itemTags.createMany({
          data: tags.map(tagId => ({
            itemId: item.id,
            tagId
          }))
        });
      }
      
      return item;
    });
    
    return res.json({
      success: true,
      message: 'Item created successfully',
      data: result
    });
  } catch (error) {
    // If it's already a typed error from createError, pass it through
    if (error.type) {
      return handleApiError(error, res);
    }
    
    // Otherwise, it's likely a database error that needs special handling
    const dbError = handleDatabaseError(error, { 
      logLevel: 'error',
      includeStack: process.env.NODE_ENV !== 'production' 
    });
    
    return handleApiError(dbError, res);
  }
});

module.exports = {
  getItemById,
  displayItemDetails,
  createItemWithRelations
};
