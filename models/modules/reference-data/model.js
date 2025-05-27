/**
 * Reference Data Module Model
 * Consolidated model for all reference data operations
 */
const mongoose = require('mongoose');

// Define schemas directly in this file
const itemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true },
  description: { type: String },
  category: { type: String },
  status: { type: String, default: 'Active' },
  deleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const valueSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  value: { type: String, required: true },
  displayName: { type: String },
  description: { type: String },
  displayOrder: { type: Number, default: 0 },
  isDefault: { type: Boolean, default: false },
  deleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const releaseNoteSchema = new mongoose.Schema({
  version: { type: String, required: true },
  releaseDate: { type: Date, required: true },
  title: { type: String, required: true },
  description: { type: String },
  features: [{ type: String }],
  bugFixes: [{ type: String }],
  deleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const restorePointSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  dataSnapshot: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: String },
  deleted: { type: Boolean, default: false }
});

// Create models from schemas
const Item = mongoose.models.Item || mongoose.model('Item', itemSchema);
const Value = mongoose.models.Value || mongoose.model('Value', valueSchema);
const ReleaseNote = mongoose.models.ReleaseNote || mongoose.model('ReleaseNote', releaseNoteSchema);
const RestorePoint = mongoose.models.RestorePoint || mongoose.model('RestorePoint', restorePointSchema);

/**
 * Get all reference data items
 */
exports.getAllItems = async (filters = {}) => {
  try {
    // Create base query to exclude deleted items
    const query = { deleted: { $ne: true } };
    
    // Apply filters if provided
    if (filters.category) {
      query.category = filters.category;
    }
    
    if (filters.status) {
      query.status = filters.status;
    }
    
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
        { code: { $regex: filters.search, $options: 'i' } }
      ];
    }
    
    // Execute the query with sort
    return await Item.find(query)
      .sort({ name: 1 })
      .exec();
  } catch (error) {
    console.error('Error in getAllItems:', error);
    throw error;
  }
};

/**
 * Get an item by ID
 */
exports.getItemById = async (id) => {
  try {
    return await Item.findById(id).exec();
  } catch (error) {
    console.error('Error in getItemById:', error);
    throw error;
  }
};

/**
 * Create a new reference data item
 */
exports.createItem = async (itemData) => {
  try {
    const item = new Item(itemData);
    await item.save();
    return item;
  } catch (error) {
    console.error('Error in createItem:', error);
    throw error;
  }
};

/**
 * Update a reference data item
 */
exports.updateItem = async (id, itemData) => {
  try {
    const item = await Item.findByIdAndUpdate(
      id,
      { ...itemData, updatedAt: new Date() },
      { new: true }
    ).exec();
    
    return item;
  } catch (error) {
    console.error('Error in updateItem:', error);
    throw error;
  }
};

/**
 * Delete a reference data item (soft delete)
 */
exports.deleteItem = async (id) => {
  try {
    const item = await Item.findByIdAndUpdate(
      id,
      { deleted: true, updatedAt: new Date() },
      { new: true }
    ).exec();
    
    return item;
  } catch (error) {
    console.error('Error in deleteItem:', error);
    throw error;
  }
};

/**
 * Count all reference data items
 */
exports.countAllItems = async () => {
  try {
    return await Item.countDocuments({ deleted: { $ne: true } }).exec();
  } catch (error) {
    console.error('Error in countAllItems:', error);
    throw error;
  }
};

/**
 * Get all reference data values
 */
exports.getAllValues = async (filters = {}) => {
  try {
    // Create base query to exclude deleted values
    const query = { deleted: { $ne: true } };
    
    // Apply filters if provided
    if (filters.itemId) {
      query.itemId = filters.itemId;
    }
    
    if (filters.search) {
      query.$or = [
        { value: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } }
      ];
    }
    
    // Execute the query with sort
    return await Value.find(query)
      .populate('itemId')
      .sort({ displayOrder: 1 })
      .exec();
  } catch (error) {
    console.error('Error in getAllValues:', error);
    throw error;
  }
};

/**
 * Get values by item ID
 */
exports.getValuesByItemId = async (itemId) => {
  try {
    return await Value.find({
      itemId,
      deleted: { $ne: true }
    })
      .sort({ displayOrder: 1 })
      .exec();
  } catch (error) {
    console.error('Error in getValuesByItemId:', error);
    throw error;
  }
};

/**
 * Get a value by ID
 */
exports.getValueById = async (id) => {
  try {
    return await Value.findById(id)
      .populate('itemId')
      .exec();
  } catch (error) {
    console.error('Error in getValueById:', error);
    throw error;
  }
};

/**
 * Create a new reference data value
 */
exports.createValue = async (valueData) => {
  try {
    const value = new Value(valueData);
    await value.save();
    return value;
  } catch (error) {
    console.error('Error in createValue:', error);
    throw error;
  }
};

/**
 * Update a reference data value
 */
exports.updateValue = async (id, valueData) => {
  try {
    const value = await Value.findByIdAndUpdate(
      id,
      { ...valueData, updatedAt: new Date() },
      { new: true }
    ).exec();
    
    return value;
  } catch (error) {
    console.error('Error in updateValue:', error);
    throw error;
  }
};

/**
 * Delete a reference data value (soft delete)
 */
exports.deleteValue = async (id) => {
  try {
    const value = await Value.findByIdAndUpdate(
      id,
      { deleted: true, updatedAt: new Date() },
      { new: true }
    ).exec();
    
    return value;
  } catch (error) {
    console.error('Error in deleteValue:', error);
    throw error;
  }
};

/**
 * Count all reference data values
 */
