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


// Accept both legacy /view/:id and new /:id paths
router.get('/submissions/view/:submissionId', bcrController.viewSubmission);
router.get('/submissions/:submissionId', bcrController.viewSubmission);
// Edit / Update
router.get('/submissions/:submissionId/edit', csrfProtection, bcrController.editSubmissionForm);
router.post('/submissions/:submissionId/edit', csrfProtection, bcrController.updateSubmission);
// Delete confirmation and action (accept alternate path for backward compatibility)
router.get('/submissions/delete/:submissionId', csrfProtection, bcrController.deleteSubmissionConfirm);
router.get('/submissions/:submissionId/delete', csrfProtection, bcrController.deleteSubmissionConfirm);
router.post('/submissions/delete/:submissionId', csrfProtection, bcrController.deleteSubmission);
router.post('/submissions/:submissionId/delete', csrfProtection, bcrController.deleteSubmission);

// === Impact Areas Routes ===
router.get('/impact-areas', bcrController.listImpactAreas);
router.get('/impact-areas/list', bcrController.listImpactAreas);
router.get('/impact-areas/new', csrfProtection, bcrController.newImpactAreaForm);
router.post('/impact-areas/new', csrfProtection, bcrController.createImpactArea);
router.get('/impact-areas/:impactAreaId/edit', csrfProtection, bcrController.editImpactAreaForm);
router.post('/impact-areas/:impactAreaId/edit', csrfProtection, bcrController.updateImpactArea);
// Accept both /impact-areas/:id/delete and /impact-areas/delete/:id for backward compatibility
router.get('/impact-areas/delete/:impactAreaId', csrfProtection, bcrController.deleteImpactAreaConfirm);
router.get('/impact-areas/:impactAreaId/delete', csrfProtection, bcrController.deleteImpactAreaConfirm);
router.post('/impact-areas/delete/:impactAreaId', csrfProtection, bcrController.deleteImpactArea);
router.post('/impact-areas/:impactAreaId/delete', csrfProtection, bcrController.deleteImpactArea);

// === Workflow Routes ===
router.get('/workflow/phases', bcrController.listWorkflowPhases);

module.exports = router;
