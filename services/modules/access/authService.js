/**
 * Authentication Service
 * Handles user authentication, password hashing, and session management
 */
const bcrypt = require('bcrypt');
const accessModel = require('../../../models/modules/access/model');

// Number of salt rounds for bcrypt
const SALT_ROUNDS = 10;

/**
 * Authenticate a user with username and password
 */
exports.authenticateUser = async (username, password) => {
  try {
    // Get user by username
    const user = await accessModel.getUserByUsername(username);
    
    if (!user) {
      return null;
    }
    
    // Check if user is active
    if (user.status !== 'active') {
      return null;
    }
    
    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      // Log failed login attempt
      console.warn(`Failed login attempt for user ${username}`);
      
      return null;
    }
    
    // Update last login time
    await accessModel.updateUser(user.id, {
      lastLogin: new Date()
    });
    
    // Log successful login
    console.log(`Successful login for user ${username}`);
    
    // Return user object (without password)
    const userObj = user.toObject();
    delete userObj.password;
    
    return userObj;
  } catch (error) {
    console.error('Error authenticating user:', error);
    throw error;
  }
};

/**
 * Hash a password using bcrypt
 */
exports.hashPassword = async (password) => {
  try {
    return await bcrypt.hash(password, SALT_ROUNDS);
  } catch (error) {
    console.error('Error hashing password:', error);
    throw error;
  }
};

/**
 * Generate a temporary password for new users
 */
exports.generateTempPassword = () => {
  // Generate a random password (8 characters)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return password;
};

/**
 * Check if a user has permission to access a resource
 */
exports.hasPermission = async (userId, resource, action) => {
  try {
    // Get user with role
    const user = await accessModel.getUserById(userId);
    
    if (!user || !user.roleId) {
      return false;
    }
    
    // Check if role has the required permission
    const role = await accessModel.getRoleById(user.roleId);
    
    if (!role || !role.permissions) {
      return false;
    }
    
    // Check if role has wildcard permission (admin)
    if (role.permissions.includes('*')) {
      return true;
    }
    
    // Check for specific permission
    const permissionKey = `${resource}.${action}`;
    return role.permissions.includes(permissionKey);
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
};

/**
 * Get a user's permissions
 */
exports.getUserPermissions = async (userId) => {
  try {
    // Get user with role
    const user = await accessModel.getUserById(userId);
    
    if (!user || !user.roleId) {
      return [];
    }
    
    // Get role permissions
    const role = await accessModel.getRoleById(user.roleId);
    
    if (!role || !role.permissions) {
      return [];
    }
    
    return role.permissions;
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return [];
  }
};

/**
 * Check if user session is valid
 */
exports.isSessionValid = (session) => {
  return !!(session && session.user);
};

/**
 * Verify session middleware
 * Used to protect routes that require authentication
 */
exports.verifySession = (req, res, next) => {
  if (this.isSessionValid(req.session)) {
    // Set user in request object
    req.user = req.session.user;
    return next();
  }
  
  // Save intended URL for redirect after login
  req.session.intendedUrl = req.originalUrl;
  
  // Redirect to login
  res.redirect('/access/login');
};

/**
 * Permission middleware
 * Used to protect routes that require specific permissions
 */
exports.requirePermission = (resource, action) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.redirect('/access/login');
    }
    
    const hasPermission = await this.hasPermission(req.user.id, resource, action);
    
    if (hasPermission) {
      return next();
    }
    
    // User doesn't have permission
    res.status(403).render('error', {
      title: 'Access Denied',
      message: 'You do not have permission to access this resource',
      error: {},
      user: req.user
    });
  };
};
