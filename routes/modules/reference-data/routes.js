/**
 * Reference Data Module Routes
 * Consolidated routes for all reference data management functionality
 */
const express = require('express');
const router = express.Router();
const { csrfProtection } = require('../../../middleware/csrf');

// Create sub-routers for different reference data sections
const itemsRouter = express.Router();
const valuesRouter = express.Router();
const releaseNotesRouter = express.Router();
const restorePointsRouter = express.Router();

// Import modularized controller
const refDataController = require('../../../controllers/modules/reference-data/controller');

// Main reference data dashboard
router.get('/', refDataController.dashboard);

// Items routes
itemsRouter.get('/', refDataController.listItems);
itemsRouter.get('/new', csrfProtection, refDataController.newItemForm);
itemsRouter.post('/new', csrfProtection, refDataController.createItem);
itemsRouter.get('/:id', refDataController.viewItem);
itemsRouter.get('/:id/edit', csrfProtection, refDataController.editItemForm);
itemsRouter.post('/:id/edit', csrfProtection, refDataController.updateItem);
itemsRouter.get('/:id/delete', csrfProtection, refDataController.deleteItemConfirm);
itemsRouter.post('/:id/delete', csrfProtection, refDataController.deleteItem);

// Values routes
valuesRouter.get('/', refDataController.listValues);
valuesRouter.get('/new', csrfProtection, refDataController.newValueForm);
valuesRouter.post('/new', csrfProtection, refDataController.createValue);
valuesRouter.get('/:id', refDataController.viewValue);
valuesRouter.get('/:id/edit', csrfProtection, refDataController.editValueForm);
valuesRouter.post('/:id/edit', csrfProtection, refDataController.updateValue);
valuesRouter.get('/:id/delete', csrfProtection, refDataController.deleteValueConfirm);
valuesRouter.post('/:id/delete', csrfProtection, refDataController.deleteValue);

// Release notes routes
releaseNotesRouter.get('/', refDataController.listReleaseNotes);
releaseNotesRouter.get('/new', csrfProtection, refDataController.newReleaseNoteForm);
releaseNotesRouter.post('/new', csrfProtection, refDataController.createReleaseNote);
releaseNotesRouter.get('/:id', refDataController.viewReleaseNote);
releaseNotesRouter.get('/:id/edit', csrfProtection, refDataController.editReleaseNoteForm);
releaseNotesRouter.post('/:id/edit', csrfProtection, refDataController.updateReleaseNote);

// Restore points routes
restorePointsRouter.get('/', refDataController.listRestorePoints);
restorePointsRouter.get('/new', csrfProtection, refDataController.createRestorePointForm);
restorePointsRouter.post('/new', csrfProtection, refDataController.createRestorePoint);
restorePointsRouter.get('/:id', refDataController.viewRestorePoint);
restorePointsRouter.get('/:id/restore', csrfProtection, refDataController.restoreConfirm);
restorePointsRouter.post('/:id/restore', csrfProtection, refDataController.restore);

// Mount sub-routers
router.use('/items', itemsRouter);
router.use('/values', valuesRouter);
router.use('/release-notes', releaseNotesRouter);
router.use('/restore-points', restorePointsRouter);

module.exports = router;
