/**
 * API User Routes
 */
const express = require('express');
const router = express.Router();
const { User } = require('../../models');
const { ensureAuthenticated } = require('../../middleware/auth');

/**
 * GET /api/user/profile
 * Get the current user's profile
 */
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
};

/**
 * PATCH /api/user/preferences
 * Update user preferences
 */
const updateUserPreferences = async (req, res) => {
  try {
    const { theme, notifications } = req.body;
    
    // Find the user
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Create or update preferences object
    const preferences = {
      ...(user.preferences || {}),
      ...(theme !== undefined && { theme }),
      ...(notifications !== undefined && { notifications })
    };
    
    // Update the user preferences
    await User.update(
      { preferences },
      { where: { id: req.user.id } }
    );
    
    // Get the updated user
    const updatedUser = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });
    
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Error updating user preferences:', error);
    res.status(500).json({ error: 'Failed to update user preferences' });
  }
};

// Apply authentication middleware to all routes
router.use(ensureAuthenticated);

// Define routes
router.get('/profile', getUserProfile);
router.patch('/preferences', updateUserPreferences);

module.exports = {
  router,
  getUserProfile,
  updateUserPreferences
};
