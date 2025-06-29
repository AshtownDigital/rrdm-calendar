/**
 * Mock User model for development and testing
 */
const fs = require('fs');
const path = require('path');

// Load mock users from JSON file
let mockUsers = [];
try {
  const mockDataPath = path.join(__dirname, '../mock-data/users.json');
  if ((process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') && fs.existsSync(mockDataPath)) {
    const rawData = fs.readFileSync(mockDataPath, 'utf8');
    mockUsers = JSON.parse(rawData);
    console.log(`Loaded ${mockUsers.length} mock users for testing/development`);
  }
} catch (error) {
  console.error('Error loading mock users:', error);
}

// Mock User model that mimics Mongoose functionality
class UserMock {
  static async findOne(query) {
    if (!mockUsers.length) return null;
    
    // Handle email queries
    if (query.email) {
      return mockUsers.find(user => user.email === query.email);
    }
    
    // Handle _id queries
    if (query._id) {
      return mockUsers.find(user => user._id === query._id);
    }
    
    return mockUsers[0]; // Default to first user if no match
  }
  
  static async find(query = {}) {
    return mockUsers;
  }
  
  static async findById(id) {
    return mockUsers.find(user => user._id === id);
  }
  
  static async countDocuments(query = {}) {
    if (Object.keys(query).length === 0) {
      return mockUsers.length;
    }
    
    // Filter by role if specified
    if (query.role) {
      return mockUsers.filter(user => user.role === query.role).length;
    }
    
    // Filter by active status if specified
    if (query.active !== undefined) {
      return mockUsers.filter(user => user.active === query.active).length;
    }
    
    return mockUsers.length;
  }
}

module.exports = UserMock;
