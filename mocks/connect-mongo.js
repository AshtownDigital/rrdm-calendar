/**
 * Mock for connect-mongo package
 */

// Create a mock MongoStore class
class MockMongoStore {
  constructor(options) {
    this.options = options || {};
  }

  static create(options) {
    return new MockMongoStore(options);
  }
}

// Export the mock
module.exports = MockMongoStore;
