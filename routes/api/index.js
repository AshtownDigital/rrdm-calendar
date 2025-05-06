/**
 * API Routes Index
 */
const express = require('express');
const router = express.Router();

// Import API route modules
const { router: healthRouter } = require('./health');
const { router: itemsRouter } = require('./items');
const { router: fundingRouter } = require('./funding');
const { router: bcrRouter } = require('./bcr');
const { router: userRouter } = require('./user');

// Mount API routes
router.use('/health', healthRouter);
router.use('/items', itemsRouter);
router.use('/funding', fundingRouter);
router.use('/bcr', bcrRouter);
router.use('/user', userRouter);

module.exports = router;
