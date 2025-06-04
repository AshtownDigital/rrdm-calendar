/**
 * Simple server starter for RRDM application
 * This file starts the simplified server for deployment testing
 */

console.log('<<<<< Starting simplified server for deployment testing >>>>>');

// Load environment variables
require('dotenv').config();

// Check if we should use the simplified server
const useSimpleServer = process.env.USE_SIMPLE_SERVER === 'true' || process.env.NODE_ENV === 'test-deployment';

if (useSimpleServer) {
  console.log('Using simplified server configuration for deployment testing');
  require('./server-simple');
} else {
  console.log('Using full application server');
  require('./server');
}
