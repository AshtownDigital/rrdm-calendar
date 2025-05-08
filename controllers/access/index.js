/**
 * Access Controllers Index
 * Exports all access controllers
 */

const authController = require('./authController');
const userController = require('./userController');

module.exports = {
  authController,
  userController
};
