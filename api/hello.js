/**
 * Simple API endpoint for testing Vercel serverless functions
 */
module.exports = (req, res) => {
  res.status(200).json({
    message: 'Hello from RRDM API!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    mongodbUri: process.env.MONGODB_URI ? 'Set' : 'Not set'
  });
};
