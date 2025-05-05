const request = require('supertest');
const { app } = require('../../server');
const { prisma } = require('../../config/prisma');
const fs = require('fs');
const path = require('path');

// Longer timeouts for tests
jest.setTimeout(30000);

describe('Funding Module', () => {
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

  describe('Funding Overview', () => {
    it('should show the funding overview page', async () => {
      const response = await agent
        .get('/funding')
        .expect(200);

      expect(response.text).toContain('Funding');
      // Check for overview cards
      expect(response.text).toContain('Requirements');
      expect(response.text).toContain('History');
      expect(response.text).toContain('Reports');
    });
  });

  describe('Funding Requirements', () => {
    it('should show the funding requirements page', async () => {
      const response = await agent
        .get('/funding/requirements')
        .expect(200);

      expect(response.text).toContain('Funding Requirements');
      // Check for training routes
      expect(response.text).toContain('Training Routes');
    });

    it('should filter requirements by training route', async () => {
      const response = await agent
        .get('/funding/requirements?route=primary')
        .expect(200);

      expect(response.text).toContain('Primary');
      // Should show filtered data
      expect(response.text).toContain('Primary Route Requirements');
    });
  });

  describe('Funding History', () => {
    it('should show the funding history page', async () => {
      const response = await agent
        .get('/funding/history')
        .expect(200);

      expect(response.text).toContain('Funding History');
      // Check for history data
      expect(response.text).toContain('Changes over time');
    });

    it('should filter history by academic year', async () => {
      const response = await agent
        .get('/funding/history?year=2024-2025')
        .expect(200);

      expect(response.text).toContain('2024-2025');
      // Should show filtered data for the selected year
      expect(response.text).toContain('Funding data for 2024-2025');
    });
  });

  describe('Funding Reports', () => {
    it('should show the funding reports page', async () => {
      const response = await agent
        .get('/funding/reports')
        .expect(200);

      expect(response.text).toContain('Funding Reports');
      // Check for report generation options
      expect(response.text).toContain('Generate Report');
    });

    it('should generate a funding report', async () => {
      const response = await agent
        .post('/funding/reports/generate')
        .send({
          reportType: 'summary',
          academicYear: '2024-2025',
          format: 'csv'
        })
        .expect(200);

      // Should indicate successful report generation
      expect(response.text).toContain('Report generated successfully');
      expect(response.headers['content-type']).toContain('text/csv');
    });
  });

  describe('Funding Navigation', () => {
    it('should show the custom funding navigation component', async () => {
      const response = await agent
        .get('/funding')
        .expect(200);

      // Check for custom navigation component
      expect(response.text).toContain('funding-navigation');
      expect(response.text).toContain('Requirements');
      expect(response.text).toContain('History');
      expect(response.text).toContain('Reports');
    });
  });

  describe('Funding Data', () => {
    it('should use the correct tag colors for funding status', async () => {
      const response = await agent
        .get('/funding/requirements')
        .expect(200);

      // Check for GOV.UK Design System tag colors
      expect(response.text).toContain('govuk-tag govuk-tag--green');
      expect(response.text).toContain('govuk-tag govuk-tag--blue');
      expect(response.text).toContain('govuk-tag govuk-tag--yellow');
    });
  });
});
