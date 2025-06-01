/**
 * Access Management Module Routes
 * Handles user authentication, authorization, and access control
 */
const express = require('express');
const router = express.Router();
const { csrfProtection } = require('../../../middleware/csrf');
const accessController = require('../../../controllers/modules/access/controller');

// User management routes
router.get('/', accessController.index);
router.get('/users', accessController.listUsers);
router.get('/users/new', csrfProtection, accessController.newUserForm);
router.post('/users/new', csrfProtection, accessController.createUser);
router.get('/users/:id', accessController.viewUser);
router.get('/users/:id/edit', csrfProtection, accessController.editUserForm);
router.post('/users/:id/edit', csrfProtection, accessController.updateUser);

// Role management routes
router.get('/roles', accessController.listRoles);
router.get('/roles/new', csrfProtection, accessController.newRoleForm);
router.post('/roles/new', csrfProtection, accessController.createRole);
router.get('/roles/:id', accessController.viewRole);
router.get('/roles/:id/edit', csrfProtection, accessController.editRoleForm);
router.post('/roles/:id/edit', csrfProtection, accessController.updateRole);

// Permission management routes
router.get('/permissions', accessController.listPermissions);
router.get('/permissions/new', csrfProtection, accessController.newPermissionForm);
router.post('/permissions/new', csrfProtection, accessController.createPermission);
router.get('/permissions/:id', accessController.viewPermission);
router.get('/permissions/:id/edit', csrfProtection, accessController.editPermissionForm);
router.post('/permissions/:id/edit', csrfProtection, accessController.updatePermission);

// Authentication routes
router.get('/login', accessController.loginForm);
router.post('/login', csrfProtection, accessController.login);
router.get('/logout', accessController.logout);
router.get('/forgot-password', accessController.forgotPasswordForm);
router.post('/forgot-password', csrfProtection, accessController.forgotPassword);
router.get('/reset-password/:token', accessController.resetPasswordForm);
router.post('/reset-password/:token', csrfProtection, accessController.resetPassword);

module.exports = router;
