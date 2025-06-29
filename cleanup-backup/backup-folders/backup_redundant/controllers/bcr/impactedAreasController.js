/**
 * Impacted Areas Controller
 * Handles management of BCR impact areas
 */
// Using centralized Prisma client
const { Bcr } = require('../../models');
require('../../config/database.mongo');
const { validate: isUuid } = require('uuid');
// Prisma client is imported from centralized config
const bcrConfigService = require('../../services/bcrConfigService');

/**
 * Render an error page with consistent formatting
 */
function renderError(res, { status = 500, title = 'Error', message = 'An error occurred', error = {}, user = null }) {
  return res.status(status).render('error', {
    title,
    message,
    error: process.env.NODE_ENV === 'development' ? error : {},
    user
  });
}

/**
 * List all impact areas
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function listAreas(req, res) {
  try {
    // Get all impact areas
    const impactAreas = await bcrConfigService.getConfigsByType('impact_area');
    
    // Sort by display order
    impactAreas.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    
    // Render the list page
    res.render('modules/bcr/impact-areas/list.njk', {
      title: 'Impact Areas',
      impactAreas,
      user: req.user
    });
  } catch (error) {
    console.error('Error in listAreas:', error);
    renderError(res, {
      status: 500,
      title: 'Error',
      message: `Failed to list impact areas: ${error.message}`,
      error,
      user: req.user
    });
  }
}

/**
 * Display form to create a new impact area
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function newAreaForm(req, res) {
  try {
    // Render the new area form
    res.render('modules/bcr/impact-areas/new.njk', {
      title: 'New Impact Area',
      user: req.user
    });
  } catch (error) {
    console.error('Error in newAreaForm:', error);
    renderError(res, {
      status: 500,
      title: 'Error',
      message: `Failed to load new impact area form: ${error.message}`,
      error,
      user: req.user
    });
  }
}

/**
 * Create a new impact area
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function createArea(req, res) {
  try {
    // Extract form data
    const { name, description, displayOrder } = req.body;
    
    // Validate required fields
    if (!name) {
      req.flash('error', 'Name is required');
      return res.redirect('/bcr/impacted-areas/new');
    }
    
    // Create a value from the name (lowercase, spaces to underscores)
    const value = name.toLowerCase().replace(/\s+/g, '_');
    
    // Create the impact area
    await bcrConfigService.createConfig({
      type: 'impact_area',
      name,
      value,
      description,
      displayOrder: displayOrder ? parseInt(displayOrder, 10) : null,
      createdBy: req.user.id
    });
    
    // Redirect to the list page with success message
    req.flash('success', `Impact area "${name}" created successfully`);
    res.redirect('/bcr/impacted-areas');
  } catch (error) {
    console.error('Error in createArea:', error);
    req.flash('error', `Failed to create impact area: ${error.message}`);
    res.redirect('/bcr/impacted-areas/new');
  }
}

/**
 * Display form to edit an impact area
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function editAreaForm(req, res) {
  try {
    const areaId = req.params.id;
    
    // Validate ID format
    if (!isUuid(areaId)) {
      return renderError(res, {
        status: 400,
        title: 'Invalid ID Format',
        message: 'The provided ID is not in a valid format',
        user: req.user
      });
    }
    
    // Get the impact area
    const impactArea = await bcrConfigService.getConfigById(areaId);
    
    if (!impactArea) {
      return renderError(res, {
        status: 404,
        title: 'Not Found',
        message: `Impact area with ID ${areaId} not found`,
        user: req.user
      });
    }
    
    // Render the edit form
    res.render('modules/bcr/impact-areas/edit.njk', {
      title: `Edit Impact Area: ${impactArea.name}`,
      impactArea,
      user: req.user
    });
  } catch (error) {
    console.error('Error in editAreaForm:', error);
    renderError(res, {
      status: 500,
      title: 'Error',
      message: `Failed to load edit form: ${error.message}`,
      error,
      user: req.user
    });
  }
}

/**
 * Update an impact area
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function updateArea(req, res) {
  try {
    const areaId = req.params.id;
    
    // Validate ID format
    if (!isUuid(areaId)) {
      return renderError(res, {
        status: 400,
        title: 'Invalid ID Format',
        message: 'The provided ID is not in a valid format',
        user: req.user
      });
    }
    
    // Extract form data
    const { name, description, displayOrder } = req.body;
    
    // Validate required fields
    if (!name) {
      req.flash('error', 'Name is required');
      return res.redirect(`/bcr/impacted-areas/${areaId}/edit`);
    }
    
    // Update the impact area
    await bcrConfigService.updateConfig(areaId, {
      name,
      description,
      displayOrder: displayOrder ? parseInt(displayOrder, 10) : null,
      updatedBy: req.user.id,
      updatedAt: new Date()
    });
    
    // Redirect to the list page with success message
    req.flash('success', `Impact area "${name}" updated successfully`);
    res.redirect('/bcr/impacted-areas');
  } catch (error) {
    console.error('Error in updateArea:', error);
    req.flash('error', `Failed to update impact area: ${error.message}`);
    res.redirect(`/bcr/impacted-areas/${req.params.id}/edit`);
  }
}

/**
 * Delete an impact area
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function deleteArea(req, res) {
  try {
    const areaId = req.params.id;
    
    // Validate ID format
    if (!isUuid(areaId)) {
      return renderError(res, {
        status: 400,
        title: 'Invalid ID Format',
        message: 'The provided ID is not in a valid format',
        user: req.user
      });
    }
    
    try {
      // Check if the impact area is in use
      const bcrsUsingArea = await Bcr.countDocuments({
        impactAreas: areaId
      });
      
      if (bcrsUsingArea > 0) {
        req.flash('error', `Cannot delete impact area: it is used by ${bcrsUsingArea} BCRs`);
        return res.redirect('/bcr/impacted-areas');
      }
      
      // Get the impact area name for the success message
      const impactArea = await bcrConfigService.getConfigById(areaId);
      
      // Delete the impact area
      await bcrConfigService.deleteConfig(areaId);
      
      req.flash('success', `Impact area ${impactArea.name} deleted successfully`);
      res.redirect('/bcr/impacted-areas');
    } catch (error) {
      console.error('Error deleting impact area:', error);
      req.flash('error', 'Failed to delete impact area');
      res.redirect('/bcr/impacted-areas');
    }
  } catch (error) {
    console.error('Error in deleteArea:', error);
    req.flash('error', `Failed to delete impact area: ${error.message}`);
    res.redirect('/bcr/impacted-areas');
  }
}

module.exports = {
  listAreas,
  newAreaForm,
  createArea,
  editAreaForm,
  updateArea,
  deleteArea
};
