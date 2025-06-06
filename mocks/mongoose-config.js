/**
 * Mock mongoose configuration for testing
 */

const mongoose = require('./mongoose');

module.exports = {
  mongoose,
  connect: jest.fn().mockResolvedValue(mongoose),
  disconnect: jest.fn().mockResolvedValue(true)
};
