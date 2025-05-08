// Simple health check endpoint for Vercel
// This file is completely standalone and doesn't import any other modules

module.exports = (req, res) => {
  // Set appropriate headers
  res.setHeader('Content-Type', 'application/json');
  
  // Return a simple health check response
  res.status(200).json({
    status: 'up',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    region: process.env.VERCEL_REGION || 'unknown'
  });
};
