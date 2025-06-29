/**
 * Controllers Index
 * Main entry point for all controllers
 */

const bcrControllers = require('./bcr');
const apiControllers = require('./api');
const referenceDataControllers = require('./reference-data');
const accessControllers = require('./access');
const fundingControllers = require('./funding');

module.exports = {
  bcr: bcrControllers,
  api: apiControllers,
  referenceData: referenceDataControllers,
  access: accessControllers,
  funding: fundingControllers
};
