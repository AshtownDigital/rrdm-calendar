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
const analysisRouter = express.Router();

// Import reference data controller
const refDataController = require('../../../controllers/referenceDataController');

// Main reference data landing page
router.get('/', (req,res)=> res.render('reference-data/index.njk'));

// Items routes
itemsRouter.get('/', refDataController.listItems);
itemsRouter.get('/new', csrfProtection, refDataController.newItemForm);
itemsRouter.post('/new', csrfProtection, refDataController.createItem);
itemsRouter.get('/ref-item/:refItemId', refDataController.viewItem);
itemsRouter.get('/ref-item/:refItemId/edit', csrfProtection, refDataController.editItemForm);
itemsRouter.post('/ref-item/:refItemId/edit', csrfProtection, refDataController.updateItem);
itemsRouter.get('/ref-item/:refItemId/delete', csrfProtection, refDataController.deleteItemConfirm);
itemsRouter.post('/ref-item/:refItemId/delete', csrfProtection, refDataController.deleteItem);

// Values routes
valuesRouter.get('/', refDataController.listValues);
valuesRouter.get('/new', csrfProtection, refDataController.newValueForm);
valuesRouter.post('/new', csrfProtection, refDataController.createValue);
valuesRouter.get('/ref-value/:refValueId', refDataController.viewValue);
valuesRouter.get('/ref-value/:refValueId/edit', csrfProtection, refDataController.editValueForm);
valuesRouter.post('/ref-value/:refValueId/edit', csrfProtection, refDataController.updateValue);
valuesRouter.get('/ref-value/:refValueId/delete', csrfProtection, refDataController.deleteValueConfirm);
valuesRouter.post('/ref-value/:refValueId/delete', csrfProtection, refDataController.deleteValue);

// Release notes routes
releaseNotesRouter.get('/', refDataController.listReleaseNotes);
releaseNotesRouter.get('/new', csrfProtection, refDataController.newReleaseNoteForm);
releaseNotesRouter.post('/new', csrfProtection, refDataController.createReleaseNote);
releaseNotesRouter.get('/note/:refNoteId', refDataController.viewReleaseNote);
releaseNotesRouter.get('/note/:refNoteId/edit', csrfProtection, refDataController.editReleaseNoteForm);
releaseNotesRouter.post('/note/:refNoteId/edit', csrfProtection, refDataController.updateReleaseNote);

// Restore points routes
restorePointsRouter.get('/', refDataController.listRestorePoints);
restorePointsRouter.get('/new', csrfProtection, refDataController.createRestorePointForm);
restorePointsRouter.post('/new', csrfProtection, refDataController.createRestorePoint);
restorePointsRouter.get('/restore-point/:refRestorePointId', refDataController.viewRestorePoint);
restorePointsRouter.get('/restore-point/:refRestorePointId/restore', csrfProtection, refDataController.restoreConfirm);
restorePointsRouter.post('/restore-point/:refRestorePointId/restore', csrfProtection, refDataController.restore);

// Analysis route
// Landing page
analysisRouter.get('/', (req,res)=> res.render('reference-data/index.njk'));

analysisRouter.get('/analysisstructure', require('../../../controllers/referenceAnalysisController').structure);
analysisRouter.get('/dashboard', require('../../../controllers/referenceAnalysisController').structure);
analysisRouter.get('/analysis/:alignment', require('../../../controllers/referenceAnalysisController').analysisByAlignment);
analysisRouter.get('/directory', require('../../../controllers/referenceAnalysisController').directory);
analysisRouter.get('/field-mapping', require('../../../controllers/referenceAnalysisController').fieldMapping);
analysisRouter.get('/export-directory/select', csrfProtection, require('../../../controllers/referenceAnalysisController').exportDirectorySelect);
analysisRouter.post('/export-directory/confirm', csrfProtection, require('../../../controllers/referenceAnalysisController').exportDirectoryConfirm);
analysisRouter.post('/export-directory/ready', csrfProtection, require('../../../controllers/referenceAnalysisController').exportDirectoryReady);
analysisRouter.post('/export-directory/download', csrfProtection, require('../../../controllers/referenceAnalysisController').exportDirectoryDownload);

// Mount sub-routers
router.use('/items', itemsRouter);
router.use('/values', valuesRouter);
router.use('/release-notes', releaseNotesRouter);
router.use('/restore-points', restorePointsRouter);
router.use('/', analysisRouter);

module.exports = router;
