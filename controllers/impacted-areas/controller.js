/**
 * Impacted Areas Controller
 * Handles CRUD operations for impacted areas
 */
const impactedAreasModel = require('../../models/impacted-areas/model');

/**
 * List all impacted areas
 * @param {import('express').Request} req 
 * @param {import('express').Response} res 
 */
const list = async (req, res) => {
  try {
    // Get all impacted areas
    const impactedAreas = await impactedAreasModel.getAllImpactedAreas();
    
    // Render the list view
    res.render('impacted-areas/list', {
      title: 'Impacted Areas',
      areas: impactedAreas, // Use the correct variable name expected by the template
      user: req.user
    });
  } catch (error) {
    console.error('Error listing impacted areas:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while listing impacted areas',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Show the form to create a new impacted area
 * @param {import('express').Request} req 
 * @param {import('express').Response} res 
 */
const newForm = async (req, res) => {
  try {
    // Get all impacted areas to determine next order value
    const impactedAreas = await impactedAreasModel.getAllImpactedAreas();
    const nextOrder = impactedAreas.length > 0 
      ? Math.max(...impactedAreas.map(area => area.displayOrder)) + 10 
      : 10;
    
    // Render the new form
    res.render('impacted-areas/new', {
      title: 'New Impacted Area',
      nextOrder,
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  } catch (error) {
    console.error('Error showing new impacted area form:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the form',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Create a new impacted area
 * @param {import('express').Request} req 
 * @param {import('express').Response} res 
 */
const create = async (req, res) => {
  try {
    // Extract area data from request body
    const areaData = {
      name: req.body.name,
      description: req.body.description,
      order: parseInt(req.body.order, 10)
    };
    
    // Create the impacted area
    const impactedArea = await impactedAreasModel.createImpactedArea(areaData);
    
    // Render confirmation page
    res.render('impacted-areas/confirm', {
      title: 'Impacted Area Created',
      message: `Impacted area "${impactedArea.name}" has been created`,
      impactedArea,
      user: req.user
    });
  } catch (error) {
    console.error('Error creating impacted area:', error);
    
    // Get all impacted areas to determine next order value
    const impactedAreas = await impactedAreasModel.getAllImpactedAreas();
    const nextOrder = impactedAreas.length > 0 
      ? Math.max(...impactedAreas.map(area => area.displayOrder)) + 10 
      : 10;
    
    // Re-render the form with error
    res.status(400).render('impacted-areas/new', {
      title: 'New Impacted Area',
      nextOrder,
      formData: req.body,
      error: error.message,
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  }
};

/**
 * Show the form to edit an impacted area
 * @param {import('express').Request} req 
 * @param {import('express').Response} res 
 */
const editForm = async (req, res) => {
  try {
    const areaId = req.params.id;
    
    // Get the impacted area
    const impactedArea = await impactedAreasModel.getImpactedAreaById(areaId);
    
    if (!impactedArea) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Impacted area not found',
        error: {},
        user: req.user
      });
    }
    
    // Render the edit form
    res.render('impacted-areas/edit', {
      title: `Edit Impacted Area: ${impactedArea.name}`,
      impactedArea,
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  } catch (error) {
    console.error('Error showing edit impacted area form:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the edit form',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Update an impacted area
 * @param {import('express').Request} req 
 * @param {import('express').Response} res 
 */
const update = async (req, res) => {
  try {
    const areaId = req.params.id;
    
    // Extract area data from request body
    const areaData = {
      name: req.body.name,
      description: req.body.description,
      order: parseInt(req.body.order, 10)
    };
    
    // Get the current impacted area
    const currentArea = await impactedAreasModel.getImpactedAreaById(areaId);
    
    if (!currentArea) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Impacted area not found',
        error: {},
        user: req.user
      });
    }
    
    // Update the impacted area
    const updatedArea = await impactedAreasModel.updateImpactedArea(areaId, areaData);
    
    // Render confirmation page
    res.render('impacted-areas/confirm', {
      title: 'Impacted Area Updated',
      message: `Impacted area "${updatedArea.name}" has been updated`,
      impactedArea: updatedArea,
      user: req.user
    });
  } catch (error) {
    console.error('Error updating impacted area:', error);
    
    // Re-render the edit form with error
    res.status(400).render('impacted-areas/edit', {
      title: 'Edit Impacted Area',
      impactedArea: {
        id: req.params.id,
        ...req.body,
        displayOrder: parseInt(req.body.order, 10)
      },
      error: error.message,
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  }
};

/**
 * Delete an impacted area
 * @param {import('express').Request} req 
 * @param {import('express').Response} res 
 */
const deleteArea = async (req, res) => {
  try {
    const areaId = req.params.id;
    
    // Get the impacted area
    const impactedArea = await impactedAreasModel.getImpactedAreaById(areaId);
    
    if (!impactedArea) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Impacted area not found',
        error: {},
        user: req.user
      });
    }
    
    // Store the name for the confirmation message
    const areaName = impactedArea.name;
    
    try {
      // Try to delete the impacted area
      await impactedAreasModel.deleteImpactedArea(areaId);
      
      // Render confirmation page
      res.render('impacted-areas/confirm', {
        title: 'Impacted Area Deleted',
        message: `Impacted area "${areaName}" has been deleted`,
        user: req.user
      });
    } catch (deleteError) {
      // If deletion fails (e.g., area is in use), show warning
      res.status(400).render('impacted-areas/warning', {
        title: 'Cannot Delete Impacted Area',
        message: deleteError.message,
        impactedArea,
        user: req.user
      });
    }
  } catch (error) {
    console.error('Error deleting impacted area:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while deleting the impacted area',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

module.exports = {
  list,
  newForm,
  create,
  editForm,
  update,
  delete: deleteArea
};
