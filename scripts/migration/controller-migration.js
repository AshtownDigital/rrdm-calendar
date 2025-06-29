/**
 * BCR Controller Migration Script
 * 
 * This script helps with the gradual migration from the monolithic controller
 * to the modular controllers. It identifies which routes need to be updated
 * and provides a way to switch between old and new implementations.
 */

const fs = require('fs');
const path = require('path');
const express = require('express');
const { createModuleLogger } = require('../../services/shared/loggerService');

// Create logger for migration script
const logger = createModuleLogger('controllerMigration');

// Path to the monolithic controller
const monolithicControllerPath = path.join(__dirname, '../../controllers/modules/bcr/controller.js');

// Path to the modular controllers
const modularControllersDir = path.join(__dirname, '../../controllers/modules/bcr/modular');

// Function to extract route handlers from the monolithic controller
function extractRouteHandlers() {
  try {
    // Load the monolithic controller
    const controller = require(monolithicControllerPath);
    
    // Get all exported functions (route handlers)
    const handlers = Object.keys(controller);
    
    logger.info(`Found ${handlers.length} route handlers in monolithic controller`);
    return handlers;
  } catch (error) {
    logger.error('Error extracting route handlers', error);
    return [];
  }
}

// Function to check which handlers have been migrated to modular controllers
function checkMigratedHandlers() {
  try {
    // Get all handlers from the monolithic controller
    const monolithicHandlers = extractRouteHandlers();
    
    // Load all modular controllers
    const modularControllers = {};
    const modularIndex = require(path.join(modularControllersDir, 'index.js'));
    
    // Collect all handlers from modular controllers
    const migratedHandlers = [];
    
    // Check each controller in the index
    Object.keys(modularIndex).forEach(controllerName => {
      const controller = modularIndex[controllerName];
      const handlers = Object.keys(controller);
      
      handlers.forEach(handler => {
        migratedHandlers.push(handler);
      });
    });
    
    // Find handlers that haven't been migrated yet
    const pendingHandlers = monolithicHandlers.filter(handler => !migratedHandlers.includes(handler));
    
    logger.info(`Migration status: ${migratedHandlers.length} of ${monolithicHandlers.length} handlers migrated`);
    logger.info(`Pending handlers: ${pendingHandlers.join(', ')}`);
    
    return {
      total: monolithicHandlers.length,
      migrated: migratedHandlers,
      pending: pendingHandlers
    };
  } catch (error) {
    logger.error('Error checking migrated handlers', error);
    return {
      total: 0,
      migrated: [],
      pending: []
    };
  }
}

// Function to create a router that can switch between old and new implementations
function createMigrationRouter(useModular = false) {
  const router = express.Router();
  
  try {
    // Load controllers
    const monolithicController = require(monolithicControllerPath);
    const modularControllers = require(path.join(modularControllersDir, 'index.js'));
    
    // Get migration status
    const migrationStatus = checkMigratedHandlers();
    
    // Create route mappings
    const routeMappings = [
      // Dashboard routes
      { path: '/', method: 'get', handler: 'dashboard', modularController: 'dashboardController' },
      { path: '/dashboard', method: 'get', handler: 'dashboard', modularController: 'dashboardController' },
      { path: '/statistics', method: 'get', handler: 'statistics', modularController: 'dashboardController' },
      
      // Workflow routes
      { path: '/workflow', method: 'get', handler: 'showWorkflow', modularController: 'workflowController' },
      { path: '/workflow-progress/:id', method: 'get', handler: 'viewWorkflowProgress', modularController: 'workflowController' },
      { path: '/workflow-progress/:id', method: 'post', handler: 'updateWorkflowStatus', modularController: 'workflowController' },
      
      // Submission routes
      { path: '/submissions/new', method: 'get', handler: 'newSubmissionForm', modularController: 'submissionController' },
      { path: '/submissions/new', method: 'post', handler: 'createSubmission', modularController: 'submissionController' },
      { path: '/submissions', method: 'get', handler: 'listSubmissions', modularController: 'submissionController' },
      { path: '/submissions/:id', method: 'get', handler: 'viewSubmission', modularController: 'submissionController' },
      { path: '/submissions/:id/edit', method: 'get', handler: 'editSubmissionForm', modularController: 'submissionController' },
      { path: '/submissions/:id/edit', method: 'post', handler: 'updateSubmission', modularController: 'submissionController' },
      
      // BCR routes
      { path: '/bcrs', method: 'get', handler: 'listApprovedBcrs', modularController: 'bcrController' },
      { path: '/bcrs/:id', method: 'get', handler: 'viewBcr', modularController: 'bcrController' }
    ];
    
    // Set up routes
    routeMappings.forEach(route => {
      // Check if the handler has been migrated
      const isMigrated = migrationStatus.migrated.includes(route.handler);
      
      // Determine which controller to use
      let handler;
      if (useModular && isMigrated) {
        // Use modular controller if available and enabled
        const modularController = modularControllers[route.modularController];
        handler = modularController[route.handler];
        logger.debug(`Using modular controller for ${route.method.toUpperCase()} ${route.path} -> ${route.modularController}.${route.handler}`);
      } else {
        // Fall back to monolithic controller
        handler = monolithicController[route.handler];
        logger.debug(`Using monolithic controller for ${route.method.toUpperCase()} ${route.path} -> ${route.handler}`);
      }
      
      // Add the route to the router
      if (handler) {
        router[route.method](route.path, handler);
      } else {
        logger.warn(`Handler not found for ${route.method.toUpperCase()} ${route.path}`);
      }
    });
    
    logger.info(`Migration router created with ${routeMappings.length} routes`);
    return router;
  } catch (error) {
    logger.error('Error creating migration router', error);
    return router;
  }
}

// Export functions
module.exports = {
  extractRouteHandlers,
  checkMigratedHandlers,
  createMigrationRouter
};
