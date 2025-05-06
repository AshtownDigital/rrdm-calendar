/**
 * Unit tests for home routes
 */
const homeRouter = require('../../../routes/home');

// Mock dependencies
jest.mock('../../../config/passport', () => ({}));
jest.mock('../../../utils/user-utils', () => ({}));

describe('Home Routes', () => {
  let app;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    // Mock request and response objects
    mockReq = {
      user: { id: 'user-123', name: 'Test User', role: 'business' }
    };
    
    mockRes = {
      render: jest.fn()
    };
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('GET /', () => {
    it('should render the home page', () => {
      // Get the route handler directly from the router
      const routeHandler = homeRouter.stack.find(layer => 
        layer.route && layer.route.path === '/'
      ).route.stack[0].handle;
      
      // Call the route handler with mock req and res
      routeHandler(mockReq, mockRes);
      
      // Verify that the correct template is rendered with the right data
      expect(mockRes.render).toHaveBeenCalledWith('modules/home/home', {
        user: mockReq.user,
        serviceName: 'Register Team Internal Services'
      });
    });
    
    it('should handle unauthenticated users', () => {
      // Create a request without a user
      const unauthReq = { user: null };
      
      // Get the route handler directly from the router
      const routeHandler = homeRouter.stack.find(layer => 
        layer.route && layer.route.path === '/'
      ).route.stack[0].handle;
      
      // Call the route handler with mock req and res
      routeHandler(unauthReq, mockRes);
      
      // Verify that the correct template is rendered with the right data
      expect(mockRes.render).toHaveBeenCalledWith('modules/home/home', {
        user: null,
        serviceName: 'Register Team Internal Services'
      });
    });
  });
});
