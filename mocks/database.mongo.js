/**
 * Mock MongoDB database configuration for testing
 */
const mongoose = require('./mongoose');

// Export a pre-connected mongoose instance
const connect = async () => {
  return Promise.resolve(mongoose);
};

module.exports = {
  connect,
  mongoose
};
