/**
 * User utilities for RRDM application
 * Provides functions to manage users (find, create, update, etc.)
 */
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const USERS_FILE = path.join(__dirname, '../data/users.json');

// Get all users
const getAllUsers = () => {
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data).users || [];
  } catch (error) {
    console.error('Error reading users file:', error);
    return [];
  }
};

// Save users data
const saveUsers = (users) => {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify({ users }, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing users file:', error);
    return false;
  }
};

// Find user by email
const findUserByEmail = (email) => {
  const users = getAllUsers();
  return users.find(user => user.email.toLowerCase() === email.toLowerCase());
};

// Find user by ID
const findUserById = (id) => {
  const users = getAllUsers();
  return users.find(user => user.id === id);
};

// Create a new user
const createUser = async (userData) => {
  const users = getAllUsers();
  
  // Check if user with this email already exists
  if (findUserByEmail(userData.email)) {
    throw new Error('User with this email already exists');
  }
  
  // Generate a unique ID
  const id = `user-${Date.now().toString().slice(-6)}`;
  
  // Hash the password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(userData.password, salt);
  
  // Create new user object
  const newUser = {
    id,
    email: userData.email,
    password: hashedPassword,
    name: userData.name || userData.email.split('@')[0],
    role: userData.role || 'business', // Default role is business user
    createdAt: new Date().toISOString(),
    lastLogin: null
  };
  
  // Add to users array and save
  users.push(newUser);
  saveUsers(users);
  
  // Return user without password
  const { password, ...userWithoutPassword } = newUser;
  return userWithoutPassword;
};

// Update user's last login time
const updateLastLogin = (userId) => {
  const users = getAllUsers();
  const userIndex = users.findIndex(user => user.id === userId);
  
  if (userIndex !== -1) {
    users[userIndex].lastLogin = new Date().toISOString();
    saveUsers(users);
  }
};

// Update user information
const updateUser = async (userId, userData) => {
  const users = getAllUsers();
  const userIndex = users.findIndex(user => user.id === userId);
  
  if (userIndex === -1) {
    throw new Error('User not found');
  }
  
  // If updating email, check if it's already in use by another user
  if (userData.email && userData.email !== users[userIndex].email) {
    const existingUser = findUserByEmail(userData.email);
    if (existingUser && existingUser.id !== userId) {
      throw new Error('Email is already in use by another user');
    }
  }
  
  // Update user properties
  users[userIndex] = {
    ...users[userIndex],
    ...userData
  };
  
  saveUsers(users);
  
  // Return user without password
  const { password, ...userWithoutPassword } = users[userIndex];
  return userWithoutPassword;
};

// Update user's password
const updateUserPassword = async (userId, newPassword) => {
  const users = getAllUsers();
  const userIndex = users.findIndex(user => user.id === userId);
  
  if (userIndex === -1) {
    throw new Error('User not found');
  }
  
  // Hash the new password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);
  
  // Update password
  users[userIndex].password = hashedPassword;
  
  saveUsers(users);
  
  return true;
};

// Delete user (hard delete)
const deleteUser = async (userId) => {
  const users = getAllUsers();
  const userIndex = users.findIndex(user => user.id === userId);
  
  if (userIndex === -1) {
    throw new Error('User not found');
  }
  
  // Remove user from array
  users.splice(userIndex, 1);
  
  saveUsers(users);
  
  return true;
};

// Validate password
const validatePassword = async (plainPassword, hashedPassword) => {
  return await bcrypt.compare(plainPassword, hashedPassword);
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
  deleteUser,
  saveUsers
};
