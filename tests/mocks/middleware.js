// Mock middleware functions
const forwardAuthenticated = (req, res, next) => next();
const ensureAuthenticated = (req, res, next) => next();
const ensureAdmin = (req, res, next) => next();
const checkPermission = (permission) => (req, res, next) => next();

module.exports = {
  forwardAuthenticated,
  ensureAuthenticated,
  ensureAdmin,
  checkPermission
};
