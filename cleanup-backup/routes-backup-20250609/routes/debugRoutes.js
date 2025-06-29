const express = require('express');
const router = express.Router();
const debugController = require('../controllers/debugController');

// Debug routes - no authentication required for testing
router.get('/status', debugController.getDiagnostics);
router.get('/calendar-test', debugController.testCalendarRender);
router.get('/simple-calendar', debugController.simpleCalendarPage);

module.exports = router;
