/**
 * Cloud Run start script for RRDM application
 */

// Set environment variables for Cloud Run
process.env.NODE_ENV = 'production';
process.env.DISABLE_FILE_WATCHING = 'true';
process.env.USE_SIMPLE_SERVER = 'false';

console.log('Starting RRDM in Cloud Run environment');
console.log('PORT:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);

try {
  // Apply nunjucks patch first to disable file watching
  require('./heroku-nunjucks-patch');
  console.log('Nunjucks patch applied successfully');
} catch (err) {
  console.error('Error applying Nunjucks patch:', err.message);
}

// Start the full server
require('./server');
