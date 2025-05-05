const request = require('supertest');
const { app } = require('../../server');
const { prisma } = require('../../config/prisma');

// Longer timeouts for tests
jest.setTimeout(30000);

describe('API Endpoints', () => {
  let server;
  let agent;
  let mockUser;
  
  beforeAll(async () => {
    // Clear any existing sessions
    await prisma.session.deleteMany();

    // Wait for database connection
    await prisma.$connect();

    // Mock user
    mockUser = {
      id: 'user-123',
      email: 'user@test.com',
      password: 'password123',
      role: 'business',
      active: true
    };

    // Start server and create agent
    server = app.listen(0);
    agent = request.agent(server);

    // Wait for server to be ready
    await new Promise((resolve) => server.once('listening', resolve));

    // Log in user
    await agent
      .post('/access/login')
      .send({
        email: 'user@test.com',
        password: 'password123'
      })
      .expect(302);
  });

  afterAll(async () => {
    await prisma.session.deleteMany();
    await prisma.$disconnect();
    await new Promise((resolve) => server.close(resolve));
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await agent
        .get('/api/health')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version');
    });
  });

  describe('Reference Data API', () => {
    it('should return items list', async () => {
      const response = await agent
        .get('/api/items')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toBeInstanceOf(Array);
    });

    it('should return a specific item', async () => {
      // Assuming there's an item with ID 1
      const response = await agent
        .get('/api/items/1')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('description');
    });

    it('should handle non-existent item', async () => {
      const response = await agent
        .get('/api/items/999999')
        .expect(404)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('error', 'Item not found');
    });

    it('should return values for an item', async () => {
      // Assuming there's an item with ID 1
      const response = await agent
        .get('/api/items/1/values')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toBeInstanceOf(Array);
    });
  });

  describe('Funding API', () => {
    it('should return funding requirements', async () => {
      const response = await agent
        .get('/api/funding/requirements')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body[0]).toHaveProperty('route');
      expect(response.body[0]).toHaveProperty('requirements');
    });

    it('should return funding history', async () => {
      const response = await agent
        .get('/api/funding/history')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body[0]).toHaveProperty('year');
      expect(response.body[0]).toHaveProperty('changes');
    });

    it('should filter funding requirements by route', async () => {
      const response = await agent
        .get('/api/funding/requirements?route=primary')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body[0]).toHaveProperty('route', 'primary');
    });
  });

  describe('BCR API', () => {
    it('should return BCR list', async () => {
      const response = await agent
        .get('/api/bcr')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toBeInstanceOf(Array);
    });

    it('should create a new BCR', async () => {
      const response = await agent
        .post('/api/bcr')
        .send({
          title: 'API Test BCR',
          description: 'This is a BCR created via API',
          priority: 'medium',
          targetDate: '2025-06-01'
        })
        .expect(201)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('title', 'API Test BCR');
    });

    it('should return a specific BCR', async () => {
      // First create a BCR
      const createResponse = await agent
        .post('/api/bcr')
        .send({
          title: 'View API Test BCR',
          description: 'This is a BCR for API viewing',
          priority: 'high',
          targetDate: '2025-07-01'
        })
        .expect(201);
      
      const bcrId = createResponse.body.id;
      
      const response = await agent
        .get(`/api/bcr/${bcrId}`)
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('id', bcrId);
      expect(response.body).toHaveProperty('title', 'View API Test BCR');
    });

    it('should update BCR status', async () => {
      // First create a BCR
      const createResponse = await agent
        .post('/api/bcr')
        .send({
          title: 'Status API Test BCR',
          description: 'This is a BCR for API status testing',
          priority: 'medium',
          targetDate: '2025-08-01'
        })
        .expect(201);
      
      const bcrId = createResponse.body.id;
      
      const response = await agent
        .patch(`/api/bcr/${bcrId}/status`)
        .send({
          status: 'in-progress',
          comment: 'Work has started via API'
        })
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('id', bcrId);
      expect(response.body).toHaveProperty('status', 'in-progress');
    });
  });

  describe('User API', () => {
    it('should return current user profile', async () => {
      const response = await agent
        .get('/api/user/profile')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('email', 'user@test.com');
      expect(response.body).toHaveProperty('role', 'business');
    });

    it('should update user preferences', async () => {
      const response = await agent
        .patch('/api/user/preferences')
        .send({
          theme: 'dark',
          notifications: true
        })
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('preferences');
      expect(response.body.preferences).toHaveProperty('theme', 'dark');
      expect(response.body.preferences).toHaveProperty('notifications', true);
    });
  });

  describe('API Error Handling', () => {
    it('should return 401 for unauthenticated requests', async () => {
      // Create a new agent without authentication
      const unauthAgent = request(app);
      
      const response = await unauthAgent
        .get('/api/items')
        .expect(401)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });

    it('should return 404 for non-existent endpoints', async () => {
      const response = await agent
        .get('/api/non-existent-endpoint')
        .expect(404)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('error', 'Not Found');
    });

    it('should return 400 for invalid request data', async () => {
      const response = await agent
        .post('/api/bcr')
        .send({
          // Missing required fields
        })
        .expect(400)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('validationErrors');
    });
  });
});
