/**
 * Mock for config/prisma.js
 */
const { PrismaClient } = require('./prisma');

// Create a mock prisma client instance
const prisma = new PrismaClient();

module.exports = {
  prisma
};
