/**
 * Mock for ../config/database.js
 */
const { mockPrisma } = require('./prisma');

module.exports = {
  prisma: mockPrisma
};
