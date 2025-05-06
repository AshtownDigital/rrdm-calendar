/**
 * Unit tests for Passport configuration
 */
const passportConfig = require('../../config/passport');
const userUtils = require('../../utils/user-utils');
const { prisma } = require('../../config/prisma');

// Mock dependencies
jest.mock('../../utils/user-utils', () => ({
  findUserByEmail: jest.fn(),
  findUserById: jest.fn(),
  validatePassword: jest.fn(),
  updateLastLogin: jest.fn()
}));

jest.mock('../../config/prisma', () => ({
  prisma: {
    users: {
      findUnique: jest.fn(),
      update: jest.fn()
    }
  }
}));

// Mock console logs to avoid cluttering test output
global.console.log = jest.fn();
global.console.error = jest.fn();

describe('Passport Configuration', () => {
  let passport;
  let mockUser;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create a mock passport object
    passport = {
      use: jest.fn(),
      serializeUser: jest.fn(),
      deserializeUser: jest.fn()
    };
    
    // Create a mock user
    mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      password: 'hashedPassword',
      name: 'Test User',
      role: 'business',
      active: true
    };
    
    // Initialize passport with our config
    passportConfig(passport);
  });
  
  it('should configure the local strategy', () => {
    // Verify that passport.use was called with a LocalStrategy
    expect(passport.use).toHaveBeenCalled();
    
    // Get the strategy that was passed to passport.use
    const strategy = passport.use.mock.calls[0][0];
    
    // Verify it's a LocalStrategy
    expect(strategy.name).toBe('local');
  });
  
  it('should configure serializeUser', () => {
    // Verify that passport.serializeUser was called
    expect(passport.serializeUser).toHaveBeenCalled();
    
    // Get the serializeUser function
    const serializeUserFn = passport.serializeUser.mock.calls[0][0];
    
    // Create a mock done callback
    const done = jest.fn();
    
    // Call the serializeUser function with our mock user
    serializeUserFn(mockUser, done);
    
    // Verify that the done callback was called with the user ID
    expect(done).toHaveBeenCalledWith(null, mockUser.id);
  });
  
  it('should configure deserializeUser', () => {
    // Verify that passport.deserializeUser was called
    expect(passport.deserializeUser).toHaveBeenCalled();
    
    // Get the deserializeUser function
    const deserializeUserFn = passport.deserializeUser.mock.calls[0][0];
    
    // Mock the findUserById function to return our mock user
    userUtils.findUserById.mockResolvedValue(mockUser);
    
    // Create a mock done callback
    const done = jest.fn();
    
    // Call the deserializeUser function with a user ID
    deserializeUserFn('user-123', done);
    
    // Verify that findUserById was called with the correct ID
    expect(userUtils.findUserById).toHaveBeenCalledWith('user-123');
    
    // Since deserializeUser is async, we need to wait for it to complete
    return new Promise(resolve => {
      setImmediate(() => {
        // Verify that the done callback was called with the user (without password)
        expect(done).toHaveBeenCalledWith(null, expect.objectContaining({
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'business',
          active: true
        }));
        
        // Verify that the password was removed
        const userPassedToDone = done.mock.calls[0][1];
        expect(userPassedToDone).not.toHaveProperty('password');
        
        resolve();
      });
    });
  });
  
  describe('Local Strategy', () => {
    let localStrategy;
    let done;
    
    beforeEach(() => {
      // Get the local strategy
      localStrategy = passport.use.mock.calls[0][0];
      
      // Create a mock done callback
      done = jest.fn();
    });
    
    it('should authenticate a valid user with correct password', async () => {
      // Mock the findUserByEmail function to return our mock user
      userUtils.findUserByEmail.mockResolvedValue(mockUser);
      
      // Mock the validatePassword function to return true
      userUtils.validatePassword.mockResolvedValue(true);
      
      // Mock the updateLastLogin function
      userUtils.updateLastLogin.mockResolvedValue(true);
      
      // Call the verify function of the local strategy
      await localStrategy._verify('test@example.com', 'correctPassword', done);
      
      // Verify that findUserByEmail was called with the correct email
      expect(userUtils.findUserByEmail).toHaveBeenCalledWith('test@example.com');
      
      // Verify that validatePassword was called with the correct password
      expect(userUtils.validatePassword).toHaveBeenCalledWith('correctPassword', 'hashedPassword');
      
      // Verify that updateLastLogin was called with the correct user ID
      expect(userUtils.updateLastLogin).toHaveBeenCalledWith('user-123');
      
      // Verify that the done callback was called with the user (without password)
      expect(done).toHaveBeenCalledWith(null, expect.objectContaining({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'business',
        active: true
      }));
      
      // Verify that the password was removed
      const userPassedToDone = done.mock.calls[0][1];
      expect(userPassedToDone).not.toHaveProperty('password');
    });
    
    it('should reject a user with incorrect password', async () => {
      // Mock the findUserByEmail function to return our mock user
      userUtils.findUserByEmail.mockResolvedValue(mockUser);
      
      // Mock the validatePassword function to return false
      userUtils.validatePassword.mockResolvedValue(false);
      
      // Call the verify function of the local strategy
      await localStrategy._verify('test@example.com', 'wrongPassword', done);
      
      // Verify that findUserByEmail was called with the correct email
      expect(userUtils.findUserByEmail).toHaveBeenCalledWith('test@example.com');
      
      // Verify that validatePassword was called with the correct password
      expect(userUtils.validatePassword).toHaveBeenCalledWith('wrongPassword', 'hashedPassword');
      
      // Verify that updateLastLogin was NOT called
      expect(userUtils.updateLastLogin).not.toHaveBeenCalled();
      
      // Verify that the done callback was called with false and an error message
      expect(done).toHaveBeenCalledWith(null, false, { message: 'Invalid email or password' });
    });
    
    it('should reject a non-existent user', async () => {
      // Mock the findUserByEmail function to return null
      userUtils.findUserByEmail.mockResolvedValue(null);
      
      // Call the verify function of the local strategy
      await localStrategy._verify('nonexistent@example.com', 'anyPassword', done);
      
      // Verify that findUserByEmail was called with the correct email
      expect(userUtils.findUserByEmail).toHaveBeenCalledWith('nonexistent@example.com');
      
      // Verify that validatePassword was NOT called
      expect(userUtils.validatePassword).not.toHaveBeenCalled();
      
      // Verify that updateLastLogin was NOT called
      expect(userUtils.updateLastLogin).not.toHaveBeenCalled();
      
      // Verify that the done callback was called with false and an error message
      expect(done).toHaveBeenCalledWith(null, false, { message: 'Invalid email or password' });
    });
    
    it('should reject an inactive user', async () => {
      // Create an inactive user
      const inactiveUser = { ...mockUser, active: false };
      
      // Mock the findUserByEmail function to return the inactive user
      userUtils.findUserByEmail.mockResolvedValue(inactiveUser);
      
      // Call the verify function of the local strategy
      await localStrategy._verify('inactive@example.com', 'anyPassword', done);
      
      // Verify that findUserByEmail was called with the correct email
      expect(userUtils.findUserByEmail).toHaveBeenCalledWith('inactive@example.com');
      
      // Verify that validatePassword was NOT called
      expect(userUtils.validatePassword).not.toHaveBeenCalled();
      
      // Verify that updateLastLogin was NOT called
      expect(userUtils.updateLastLogin).not.toHaveBeenCalled();
      
      // Verify that the done callback was called with false and an error message
      expect(done).toHaveBeenCalledWith(null, false, { 
        message: 'Your account has been deactivated. Please contact an administrator.' 
      });
    });
    
    it('should handle authentication errors', async () => {
      // Mock the findUserByEmail function to throw an error
      const testError = new Error('Database error');
      userUtils.findUserByEmail.mockRejectedValue(testError);
      
      // Call the verify function of the local strategy
      await localStrategy._verify('test@example.com', 'anyPassword', done);
      
      // Verify that findUserByEmail was called with the correct email
      expect(userUtils.findUserByEmail).toHaveBeenCalledWith('test@example.com');
      
      // Verify that the done callback was called with the error
      expect(done).toHaveBeenCalledWith(testError);
    });
  });
  
  describe('deserializeUser', () => {
    let deserializeUserFn;
    let done;
    
    beforeEach(() => {
      // Get the deserializeUser function
      deserializeUserFn = passport.deserializeUser.mock.calls[0][0];
      
      // Create a mock done callback
      done = jest.fn();
    });
    
    it('should handle non-existent users', () => {
      // Mock the findUserById function to return null
      userUtils.findUserById.mockResolvedValue(null);
      
      // Call the deserializeUser function with a non-existent user ID
      deserializeUserFn('nonexistent-id', done);
      
      // Verify that findUserById was called with the correct ID
      expect(userUtils.findUserById).toHaveBeenCalledWith('nonexistent-id');
      
      // Since deserializeUser is async, we need to wait for it to complete
      return new Promise(resolve => {
        setImmediate(() => {
          // Verify that the done callback was called with false
          expect(done).toHaveBeenCalledWith(null, false);
          resolve();
        });
      });
    });
    
    it('should handle inactive users', () => {
      // Create an inactive user
      const inactiveUser = { ...mockUser, active: false };
      
      // Mock the findUserById function to return the inactive user
      userUtils.findUserById.mockResolvedValue(inactiveUser);
      
      // Call the deserializeUser function with the inactive user ID
      deserializeUserFn('inactive-id', done);
      
      // Verify that findUserById was called with the correct ID
      expect(userUtils.findUserById).toHaveBeenCalledWith('inactive-id');
      
      // Since deserializeUser is async, we need to wait for it to complete
      return new Promise(resolve => {
        setImmediate(() => {
          // Verify that the done callback was called with false
          expect(done).toHaveBeenCalledWith(null, false);
          resolve();
        });
      });
    });
    
    it('should handle deserialization errors', () => {
      // Mock the findUserById function to throw an error
      const testError = new Error('Database error');
      userUtils.findUserById.mockRejectedValue(testError);
      
      // Call the deserializeUser function with any user ID
      deserializeUserFn('any-id', done);
      
      // Verify that findUserById was called with the correct ID
      expect(userUtils.findUserById).toHaveBeenCalledWith('any-id');
      
      // Since deserializeUser is async, we need to wait for it to complete
      return new Promise(resolve => {
        setImmediate(() => {
          // Verify that the done callback was called with the error
          expect(done).toHaveBeenCalledWith(testError);
          resolve();
        });
      });
    });
  });
});
