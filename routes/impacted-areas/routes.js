/**
 * Impacted Areas Routes
 * Handles routes for impacted areas management
 */
const express = require('express');
const router = express.Router();
const impactedAreasController = require('../../controllers/impacted-areas/controller');
const csrfProtection = require('../../middleware/csrf');

// List all impacted areas
router.get('/', impactedAreasController.list);

// Show create form
router.get('/new', impactedAreasController.newForm);

// Create new impacted area
router.post('/', csrfProtection, impactedAreasController.create);

// Show edit form
router.get('/:id/edit', impactedAreasController.editForm);

// Submit updates
router.post('/:id/update', csrfProtection, impactedAreasController.update);

// Delete an impacted area
router.post('/:id/delete', csrfProtection, impactedAreasController.delete);

module.exports = router;
