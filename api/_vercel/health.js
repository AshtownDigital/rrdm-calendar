/**
 * Dedicated health check endpoint for Vercel
 * This is a minimal implementation to ensure Vercel can verify the deployment
 * 
 * IMPORTANT: This file uses CommonJS module syntax to ensure compatibility
 */
const { prisma } = require('../../config/database');

/**
 * Health check handler for Vercel
 */
module.exports = async (req, res) => {
  // Set appropriate headers
  res.setHeader('Content-Type', 'application/json');
  
  // Check database connection
  let dbStatus = 'unknown';
  try {
    // Simple database query to check connection
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (dbError) {
    dbStatus = 'disconnected';
    console.error('Database health check failed:', dbError.message);
  }
  
  // Return a simple health check response
  res.status(200).json({
    status: 'up',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    region: process.env.VERCEL_REGION || 'unknown',
    database: dbStatus,
    serverless: process.env.VERCEL === '1' ? true : false
  });
}
