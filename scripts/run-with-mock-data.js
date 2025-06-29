/**
 * Script to run the server with mock data
 * Run with: node scripts/run-with-mock-data.js
 */

// Set environment to test mode
process.env.NODE_ENV = 'test';

// Set port to 3002 since 3000 and 3001 are in use
process.env.PORT = 3002;

// Import and run the server
require('../server');

console.log('Server started in TEST mode with mock data');
console.log('Academic years from mock-data/academic-years.json will be used');
console.log('Access the academic years page at: http://localhost:3002/academic-years');
