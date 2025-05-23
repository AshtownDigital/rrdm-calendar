const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');

describe('Serverless Environment Tests', () => {
  let mongoServer;

  beforeAll(async () => {
    // Set up MongoDB Memory Server for testing
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    process.env.MONGODB_URI = mongoUri;
    process.env.VERCEL = '1'; // Enable serverless mode
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear all collections before each test
    const collections = await mongoose.connection.db.collections();
    for (let collection of collections) {
      await collection.deleteMany({});
    }
  });

  test('should connect to database in serverless environment', async () => {
    const response = await request(app).get('/');
    expect(response.status).not.toBe(500);
    expect(mongoose.connection.readyState).toBe(1); // 1 means connected
  });

  test('should serve static files in serverless environment', async () => {
    const response = await request(app).get('/assets/css/application.css');
    expect(response.status).toBe(200);
    expect(response.type).toBe('text/css');
  });

  test('should render templates in serverless environment', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.type).toBe('text/html');
  });

  test('should handle database connection errors gracefully', async () => {
    // Temporarily set invalid MongoDB URI
    const originalUri = process.env.MONGODB_URI;
    process.env.MONGODB_URI = 'mongodb://invalid:27017/test';

    const response = await request(app).get('/');
    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error');

    // Restore valid MongoDB URI
    process.env.MONGODB_URI = originalUri;
  });

  test('should maintain session in serverless environment', async () => {
    const agent = request.agent(app);
    
    // Make a request that would set session data
    await agent
      .post('/login')
      .send({ username: 'test', password: 'test' })
      .expect(302);

    // Verify session persists in subsequent request
    const response = await agent.get('/');
    expect(response.status).toBe(200);
  });
});
