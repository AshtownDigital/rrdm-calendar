/**
 * Consolidated BCR Module Routes
 * All BCR management functionality using the consolidated controller
 */
const express = require('express');
const router = express.Router();
const { csrfProtection } = require('../../../middleware/csrf');
const bcrController = require('../../../controllers/consolidatedBcrController');

// === Dashboard Routes ===
router.get('/', (req, res) => {
  res.redirect('/bcr/dashboard');
});
router.get('/dashboard', bcrController.dashboard);

// === Submission Routes ===
router.get('/submissions', bcrController.listSubmissions);
router.get('/submissions/new', csrfProtection, bcrController.newSubmissionForm);
router.post('/submissions/new', csrfProtection, bcrController.createSubmission);
router.get('/submissions/:submissionId', bcrController.viewSubmission);

// === Impact Areas Routes ===
router.get('/impact-areas', bcrController.listImpactAreas);
router.get('/impact-areas/list', bcrController.listImpactAreas);
router.get('/impact-areas/new', csrfProtection, bcrController.newImpactAreaForm);
router.post('/impact-areas/new', csrfProtection, bcrController.createImpactArea);
router.get('/impact-areas/:impactAreaId/edit', csrfProtection, bcrController.editImpactAreaForm);
router.post('/impact-areas/:impactAreaId/edit', csrfProtection, bcrController.updateImpactArea);
router.get('/impact-areas/:impactAreaId/delete', csrfProtection, bcrController.deleteImpactAreaConfirm);
router.post('/impact-areas/:impactAreaId/delete', csrfProtection, bcrController.deleteImpactArea);

// === Workflow Routes ===
router.get('/workflow/phases', bcrController.listWorkflowPhases);

module.exports = router;
