/**
 * Access Management routes for RRDM application
 * Handles user authentication, registration, and management
 */
const express = require('express');
const router = express.Router();
const passport = require('passport');
const userUtils = require('../../utils/user-utils');
const { ensureAuthenticated, ensureAdmin, forwardAuthenticated } = require('../../middleware/auth');

// Login page - GET
router.get('/login', forwardAuthenticated, (req, res) => {
  res.render('modules/access/login', {
    title: 'Login | Register Team Internal Services',
    errors: req.flash('error'),
    success: req.flash('success')
  });
});

// Login - POST
router.post('/login', (req, res, next) => {
  passport.authenticate('local', {
    successRedirect: req.session.returnTo || '/home',
    failureRedirect: '/access/login',
    failureFlash: true
  })(req, res, next);
  
  // Clear returnTo from session
  delete req.session.returnTo;
});

// Logout - GET
router.get('/logout', (req, res, next) => {
  // First logout the user
  req.logout(function(err) {
    if (err) { return next(err); }
    
    // Then destroy the session completely
    req.session.destroy(function(err) {
      if (err) { return next(err); }
      
      // Clear the cookie
      res.clearCookie('connect.sid');
      
      // Redirect to login page without flash message
      // This ensures no session data is carried over
      return res.redirect('/access/login');
    });
  });
});

// User Management (Admin only) - GET
router.get('/manage', ensureAuthenticated, ensureAdmin, (req, res) => {
  const users = userUtils.getAllUsers().map(user => {
    // Remove password from user object
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  });
  
  res.render('modules/access/manage', {
    title: 'User Management | Register Team Internal Services',
    users,
    errors: req.flash('error'),
    success: req.flash('success')
  });
});

// Create User page (Admin only) - GET
router.get('/create', ensureAuthenticated, ensureAdmin, (req, res) => {
  res.render('modules/access/create-user', {
    title: 'Create User | Register Team Internal Services',
    errors: req.flash('error')
  });
});

// Create User (Admin only) - POST
router.post('/create', ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    const { email, password, confirmPassword, name, role } = req.body;
    
    // Validation
    const errors = [];
    
    if (!email || !password || !confirmPassword) {
      errors.push('Please fill in all required fields');
    }
    
    if (password !== confirmPassword) {
      errors.push('Passwords do not match');
    }
    
    if (password && password.length < 6) {
      errors.push('Password must be at least 6 characters');
    }
    
    if (errors.length > 0) {
      req.flash('error', errors);
      return res.redirect('/access/create');
    }
    
    // Create user
    await userUtils.createUser({
      email,
      password,
      name: name || email.split('@')[0],
      role: role || 'business'
    });
    
    req.flash('success', 'User created successfully');
    res.redirect('/access/manage');
  } catch (error) {
    req.flash('error', error.message);
    res.redirect('/access/create');
  }
});

// User Detail page (Admin only) - GET
router.get('/user/:id', ensureAuthenticated, ensureAdmin, (req, res) => {
  try {
    const userId = req.params.id;
    const user = userUtils.findUserById(userId);
    
    if (!user) {
      req.flash('error', 'User not found');
      return res.redirect('/access/manage');
    }
    
    // Remove password from user object
    const { password, ...userWithoutPassword } = user;
    
    // Find the record number based on the order in the users array
    const users = userUtils.getAllUsers();
    const recordNo = users.findIndex(u => u.id === userId) + 1;
    
    res.render('modules/access/user-detail', {
      title: 'User Details | Register Team Internal Services',
      user: userWithoutPassword,
      recordNo,
      errors: req.flash('error'),
      success: req.flash('success')
    });
  } catch (error) {
    req.flash('error', error.message);
    res.redirect('/access/manage');
  }
});

// Edit User page (Admin only) - GET
router.get('/edit/:id', ensureAuthenticated, ensureAdmin, (req, res) => {
  try {
    const userId = req.params.id;
    const user = userUtils.findUserById(userId);
    
    if (!user) {
      req.flash('error', 'User not found');
      return res.redirect('/access/manage');
    }
    
    // Remove password from user object
    const { password, ...userWithoutPassword } = user;
    
    res.render('modules/access/edit-user', {
      title: 'Edit User | Register Team Internal Services',
      user: userWithoutPassword,
      errors: req.flash('error')
    });
  } catch (error) {
    req.flash('error', error.message);
    res.redirect('/access/manage');
  }
});

// Edit User (Admin only) - POST
router.post('/edit/:id', ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const { name, email, role } = req.body;
    
    // Validation
    const errors = {};
    
    if (!name) errors.name = 'Name is required';
    if (!email) errors.email = 'Email is required';
    if (!role) errors.role = 'Role is required';
    
    if (Object.keys(errors).length > 0) {
      return res.render('modules/access/edit-user', {
        title: 'Edit User | Register Team Internal Services',
        user: { id: userId, name, email, role },
        errors
      });
    }
    
    // Update user
    await userUtils.updateUser(userId, { name, email, role });
    
    req.flash('success', 'User updated successfully');
    res.redirect(`/access/user/${userId}`);
  } catch (error) {
    req.flash('error', error.message);
    res.redirect(`/access/edit/${req.params.id}`);
  }
});

