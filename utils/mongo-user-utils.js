/**
 * MongoDB User utilities for RRDM application
 * Provides functions to manage users in MongoDB
 */
const { User } = require('../models');
const bcrypt = require('bcryptjs');

/**
 * Get all users
 * @returns {Promise<Array>} Array of users
 */
const getAllUsers = async () => {
  try {
    const users = await User.find().sort({ createdAt: 1 });
    
    // Remove sensitive data
    return users.map(user => {
      const userObj = user.toObject();
      delete userObj.password;
      return userObj;
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

/**
 * Find user by email
 * @param {string} email - User email
 * @returns {Promise<Object|null>} User object or null if not found
 */
const findUserByEmail = async (email) => {
  try {
    return await User.findOne({ email: email.toLowerCase() });
  } catch (error) {
    console.error('Error finding user by email:', error);
    throw error;
  }
};

/**
 * Find user by ID
 * @param {string} id - User ID
 * @returns {Promise<Object|null>} User object or null if not found
 */
const findUserById = async (id) => {
  try {
    return await User.findById(id);
  } catch (error) {
    console.error('Error finding user by ID:', error);
    throw error;
  }
};

/**
 * Create a new user
 * @param {Object} userData - User data
 * @returns {Promise<Object>} Created user
 */
const createUser = async (userData) => {
  try {
    // Check if user with this email already exists
    const existingUser = await findUserByEmail(userData.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }
    
    // Create new user
    const user = new User({
      email: userData.email.toLowerCase(),
      password: userData.password, // Will be hashed by model pre-save hook
      name: userData.name || userData.email.split('@')[0],
      role: userData.role || 'business',
      active: true
    });
    
    await user.save();
    
    // Return user without password
    const userObj = user.toObject();
    delete userObj.password;
    return userObj;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

/**
 * Update user's last login time
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Success status
 */
const updateLastLogin = async (userId) => {
  try {
    await User.findByIdAndUpdate(userId, {
      lastLogin: new Date(),
      updatedAt: new Date()
    });
    
    return true;
  } catch (error) {
    console.error('Error updating last login:', error);
    return false;
  }
};

/**
 * Update user information
 * @param {string} userId - User ID
 * @param {Object} userData - Updated user data
 * @returns {Promise<Object>} Updated user
 */
const updateUser = async (userId, userData) => {
  try {
    // If updating email, check if it's already in use by another user
    if (userData.email) {
      const existingUser = await findUserByEmail(userData.email);
      if (existingUser && existingUser._id.toString() !== userId) {
        throw new Error('Email is already in use by another user');
      }
    }
    
    // Update user
    const user = await User.findByIdAndUpdate(
      userId,
      {
        ...userData,
        updatedAt: new Date()
      },
      { new: true } // Return the updated document
    );
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Return user without password
    const userObj = user.toObject();
    delete userObj.password;
    return userObj;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

/**
 * Update user's password
 * @param {string} userId - User ID
 * @param {string} newPassword - New password
 * @returns {Promise<boolean>} Success status
 */
const updateUserPassword = async (userId, newPassword) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Update password (will be hashed by model pre-save hook)
    user.password = newPassword;
    await user.save();
    
    return true;
  } catch (error) {
    console.error('Error updating password:', error);
    throw error;
  }
};

/**
 * Toggle user active status
 * @param {string} userId - User ID
 * @param {boolean} active - Active status
 * @returns {Promise<boolean>} Success status
 */
const toggleUserActive = async (userId, active) => {
  try {
    const user = await User.findByIdAndUpdate(
      userId,
      {
        active,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return true;
  } catch (error) {
    console.error('Error toggling user active status:', error);
    throw error;
  }
};

/**
 * Delete user
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Success status
 */
const deleteUser = async (userId) => {
  try {
    const result = await User.findByIdAndDelete(userId);
    if (!result) {
      throw new Error('User not found');
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

/**
 * Validate password
 * @param {string} plainPassword - Plain text password
 * @param {string} hashedPassword - Hashed password
 * @returns {Promise<boolean>} Whether password matches
 */
const validatePassword = async (plainPassword, hashedPassword) => {
  return await bcrypt.compare(plainPassword, hashedPassword);
};

/**
 * Migrate users from JSON to database
 * @param {Array} jsonUsers - Array of user objects from JSON
 * @returns {Promise<boolean>} Success status
 */
const migrateUsersFromJson = async (jsonUsers) => {
  try {
    for (const userData of jsonUsers) {
      // Check if user already exists in database
      const existingUser = await findUserByEmail(userData.email);
      if (!existingUser) {
        console.log(`Migrating user ${userData.email}`);
        
        // Create user with pre-hashed password
        const user = new User({
          email: userData.email.toLowerCase(),
          password: userData.password, // Already hashed
          name: userData.name,
          role: userData.role || 'business',
          active: userData.active !== false, // Default to true if not specified
          lastLogin: userData.lastLogin ? new Date(userData.lastLogin) : null,
          createdAt: userData.createdAt ? new Date(userData.createdAt) : new Date(),
          updatedAt: userData.updatedAt ? new Date(userData.updatedAt) : new Date()
        });
        
        // Save without running the password hashing hook
        user.$isNew = false; // Trick to avoid pre-save hooks
        await user.save({ validateBeforeSave: false });
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error migrating users:', error);
    return false;
  }
};

module.exports = {
  getAllUsers,
  findUserByEmail,
  findUserById,
  createUser,
  updateLastLogin,
  validatePassword,
  updateUser,
  updateUserPassword,
  toggleUserActive,
  deleteUser,
  migrateUsersFromJson
};
