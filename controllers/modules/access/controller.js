/**
 * Access Module Controller
 * Handles user authentication, authorization, and access control
 */

const accessModel = require('../../../models/modules/access/model');
const authService = require('../../../services/modules/access/authService');
const { createHash } = require('crypto');

// Mock email service until we create a proper modular version
const emailService = {
  sendWelcomeEmail: (email, data) => {
    console.log(`[Mock Email] Welcome email to ${email} with data:`, data);
    return Promise.resolve();
  },
  sendPasswordResetEmail: (email, data) => {
    console.log(`[Mock Email] Password reset email to ${email} with data:`, data);
    return Promise.resolve();
  }
};

/**
 * Render Access Management dashboard
 */
exports.index = async (req, res) => {
  try {
    // Get dashboard metrics
    const userCount = await accessModel.countAllUsers();
    const roleCount = await accessModel.countAllRoles();
    const permissionCount = await accessModel.countAllPermissions();
    
    // Render dashboard with metrics
    res.render('modules/access/dashboard', {
      title: 'Access Management',
      metrics: {
        users: userCount,
        roles: roleCount,
        permissions: permissionCount
      },
      user: req.user
    });
  } catch (error) {
    console.error('Error in access management dashboard controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the access management dashboard',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

// ===== User Management =====

/**
 * List all users
 */
exports.listUsers = async (req, res) => {
  try {
    const users = await accessModel.getAllUsers(req.query);
    
    res.render('modules/access/users/list', {
      title: 'Users',
      users,
      filters: req.query,
      user: req.user
    });
  } catch (error) {
    console.error('Error in list users controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the users list',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Render new user form
 */
exports.newUserForm = async (req, res) => {
  try {
    // Get all roles for the form
    const roles = await accessModel.getAllRoles();
    
    res.render('modules/access/users/new', {
      title: 'New User',
      roles,
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  } catch (error) {
    console.error('Error in new user form controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the new user form',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Create a new user
 */
exports.createUser = async (req, res) => {
  try {
    // Generate temporary password if not provided
    if (!req.body.password) {
      req.body.password = authService.generateTempPassword();
    }
    
    // Create the user
    const user = await accessModel.createUser(req.body);
    
    // Mock send welcome email with credentials
    console.log(`[INFO] Would send welcome email to ${user.email}`);
    await emailService.sendWelcomeEmail(user.email, {
      name: user.name,
      username: user.username,
      password: req.body.password // Only used for temporary password
    });
    
    res.redirect(`/access/users/${user.id}`);
  } catch (error) {
    console.error('Error in create user controller:', error);
    
    // Get all roles for re-rendering the form
    const roles = await accessModel.getAllRoles();
    
    res.status(500).render('modules/access/users/new', {
      title: 'New User',
      roles,
      formData: req.body,
      error: 'Failed to create user',
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  }
};

/**
 * View a specific user
 */
exports.viewUser = async (req, res) => {
  try {
    const userDetails = await accessModel.getUserById(req.params.id);
    
    if (!userDetails) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'The requested user was not found',
        error: {},
        user: req.user
      });
    }
    
    res.render('modules/access/users/view', {
      title: `User: ${userDetails.name}`,
      userDetails,
      user: req.user
    });
  } catch (error) {
    console.error('Error in view user controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the user details',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Render edit user form
 */
exports.editUserForm = async (req, res) => {
  try {
    const userDetails = await accessModel.getUserById(req.params.id);
    
    if (!userDetails) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'The requested user was not found',
        error: {},
        user: req.user
      });
    }
    
    // Get all roles for the form
    const roles = await accessModel.getAllRoles();
    
    res.render('modules/access/users/edit', {
      title: `Edit User: ${userDetails.name}`,
      userDetails,
      roles,
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  } catch (error) {
    console.error('Error in edit user form controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the edit user form',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Update a user
 */
exports.updateUser = async (req, res) => {
  try {
    // If password field is empty, remove it from the update data
    if (!req.body.password) {
      delete req.body.password;
    }
    
    const userDetails = await accessModel.updateUser(req.params.id, req.body);
    
    res.redirect(`/access/users/${userDetails.id}`);
  } catch (error) {
    console.error('Error in update user controller:', error);
    
    // Get all roles for re-rendering the form
    const roles = await accessModel.getAllRoles();
    
    res.status(500).render('modules/access/users/edit', {
      title: 'Edit User',
      userDetails: { id: req.params.id, ...req.body },
      roles,
      error: 'Failed to update user',
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  }
};

// ===== Role Management =====

/**
 * List all roles
 */
exports.listRoles = async (req, res) => {
  try {
    const roles = await accessModel.getAllRoles();
    
    res.render('modules/access/roles/list', {
      title: 'Roles',
      roles,
      user: req.user
    });
  } catch (error) {
    console.error('Error in list roles controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the roles list',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Render new role form
 */
exports.newRoleForm = async (req, res) => {
  try {
    // Get all permissions for the form
    const permissions = await accessModel.getAllPermissions();
    
    res.render('modules/access/roles/new', {
      title: 'New Role',
      permissions,
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  } catch (error) {
    console.error('Error in new role form controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the new role form',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Create a new role
 */
exports.createRole = async (req, res) => {
  try {
    const role = await accessModel.createRole(req.body);
    
    res.redirect(`/access/roles/${role.id}`);
  } catch (error) {
    console.error('Error in create role controller:', error);
    
    // Get all permissions for re-rendering the form
    const permissions = await accessModel.getAllPermissions();
    
    res.status(500).render('modules/access/roles/new', {
      title: 'New Role',
      permissions,
      formData: req.body,
      error: 'Failed to create role',
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  }
};

/**
 * View a specific role
 */
exports.viewRole = async (req, res) => {
  try {
    const role = await accessModel.getRoleById(req.params.id);
    
    if (!role) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'The requested role was not found',
        error: {},
        user: req.user
      });
    }
    
    // Get users with this role
    const usersWithRole = await accessModel.getUsersByRoleId(role.id);
    
    res.render('modules/access/roles/view', {
      title: `Role: ${role.name}`,
      role,
      usersWithRole,
      user: req.user
    });
  } catch (error) {
    console.error('Error in view role controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the role details',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Render edit role form
 */
exports.editRoleForm = async (req, res) => {
  try {
    const role = await accessModel.getRoleById(req.params.id);
    
    if (!role) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'The requested role was not found',
        error: {},
        user: req.user
      });
    }
    
    // Get all permissions for the form
    const permissions = await accessModel.getAllPermissions();
    
    res.render('modules/access/roles/edit', {
      title: `Edit Role: ${role.name}`,
      role,
      permissions,
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  } catch (error) {
    console.error('Error in edit role form controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the edit role form',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Update a role
 */
exports.updateRole = async (req, res) => {
  try {
    const role = await accessModel.updateRole(req.params.id, req.body);
    
    res.redirect(`/access/roles/${role.id}`);
  } catch (error) {
    console.error('Error in update role controller:', error);
    
    // Get all permissions for re-rendering the form
    const permissions = await accessModel.getAllPermissions();
    
    res.status(500).render('modules/access/roles/edit', {
      title: 'Edit Role',
      role: { id: req.params.id, ...req.body },
      permissions,
      error: 'Failed to update role',
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  }
};

// ===== Permission Management =====

/**
 * List all permissions
 */
exports.listPermissions = async (req, res) => {
  try {
    const permissions = await accessModel.getAllPermissions(req.query);
    
    res.render('modules/access/permissions/list', {
      title: 'Permissions',
      permissions,
      filters: req.query,
      user: req.user
    });
  } catch (error) {
    console.error('Error in list permissions controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the permissions list',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Render new permission form
 */
exports.newPermissionForm = async (req, res) => {
  try {
    res.render('modules/access/permissions/new', {
      title: 'New Permission',
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  } catch (error) {
    console.error('Error in new permission form controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the new permission form',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Create a new permission
 */
exports.createPermission = async (req, res) => {
  try {
    const permission = await accessModel.createPermission(req.body);
    
    res.redirect(`/access/permissions/${permission.id}`);
  } catch (error) {
    console.error('Error in create permission controller:', error);
    res.status(500).render('modules/access/permissions/new', {
      title: 'New Permission',
      formData: req.body,
      error: 'Failed to create permission',
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  }
};

/**
 * View a specific permission
 */
exports.viewPermission = async (req, res) => {
  try {
    const permission = await accessModel.getPermissionById(req.params.id);
    
    if (!permission) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'The requested permission was not found',
        error: {},
        user: req.user
      });
    }
    
    // Get roles that have this permission
    const roles = await accessModel.getRolesByPermissionId(permission.id);
    
    res.render('modules/access/permissions/view', {
      title: `Permission: ${permission.name}`,
      permission,
      roles,
      user: req.user
    });
  } catch (error) {
    console.error('Error in view permission controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the permission details',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Render edit permission form
 */
exports.editPermissionForm = async (req, res) => {
  try {
    const permission = await accessModel.getPermissionById(req.params.id);
    
    if (!permission) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'The requested permission was not found',
        error: {},
        user: req.user
      });
    }
    
    res.render('modules/access/permissions/edit', {
      title: `Edit Permission: ${permission.name}`,
      permission,
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  } catch (error) {
    console.error('Error in edit permission form controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the edit form',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};

/**
 * Update a permission
 */
exports.updatePermission = async (req, res) => {
  try {
    const permission = await accessModel.updatePermission(req.params.id, req.body);
    
    res.redirect(`/access/permissions/${permission.id}`);
  } catch (error) {
    console.error('Error in update permission controller:', error);
    res.status(500).render('modules/access/permissions/edit', {
      title: 'Edit Permission',
      permission: { id: req.params.id, ...req.body },
      error: 'Failed to update permission',
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  }
};

// ===== Authentication =====

/**
 * Render login form
 */
exports.loginForm = async (req, res) => {
  try {
    // If user is already logged in, redirect to home
    if (req.user) {
      return res.redirect('/');
    }
    
    res.render('modules/access/login', {
      title: 'Login',
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      error: req.query.error
    });
  } catch (error) {
    console.error('Error in login form controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the login form',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

/**
 * Process login
 */
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Authenticate user
    const user = await authService.authenticateUser(username, password);
    
    if (!user) {
      return res.redirect('/access/login?error=Invalid+username+or+password');
    }
    
    // Set user in session
    req.session.user = user;
    
    // Redirect to intended URL or home
    const redirectUrl = req.session.intendedUrl || '/';
    delete req.session.intendedUrl;
    
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Error in login controller:', error);
    res.redirect('/access/login?error=An+error+occurred+during+login');
  }
};

/**
 * Process logout
 */
exports.logout = async (req, res) => {
  try {
    // Clear session
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
      }
      
      res.redirect('/access/login');
    });
  } catch (error) {
    console.error('Error in logout controller:', error);
    res.redirect('/');
  }
};

/**
 * Render forgot password form
 */
exports.forgotPasswordForm = async (req, res) => {
  try {
    res.render('modules/access/forgot-password', {
      title: 'Forgot Password',
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
  } catch (error) {
    console.error('Error in forgot password form controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the forgot password form',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

/**
 * Process forgot password
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Get user by email
    const user = await accessModel.getUserByEmail(email);
    
    if (user) {
      // Generate reset token
      const token = createHash('sha256').update(`${user.id}-${Date.now()}-${Math.random()}`).digest('hex');
      
      // Save reset token to user
      await accessModel.updateUser(user.id, {
        resetPasswordToken: token,
        resetPasswordExpires: new Date(Date.now() + 3600000) // 1 hour
      });
      
      // Mock send reset email
      console.log(`[INFO] Would send password reset email to ${email}`);
      await emailService.sendPasswordResetEmail(email, {
        name: user.name,
        resetUrl: `${process.env.BASE_URL}/access/reset-password/${token}`
      });
    }
    
    // Always show success message even if email not found (security)
    res.render('modules/access/forgot-password-success', {
      title: 'Password Reset Email Sent'
    });
  } catch (error) {
    console.error('Error in forgot password controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while processing your password reset request',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

/**
 * Render reset password form
 */
exports.resetPasswordForm = async (req, res) => {
  try {
    const { token } = req.params;
    
    // Verify token
    const user = await accessModel.getUserByResetToken(token);
    
    if (!user || user.resetPasswordExpires < new Date()) {
      return res.status(400).render('error', {
        title: 'Invalid or Expired Token',
        message: 'The password reset token is invalid or has expired',
        error: {}
      });
    }
    
    res.render('modules/access/reset-password', {
      title: 'Reset Password',
      token,
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
  } catch (error) {
    console.error('Error in reset password form controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the reset password form',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

/**
 * Process reset password
 */
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;
    
    // Verify token
    const user = await accessModel.getUserByResetToken(token);
    
    if (!user || user.resetPasswordExpires < new Date()) {
      return res.status(400).render('error', {
        title: 'Invalid or Expired Token',
        message: 'The password reset token is invalid or has expired',
        error: {}
      });
    }
    
    // Verify passwords match
    if (password !== confirmPassword) {
      return res.render('modules/access/reset-password', {
        title: 'Reset Password',
        token,
        error: 'Passwords do not match',
        csrfToken: req.csrfToken ? req.csrfToken() : ''
      });
    }
    
    // Update password and clear reset token
    await accessModel.updateUser(user.id, {
      password: await authService.hashPassword(password),
      resetPasswordToken: null,
      resetPasswordExpires: null
    });
    
    // Redirect to login with success message
    res.redirect('/access/login?message=Password+reset+successful');
  } catch (error) {
    console.error('Error in reset password controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while resetting your password',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};
