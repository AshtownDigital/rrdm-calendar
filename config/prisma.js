/**
 * Prisma client singleton for RRDM application
 * This ensures we only have one instance of PrismaClient
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
  errorFormat: 'pretty',
});

// Connect to the database immediately
prisma.$connect()
  .then(() => {
    console.log('Successfully connected to database');
  })
  .catch((error) => {
    console.error('Failed to connect to database:', error);
  });

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing Prisma connection');
  try {
    await prisma.$disconnect();
    console.log('Prisma disconnected successfully');
  } catch (error) {
    console.error('Error disconnecting from Prisma:', error);
  }
  process.exit(0);
});

module.exports = { prisma };
