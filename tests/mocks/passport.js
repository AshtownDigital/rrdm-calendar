const LocalStrategy = require('passport-local').Strategy;
const userUtils = require('../../utils/user-utils');

module.exports = {
  initialize: () => (req, res, next) => next(),
  session: () => (req, res, next) => next(),
  authenticate: jest.fn(),
  use: jest.fn(),
  serializeUser: jest.fn(),
  deserializeUser: jest.fn()
};
