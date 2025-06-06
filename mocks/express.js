/**
 * Mock implementation of Express for testing
 */

// Mock response object
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.render = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  res.sendStatus = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  res.type = jest.fn().mockReturnValue(res);
  res.locals = {};
  res.headersSent = false;
  return res;
};

// Mock request object
const mockRequest = (options = {}) => {
  const req = {};
  req.body = options.body || {};
  req.query = options.query || {};
  req.params = options.params || {};
  req.session = options.session || {};
  req.cookies = options.cookies || {};
  req.headers = options.headers || {};
  req.get = jest.fn().mockImplementation((header) => req.headers[header]);
  req.path = options.path || '/';
  req.url = options.url || req.path;
  req.method = options.method || 'GET';
  req.originalUrl = options.originalUrl || req.url;
  req.user = options.user || null;
  req.flash = jest.fn();
  req.isAuthenticated = jest.fn().mockReturnValue(!!req.user);
  return req;
};

// Mock router
const mockRouter = () => {
  const router = jest.fn();
  router.get = jest.fn().mockReturnValue(router);
  router.post = jest.fn().mockReturnValue(router);
  router.put = jest.fn().mockReturnValue(router);
  router.delete = jest.fn().mockReturnValue(router);
  router.patch = jest.fn().mockReturnValue(router);
  router.use = jest.fn().mockReturnValue(router);
  router.all = jest.fn().mockReturnValue(router);
  router.route = jest.fn().mockReturnValue(router);
  router.param = jest.fn().mockReturnValue(router);
  return router;
};

// Mock Express app
const mockApp = () => {
  const app = jest.fn();
  app.get = jest.fn().mockReturnValue(app);
  app.post = jest.fn().mockReturnValue(app);
  app.put = jest.fn().mockReturnValue(app);
  app.delete = jest.fn().mockReturnValue(app);
  app.patch = jest.fn().mockReturnValue(app);
  app.use = jest.fn().mockReturnValue(app);
  app.all = jest.fn().mockReturnValue(app);
  app.route = jest.fn().mockReturnValue(app);
  app.param = jest.fn().mockReturnValue(app);
  app.set = jest.fn().mockReturnValue(app);
  app.engine = jest.fn().mockReturnValue(app);
  app.listen = jest.fn().mockImplementation((port, callback) => {
    if (callback) callback();
    return { close: jest.fn() };
  });
  app.locals = {};
  return app;
};

// Mock Express function
const express = jest.fn().mockImplementation(() => mockApp());

// Add Express methods
express.Router = jest.fn().mockImplementation(() => mockRouter());
express.static = jest.fn().mockReturnValue(jest.fn());
express.json = jest.fn().mockReturnValue(jest.fn());
express.urlencoded = jest.fn().mockReturnValue(jest.fn());
express.raw = jest.fn().mockReturnValue(jest.fn());
express.text = jest.fn().mockReturnValue(jest.fn());

// Export the mock
module.exports = express;
module.exports.mockRequest = mockRequest;
module.exports.mockResponse = mockResponse;
module.exports.mockRouter = mockRouter;
module.exports.mockApp = mockApp;
