/**
 * BCR Impact Area Controller
 * Handles all operations related to BCR impact areas
 */
// Using centralized Prisma client
const { BcrConfig } = require('../../models');
require('../../config/database.mongo');
// Prisma client is imported from centralized config
const { v4: uuidv4 } = require('uuid');
const bcrConfigService = require('../../services/bcrConfigService');

/**
 * List all impact areas
 */
const listImpactAreas = async (req, res) => {
  try {
    // Get all impact areas from the database
    const impactAreas = await bcrConfigService.getConfigsByType('impactArea');
    
    // Sort by display order
    impactAreas.sort((a, b) => a.displayOrder - b.displayOrder);
    
    // Get descriptions if they exist
    const descriptions = await bcrConfigService.getConfigsByType('impactArea_description');
    
    // Combine impact areas with their descriptions
    const impactAreasWithDescriptions = impactAreas.map(area => {
      const descriptionConfig = descriptions.find(desc => 
        desc.name === `description:${area.name}`
      );
      
      return {
        ...area,
        description: descriptionConfig ? descriptionConfig.value : ''
      };
    });
    
    // Render the list view
    res.render('modules/bcr/impact-areas/index', {
      title: 'BCR Impact Areas',
      impactAreas: impactAreasWithDescriptions,
      user: req.user
    });
  } catch (error) {
    console.error('Error listing impact areas:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load impact areas',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Show the create impact area form
 */
const showCreateForm = (req, res) => {
  res.render('modules/bcr/impact-areas/create', {
    title: 'Create Impact Area',
    user: req.user
  });
};

/**
 * Process the create impact area form
 */
const createImpactArea = async (req, res) => {
  try {
    const { name, description, displayOrder } = req.body;
    
    // Validate input
    if (!name) {
      return res.status(400).render('modules/bcr/impact-areas/create', {
        title: 'Create Impact Area',
        error: 'Impact area name is required',
        formData: req.body,
        user: req.user
      });
    }
    
    // Create the impact area
    const impactArea = await BcrConfig.create({
      type: 'impactArea',
      name,
      value: name,
      displayOrder: displayOrder ? parseInt(displayOrder, 10) : 0
    });
    
    // Create the description if provided
    if (description) {
      await BcrConfig.create({
        type: 'impactArea_description',
        name: `description:${name}`,
        value: description,
        displayOrder: displayOrder ? parseInt(displayOrder, 10) : 0
      });
    }
    
    // Store the impact area in session for the confirmation page
    req.session.createdImpactArea = {
      ...impactArea,
      description
    };
    
    // Redirect to confirmation page
    res.redirect('/bcr/impact-areas/create-confirmation');
  } catch (error) {
    console.error('Error creating impact area:', error);
    res.status(500).render('modules/bcr/impact-areas/create', {
      title: 'Create Impact Area',
      error: 'Failed to create impact area',
      formData: req.body,
      user: req.user
    });
  }
};

/**
 * Show the create impact area confirmation page
 */
const showCreateConfirmation = (req, res) => {
  // Get the created impact area from session
  const impactArea = req.session.createdImpactArea;
  
  if (!impactArea) {
    return res.redirect('/bcr/impact-areas');
  }
  
  // Clear the session
  delete req.session.createdImpactArea;
  
  // Render the confirmation page
  res.render('modules/bcr/impact-areas/create-confirmation', {
    title: 'Impact Area Created',
    impactArea,
    user: req.user
  });
};

/**
 * Show the edit impact area form
 */
const showEditForm = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the impact area
    const impactArea = await bcrConfigService.getConfigById(id);
    
    if (!impactArea) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Impact area not found',
        user: req.user
      });
    }
    
    // Get the description if it exists
    const descriptions = await bcrConfigService.getConfigsByType('impactArea_description');
    const descriptionConfig = descriptions.find(desc => 
      desc.name === `description:${impactArea.name}`
    );
    
    // Combine impact area with its description
    const impactAreaWithDescription = {
      ...impactArea,
      description: descriptionConfig ? descriptionConfig.value : ''
    };
    
    // Render the edit form
    res.render('modules/bcr/impact-areas/edit', {
      title: 'Edit Impact Area',
      impactArea: impactAreaWithDescription,
      user: req.user
    });
  } catch (error) {
    console.error('Error loading edit form:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load edit form',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Process the edit impact area form
 */
const updateImpactArea = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, displayOrder } = req.body;
    
    // Validate input
    if (!name) {
      return res.status(400).render('modules/bcr/impact-areas/edit', {
        title: 'Edit Impact Area',
        error: 'Impact area name is required',
        impactArea: { id, name, description, displayOrder },
        user: req.user
      });
    }
    
    // Get the current impact area
    const currentImpactArea = await bcrConfigService.getConfigById(id);
    
    if (!currentImpactArea) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Impact area not found',
        user: req.user
      });
    }
    
    // Update the impact area
    const updatedImpactArea = await bcrConfigService.updateConfig(id, {
      type: 'impactArea',
      name,
      value: name,
      displayOrder: displayOrder ? parseInt(displayOrder, 10) : 0
    });
    
    // Get the description if it exists
    const descriptions = await bcrConfigService.getConfigsByType('impactArea_description');
    const descriptionConfig = descriptions.find(desc => 
      desc.name === `description:${currentImpactArea.name}`
    );
    
    // Update or create the description
    if (descriptionConfig) {
      // Update the description name if the impact area name changed
      const descriptionName = `description:${name}`;
      await bcrConfigService.updateConfig(descriptionConfig.id, {
        type: 'impactArea_description',
        name: descriptionName,
        value: description,
        displayOrder: displayOrder ? parseInt(displayOrder, 10) : 0
      });
    } else if (description) {
      // Create a new description if it doesn't exist
      await bcrConfigService.createConfig({
        type: 'impactArea_description',
        name: `description:${name}`,
        value: description,
        displayOrder: displayOrder ? parseInt(displayOrder, 10) : 0
      });
    }
    
    // Store the updated impact area in session for the confirmation page
    req.session.updatedImpactArea = {
      ...updatedImpactArea,
      description
    };
    
    // Redirect to confirmation page
    res.redirect('/bcr/impact-areas/edit-confirmation');
  } catch (error) {
    console.error('Error updating impact area:', error);
    res.status(500).render('modules/bcr/impact-areas/edit', {
      title: 'Edit Impact Area',
      error: 'Failed to update impact area',
      impactArea: req.body,
      user: req.user
    });
  }
};

