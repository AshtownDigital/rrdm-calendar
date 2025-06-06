/**
 * Mock implementation of ioredis for testing
 */

const EventEmitter = require('events');

class RedisMock extends EventEmitter {
  constructor() {
    super();
    this.connected = true;
    this.data = {};
  }

  connect() {
    return Promise.resolve();
  }

  disconnect() {
    return Promise.resolve();
  }

  get(key) {
    return Promise.resolve(this.data[key] || null);
  }

  set(key, value) {
    this.data[key] = value;
    return Promise.resolve('OK');
  }

  del(key) {
    delete this.data[key];
    return Promise.resolve(1);
  }

  expire() {
    return Promise.resolve(1);
  }

  // Add other Redis commands as needed
  hset() {
    return Promise.resolve(1);
  }

  hget() {
    return Promise.resolve(null);
  }

  hgetall() {
    return Promise.resolve({});
  }

  hmset() {
    return Promise.resolve('OK');
  }

  incr() {
    return Promise.resolve(1);
  }

  decr() {
    return Promise.resolve(0);
  }
}

// Export a factory function that returns a new instance
module.exports = jest.fn(() => new RedisMock());
