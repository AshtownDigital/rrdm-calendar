/**
 * User Management Controller
 * Handles user management operations
 */
const { prisma } = require('../../config/database');
const bcrypt = require('bcryptjs');

/**
 * Display the user profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showProfile = async (req, res) => {
  try {
    // Get the user from the database
    const user = await prisma.users.findUnique({
      where: { id: req.user.id }
    });
    
    if (!user) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'User not found',
        user: req.user
      });
    }
    
    // Render the template with data
    res.render('modules/access/profile', {
      title: 'User Profile',
      profile: user,
      success_msg: req.flash('success_msg'),
      error_msg: req.flash('error_msg'),
      user: req.user
    });
  } catch (error) {
    console.error('Error showing profile:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load user profile',
      error,
      user: req.user
    });
  }
};

/**
 * Display the edit profile form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showEditProfileForm = async (req, res) => {
  try {
    // Get the user from the database
    const user = await prisma.users.findUnique({
      where: { id: req.user.id }
    });
    
    if (!user) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'User not found',
        user: req.user
      });
    }
    
    // Render the template with data
    res.render('modules/access/edit-profile', {
      title: 'Edit Profile',
      profile: user,
      user: req.user
    });
  } catch (error) {
    console.error('Error showing edit profile form:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load edit profile form',
      error,
      user: req.user
    });
  }
};

/**
 * Process edit profile form submission
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    
    // Validation
    if (!name || !email) {
      req.flash('error_msg', 'Please fill in all fields');
      return res.redirect('/profile/edit');
    }
    
    // Check if email is already in use by another user
    const existingUser = await prisma.users.findFirst({
      where: {
        email,
        id: { not: req.user.id }
      }
    });
    
    if (existingUser) {
      req.flash('error_msg', 'Email is already in use');
      return res.redirect('/profile/edit');
    }
    
    // Update user
    await prisma.users.update({
      where: { id: req.user.id },
      data: {
        name,
        email,
        updatedAt: new Date()
      }
    });
    
    req.flash('success_msg', 'Profile updated successfully');
    res.redirect('/profile');
  } catch (error) {
    console.error('Error updating profile:', error);
    req.flash('error_msg', 'Failed to update profile');
    res.redirect('/profile/edit');
  }
};

/**
 * Display the change password form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showChangePasswordForm = (req, res) => {
  res.render('modules/access/change-password', {
    title: 'Change Password',
    user: req.user
  });
};

/**
 * Process change password form submission
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      req.flash('error_msg', 'Please fill in all fields');
      return res.redirect('/profile/change-password');
    }
    
    if (newPassword !== confirmPassword) {
      req.flash('error_msg', 'New passwords do not match');
      return res.redirect('/profile/change-password');
    }
    
    if (newPassword.length < 6) {
      req.flash('error_msg', 'Password should be at least 6 characters');
      return res.redirect('/profile/change-password');
    }
    
    // Get the user from the database
    const user = await prisma.users.findUnique({
      where: { id: req.user.id }
    });
    
    if (!user) {
      req.flash('error_msg', 'User not found');
      return res.redirect('/profile/change-password');
    }
    
    // Check if current password is correct
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    
    if (!isMatch) {
      req.flash('error_msg', 'Current password is incorrect');
      return res.redirect('/profile/change-password');
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update password
    await prisma.users.update({
      where: { id: req.user.id },
      data: {
        password: hashedPassword,
        updatedAt: new Date()
      }
    });
    
    req.flash('success_msg', 'Password changed successfully');
    res.redirect('/profile');
  } catch (error) {
    console.error('Error changing password:', error);
    req.flash('error_msg', 'Failed to change password');
    res.redirect('/profile/change-password');
  }
};

/**
 * Display the user management page (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const listUsers = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).render('error', {
        title: 'Forbidden',
        message: 'You do not have permission to access this page',
        user: req.user
      });
    }
    
    // Get all users from the database
    const users = await prisma.users.findMany({
      orderBy: { name: 'asc' }
    });
    
    // Render the template with data
    res.render('modules/access/manage', {
      title: 'User Management',
      users,
      success_msg: req.flash('success_msg'),
      error_msg: req.flash('error_msg'),
      user: req.user
    });
  } catch (error) {
    console.error('Error listing users:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load users',
      error,
      user: req.user
    });
  }
};

/**
 * Toggle user active status (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const toggleUserStatus = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action'
      });
    }
    
    const userId = req.params.id;
    
    // Get the user from the database
    const user = await prisma.users.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Prevent deactivating own account
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account'
      });
    }
    
    // Toggle active status
    await prisma.users.update({
      where: { id: userId },
      data: {
        active: !user.active,
        updatedAt: new Date()
      }
    });
    
    res.json({
      success: true,
      message: `User ${user.active ? 'deactivated' : 'activated'} successfully`
    });
  } catch (error) {
    console.error('Error toggling user status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle user status'
    });
  }
};

/**
 * Display the create user form (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showCreateUserForm = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).render('error', {
        title: 'Forbidden',
        message: 'You do not have permission to access this page',
        user: req.user
      });
    }
    
    // Render the template with data
    res.render('modules/access/create-user', {
      title: 'Create User',
      user: req.user
    });
  } catch (error) {
    console.error('Error showing create user form:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load create user form',
      error,
      user: req.user
    });
  }
};

/**
 * Process create user form submission (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createUser = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).render('error', {
        title: 'Forbidden',
        message: 'You do not have permission to perform this action',
        user: req.user
      });
    }
    
    const { name, email, password, role } = req.body;
    
    // Validation
    if (!name || !email || !password || !role) {
      req.flash('error_msg', 'Please fill in all fields');
      return res.redirect('/access/create');
    }
    
    if (password.length < 6) {
      req.flash('error_msg', 'Password should be at least 6 characters');
      return res.redirect('/access/create');
    }
    
    // Check if user already exists
    const existingUser = await prisma.users.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      req.flash('error_msg', 'Email is already registered');
      return res.redirect('/access/create');
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create user
    await prisma.users.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    req.flash('success_msg', 'User created successfully');
    res.redirect('/access/manage');
  } catch (error) {
    console.error('Error creating user:', error);
    req.flash('error_msg', 'Failed to create user');
    res.redirect('/access/create');
  }
};

/**
 * Display user details (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const viewUserDetails = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).render('error', {
        title: 'Forbidden',
        message: 'You do not have permission to access this page',
        user: req.user
      });
    }
    
    const userId = req.params.id;
    
    // Get the user from the database
    const userDetails = await prisma.users.findUnique({
      where: { id: userId }
    });
    
    if (!userDetails) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'User not found',
        user: req.user
      });
    }
    
    // Render the template with data
    res.render('modules/access/user-detail', {
      title: 'User Details',
      userDetails,
      user: req.user
    });
  } catch (error) {
    console.error('Error viewing user details:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load user details',
      error,
      user: req.user
    });
  }
};

/**
 * Display the edit user form (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showEditUserForm = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).render('error', {
        title: 'Forbidden',
        message: 'You do not have permission to access this page',
        user: req.user
      });
    }
    
    const userId = req.params.id;
    
    // Get the user from the database
    const userToEdit = await prisma.users.findUnique({
      where: { id: userId }
    });
    
    if (!userToEdit) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'User not found',
        user: req.user
      });
    }
    
    // Render the template with data
    res.render('modules/access/edit-user', {
      title: 'Edit User',
      userToEdit,
      user: req.user
    });
  } catch (error) {
    console.error('Error showing edit user form:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load edit user form',
      error,
      user: req.user
    });
  }
};

/**
 * Process edit user form submission (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateUser = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).render('error', {
        title: 'Forbidden',
        message: 'You do not have permission to perform this action',
        user: req.user
      });
    }
    
    const userId = req.params.id;
    const { name, email, role } = req.body;
    
    // Validation
    if (!name || !email || !role) {
      req.flash('error_msg', 'Please fill in all fields');
      return res.redirect(`/access/edit/${userId}`);
    }
    
    // Check if email is already in use by another user
    const existingUser = await prisma.users.findFirst({
      where: {
        email,
        id: { not: userId }
      }
    });
    
    if (existingUser) {
      req.flash('error_msg', 'Email is already in use');
      return res.redirect(`/access/edit/${userId}`);
    }
    
    // Update user
    await prisma.users.update({
      where: { id: userId },
      data: {
        name,
        email,
        role,
        updatedAt: new Date()
      }
    });
    
    req.flash('success_msg', 'User updated successfully');
    res.redirect('/access/manage');
  } catch (error) {
    console.error('Error updating user:', error);
    req.flash('error_msg', 'Failed to update user');
    res.redirect(`/access/edit/${req.params.id}`);
  }
};

/**
 * Display the revoke access form (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showRevokeAccessForm = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).render('error', {
        title: 'Forbidden',
        message: 'You do not have permission to access this page',
        user: req.user
      });
    }
    
    const userId = req.params.id;
    
    // Get the user from the database
    const userToRevoke = await prisma.users.findUnique({
      where: { id: userId }
    });
    
    if (!userToRevoke) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'User not found',
        user: req.user
      });
    }
    
    // Prevent revoking own access
    if (userId === req.user.id) {
      req.flash('error_msg', 'You cannot revoke your own access');
      return res.redirect('/access/manage');
    }
    
    // Render the template with data
    res.render('modules/access/revoke-confirm', {
      title: 'Revoke Access',
      userToRevoke,
      user: req.user
    });
  } catch (error) {
    console.error('Error showing revoke access form:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load revoke access form',
      error,
      user: req.user
    });
  }
};

/**
 * Process revoke access form submission (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const revokeAccess = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).render('error', {
        title: 'Forbidden',
        message: 'You do not have permission to perform this action',
        user: req.user
      });
    }
    
    const userId = req.params.id;
    
    // Get the user from the database
    const user = await prisma.users.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'User not found',
        user: req.user
      });
    }
    
    // Prevent revoking own access
    if (userId === req.user.id) {
      req.flash('error_msg', 'You cannot revoke your own access');
      return res.redirect('/access/manage');
    }
    
    // Revoke access
    await prisma.users.update({
      where: { id: userId },
      data: {
        active: false,
        updatedAt: new Date()
      }
    });
    
    req.flash('success_msg', 'User access revoked successfully');
    res.redirect('/access/manage');
  } catch (error) {
    console.error('Error revoking access:', error);
    req.flash('error_msg', 'Failed to revoke access');
    res.redirect(`/access/revoke/${req.params.id}`);
  }
};

/**
 * Display the restore access form (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showRestoreAccessForm = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).render('error', {
        title: 'Forbidden',
        message: 'You do not have permission to access this page',
        user: req.user
      });
    }
    
    const userId = req.params.id;
    
    // Get the user from the database
    const userToRestore = await prisma.users.findUnique({
      where: { id: userId }
    });
    
    if (!userToRestore) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'User not found',
        user: req.user
      });
    }
    
    // Render the template with data
    res.render('modules/access/restore-confirm', {
      title: 'Restore Access',
      userToRestore,
      user: req.user
    });
  } catch (error) {
    console.error('Error showing restore access form:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load restore access form',
      error,
      user: req.user
    });
  }
};

/**
 * Process restore access form submission (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const restoreAccess = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).render('error', {
        title: 'Forbidden',
        message: 'You do not have permission to perform this action',
        user: req.user
      });
    }
    
    const userId = req.params.id;
    
    // Get the user from the database
    const user = await prisma.users.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'User not found',
        user: req.user
      });
    }
    
    // Restore access
    await prisma.users.update({
      where: { id: userId },
      data: {
        active: true,
        updatedAt: new Date()
      }
    });
    
    req.flash('success_msg', 'User access restored successfully');
    res.redirect('/access/manage');
  } catch (error) {
    console.error('Error restoring access:', error);
    req.flash('error_msg', 'Failed to restore access');
    res.redirect(`/access/restore/${req.params.id}`);
  }
};

/**
 * Display the reset password form (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showResetPasswordForm = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).render('error', {
        title: 'Forbidden',
        message: 'You do not have permission to access this page',
        user: req.user
      });
    }
    
    const userId = req.params.id;
    
    // Get the user from the database
    const userToReset = await prisma.users.findUnique({
      where: { id: userId }
    });
    
    if (!userToReset) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'User not found',
        user: req.user
      });
    }
    
    // Render the template with data
    res.render('modules/access/reset-password', {
      title: 'Reset Password',
      userToReset,
      user: req.user
    });
  } catch (error) {
    console.error('Error showing reset password form:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load reset password form',
      error,
      user: req.user
    });
  }
};

/**
 * Process reset password form submission (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const resetPassword = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).render('error', {
        title: 'Forbidden',
        message: 'You do not have permission to perform this action',
        user: req.user
      });
    }
    
    const userId = req.params.id;
    const { newPassword, confirmPassword } = req.body;
    
    // Validation
    if (!newPassword || !confirmPassword) {
      req.flash('error_msg', 'Please fill in all fields');
      return res.redirect(`/access/reset-password/${userId}`);
    }
    
    if (newPassword !== confirmPassword) {
      req.flash('error_msg', 'Passwords do not match');
      return res.redirect(`/access/reset-password/${userId}`);
    }
    
    if (newPassword.length < 6) {
      req.flash('error_msg', 'Password should be at least 6 characters');
      return res.redirect(`/access/reset-password/${userId}`);
    }
    
    // Get the user from the database
    const user = await prisma.users.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'User not found',
        user: req.user
      });
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update password
    await prisma.users.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        updatedAt: new Date()
      }
    });
    
    req.flash('success_msg', 'Password reset successfully');
    res.redirect('/access/manage');
  } catch (error) {
    console.error('Error resetting password:', error);
    req.flash('error_msg', 'Failed to reset password');
    res.redirect(`/access/reset-password/${req.params.id}`);
  }
};

/**
 * Display the delete user form (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showDeleteUserForm = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).render('error', {
        title: 'Forbidden',
        message: 'You do not have permission to access this page',
        user: req.user
      });
    }
    
    const userId = req.params.id;
    
    // Get the user from the database
    const userToDelete = await prisma.users.findUnique({
      where: { id: userId }
    });
    
    if (!userToDelete) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'User not found',
        user: req.user
      });
    }
    
    // Prevent deleting own account
    if (userId === req.user.id) {
      req.flash('error_msg', 'You cannot delete your own account');
      return res.redirect('/access/manage');
    }
    
    // Render the template with data
    res.render('modules/access/delete-confirm', {
      title: 'Delete User',
      userToDelete,
      user: req.user
    });
  } catch (error) {
    console.error('Error showing delete user form:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load delete user form',
      error,
      user: req.user
    });
  }
};

/**
 * Process delete user form submission (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteUser = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).render('error', {
        title: 'Forbidden',
        message: 'You do not have permission to perform this action',
        user: req.user
      });
    }
    
    const userId = req.params.id;
    
    // Get the user from the database
    const user = await prisma.users.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'User not found',
        user: req.user
      });
    }
    
    // Prevent deleting own account
    if (userId === req.user.id) {
      req.flash('error_msg', 'You cannot delete your own account');
      return res.redirect('/access/manage');
    }
    
    // Delete user
    await prisma.users.delete({
      where: { id: userId }
    });
    
    req.flash('success_msg', 'User deleted successfully');
    res.redirect('/access/manage');
  } catch (error) {
    console.error('Error deleting user:', error);
    req.flash('error_msg', 'Failed to delete user');
    res.redirect(`/access/delete/${req.params.id}`);
  }
};

module.exports = {
  showProfile,
  showEditProfileForm,
  updateProfile,
  showChangePasswordForm,
  changePassword,
  listUsers,
  toggleUserStatus,
  // New exports for user management
  showCreateUserForm,
  createUser,
  viewUserDetails,
  showEditUserForm,
  updateUser,
  showRevokeAccessForm,
  revokeAccess,
  showRestoreAccessForm,
  restoreAccess,
  showResetPasswordForm,
  resetPassword,
  showDeleteUserForm,
  deleteUser
};