/**
 * Show the edit impact area confirmation page
 */
const showEditConfirmation = (req, res) => {
  // Get the updated impact area from session
  const impactArea = req.session.updatedImpactArea;
  
  if (!impactArea) {
    return res.redirect('/bcr/impact-areas');
  }
  
  // Clear the session
  delete req.session.updatedImpactArea;
  
  // Render the confirmation page
  res.render('modules/bcr/impact-areas/edit-confirmation', {
    title: 'Impact Area Updated',
    impactArea,
    user: req.user
  });
};

/**
 * Show the delete impact area warning page
 */
const showDeleteWarning = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the impact area
    const impactArea = await bcrConfigService.getConfigById(id);
    
    if (!impactArea) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Impact area not found',
        user: req.user
      });
    }
    
    // Get the description if it exists
    const descriptions = await bcrConfigService.getConfigsByType('impactArea_description');
    const descriptionConfig = descriptions.find(desc => 
      desc.name === `description:${impactArea.name}`
    );
    
    // Combine impact area with its description
    const impactAreaWithDescription = {
      ...impactArea,
      description: descriptionConfig ? descriptionConfig.value : ''
    };
    
    // Render the delete warning page
    res.render('modules/bcr/impact-areas/delete-warning', {
      title: 'Delete Impact Area',
      impactArea: impactAreaWithDescription,
      user: req.user
    });
  } catch (error) {
    console.error('Error loading delete warning:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load delete warning',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Process the delete impact area request
 */
const deleteImpactArea = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the impact area
    const impactArea = await bcrConfigService.getConfigById(id);
    
    if (!impactArea) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Impact area not found',
        user: req.user
      });
    }
    
    // Get the description if it exists
    const descriptions = await bcrConfigService.getConfigsByType('impactArea_description');
    const descriptionConfig = descriptions.find(desc => 
      desc.name === `description:${impactArea.name}`
    );
    
    // Store the impact area in session for the confirmation page
    req.session.deletedImpactArea = {
      ...impactArea,
      description: descriptionConfig ? descriptionConfig.value : ''
    };
    
    // Delete the impact area
    await bcrConfigService.deleteConfig(id);
    
    // Delete the description if it exists
    if (descriptionConfig) {
      await bcrConfigService.deleteConfig(descriptionConfig.id);
    }
    
    // Redirect to confirmation page
    res.redirect('/bcr/impact-areas/delete-confirmation');
  } catch (error) {
    console.error('Error deleting impact area:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to delete impact area',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Show the delete impact area confirmation page
 */
const showDeleteConfirmation = (req, res) => {
  // Get the deleted impact area from session
  const impactArea = req.session.deletedImpactArea;
  
  if (!impactArea) {
    return res.redirect('/bcr/impact-areas');
  }
  
  // Clear the session
  delete req.session.deletedImpactArea;
  
  // Render the confirmation page
  res.render('modules/bcr/impact-areas/delete-confirmation', {
    title: 'Impact Area Deleted',
    impactArea,
    user: req.user
  });
};

module.exports = {
  listImpactAreas,
  showCreateForm,
  createImpactArea,
  showCreateConfirmation,
  showEditForm,
  updateImpactArea,
  showEditConfirmation,
  showDeleteWarning,
  deleteImpactArea,
  showDeleteConfirmation
};