exports.countAllValues = async () => {
  try {
    return await Value.countDocuments({ deleted: { $ne: true } }).exec();
  } catch (error) {
    console.error('Error in countAllValues:', error);
    throw error;
  }
};

// Release Notes functions
exports.getAllReleaseNotes = async (filters = {}) => {
  try {
    // Create base query to exclude deleted release notes
    const query = { deleted: { $ne: true } };
    
    // Apply filters if provided
    if (filters.search) {
      query.$or = [
        { version: { $regex: filters.search, $options: 'i' } },
        { title: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } }
      ];
    }
    
    // Execute the query with sort
    return await ReleaseNote.find(query)
      .sort({ releaseDate: -1 })
      .exec();
  } catch (error) {
    console.error('Error in getAllReleaseNotes:', error);
    throw error;
  }
};

exports.getReleaseNoteById = async (id) => {
  try {
    return await ReleaseNote.findById(id).exec();
  } catch (error) {
    console.error('Error in getReleaseNoteById:', error);
    throw error;
  }
};

exports.createReleaseNote = async (releaseNoteData) => {
  try {
    const releaseNote = new ReleaseNote(releaseNoteData);
    await releaseNote.save();
    return releaseNote;
  } catch (error) {
    console.error('Error in createReleaseNote:', error);
    throw error;
  }
};

exports.updateReleaseNote = async (id, releaseNoteData) => {
  try {
    const releaseNote = await ReleaseNote.findByIdAndUpdate(
      id,
      { ...releaseNoteData, updatedAt: new Date() },
      { new: true }
    ).exec();
    
    return releaseNote;
  } catch (error) {
    console.error('Error in updateReleaseNote:', error);
    throw error;
  }
};

exports.countAllReleaseNotes = async () => {
  try {
    return await ReleaseNote.countDocuments({ deleted: { $ne: true } }).exec();
  } catch (error) {
    console.error('Error in countAllReleaseNotes:', error);
    throw error;
  }
};

// Restore Points functions
exports.getAllRestorePoints = async (filters = {}) => {
  try {
    // Create base query to exclude deleted restore points
    const query = { deleted: { $ne: true } };
    
    // Apply filters if provided
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } }
      ];
    }
    
    // Execute the query with sort
    return await RestorePoint.find(query)
      .sort({ createdAt: -1 })
      .exec();
  } catch (error) {
    console.error('Error in getAllRestorePoints:', error);
    throw error;
  }
};

exports.getRestorePointById = async (id) => {
  try {
    return await RestorePoint.findById(id).exec();
  } catch (error) {
    console.error('Error in getRestorePointById:', error);
    throw error;
  }
};

exports.createRestorePoint = async (restorePointData) => {
  try {
    // Create data snapshot of all reference data
    const dataSnapshot = {
      items: await Item.find({ deleted: { $ne: true } }).lean(),
      values: await Value.find({ deleted: { $ne: true } }).lean(),
      releaseNotes: await ReleaseNote.find({ deleted: { $ne: true } }).lean()
    };
    
    const restorePoint = new RestorePoint({
      ...restorePointData,
      dataSnapshot,
      createdAt: new Date()
    });
    
    await restorePoint.save();
    return restorePoint;
  } catch (error) {
    console.error('Error in createRestorePoint:', error);
    throw error;
  }
};

exports.restoreFromRestorePoint = async (id, options = {}) => {
  try {
    const restorePoint = await RestorePoint.findById(id).exec();
    
    if (!restorePoint || !restorePoint.dataSnapshot) {
      throw new Error('Restore point not found or contains no data');
    }
    
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Clear current data (soft delete)
      await Item.updateMany({}, { deleted: true }, { session });
      await Value.updateMany({}, { deleted: true }, { session });
      await ReleaseNote.updateMany({}, { deleted: true }, { session });
      
      // Restore items
      if (restorePoint.dataSnapshot.items && restorePoint.dataSnapshot.items.length > 0) {
        for (const item of restorePoint.dataSnapshot.items) {
          // Remove MongoDB specific fields for clean insert
          const cleanItem = { ...item };
          delete cleanItem._id;
          
          await Item.create([cleanItem], { session });
        }
      }
      
      // Restore values
      if (restorePoint.dataSnapshot.values && restorePoint.dataSnapshot.values.length > 0) {
        for (const value of restorePoint.dataSnapshot.values) {
          // Remove MongoDB specific fields for clean insert
          const cleanValue = { ...value };
          delete cleanValue._id;
          
          await Value.create([cleanValue], { session });
        }
      }
      
      // Restore release notes
      if (restorePoint.dataSnapshot.releaseNotes && restorePoint.dataSnapshot.releaseNotes.length > 0) {
        for (const note of restorePoint.dataSnapshot.releaseNotes) {
          // Remove MongoDB specific fields for clean insert
          const cleanNote = { ...note };
          delete cleanNote._id;
          
          await ReleaseNote.create([cleanNote], { session });
        }
      }
      
      // Create a record of this restore operation
      const restoreLogPoint = new RestorePoint({
        name: `Restore Log: ${restorePoint.name}`,
        description: `Data restored from point: ${restorePoint.name}. Notes: ${options.notes || 'None'}`,
        createdBy: options.restoredById || 'system',
        createdAt: new Date()
      });
      
      await restoreLogPoint.save({ session });
      
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
    
    return { success: true, message: 'Data restored successfully' };
  } catch (error) {
    console.error('Error in restoreFromRestorePoint:', error);
    throw error;
  }
};

exports.countAllRestorePoints = async () => {
  try {
    return await RestorePoint.countDocuments({ deleted: { $ne: true } }).exec();
  } catch (error) {
    console.error('Error in countAllRestorePoints:', error);
    throw error;
  }
};
