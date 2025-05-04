/**
 * Database User utilities for RRDM application
 * Provides functions to manage users in the PostgreSQL database
 */
const { User } = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');

// Get all users
const getAllUsers = async () => {
  try {
    return await User.findAll({
      order: [['createdAt', 'ASC']]
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
};

// Find user by email
const findUserByEmail = async (email) => {
  try {
    return await User.findOne({
      where: {
        email: {
          [Op.iLike]: email // Case-insensitive search
        }
      }
    });
  } catch (error) {
    console.error('Error finding user by email:', error);
    return null;
  }
};

// Find user by ID
const findUserById = async (id) => {
  try {
    return await User.findByPk(id);
  } catch (error) {
    console.error('Error finding user by ID:', error);
    return null;
  }
};

// Create a new user
const createUser = async (userData) => {
  try {
    // Check if user with this email already exists
    const existingUser = await findUserByEmail(userData.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }
    
    // Create new user
    const newUser = await User.create({
      email: userData.email,
      password: userData.password, // Will be hashed by model hook
      name: userData.name || userData.email.split('@')[0],
      role: userData.role || 'business', // Default role is business user
      active: true
    });
    
    // Return user without password
    const userJson = newUser.toJSON();
    delete userJson.password;
    return userJson;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

// Update user's last login time
const updateLastLogin = async (userId) => {
  try {
    await User.update(
      { lastLogin: new Date() },
      { where: { id: userId } }
    );
    return true;
  } catch (error) {
    console.error('Error updating last login:', error);
    return false;
  }
};

// Update user information
const updateUser = async (userId, userData) => {
  try {
    const user = await findUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // If updating email, check if it's already in use by another user
    if (userData.email && userData.email !== user.email) {
      const existingUser = await findUserByEmail(userData.email);
      if (existingUser && existingUser.id !== userId) {
        throw new Error('Email is already in use by another user');
      }
    }
    
    // Update user properties
    await user.update(userData);
    
    // Return user without password
    const userJson = user.toJSON();
    delete userJson.password;
    return userJson;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

// Update user's password
const updateUserPassword = async (userId, newPassword) => {
  try {
    const user = await findUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Update password (will be hashed by model hook)
    await user.update({ password: newPassword });
    return true;
  } catch (error) {
    console.error('Error updating password:', error);
    throw error;
  }
};

// Toggle user active status
const toggleUserActive = async (userId, active) => {
  try {
    const user = await findUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    await user.update({ active });
    return true;
  } catch (error) {
    console.error('Error toggling user active status:', error);
    throw error;
  }
};

// Delete user (hard delete)
const deleteUser = async (userId) => {
  try {
    const user = await findUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    await user.destroy();
    return true;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

// Validate password
const validatePassword = async (plainPassword, hashedPassword) => {
  return await bcrypt.compare(plainPassword, hashedPassword);
};

// Migrate users from JSON file to database
const migrateUsersFromJson = async (jsonUsers) => {
  try {
    for (const user of jsonUsers) {
      // Check if user already exists in database
      const existingUser = await findUserByEmail(user.email);
      if (!existingUser) {
        // Generate a valid UUID for the user
        const uuid = require('uuid');
        const userId = uuid.v4();
        
        console.log(`Migrating user ${user.email} with new UUID ${userId}`);
        
        // Create user with a valid UUID
        await User.create({
          id: userId, // Use UUID v4 instead of the original ID
          email: user.email,
          password: user.password, // Already hashed
          name: user.name,
          role: user.role,
          active: user.active !== false, // Default to true if not specified
          lastLogin: user.lastLogin ? new Date(user.lastLogin) : null,
          createdAt: user.createdAt ? new Date(user.createdAt) : new Date()
        }, {
          hooks: false // Skip password hashing since it's already hashed
        });
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
