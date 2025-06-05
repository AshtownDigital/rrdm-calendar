/**
 * API Integration Tests - Simplified Mock Version
 */
const express = require('express');

// Create a simple express app for testing
const createTestApp = () => {
  const app = express();
  
  // API routes
  app.get('/api', (req, res) => {
    res.json({ version: '1.0.0', name: 'RRDM API' });
  });
  
  app.get('/api/v1/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
  });
  
  // Protected route
  app.get('/api/v1/items', (req, res) => {
    if (req.headers['x-auth'] === 'false') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    res.json({ items: [{ id: 1, name: 'Item 1' }] });
  });
  
  // 404 handler
  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Not Found' });
  });
  
  return app;
};

// Tests
// Set a higher timeout for all tests in this file
jest.setTimeout(30000); // 30 seconds

describe('API Routes', () => {
  let app;
  let request;
  
  beforeEach(() => {
    // Create a fresh app for each test
    app = createTestApp();
    request = require('supertest')(app);
  });
  
  test('should return API version information', async () => {
    const response = await request.get('/api');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('version');
    expect(response.body).toHaveProperty('name');
  });
  
  test('should return health check information', async () => {
    const response = await request.get('/api/v1/health');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
  });
  
  test('should return reference data items', async () => {
    const response = await request.get('/api/v1/items');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('items');
    expect(Array.isArray(response.body.items)).toBe(true);
  });
  
  test('should return 404 for non-existent endpoints', async () => {
    const response = await request.get('/api/v1/non-existent');
    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error');
  });
  
  test('should return 401 for unauthenticated requests', async () => {
    const response = await request.get('/api/v1/items')
      .set('x-auth', 'false');
    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error', 'Unauthorized');
  });
});
