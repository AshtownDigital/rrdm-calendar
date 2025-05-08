/**
 * API Integration Tests
 */
const request = require('supertest');
const app = require('../../server');

describe('API Routes', () => {
  // Mock authenticated user for tests
  let authenticatedRequest;

  beforeEach(() => {
    // Create an authenticated request agent
    authenticatedRequest = request.agent(app);
    
    // Mock authentication by setting session data
    authenticatedRequest.set('Cookie', ['rrdm.sid=test-session']);
  });

  describe('API Version Information', () => {
    it('should return API version information', async () => {
      const response = await authenticatedRequest.get('/api');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('name', 'RRDM API');
      expect(response.body).toHaveProperty('versions');
      expect(response.body.versions).toContain('v1');
      expect(response.body).toHaveProperty('currentVersion', 'v1');
    });
  });

  describe('API v1 Routes', () => {
    it('should return health check information', async () => {
      const response = await authenticatedRequest.get('/api/v1/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'API v1 is running');
      expect(response.body).toHaveProperty('version', 'v1');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should return reference data items', async () => {
      const response = await authenticatedRequest.get('/api/v1/items');
      
      expect(response.status).toBe(200);
      // The actual response will depend on the mock data in the test environment
      // but we can at least verify the structure
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('API Error Handling', () => {
    it('should return 404 for non-existent endpoints', async () => {
      const response = await authenticatedRequest.get('/api/v1/non-existent');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('status', 404);
    });

    it('should return 401 for unauthenticated requests', async () => {
      // Use a non-authenticated request
      const response = await request(app).get('/api/v1/items');
      
      expect(response.status).toBe(401);
      // The actual response will depend on how authentication is configured
      // but we expect some kind of error response
    });
  });
});
