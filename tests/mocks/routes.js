const express = require('express');

// Create mock routers
const createMockRouter = () => {
  const router = express.Router();
  router.get = jest.fn(router.get);
  router.post = jest.fn(router.post);
  router.put = jest.fn(router.put);
  router.delete = jest.fn(router.delete);
  return router;
};

module.exports = {
  accessRouter: createMockRouter(),
  homeRouter: createMockRouter(),
  refDataRouter: createMockRouter(),
  fundingRouter: createMockRouter(),
  bcrRouter: createMockRouter(),
  itemsRouter: createMockRouter(),
  valuesRouter: createMockRouter(),
  releaseNotesRouter: createMockRouter(),
  restorePointsRouter: createMockRouter(),
  apiRouter: createMockRouter()
};
