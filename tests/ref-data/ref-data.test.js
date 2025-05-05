const request = require('supertest');
const { app } = require('../../server');
const { prisma } = require('../../config/prisma');

// Longer timeouts for tests
jest.setTimeout(30000);

describe('Reference Data Module', () => {
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

  describe('Reference Data Dashboard', () => {
    it('should show the reference data dashboard page', async () => {
      const response = await agent
        .get('/ref-data/dashboard')
        .expect(200);

      expect(response.text).toContain('Reference Data');
      // Check for dashboard elements
      expect(response.text).toContain('Data Dictionary');
      expect(response.text).toContain('Items');
      expect(response.text).toContain('Values');
    });
  });

  describe('Data Dictionary', () => {
    it('should show the data dictionary page', async () => {
      const response = await agent
        .get('/ref-data/dictionary')
        .expect(200);

      expect(response.text).toContain('Data Dictionary');
      // Check for dictionary elements
      expect(response.text).toContain('Items');
      expect(response.text).toContain('Definitions');
    });

    it('should filter dictionary by category', async () => {
      const response = await agent
        .get('/ref-data/dictionary?category=academic')
        .expect(200);

      expect(response.text).toContain('Academic');
      // Should show filtered data
      expect(response.text).toContain('Academic Data');
    });
  });

  describe('Items Management', () => {
    it('should show the items list page', async () => {
      const response = await agent
        .get('/items')
        .expect(200);

      expect(response.text).toContain('Reference Data Items');
      // Check for items list
      expect(response.text).toContain('Item Name');
      expect(response.text).toContain('Description');
    });

    it('should show item details', async () => {
      // Assuming there's an item with ID 1
      const response = await agent
        .get('/items/1')
        .expect(200);

      expect(response.text).toContain('Item Details');
      expect(response.text).toContain('Values');
    });

    it('should create a new item', async () => {
      const response = await agent
        .post('/items/create')
        .send({
          name: 'Test Item',
          description: 'This is a test item',
          category: 'test'
        })
        .expect(302);

      expect(response.headers.location).toContain('/items/');
    });

    it('should validate required fields for item creation', async () => {
      const response = await agent
        .post('/items/create')
        .send({})
        .expect(200);

      expect(response.text).toContain('Name is required');
      expect(response.text).toContain('Description is required');
    });
  });

  describe('Values Management', () => {
    it('should show the values list page', async () => {
      const response = await agent
        .get('/values')
        .expect(200);

      expect(response.text).toContain('Reference Data Values');
      // Check for values list
      expect(response.text).toContain('Value');
      expect(response.text).toContain('Item');
    });

    it('should show value details', async () => {
      // Assuming there's a value with ID 1
      const response = await agent
        .get('/values/1')
        .expect(200);

      expect(response.text).toContain('Value Details');
    });

    it('should create a new value', async () => {
      const response = await agent
        .post('/values/create')
        .send({
          value: 'Test Value',
          itemId: '1',
          description: 'This is a test value'
        })
        .expect(302);

      expect(response.headers.location).toContain('/values/');
    });

    it('should validate required fields for value creation', async () => {
      const response = await agent
        .post('/values/create')
        .send({})
        .expect(200);

      expect(response.text).toContain('Value is required');
      expect(response.text).toContain('Item is required');
    });
  });

  describe('Release Notes', () => {
    it('should show the release notes page', async () => {
      const response = await agent
        .get('/release-notes')
        .expect(200);

      expect(response.text).toContain('Release Notes');
      // Check for release notes elements
      expect(response.text).toContain('Version');
      expect(response.text).toContain('Date');
      expect(response.text).toContain('Changes');
    });
  });

  describe('Restore Points', () => {
    it('should show the restore points page', async () => {
      const response = await agent
        .get('/restore-points')
        .expect(200);

      expect(response.text).toContain('Restore Points');
      // Check for restore points elements
      expect(response.text).toContain('Date');
      expect(response.text).toContain('Description');
    });

    it('should create a restore point', async () => {
      const response = await agent
        .post('/restore-points/create')
        .send({
          description: 'Test Restore Point'
        })
        .expect(302);

      expect(response.headers.location).toContain('/restore-points');
    });
  });

  describe('Tag Colors', () => {
    it('should use the correct tag colors for status indicators', async () => {
      const response = await agent
        .get('/items')
        .expect(200);

      // Check for GOV.UK Design System tag colors based on the memory
      expect(response.text).toContain('govuk-tag govuk-tag--green');  // Success/completed states
      expect(response.text).toContain('govuk-tag govuk-tag--grey');   // Inactive/neutral states
      expect(response.text).toContain('govuk-tag govuk-tag--blue');   // New/pending states
    });
  });
});
