/**
 * Prisma User utilities for RRDM application
 * Provides functions to manage users in the Neon PostgreSQL database using Prisma
 */
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { prisma } = require('../config/database');

/**
 * Get all users
 * @returns {Promise<Array>} Array of users
 */
const getAllUsers = async () => {
  try {
    const users = await prisma.users.findMany({
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    // Remove sensitive data
    return users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
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
    const user = await prisma.users.findUnique({
      where: {
        email: email.toLowerCase()
      }
    });
    
    return user;
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
    const user = await prisma.users.findUnique({
      where: { id }
    });
    
    return user;
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
    
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);
    
    // Create new user
    const user = await prisma.users.create({
      data: {
        id: uuidv4(),
        email: userData.email.toLowerCase(),
        password: hashedPassword,
        name: userData.name || userData.email.split('@')[0],
        role: userData.role || 'business',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    // Return user without password
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
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
    await prisma.users.update({
      where: { id: userId },
      data: { 
        lastLogin: new Date(),
        updatedAt: new Date()
      }
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
      if (existingUser && existingUser.id !== userId) {
        throw new Error('Email is already in use by another user');
      }
    }
    
    // Update user
    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: {
        ...userData,
        updatedAt: new Date()
      }
    });
    
    // Return user without password
    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
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
    // Hash the new password
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
    await prisma.users.update({
      where: { id: userId },
      data: { 
        active: active,
        updatedAt: new Date()
      }
    });
    
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
    await prisma.users.delete({
      where: { id: userId }
    });
    
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
    for (const user of jsonUsers) {
      // Check if user already exists in database
      const existingUser = await findUserByEmail(user.email);
      if (!existingUser) {
        console.log(`Migrating user ${user.email}`);
        
        // Create user
        await prisma.users.create({
          data: {
            id: uuidv4(),
            email: user.email.toLowerCase(),
            password: user.password, // Already hashed
            name: user.name,
            role: user.role || 'business',
            active: user.active !== false, // Default to true if not specified
            lastLogin: user.lastLogin ? new Date(user.lastLogin) : null,
            createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
            updatedAt: user.updatedAt ? new Date(user.updatedAt) : new Date()
          }
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