// Revoke User Access page (Admin only) - GET
router.get('/revoke/:id', ensureAuthenticated, ensureAdmin, (req, res) => {
  try {
    const userId = req.params.id;
    const user = userUtils.findUserById(userId);
    
    if (!user) {
      req.flash('error', 'User not found');
      return res.redirect('/access/manage');
    }
    
    // Remove password from user object
    const { password, ...userWithoutPassword } = user;
    
    // Find the record number based on the order in the users array
    const users = userUtils.getAllUsers();
    const recordNo = users.findIndex(u => u.id === userId) + 1;
    
    res.render('modules/access/revoke-confirm', {
      title: 'Revoke User Access | Register Team Internal Services',
      user: userWithoutPassword,
      recordNo,
      errors: req.flash('error')
    });
  } catch (error) {
    req.flash('error', error.message);
    res.redirect('/access/manage');
  }
});

// Revoke User Access (Admin only) - POST
router.post('/revoke/:id', ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Update user's active status to false (soft delete)
    await userUtils.updateUser(userId, { active: false });
    
    req.flash('success', 'User access has been revoked');
    res.redirect('/access/manage');
  } catch (error) {
    req.flash('error', error.message);
    res.redirect(`/access/revoke/${req.params.id}`);
  }
});

// Restore User Access page (Admin only) - GET
router.get('/restore/:id', ensureAuthenticated, ensureAdmin, (req, res) => {
  try {
    const userId = req.params.id;
    const user = userUtils.findUserById(userId);
    
    if (!user) {
      req.flash('error', 'User not found');
      return res.redirect('/access/manage');
    }
    
    // Remove password from user object
    const { password, ...userWithoutPassword } = user;
    
    // Find the record number based on the order in the users array
    const users = userUtils.getAllUsers();
    const recordNo = users.findIndex(u => u.id === userId) + 1;
    
    res.render('modules/access/restore-confirm', {
      title: 'Restore User Access | Register Team Internal Services',
      user: userWithoutPassword,
      recordNo,
      errors: req.flash('error')
    });
  } catch (error) {
    req.flash('error', error.message);
    res.redirect('/access/manage');
  }
});

// Restore User Access (Admin only) - POST
router.post('/restore/:id', ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Update user's active status to true
    await userUtils.updateUser(userId, { active: true });
    
    req.flash('success', 'User access has been restored');
    res.redirect('/access/manage');
  } catch (error) {
    req.flash('error', error.message);
    res.redirect(`/access/restore/${req.params.id}`);
  }
});

// Reset User Password page (Admin only) - GET
router.get('/reset-password/:id', ensureAuthenticated, ensureAdmin, (req, res) => {
  try {
    const userId = req.params.id;
    const user = userUtils.findUserById(userId);
    
    if (!user) {
      req.flash('error', 'User not found');
      return res.redirect('/access/manage');
    }
    
    // Remove password from user object
    const { password, ...userWithoutPassword } = user;
    
    // Find the record number based on the order in the users array
    const users = userUtils.getAllUsers();
    const recordNo = users.findIndex(u => u.id === userId) + 1;
    
    res.render('modules/access/reset-password', {
      title: 'Reset Password | Register Team Internal Services',
      user: userWithoutPassword,
      recordNo,
      errors: req.flash('error')
    });
  } catch (error) {
    req.flash('error', error.message);
    res.redirect('/access/manage');
  }
});

// Reset User Password (Admin only) - POST
router.post('/reset-password/:id', ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const { password, confirmPassword } = req.body;
    
    // Validation
    const errors = {};
    
    if (!password) errors.password = 'Password is required';
    if (password && password.length < 8) errors.password = 'Password must be at least 8 characters';
    if (!confirmPassword) errors.confirmPassword = 'Please confirm the password';
    if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match';
    
    if (Object.keys(errors).length > 0) {
      // Find the record number based on the order in the users array
      const users = userUtils.getAllUsers();
      const user = userUtils.findUserById(userId);
      const recordNo = users.findIndex(u => u.id === userId) + 1;
      
      return res.render('modules/access/reset-password', {
        title: 'Reset Password | Register Team Internal Services',
        user: { id: userId, name: user.name, email: user.email },
        recordNo,
        errors
      });
    }
    
    // Update user's password
    await userUtils.updateUserPassword(userId, password);
    
    req.flash('success', 'Password has been reset successfully');
    res.redirect(`/access/user/${userId}`);
  } catch (error) {
    req.flash('error', error.message);
    res.redirect(`/access/reset-password/${req.params.id}`);
  }
});

// Delete User page (Admin only) - GET
router.get('/delete/:id', ensureAuthenticated, ensureAdmin, (req, res) => {
  try {
    const userId = req.params.id;
    const user = userUtils.findUserById(userId);
    
    if (!user) {
      req.flash('error', 'User not found');
      return res.redirect('/access/manage');
    }
    
    // Remove password from user object
    const { password, ...userWithoutPassword } = user;
    
    // Find the record number based on the order in the users array
    const users = userUtils.getAllUsers();
    const recordNo = users.findIndex(u => u.id === userId) + 1;
    
    res.render('modules/access/delete-confirm', {
      title: 'Delete User | Register Team Internal Services',
      user: userWithoutPassword,
      recordNo,
      errors: req.flash('error')
    });
  } catch (error) {
    req.flash('error', error.message);
    res.redirect('/access/manage');
  }
});

// Delete User (Admin only) - POST
router.post('/delete/:id', ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const confirmDelete = req.body['confirm-delete'];
    
    if (confirmDelete !== 'yes') {
      req.flash('error', 'You must confirm deletion by checking the box');
      return res.redirect(`/access/delete/${userId}`);
    }
    
    // Hard delete the user
    await userUtils.deleteUser(userId);
    
    req.flash('success', 'User has been permanently deleted');
    res.redirect('/access/manage');
  } catch (error) {
    req.flash('error', error.message);
    res.redirect(`/access/delete/${req.params.id}`);
  }
});

module.exports = router;
