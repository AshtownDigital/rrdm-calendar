/**
 * Access Module Model
 * Consolidated model for all user, role, and permission operations
 */
const mongoose = require('mongoose');

// Define schemas directly in this file
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  password: { type: String, required: true },
  roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
  status: { type: String, default: 'Active' },
  lastLogin: { type: Date },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  deleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const roleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  permissions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Permission' }],
  deleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const permissionSchema = new mongoose.Schema({
  resource: { type: String, required: true },
  action: { type: String, required: true },
  description: { type: String },
  deleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Create models from schemas
const User = mongoose.models.User || mongoose.model('User', userSchema);
const Role = mongoose.models.Role || mongoose.model('Role', roleSchema);
const Permission = mongoose.models.Permission || mongoose.model('Permission', permissionSchema);

/**
 * Get all users with optional filtering
 */
exports.getAllUsers = async (filters = {}) => {
  try {
    // Create base query to exclude deleted users
    const query = { deleted: { $ne: true } };
    
    // Apply filters if provided
    if (filters.role) {
      query.roleId = filters.role;
    }
    
    if (filters.status) {
      query.status = filters.status;
    }
    
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } },
        { username: { $regex: filters.search, $options: 'i' } }
      ];
    }
    
    // Execute the query with population and sort
    return await User.find(query)
      .populate('roleId')
      .sort({ name: 1 })
      .exec();
  } catch (error) {
    console.error('Error in getAllUsers:', error);
    throw error;
  }
};

/**
 * Get a user by ID
 */
exports.getUserById = async (id) => {
  try {
    return await User.findById(id)
      .populate('roleId')
      .exec();
  } catch (error) {
    console.error('Error in getUserById:', error);
    throw error;
  }
};

/**
 * Get a user by username
 */
exports.getUserByUsername = async (username) => {
  try {
    return await User.findOne({ 
      username,
      deleted: { $ne: true }
    })
      .populate('roleId')
      .exec();
  } catch (error) {
    console.error('Error in getUserByUsername:', error);
    throw error;
  }
};

/**
 * Get a user by email
 */
exports.getUserByEmail = async (email) => {
  try {
    return await User.findOne({ 
      email,
      deleted: { $ne: true }
    })
      .populate('roleId')
      .exec();
  } catch (error) {
    console.error('Error in getUserByEmail:', error);
    throw error;
  }
};

/**
 * Get a user by reset password token
 */
exports.getUserByResetToken = async (token) => {
  try {
    return await User.findOne({ 
      resetPasswordToken: token,
      deleted: { $ne: true }
    })
      .populate('roleId')
      .exec();
  } catch (error) {
    console.error('Error in getUserByResetToken:', error);
    throw error;
  }
};

/**
 * Create a new user
 */
exports.createUser = async (userData) => {
  try {
    const user = new User(userData);
    await user.save();
    return user;
  } catch (error) {
    console.error('Error in createUser:', error);
    throw error;
  }
};

/**
 * Update a user
 */
exports.updateUser = async (id, userData) => {
  try {
    const user = await User.findByIdAndUpdate(
      id,
      { ...userData, updatedAt: new Date() },
      { new: true }
    ).exec();
    
    return user;
  } catch (error) {
    console.error('Error in updateUser:', error);
    throw error;
  }
};

/**
 * Delete a user (soft delete)
 */
exports.deleteUser = async (id) => {
  try {
    const user = await User.findByIdAndUpdate(
      id,
      { deleted: true, updatedAt: new Date() },
      { new: true }
    ).exec();
    
    return user;
  } catch (error) {
    console.error('Error in deleteUser:', error);
    throw error;
  }
};

/**
 * Count all users
 */
exports.countAllUsers = async () => {
  try {
    return await User.countDocuments({ deleted: { $ne: true } }).exec();
  } catch (error) {
    console.error('Error in countAllUsers:', error);
    throw error;
  }
};

/**
 * Get all roles
 */
exports.getAllRoles = async () => {
  try {
    return await Role.find({ deleted: { $ne: true } })
      .sort({ name: 1 })
      .exec();
  } catch (error) {
    console.error('Error in getAllRoles:', error);
    throw error;
  }
};

/**
 * Get a role by ID
 */
