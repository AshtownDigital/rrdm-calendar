/**
 * Models index file
 * Exports all MongoDB models
 */
const User = require('./User');
const Bcr = require('./Bcr');
const BcrConfig = require('./BcrConfig');

module.exports = {
  User,
  Bcr,
  BcrConfig
};
