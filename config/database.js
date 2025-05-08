/**
 * Database configuration for RRDM application
 * Establishes connection to PostgreSQL database using Prisma
 */
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

// Create Prisma client instance with logging in development mode
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Test database connection
const testConnection = async () => {
  try {
    await prisma.$connect();
    console.log('Database connection has been established successfully.');
    return true;
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    return false;
  }
};

// Function to disconnect from the database
const disconnect = async () => {
  await prisma.$disconnect();
  console.log('Database connection has been closed.');
};

module.exports = {
  prisma,
  testConnection,
  disconnect
};