exports.getRoleById = async (id) => {
  try {
    return await Role.findById(id).exec();
  } catch (error) {
    console.error('Error in getRoleById:', error);
    throw error;
  }
};

/**
 * Create a new role
 */
exports.createRole = async (roleData) => {
  try {
    const role = new Role(roleData);
    await role.save();
    return role;
  } catch (error) {
    console.error('Error in createRole:', error);
    throw error;
  }
};

/**
 * Update a role
 */
exports.updateRole = async (id, roleData) => {
  try {
    const role = await Role.findByIdAndUpdate(
      id,
      { ...roleData, updatedAt: new Date() },
      { new: true }
    ).exec();
    
    return role;
  } catch (error) {
    console.error('Error in updateRole:', error);
    throw error;
  }
};

/**
 * Delete a role (soft delete)
 */
exports.deleteRole = async (id) => {
  try {
    const role = await Role.findByIdAndUpdate(
      id,
      { deleted: true, updatedAt: new Date() },
      { new: true }
    ).exec();
    
    return role;
  } catch (error) {
    console.error('Error in deleteRole:', error);
    throw error;
  }
};

/**
 * Count all roles
 */
exports.countAllRoles = async () => {
  try {
    return await Role.countDocuments({ deleted: { $ne: true } }).exec();
  } catch (error) {
    console.error('Error in countAllRoles:', error);
    throw error;
  }
};

/**
 * Get users by role ID
 */
exports.getUsersByRoleId = async (roleId) => {
  try {
    return await User.find({
      roleId,
      deleted: { $ne: true }
    })
      .sort({ name: 1 })
      .exec();
  } catch (error) {
    console.error('Error in getUsersByRoleId:', error);
    throw error;
  }
};

/**
 * Get all permissions
 */
exports.getAllPermissions = async (filters = {}) => {
  try {
    // Create base query to exclude deleted permissions
    const query = { deleted: { $ne: true } };
    
    // Apply filters if provided
    if (filters.resource) {
      query.resource = filters.resource;
    }
    
    if (filters.action) {
      query.action = filters.action;
    }
    
    if (filters.search) {
      query.$or = [
        { resource: { $regex: filters.search, $options: 'i' } },
        { action: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } }
      ];
    }
    
    return await Permission.find(query)
      .sort({ resource: 1, action: 1 })
      .exec();
  } catch (error) {
    console.error('Error in getAllPermissions:', error);
    throw error;
  }
};

/**
 * Get a permission by ID
 */
exports.getPermissionById = async (id) => {
  try {
    return await Permission.findById(id).exec();
  } catch (error) {
    console.error('Error in getPermissionById:', error);
    throw error;
  }
};

/**
 * Create a new permission
 */
exports.createPermission = async (permissionData) => {
  try {
    const permission = new Permission(permissionData);
    await permission.save();
    return permission;
  } catch (error) {
    console.error('Error in createPermission:', error);
    throw error;
  }
};

/**
 * Update a permission
 */
exports.updatePermission = async (id, permissionData) => {
  try {
    const permission = await Permission.findByIdAndUpdate(
      id,
      { ...permissionData, updatedAt: new Date() },
      { new: true }
    ).exec();
    
    return permission;
  } catch (error) {
    console.error('Error in updatePermission:', error);
    throw error;
  }
};

/**
 * Delete a permission (soft delete)
 */
exports.deletePermission = async (id) => {
  try {
    const permission = await Permission.findByIdAndUpdate(
      id,
      { deleted: true, updatedAt: new Date() },
      { new: true }
    ).exec();
    
    return permission;
  } catch (error) {
    console.error('Error in deletePermission:', error);
    throw error;
  }
};

/**
 * Count all permissions
 */
exports.countAllPermissions = async () => {
  try {
    return await Permission.countDocuments({ deleted: { $ne: true } }).exec();
  } catch (error) {
    console.error('Error in countAllPermissions:', error);
    throw error;
  }
};

/**
 * Get roles by permission ID
 */
exports.getRolesByPermissionId = async (permissionId) => {
  try {
    return await Role.find({
      permissions: permissionId,
      deleted: { $ne: true }
    })
      .sort({ name: 1 })
      .exec();
  } catch (error) {
    console.error('Error in getRolesByPermissionId:', error);
    throw error;
  }
};
