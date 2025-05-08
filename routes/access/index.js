/**
 * Access Management routes for RRDM application
 * Handles user authentication, registration, and management
 */
const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureAdmin, forwardAuthenticated } = require('../../middleware/auth');
const { authController, userController } = require('../../controllers/access');

// Authentication routes
router.get('/login', forwardAuthenticated, authController.showLoginForm);
router.post('/login', authController.processLogin);
router.get('/logout', authController.logout);

// User management routes (Admin only)
router.get('/manage', ensureAdmin, userController.listUsers);
router.get('/create', ensureAdmin, userController.showCreateUserForm);
router.post('/create', ensureAdmin, userController.createUser);
router.get('/user/:id', ensureAdmin, userController.viewUserDetails);
router.get('/edit/:id', ensureAdmin, userController.showEditUserForm);
router.post('/edit/:id', ensureAdmin, userController.updateUser);
router.get('/revoke/:id', ensureAdmin, userController.showRevokeAccessForm);
router.post('/revoke/:id', ensureAdmin, userController.revokeAccess);
router.get('/restore/:id', ensureAdmin, userController.showRestoreAccessForm);
router.post('/restore/:id', ensureAdmin, userController.restoreAccess);
router.get('/reset-password/:id', ensureAdmin, userController.showResetPasswordForm);
router.post('/reset-password/:id', ensureAdmin, userController.resetPassword);
router.get('/delete/:id', ensureAdmin, userController.showDeleteUserForm);
router.post('/delete/:id', ensureAdmin, userController.deleteUser);

module.exports = router;
