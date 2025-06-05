/**
 * Mock mongoose for testing
 */

// Create mock schema
class MockSchema {
  constructor(definition, options) {
    this.definition = definition;
    this.options = options || {};
    this.paths = {};
    this.methods = {};
    this.statics = {};
    this.virtuals = {};
    this.settings = {};
  }
  
  static get Types() {
    return {
      ObjectId: jest.fn((id) => id || 'mock-object-id'),
      String: String,
      Number: Number,
      Boolean: Boolean,
      Date: Date,
      Buffer: Buffer,
      Mixed: Object,
      Array: Array
    };
  }
  
  set(key, value) {
    this.settings[key] = value;
    return this;
  }

  method(name, fn) {
    this.methods[name] = fn;
    return this;
  }

  static(name, fn) {
    this.statics[name] = fn;
    return this;
  }

  virtual(name) {
    const virtual = {
      get: jest.fn(),
      set: jest.fn(),
      getters: []
    };
    this.virtuals[name] = virtual;
    return virtual;
  }

  pre() {
    return this;
  }

  post() {
    return this;
  }

  index() {
    return this;
  }
}

// Create mock model
class MockModel {
  constructor(name, schema) {
    this.modelName = name;
    this.schema = schema;
    
    // Add common methods
    this.find = jest.fn().mockReturnThis();
    this.findOne = jest.fn().mockReturnThis();
    this.findById = jest.fn().mockReturnThis();
    this.populate = jest.fn().mockReturnThis();
    this.select = jest.fn().mockReturnThis();
    this.sort = jest.fn().mockReturnThis();
    this.skip = jest.fn().mockReturnThis();
    this.limit = jest.fn().mockReturnThis();
    this.lean = jest.fn().mockReturnThis();
    this.exec = jest.fn().mockResolvedValue([]);
    
    // CRUD operations
    this.create = jest.fn().mockResolvedValue({ _id: 'mock-id-123', ...schema.definition });
    this.updateOne = jest.fn().mockResolvedValue({ nModified: 1 });
    this.updateMany = jest.fn().mockResolvedValue({ nModified: 1 });
    this.deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });
    this.deleteMany = jest.fn().mockResolvedValue({ deletedCount: 1 });
    this.countDocuments = jest.fn().mockResolvedValue(0);
  }
}

// Create mongoose mock
const mongoose = {
  Schema: MockSchema,
  model: jest.fn((name, schema) => new MockModel(name, schema)),
  models: {},
  connect: jest.fn().mockResolvedValue({}),
  connection: {
    on: jest.fn(),
    once: jest.fn(),
    close: jest.fn().mockResolvedValue(true)
  },
  Types: {
    ObjectId: jest.fn((id) => id || 'mock-object-id')
  },
  set: jest.fn(),
  get: jest.fn()
};

module.exports = mongoose;
