/**
 * Submissions routes – standalone namespace detached from BCR module
 */
const express = require('express');
const router = express.Router();
const submissionController = require('../controllers/submissionController');
const { csrfProtection, enhancedCsrfProtection } = require('../middleware/csrf');

// New submission
router.get('/new', enhancedCsrfProtection, submissionController.newForm);
router.post('/new', csrfProtection, submissionController.create);

// List & view
router.get('/', submissionController.list);
// legacy view path used in some templates
router.get('/view/:id', submissionController.view);
router.get('/view', (req,res)=> res.redirect('/submissions'));
// explicit details path (legacy links) – must be before generic :id
router.get('/:id/details', submissionController.details);
router.get('/:id', submissionController.view);

// Edit/update
router.get('/:id/edit', csrfProtection, submissionController.editForm);
router.post('/:id/edit', csrfProtection, submissionController.update);

// Delete
router.post('/:id/delete', csrfProtection, submissionController.delete);

module.exports = router;
