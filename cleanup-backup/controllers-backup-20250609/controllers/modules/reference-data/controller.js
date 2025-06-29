/**
 * Reference Data Module Controller
 * Consolidated controller for Reference Data functionality
 */

// Use the consolidated model for all reference data operations
const referenceDataModel = require('../../../models/modules/reference-data/model');

/**
 * Render Reference Data dashboard
 */
exports.dashboard = async (req, res) => {
  try {
    // Get dashboard metrics using the consolidated model
    const itemCount = await referenceDataModel.countAllItems();
    const valueCount = await referenceDataModel.countAllValues();
    const releaseNoteCount = await referenceDataModel.countAllReleaseNotes();
    const restorePointCount = await referenceDataModel.countAllRestorePoints();
    
    // Render dashboard with metrics
    res.render('modules/reference-data/dashboard', {
      title: 'Reference Data Dashboard',
      metrics: {
        items: itemCount,
        values: valueCount,
        releaseNotes: releaseNoteCount,
        restorePoints: restorePointCount
      },
      user: req.user
    });
  } catch (error) {
    console.error('Error in reference data dashboard controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the reference data dashboard',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

// ===== Items Management =====

/**
 * List all reference data items
 */
exports.listItems = async (req, res) => {
  try {
    const items = await referenceDataModel.getAllItems(req.query);
    
    res.render('modules/reference-data/items/list', {
      title: 'Reference Data Items',
      items,
      filters: req.query,
      user: req.user
    });
  } catch (error) {
    console.error('Error in list items controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the items list',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Render new item form
 */
exports.newItemForm = async (req, res) => {
  try {
    res.render('modules/reference-data/items/new', {
      title: 'New Reference Data Item',
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  } catch (error) {
    console.error('Error in new item form controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the new item form',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Create a new reference data item
 */
exports.createItem = async (req, res) => {
  try {
    const item = await referenceDataModel.createItem(req.body);
    
    res.redirect(`/reference-data/items/${item.id}`);
  } catch (error) {
    console.error('Error in create item controller:', error);
    res.status(500).render('modules/reference-data/items/new', {
      title: 'New Reference Data Item',
      formData: req.body,
      error: 'Failed to create item',
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  }
};

/**
 * View a specific reference data item
 */
exports.viewItem = async (req, res) => {
  try {
    const item = await referenceDataModel.getItemById(req.params.id);
    
    if (!item) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'The requested item was not found',
        error: {},
        user: req.user
      });
    }
    
    // Get related values for this item
    const values = await referenceDataModel.getValuesByItemId(item.id);
    
    res.render('modules/reference-data/items/view', {
      title: `Item: ${item.name}`,
      item,
      values,
      user: req.user
    });
  } catch (error) {
    console.error('Error in view item controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the item details',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Render edit item form
 */
exports.editItemForm = async (req, res) => {
  try {
    const item = await itemsModel.getItemById(req.params.id);
    
    if (!item) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'The requested item was not found',
        error: {},
        user: req.user
      });
    }
    
    res.render('modules/reference-data/items/edit', {
      title: `Edit Item: ${item.name}`,
      item,
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  } catch (error) {
    console.error('Error in edit item form controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the edit item form',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Update a reference data item
 */
exports.updateItem = async (req, res) => {
  try {
    const item = await referenceDataModel.updateItem(req.params.id, req.body);
    
    res.redirect(`/reference-data/items/${item.id}`);
  } catch (error) {
    console.error('Error in update item controller:', error);
    res.status(500).render('modules/reference-data/items/edit', {
      title: 'Edit Reference Data Item',
      item: { id: req.params.id, ...req.body },
      error: 'Failed to update item',
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  }
};

/**
 * Confirm delete item
 */
exports.deleteItemConfirm = async (req, res) => {
  try {
    const item = await referenceDataModel.getItemById(req.params.id);
    
    if (!item) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'The requested item was not found',
        error: {},
        user: req.user
      });
    }
    
    res.render('modules/reference-data/items/delete-confirm', {
      title: `Delete Item: ${item.name}`,
      item,
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  } catch (error) {
    console.error('Error in delete item confirm controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the delete confirmation',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Delete a reference data item
 */
exports.deleteItem = async (req, res) => {
  try {
    await referenceDataModel.deleteItem(req.params.id);
    
    res.redirect('/reference-data/items');
  } catch (error) {
    console.error('Error in delete item controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while trying to delete the item',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

// Similar CRUD functions for Values, Release Notes, and Restore Points
// Abbreviated for brevity but would follow same pattern as Items above

exports.listValues = async (req, res) => {
  try {
    const values = await referenceDataModel.getAllValues(req.query);
    
    res.render('modules/reference-data/values/list', {
      title: 'Reference Data Values',
      values,
      filters: req.query,
      user: req.user
    });
  } catch (error) {
    console.error('Error in list values controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the values list',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

exports.newValueForm = async (req, res) => {
  try {
    // Get all items for the dropdown
    const items = await referenceDataModel.getAllItems();
    
    res.render('modules/reference-data/values/new', {
      title: 'New Reference Data Value',
      items,
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  } catch (error) {
    console.error('Error in new value form controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the new value form',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

exports.createValue = async (req, res) => {
  try {
    const value = await referenceDataModel.createValue(req.body);
    
    res.redirect(`/reference-data/values/${value.id}`);
  } catch (error) {
    console.error('Error in create value controller:', error);
    // Get all items for re-rendering the form
    const items = await referenceDataModel.getAllItems();
    
    res.status(500).render('modules/reference-data/values/new', {
      title: 'New Reference Data Value',
      items,
      formData: req.body,
      error: 'Failed to create value',
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  }
};

exports.viewValue = async (req, res) => {
  try {
    const value = await referenceDataModel.getValueById(req.params.id);
    
    if (!value) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'The requested value was not found',
        error: {},
        user: req.user
      });
    }
    
    // Get the parent item
    const item = value.itemId ? 
      await referenceDataModel.getItemById(value.itemId) : null;
    
    res.render('modules/reference-data/values/view', {
      title: `Value: ${value.name}`,
      value,
      item,
      user: req.user
    });
  } catch (error) {
    console.error('Error in view value controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the value details',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

exports.editValueForm = async (req, res) => {
  try {
    const value = await referenceDataModel.getValueById(req.params.id);
    
    if (!value) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'The requested value was not found',
        error: {},
        user: req.user
      });
    }
    
    // Get all items for the dropdown
    const items = await referenceDataModel.getAllItems();
    
    res.render('modules/reference-data/values/edit', {
      title: `Edit Value: ${value.name}`,
      value,
      items,
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  } catch (error) {
    console.error('Error in edit value form controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the edit form',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

exports.updateValue = async (req, res) => {
  try {
    const value = await referenceDataModel.updateValue(req.params.id, req.body);
    
    res.redirect(`/reference-data/values/${value.id}`);
  } catch (error) {
    console.error('Error in update value controller:', error);
    // Get all items for re-rendering the form
    const items = await referenceDataModel.getAllItems();
    
    res.status(500).render('modules/reference-data/values/edit', {
      title: 'Edit Reference Data Value',
      value: { id: req.params.id, ...req.body },
      items,
      error: 'Failed to update value',
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  }
};

exports.deleteValueConfirm = async (req, res) => {
  try {
    const value = await referenceDataModel.getValueById(req.params.id);
    
    if (!value) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'The requested value was not found',
        error: {},
        user: req.user
      });
    }
    
    res.render('modules/reference-data/values/delete-confirm', {
      title: `Delete Value: ${value.name}`,
      value,
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  } catch (error) {
    console.error('Error in delete value confirm controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the delete confirmation',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

exports.deleteValue = async (req, res) => {
  try {
    await referenceDataModel.deleteValue(req.params.id);
    
    res.redirect('/reference-data/values');
  } catch (error) {
    console.error('Error in delete value controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while trying to delete the value',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

// Release Notes functions

exports.listReleaseNotes = async (req, res) => {
  try {
    const releaseNotes = await referenceDataModel.getAllReleaseNotes(req.query);
    
    res.render('modules/reference-data/release-notes/list', {
      title: 'Release Notes',
      releaseNotes,
      filters: req.query,
      user: req.user
    });
  } catch (error) {
    console.error('Error in list release notes controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the release notes list',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

exports.newReleaseNoteForm = async (req, res) => {
  try {
    res.render('modules/reference-data/release-notes/new', {
      title: 'New Release Note',
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  } catch (error) {
    console.error('Error in new release note form controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the new release note form',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

exports.createReleaseNote = async (req, res) => {
  try {
    const releaseNote = await referenceDataModel.createReleaseNote({
      ...req.body,
      createdById: req.user ? req.user.id : null
    });
    
    res.redirect(`/reference-data/release-notes/${releaseNote.id}`);
  } catch (error) {
    console.error('Error in create release note controller:', error);
    res.status(500).render('modules/reference-data/release-notes/new', {
      title: 'New Release Note',
      formData: req.body,
      error: 'Failed to create release note',
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  }
};

exports.viewReleaseNote = async (req, res) => {
  try {
    const releaseNote = await referenceDataModel.getReleaseNoteById(req.params.id);
    
    if (!releaseNote) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'The requested release note was not found',
        error: {},
        user: req.user
      });
    }
    
    // Get the creator user if available
    let creator = null;
    if (releaseNote.createdById) {
      try {
        // If you have a user service, fetch the user here
        // creator = await userService.getUserById(releaseNote.createdById);
      } catch (error) {
        console.log('Error retrieving creator:', error.message);
      }
    }
    
    res.render('modules/reference-data/release-notes/view', {
      title: `Release Note: ${releaseNote.version}`,
      releaseNote,
      creator,
      user: req.user
    });
  } catch (error) {
    console.error('Error in view release note controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the release note details',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

exports.editReleaseNoteForm = async (req, res) => {
  try {
    const releaseNote = await referenceDataModel.getReleaseNoteById(req.params.id);
    
    if (!releaseNote) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'The requested release note was not found',
        error: {},
        user: req.user
      });
    }
    
    res.render('modules/reference-data/release-notes/edit', {
      title: `Edit Release Note: ${releaseNote.version}`,
      releaseNote,
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  } catch (error) {
    console.error('Error in edit release note form controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the edit form',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

exports.updateReleaseNote = async (req, res) => {
  try {
    const releaseNote = await referenceDataModel.updateReleaseNote(req.params.id, req.body);
    
    res.redirect(`/reference-data/release-notes/${releaseNote.id}`);
  } catch (error) {
    console.error('Error in update release note controller:', error);
    res.status(500).render('modules/reference-data/release-notes/edit', {
      title: 'Edit Release Note',
      releaseNote: { id: req.params.id, ...req.body },
      error: 'Failed to update release note',
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  }
};

// Restore Points functions

exports.listRestorePoints = async (req, res) => {
  try {
    const restorePoints = await referenceDataModel.getAllRestorePoints(req.query);
    
    res.render('modules/reference-data/restore-points/list', {
      title: 'Restore Points',
      restorePoints,
      filters: req.query,
      user: req.user
    });
  } catch (error) {
    console.error('Error in list restore points controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the restore points list',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

exports.createRestorePointForm = async (req, res) => {
  try {
    res.render('modules/reference-data/restore-points/new', {
      title: 'Create Restore Point',
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  } catch (error) {
    console.error('Error in create restore point form controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the create restore point form',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

exports.createRestorePoint = async (req, res) => {
  try {
    const restorePoint = await referenceDataModel.createRestorePoint({
      ...req.body,
      createdById: req.user ? req.user.id : null
    });
    
    res.redirect(`/reference-data/restore-points/${restorePoint.id}`);
  } catch (error) {
    console.error('Error in create restore point controller:', error);
    res.status(500).render('modules/reference-data/restore-points/new', {
      title: 'Create Restore Point',
      formData: req.body,
      error: 'Failed to create restore point',
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  }
};

exports.viewRestorePoint = async (req, res) => {
  try {
    const restorePoint = await referenceDataModel.getRestorePointById(req.params.id);
    
    if (!restorePoint) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'The requested restore point was not found',
        error: {},
        user: req.user
      });
    }
    
    // Get the creator user if available
    let creator = null;
    if (restorePoint.createdById) {
      try {
        // If you have a user service, fetch the user here
        // creator = await userService.getUserById(restorePoint.createdById);
      } catch (error) {
        console.log('Error retrieving creator:', error.message);
      }
    }
    
    res.render('modules/reference-data/restore-points/view', {
      title: `Restore Point: ${restorePoint.name || restorePoint.id}`,
      restorePoint,
      creator,
      user: req.user
    });
  } catch (error) {
    console.error('Error in view restore point controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the restore point details',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

exports.restoreConfirm = async (req, res) => {
  try {
    const restorePoint = await referenceDataModel.getRestorePointById(req.params.id);
    
    if (!restorePoint) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'The requested restore point was not found',
        error: {},
        user: req.user
      });
    }
    
    res.render('modules/reference-data/restore-points/restore-confirm', {
      title: `Restore Data: ${restorePoint.name || restorePoint.id}`,
      restorePoint,
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  } catch (error) {
    console.error('Error in restore confirm controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the restore confirmation',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

exports.restore = async (req, res) => {
  try {
    await referenceDataModel.restoreFromRestorePoint(req.params.id, {
      restoredById: req.user ? req.user.id : null,
      notes: req.body.notes
    });
    
    res.redirect('/reference-data');
  } catch (error) {
    console.error('Error in restore controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while trying to restore data',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};
