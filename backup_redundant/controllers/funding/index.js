/**
 * Funding Controllers Index
 * Exports all funding controllers
 */

const indexController = require('./indexController');
const allocationsController = require('./allocationsController');

module.exports = {
  indexController,
  allocationsController
};
