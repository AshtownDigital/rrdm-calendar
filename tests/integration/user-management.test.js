const request = require('supertest');
const { app } = require('../../server');
const { prisma } = require('../../config/prisma');
const bcrypt = require('bcryptjs');
const userUtils = require('../../utils/user-utils');
const passport = require('passport');

// Longer timeouts for tests
jest.setTimeout(30000);

describe('User Management', () => {
  jest.setTimeout(60000); 
  let server;
  let agent;
  let userAgent;
  let mockAdminUser;
  let mockUser;
  let testUser;
  let adminCookie;
  let userCookie;

  beforeAll(async () => {
    // Clear any existing sessions
    await prisma.session.deleteMany();

    // Wait for database connection
    await prisma.$connect();

    // Clear any existing test users
    await prisma.users.deleteMany({
      where: {
        email: {
          in: ['admin@test.com', 'test@example.com', 'updated@example.com', 'regular@test.com']
        }
      }
    });

    // Create test user first
    testUser = await prisma.users.create({
      data: {
        email: 'test@example.com',
        password: await bcrypt.hash('password123', 10),
        role: 'business',
        active: true
      }
    });

    // Mock admin user
    mockAdminUser = {
      id: 'admin-123',
      email: 'admin@test.com',
      password: 'password123',
      role: 'admin',
      active: true
    };

    // Mock regular user
    mockUser = {
      id: 'user-123',
      email: 'user@test.com',
      password: 'password123',
      role: 'business',
      active: true
    };

    // Mock bcrypt
    bcrypt.hash = jest.fn().mockResolvedValue('hashedPassword');
    bcrypt.compare = jest.fn().mockResolvedValue(true);

    // Mock userUtils
    userUtils.findUserByEmail = jest.fn().mockImplementation((email) => {
      if (email === 'admin@test.com') {
        return mockAdminUser;
      } else if (email === 'user@test.com') {
        return mockUser;
      }
      return null;
    });

    userUtils.findUserById = jest.fn().mockImplementation((id) => {
      if (id === 'admin-123') {
        return mockAdminUser;
      } else if (id === 'user-123') {
        return mockUser;
      }
      return null;
    });

    userUtils.validatePassword = jest.fn().mockResolvedValue(true);
    userUtils.getAllUsers = jest.fn().mockResolvedValue([
      mockAdminUser,
      mockUser,
      testUser
    ]);

    // Start server and create agents
    server = app.listen(0);
    agent = request.agent(server);
    userAgent = request.agent(server);

    // Wait for server to be ready
    await new Promise((resolve) => server.once('listening', resolve));

    // Log in admin user
    await agent
      .post('/access/login')
      .send({
        email: 'admin@test.com',
        password: 'password123'
      })
      .expect(302);

    // Skip getting cookies directly - supertest will handle this internally
    adminCookie = null; // Not needed as the agent maintains its own cookie jar

    // Log in regular user
    await userAgent
      .post('/access/login')
      .send({
        email: 'user@test.com',
        password: 'password123'
      })
      .expect(302);

    // Skip getting cookies directly - supertest will handle this internally
    userCookie = null; // Not needed as the agent maintains its own cookie jar
  });

  afterAll(async () => {
    await prisma.users.deleteMany();
    await prisma.session.deleteMany();
    await prisma.$disconnect();
    await new Promise((resolve) => server.close(resolve));
  });

  describe('View User Management Pages', () => {
    it('should show the user management page', async () => {
      // Mock getAllUsers
      userUtils.getAllUsers = jest.fn().mockResolvedValue([
        { id: 'admin-123', email: 'admin@test.com', role: 'admin', active: true },
        { id: 'user-123', email: 'user@test.com', role: 'business', active: true }
      ]);

      const response = await agent
        .get('/access/manage')
        // Cookie is automatically handled by the agent
        .expect(200);

      expect(response.text).toContain('User Management');
      expect(response.text).toContain('Create User');
    });

    it('should deny access to non-admin users', async () => {
      const response = await userAgent
        .get('/access/manage')
        // Cookie is automatically handled by the agent
        .expect(403);

      expect(response.text).toContain('Unauthorized');
    });
  });

  describe('Create User', () => {
    it('should show the create user form', async () => {
      const response = await agent
        .get('/access/create')
        // Cookie is automatically handled by the agent
        .expect(200);

      expect(response.text).toContain('Create User');
    });

    it('should create a new user', async () => {
      // Mock createUser
      userUtils.createUser = jest.fn().mockResolvedValue({
        id: 'new-123',
        email: 'newuser@test.com',
        role: 'business',
        active: true
      });

      const response = await agent
        .post('/access/create')
        // Cookie is automatically handled by the agent
        .send({
          email: 'newuser@test.com',
          password: 'password123',
          confirmPassword: 'password123',
          name: 'New User',
          role: 'business'
        })
        .expect(302)
        .expect('Location', '/access/manage');

      expect(userUtils.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'newuser@test.com',
          role: 'business'
        })
      );
    });

    it('should handle validation errors', async () => {
      const response = await agent
        .post('/access/create')
        // Cookie is automatically handled by the agent
        .send({
          email: 'invalid',
          password: 'short',
          confirmPassword: 'mismatch',
          name: '',
          role: 'invalid'
        })
        .expect(200);

      expect(response.text).toContain('Invalid email address');
      expect(response.text).toContain('Password must be at least 8 characters');
      expect(response.text).toContain('Passwords do not match');
      expect(response.text).toContain('Name is required');
      expect(response.text).toContain('Invalid role');
    });

    it('should handle server errors', async () => {
      // Mock database error
      const mockError = new Error('Database error');
      userUtils.createUser = jest.fn().mockRejectedValue(mockError);

      const response = await agent
        .post('/access/create')
        // Cookie is automatically handled by the agent
        .send({
          email: 'error@example.com',
          password: 'password123',
          confirmPassword: 'password123',
          name: 'Error Test',
          role: 'business'
        })
        .expect(500);

      expect(response.text).toContain('Internal Server Error');
    });
  });

  describe('Update User', () => {
    it('should show the edit user form', async () => {
      const response = await agent
        .get(`/access/edit/${testUser.id}`)
        // Cookie is automatically handled by the agent
        .expect(200);

      expect(response.text).toContain('Edit User');
      expect(response.text).toContain(testUser.email);
    });

    it('should update user details', async () => {
      const response = await agent
        .post(`/access/edit/${testUser.id}`)
        // Cookie is automatically handled by the agent
        .send({
          email: 'updated@example.com',
          name: 'Updated User',
          role: 'business'
        })
        .expect(302);

      // Verify user was updated
      const updatedUser = await prisma.users.findUnique({
        where: { id: testUser.id }
      });
      expect(updatedUser.email).toBe('updated@example.com');
      expect(updatedUser.name).toBe('Updated User');
    });

    it('should not allow non-admin users to edit other users', async () => {
      // Try to edit another user with non-admin user
      const response = await userAgent
        .post('/access/update')
        // Cookie is automatically handled by the agent
        .send({
          id: testUser.id,
          email: 'hacked@example.com',
          name: 'Hacked User',
          role: 'admin'
        })
        .expect(403);

      expect(response.text).toBe('Unauthorized');

      // Verify user was not updated
      const unchangedUser = await prisma.users.findUnique({
        where: { id: testUser.id }
      });
      expect(unchangedUser.name).not.toBe('Hacked User');
      expect(unchangedUser.email).not.toBe('hacked@example.com');
    });

    it('should handle non-existent user', async () => {
      const response = await agent
        .get('/access/edit/non-existent-id')
        // Cookie is automatically handled by the agent
        .expect(404);

      expect(response.text).toContain('User not found');
    });

    it('should validate required fields', async () => {
      const response = await agent
        .post(`/access/edit/${testUser.id}`)
        // Cookie is automatically handled by the agent
        .send({})
        .expect(200);

      expect(response.text).toContain('Email is required');
      expect(response.text).toContain('Name is required');
    });
  });

  describe('Reset Password', () => {
    it('should show the reset password form', async () => {
      const response = await agent
        .get(`/access/reset-password/${testUser.id}`)
        // Cookie is automatically handled by the agent
        .expect(200);

      expect(response.text).toContain('Reset Password');
    });

    it('should reset user password', async () => {
      const response = await agent
        .post(`/access/reset-password/${testUser.id}`)
        // Cookie is automatically handled by the agent
        .send({
          password: 'newpass123',
          confirmPassword: 'newpass123'
        })
        .expect(302);

      // Verify password was updated
      const updatedUser = await prisma.users.findUnique({
        where: { id: testUser.id }
      });
      expect(updatedUser.password).not.toBe('password123');
    });

    it('should handle password mismatch', async () => {
      const response = await agent
        .post(`/access/reset-password/${testUser.id}`)
        // Cookie is automatically handled by the agent
        .send({
          password: 'newpass123',
          confirmPassword: 'different'
        })
        .expect(200);

      expect(response.text).toContain('Passwords do not match');
    });

    it('should require minimum password length', async () => {
      const response = await agent
        .post(`/access/reset-password/${testUser.id}`)
        // Cookie is automatically handled by the agent
        .send({
          password: 'short',
          confirmPassword: 'short'
        })
        .expect(200);

      expect(response.text).toContain('Password must be at least 8 characters');
    });

    it('should not allow non-admin users to reset other users passwords', async () => {
      const response = await userAgent
        .post(`/access/reset-password/${testUser.id}`)
        // Cookie is automatically handled by the agent
        .send({
          password: 'hacked123',
          confirmPassword: 'hacked123'
        })
        .expect(403);

      expect(response.text).toBe('Unauthorized');

      // Verify old password still works
      const loginResponse = await userAgent
        .post('/access/login')
        // Cookie is automatically handled by the agent
        .send({
          email: testUser.email,
          password: 'password123'
        })
        .expect(302);

      expect(loginResponse.headers.location).toBe('/home');
    });
  });

  describe('Revoke and Restore Access', () => {
    it('should show the revoke access confirmation page', async () => {
      const response = await agent
        .get(`/access/revoke/${testUser.id}`)
        // Cookie is automatically handled by the agent
        .expect(200);

      expect(response.text).toContain('Revoke Access');
    });

    it('should revoke user access', async () => {
      const response = await agent
        .post(`/access/revoke/${testUser.id}`)
        // Cookie is automatically handled by the agent
        .send({ 'confirm-revoke': 'yes' })
        .expect(302);

      // Verify user access was revoked
      const revokedUser = await prisma.users.findUnique({
        where: { id: testUser.id }
      });
      expect(revokedUser.active).toBe(false);

      // Try to login with revoked user
      const loginResponse = await request(app)
        .post('/access/login')
        .send({
          email: 'updated@example.com',
          password: 'newpass123'
        })
        .expect(200);

      expect(loginResponse.text).toContain('Account is inactive');
    });

    it('should show the restore access confirmation page', async () => {
      const response = await agent
        .get(`/access/restore/${testUser.id}`)
        // Cookie is automatically handled by the agent
        .expect(200);

      expect(response.text).toContain('Restore Access');
    });

    it('should restore user access', async () => {
      const response = await agent
        .post(`/access/restore/${testUser.id}`)
        // Cookie is automatically handled by the agent
        .send({ 'confirm-restore': 'yes' })
        .expect(302);

      // Verify user access was restored
      const restoredUser = await prisma.users.findUnique({
        where: { id: testUser.id }
      });
      expect(restoredUser.active).toBe(true);

      // Try to login with restored user
      const loginResponse = await request(app)
        .post('/access/login')
        .send({
          email: 'updated@example.com',
          password: 'newpass123'
        })
        .expect(302);

      expect(loginResponse.headers.location).toBe('/home');
    });
  });

  describe('Delete User', () => {
    it('should show the delete confirmation page', async () => {
      const response = await agent
        .get(`/access/delete/${testUser.id}`)
        // Cookie is automatically handled by the agent
        .expect(200);

      expect(response.text).toContain('Delete User');
    });

    it('should delete user', async () => {
      const response = await agent
        .post(`/access/delete/${testUser.id}`)
        // Cookie is automatically handled by the agent
        .send({ 'confirm-delete': 'yes' })
        .expect(302);

      // Verify user was deleted
      const deletedUser = await prisma.users.findUnique({
        where: { id: testUser.id }
      });
      expect(deletedUser).toBeFalsy();
    });

    it('should not allow non-admin users to delete users', async () => {
      const response = await userAgent
        .post(`/access/delete/${testUser.id}`)
        // Cookie is automatically handled by the agent
        .send({ 'confirm-delete': 'yes' })
        .expect(403);

      expect(response.text).toContain('Unauthorized');

      // Verify user still exists
      const user = await prisma.users.findUnique({
        where: { id: testUser.id }
      });
      expect(user).toBeTruthy();
    });
  });
});
