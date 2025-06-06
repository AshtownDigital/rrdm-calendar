/**
 * Mock implementation of Sequelize for testing
 */

// Mock Model class
class Model {
  static init() {
    return this;
  }

  static associate() {
    return this;
  }

  static findAll() {
    return Promise.resolve([]);
  }

  static findOne() {
    return Promise.resolve(null);
  }

  static findByPk() {
    return Promise.resolve(null);
  }

  static create() {
    return Promise.resolve({});
  }

  static update() {
    return Promise.resolve([1]);
  }

  static destroy() {
    return Promise.resolve(1);
  }

  static belongsTo() {
    return this;
  }

  static hasMany() {
    return this;
  }

  static belongsToMany() {
    return this;
  }
}

// Mock Sequelize class
class Sequelize {
  constructor(database, username, password, options = {}) {
    // Handle different constructor signatures
    if (typeof database === 'object' && database !== null) {
      options = database;
    }
    
    // Set default options
    this.options = {
      dialect: 'mysql',
      host: 'localhost',
      port: 3306,
      ...options
    };
    
    this.models = {};
    this.QueryTypes = {
      SELECT: 'SELECT',
      INSERT: 'INSERT',
      UPDATE: 'UPDATE',
      DELETE: 'DELETE'
    };
  }

  define(modelName) {
    const model = Object.create(Model);
    this.models[modelName] = model;
    return model;
  }

  authenticate() {
    return Promise.resolve();
  }

  sync() {
    return Promise.resolve(this);
  }

  transaction(callback) {
    if (callback) {
      return callback({
        commit: () => Promise.resolve(),
        rollback: () => Promise.resolve()
      });
    }
    
    return Promise.resolve({
      commit: () => Promise.resolve(),
      rollback: () => Promise.resolve()
    });
  }

  query() {
    return Promise.resolve([]);
  }
}

// Mock DataTypes
Sequelize.DataTypes = {
  STRING: 'STRING',
  TEXT: 'TEXT',
  INTEGER: 'INTEGER',
  FLOAT: 'FLOAT',
  BOOLEAN: 'BOOLEAN',
  DATE: 'DATE',
  DATEONLY: 'DATEONLY',
  UUID: 'UUID',
  UUIDV4: 'UUIDV4',
  ENUM: (...values) => ({ values }),
  ARRAY: (type) => `ARRAY(${type})`,
  JSON: 'JSON',
  JSONB: 'JSONB'
};

// Export the mock
module.exports = Sequelize;
module.exports.Model = Model;
module.exports.Sequelize = Sequelize;
module.exports.Op = {
  eq: Symbol('eq'),
  ne: Symbol('ne'),
  gt: Symbol('gt'),
  gte: Symbol('gte'),
  lt: Symbol('lt'),
  lte: Symbol('lte'),
  in: Symbol('in'),
  notIn: Symbol('notIn'),
  like: Symbol('like'),
  notLike: Symbol('notLike'),
  iLike: Symbol('iLike'),
  notILike: Symbol('notILike'),
  and: Symbol('and'),
  or: Symbol('or')
};
