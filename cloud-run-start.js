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



// Start the full server
require('./server');
