/**
 * User utilities for RRDM application
 * Provides functions to manage users (find, create, update, etc.)
 */
const bcrypt = require('bcryptjs');

// Use Neon PostgreSQL database
console.log('User utils using Neon PostgreSQL database');
const { prisma } = require('../config/database');


// Get all users
const getAllUsers = async () => {
  try {

    const users = await prisma.users.findMany();
    return users;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

// Find user by email
const findUserByEmail = async (email) => {
  try {
    console.log(`Looking for user with email: ${email}`);
    
    const user = await prisma.users.findUnique({
      where: {
        email: email.toLowerCase()
      }
    });
    
    console.log(`User found: ${user ? 'Yes' : 'No'}`);
    if (user) {
      console.log(`User details: id=${user.id}, name=${user.name}, role=${user.role}, active=${user.active}`);
    }
    
    return user;
  } catch (error) {
    console.error('Error finding user by email:', error);
    throw error;
  }
};

// Find user by ID
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

// Create a new user
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
        email: userData.email.toLowerCase(),
        password: hashedPassword,
        name: userData.name || userData.email.split('@')[0],
        role: userData.role || 'business',
        lastLogin: null
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

// Update user's last login time
const updateLastLogin = async (userId) => {
  try {

    
    await prisma.users.update({
      where: { id: userId },
      data: { lastLogin: new Date() }
    });
  } catch (error) {
    console.error('Error updating last login:', error);
  }
};

// Update user information
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
    const user = await prisma.users.update({
      where: { id: userId },
      data: userData
    });
    
    // Return user without password
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

// Update user's password
const updateUserPassword = async (userId, newPassword) => {
  try {

    
    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update password
    await prisma.users.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });
    
    return true;
  } catch (error) {
    console.error('Error updating password:', error);
    throw error;
  }
};

// Delete user (hard delete)
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

// Validate password
const validatePassword = async (plainPassword, hashedPassword) => {
  console.log('Validating password...');
  console.log(`Plain password length: ${plainPassword ? plainPassword.length : 0}`);
  console.log(`Hashed password: ${hashedPassword ? hashedPassword.substring(0, 10) + '...' : 'null'}`);
  
  const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
  console.log(`Password match: ${isMatch ? 'Yes' : 'No'}`);
  
  return isMatch;
};

module.exports = {
  findUserByEmail,
  findUserById,
  validatePassword,
  createUser,
  updateUser,
  updateUserPassword,
  getAllUsers,
  deleteUser,
  updateLastLogin
};
