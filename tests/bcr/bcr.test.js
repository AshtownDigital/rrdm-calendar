const request = require('supertest');
const { app } = require('../../server');
const { prisma } = require('../../config/prisma');

// Longer timeouts for tests
jest.setTimeout(30000);

describe('Business Change Request (BCR) Module', () => {
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

  describe('BCR Dashboard', () => {
    it('should show the BCR dashboard page', async () => {
      const response = await agent
        .get('/bcr')
        .expect(200);

      expect(response.text).toContain('Business Change Requests');
      // Check for dashboard elements
      expect(response.text).toContain('My Requests');
      expect(response.text).toContain('Create Request');
    });
  });

  describe('BCR Creation', () => {
    it('should show the BCR creation page', async () => {
      const response = await agent
        .get('/bcr/create')
        .expect(200);

      expect(response.text).toContain('Create Business Change Request');
      // Check for form elements
      expect(response.text).toContain('Title');
      expect(response.text).toContain('Description');
      expect(response.text).toContain('Priority');
    });

    it('should create a new BCR', async () => {
      const response = await agent
        .post('/bcr/create')
        .send({
          title: 'Test BCR',
          description: 'This is a test BCR',
          priority: 'medium',
          targetDate: '2025-06-01'
        })
        .expect(302);

      expect(response.headers.location).toContain('/bcr/view/');
    });

    it('should validate required fields', async () => {
      const response = await agent
        .post('/bcr/create')
        .send({})
        .expect(200);

      expect(response.text).toContain('Title is required');
      expect(response.text).toContain('Description is required');
    });
  });

  describe('BCR Viewing', () => {
    it('should show a specific BCR', async () => {
      // First create a BCR to view
      const createResponse = await agent
        .post('/bcr/create')
        .send({
          title: 'View Test BCR',
          description: 'This is a BCR for viewing',
          priority: 'high',
          targetDate: '2025-07-01'
        })
        .expect(302);
      
      const bcrId = createResponse.headers.location.split('/').pop();
      
      const response = await agent
        .get(`/bcr/view/${bcrId}`)
        .expect(200);

      expect(response.text).toContain('View Test BCR');
      expect(response.text).toContain('This is a BCR for viewing');
      expect(response.text).toContain('high');
    });
  });

  describe('BCR Status Updates', () => {
    it('should update BCR status', async () => {
      // First create a BCR to update
      const createResponse = await agent
        .post('/bcr/create')
        .send({
          title: 'Status Test BCR',
          description: 'This is a BCR for status testing',
          priority: 'medium',
          targetDate: '2025-08-01'
        })
        .expect(302);
      
      const bcrId = createResponse.headers.location.split('/').pop();
      
      const response = await agent
        .post(`/bcr/update-status/${bcrId}`)
        .send({
          status: 'in-progress',
          comment: 'Work has started'
        })
        .expect(302);

      expect(response.headers.location).toContain(`/bcr/view/${bcrId}`);
      
      // Verify status was updated
      const viewResponse = await agent
        .get(`/bcr/view/${bcrId}`)
        .expect(200);
        
      expect(viewResponse.text).toContain('in-progress');
      expect(viewResponse.text).toContain('Work has started');
    });
  });

  describe('BCR Listing and Filtering', () => {
    it('should list all BCRs', async () => {
      const response = await agent
        .get('/bcr/list')
        .expect(200);

      expect(response.text).toContain('Business Change Requests');
      expect(response.text).toContain('Test BCR');
      expect(response.text).toContain('View Test BCR');
      expect(response.text).toContain('Status Test BCR');
    });

    it('should filter BCRs by status', async () => {
      const response = await agent
        .get('/bcr/list?status=in-progress')
        .expect(200);

      expect(response.text).toContain('Status Test BCR');
      expect(response.text).toContain('in-progress');
    });

    it('should filter BCRs by priority', async () => {
      const response = await agent
        .get('/bcr/list?priority=high')
        .expect(200);

      expect(response.text).toContain('View Test BCR');
      expect(response.text).toContain('high');
    });
  });

  describe('BCR Tag Colors', () => {
    it('should use the correct tag colors for BCR status', async () => {
      const response = await agent
        .get('/bcr/list')
        .expect(200);

      // Check for GOV.UK Design System tag colors based on the memory
      expect(response.text).toContain('govuk-tag govuk-tag--blue');  // New/pending states
      expect(response.text).toContain('govuk-tag govuk-tag--light-blue');  // In-progress states
      expect(response.text).toContain('govuk-tag govuk-tag--green');  // Success/completed states
    });
  });
});
