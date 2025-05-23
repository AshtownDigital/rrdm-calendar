/**
 * Consolidated API handler for Vercel serverless environment
 * This file handles multiple API routes to stay within Vercel's Hobby plan limits
 * Updated for MongoDB integration
 */
const express = require('express');
const router = express.Router();

// Import the main Express app
const app = require('../server');

// Simple health check endpoint
const healthCheck = (req, res) => {
  // Format MongoDB URI for display (hide credentials)
  let mongoStatus = 'Not set';
  if (process.env.MONGODB_URI) {
    const uri = process.env.MONGODB_URI;
    mongoStatus = 'Set';
    // Add validation check
    if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
      mongoStatus = 'Invalid format';
    }
  }
  
  res.status(200).json({
    status: 'up',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    mongodbUri: mongoStatus,
    serverless: true
  });
};

// Hello endpoint (previously in hello.js)
const hello = (req, res) => {
  // Format MongoDB URI for display (hide credentials)
  let mongoStatus = 'Not set';
  if (process.env.MONGODB_URI) {
    const uri = process.env.MONGODB_URI;
    mongoStatus = 'Set';
    // Add validation check
    if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
      mongoStatus = 'Invalid format';
    }
  }
  
  res.status(200).json({
    message: 'Hello from RRDM API!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    mongodbUri: mongoStatus,
    serverless: true
  });
};

// Export the handler function for Vercel
module.exports = (req, res) => {
  console.log(`[Vercel Consolidated] Request received: ${req.method} ${req.url}`);
  
  // Set environment variables for serverless environment
  process.env.VERCEL = '1';
  
  // Handle specific API routes to reduce the number of serverless functions
  if (req.url === '/api/health' || req.url === '/_vercel/health') {
    return healthCheck(req, res);
  }
  
  if (req.url === '/api/hello') {
    return hello(req, res);
  }
  
  // For all other routes, use the main Express app
  try {
    // Disable Prisma in serverless environment to prevent stack overflow
    if (!global.prismaDisabled) {
      console.log('[Vercel] Disabling Prisma in serverless environment');
      global.prismaDisabled = true;
    }
    
    return app(req, res);
  } catch (error) {
    console.error('[Vercel Consolidated] Error handling request:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred while processing your request.',
      path: req.url,
      serverless: true
    });
  }
};
