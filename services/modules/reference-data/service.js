/**
 * Reference Data Module Service
 * Handles business logic for reference data operations
 */
const referenceDataModel = require('../../../models/modules/reference-data/model');
const auditService = require('../../audit/service');

/**
 * Get reference data dashboard metrics
 */
exports.getDashboardMetrics = async () => {
  try {
    const itemCount = await referenceDataModel.countAllItems();
    const valueCount = await referenceDataModel.countAllValues();
    const releaseNoteCount = await referenceDataModel.countAllReleaseNotes();
    const restorePointCount = await referenceDataModel.countAllRestorePoints();
    
    return {
      items: itemCount,
      values: valueCount,
      releaseNotes: releaseNoteCount,
      restorePoints: restorePointCount
    };
  } catch (error) {
    console.error('Error getting dashboard metrics:', error);
    throw error;
  }
};

/**
 * Create a new reference data item with audit trail
 */
exports.createItem = async (itemData, userId) => {
  try {
    const item = await referenceDataModel.createItem(itemData);
    
    // Log audit entry
    await auditService.logAction({
      action: 'CREATE_ITEM',
      entityType: 'REFERENCE_DATA_ITEM',
      entityId: item.id,
      userId,
      details: {
        name: item.name,
        code: item.code,
        category: item.category
      }
    });
    
    return item;
  } catch (error) {
    console.error('Error creating reference data item:', error);
    throw error;
  }
};

/**
 * Update a reference data item with audit trail
 */
exports.updateItem = async (id, itemData, userId) => {
  try {
    // Get the original item for comparison
    const originalItem = await referenceDataModel.getItemById(id);
    
    if (!originalItem) {
      throw new Error('Item not found');
    }
    
    // Update the item
    const updatedItem = await referenceDataModel.updateItem(id, itemData);
    
    // Log audit entry with changes
    await auditService.logAction({
      action: 'UPDATE_ITEM',
      entityType: 'REFERENCE_DATA_ITEM',
      entityId: updatedItem.id,
      userId,
      details: {
        changes: getChanges(originalItem.toObject(), updatedItem.toObject())
      }
    });
    
    return updatedItem;
  } catch (error) {
    console.error('Error updating reference data item:', error);
    throw error;
  }
};

/**
 * Delete a reference data item with audit trail
 */
exports.deleteItem = async (id, userId) => {
  try {
    // Get the item before deletion
    const item = await referenceDataModel.getItemById(id);
    
    if (!item) {
      throw new Error('Item not found');
    }
    
    // Delete (soft) the item
    await referenceDataModel.deleteItem(id);
    
    // Log audit entry
    await auditService.logAction({
      action: 'DELETE_ITEM',
      entityType: 'REFERENCE_DATA_ITEM',
      entityId: id,
      userId,
      details: {
        name: item.name,
        code: item.code,
        category: item.category
      }
    });
    
    return true;
  } catch (error) {
    console.error('Error deleting reference data item:', error);
    throw error;
  }
};

/**
 * Create a new restore point with all current reference data
 */
exports.createRestorePoint = async (name, description, userId) => {
  try {
    // Get all current reference data
    const items = await referenceDataModel.getAllItems();
    const values = await referenceDataModel.getAllValues();
    
    // Create restore point with snapshot of data
    const restorePoint = await referenceDataModel.createRestorePoint({
      name,
      description,
      createdBy: userId,
      snapshot: {
        items: JSON.stringify(items),
        values: JSON.stringify(values)
      }
    });
    
    // Log audit entry
    await auditService.logAction({
      action: 'CREATE_RESTORE_POINT',
      entityType: 'RESTORE_POINT',
      entityId: restorePoint.id,
      userId,
      details: {
        name: restorePoint.name,
        itemCount: items.length,
        valueCount: values.length
      }
    });
    
    return restorePoint;
  } catch (error) {
    console.error('Error creating restore point:', error);
    throw error;
  }
};

/**
 * Restore reference data from a restore point
 */
exports.restoreFromRestorePoint = async (id, userId) => {
  try {
    // Get the restore point
    const restorePoint = await referenceDataModel.getRestorePointById(id);
    
    if (!restorePoint) {
      throw new Error('Restore point not found');
    }
    
    // Perform the restore operation
    await referenceDataModel.restoreFromRestorePoint(id);
    
    // Log audit entry
    await auditService.logAction({
      action: 'RESTORE_FROM_POINT',
      entityType: 'RESTORE_POINT',
      entityId: id,
      userId,
      details: {
        name: restorePoint.name,
        timestamp: restorePoint.createdAt
      }
    });
    
    return true;
  } catch (error) {
    console.error('Error restoring from restore point:', error);
    throw error;
  }
};

/**
 * Helper function to determine changes between original and updated objects
 */
function getChanges(original, updated) {
  const changes = {};
  
  // Compare properties and track changes
  Object.keys(updated).forEach(key => {
    // Skip metadata and special fields
    if (['_id', '__v', 'createdAt', 'updatedAt', 'deleted'].includes(key)) {
      return;
    }
    
    // Check if value has changed
    if (JSON.stringify(original[key]) !== JSON.stringify(updated[key])) {
      changes[key] = {
        from: original[key],
        to: updated[key]
      };
    }
  });
  
  return changes;
}
