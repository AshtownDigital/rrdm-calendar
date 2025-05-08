/**
 * BCR Submissions Controller Tests
 */
const { submissionsController } = require('../../../controllers/bcr');
const { prisma } = require('../../../config/database');

// Mock the Prisma client
jest.mock('../../../config/database', () => ({
  prisma: {
    bcr: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn()
    },
    bcrConfig: {
      findFirst: jest.fn()
    },
    bcrComment: {
      findMany: jest.fn()
    },
    bcrHistory: {
      findMany: jest.fn()
    },
    user: {
      findMany: jest.fn()
    }
  }
}));

// Mock Express request and response
const mockRequest = (params = {}, query = {}, body = {}, user = { id: '1', name: 'Test User', isAdmin: false }) => ({
  params,
  query,
  body,
  user
});

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.render = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.locals = {};
  return res;
};

describe('BCR Submissions Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listSubmissions', () => {
    it('should render the submissions list view with data', async () => {
      // Mock data
      const mockSubmissions = [
        { 
          id: '1', 
          bcrNumber: 'BCR-2023-001', 
          title: 'Test BCR 1', 
          status: 'Draft', 
          createdAt: new Date(),
          submittedBy: { name: 'John Doe' }
        },
        { 
          id: '2', 
          bcrNumber: 'BCR-2023-002', 
          title: 'Test BCR 2', 
          status: 'Submitted', 
          createdAt: new Date(),
          submittedBy: { name: 'Jane Smith' }
        }
      ];
      
      const mockConfig = {
        currentYear: 2023,
        nextBcrNumber: 3
      };
      
      // Set up mocks
      prisma.bcr.findMany.mockResolvedValue(mockSubmissions);
      prisma.bcr.count.mockResolvedValue(2);
      prisma.bcrConfig.findFirst.mockResolvedValue(mockConfig);
      
      const req = mockRequest({}, { status: 'all', page: '1' });
      const res = mockResponse();
      
      // Call the controller method
      await submissionsController.listSubmissions(req, res);
      
      // Assertions
      expect(prisma.bcr.findMany).toHaveBeenCalled();
      expect(res.render).toHaveBeenCalledWith(
        'modules/bcr/submissions',
        expect.objectContaining({
          title: 'BCR Submissions',
          submissions: mockSubmissions,
          pagination: expect.any(Object)
        })
      );
    });
    
    it('should filter submissions by status when provided', async () => {
      // Mock data
      const mockSubmissions = [
        { 
          id: '2', 
          bcrNumber: 'BCR-2023-002', 
          title: 'Test BCR 2', 
          status: 'Submitted', 
          createdAt: new Date(),
          submittedBy: { name: 'Jane Smith' }
        }
      ];
      
      // Set up mocks
      prisma.bcr.findMany.mockResolvedValue(mockSubmissions);
      prisma.bcr.count.mockResolvedValue(1);
      prisma.bcrConfig.findFirst.mockResolvedValue({ currentYear: 2023, nextBcrNumber: 3 });
      
      const req = mockRequest({}, { status: 'Submitted', page: '1' });
      const res = mockResponse();
      
      // Call the controller method
      await submissionsController.listSubmissions(req, res);
      
      // Assertions
      expect(prisma.bcr.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'Submitted'
          })
        })
      );
    });
    
    it('should handle errors and render the error page', async () => {
      // Set up mocks to throw an error
      prisma.bcr.findMany.mockRejectedValue(new Error('Database error'));
      
      const req = mockRequest();
      const res = mockResponse();
      
      // Call the controller method
      await submissionsController.listSubmissions(req, res);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.render).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({
          title: 'Error',
          message: 'Failed to load BCR submissions'
        })
      );
    });
  });
  
  describe('viewSubmissionDetails', () => {
    it('should render the submission details view with data', async () => {
      // Mock data
      const mockSubmission = { 
        id: '1', 
        bcrNumber: 'BCR-2023-001', 
        title: 'Test BCR 1', 
        status: 'Draft', 
        description: 'Test description',
        createdAt: new Date(),
        submittedBy: { id: '1', name: 'John Doe' }
      };
      
      const mockComments = [
        { id: '1', text: 'Comment 1', createdAt: new Date(), user: { name: 'Jane Smith' } }
      ];
      
      const mockHistory = [
        { id: '1', action: 'Created', createdAt: new Date(), user: { name: 'John Doe' } }
      ];
      
      // Set up mocks
      prisma.bcr.findUnique.mockResolvedValue(mockSubmission);
      prisma.bcrComment.findMany.mockResolvedValue(mockComments);
      prisma.bcrHistory.findMany.mockResolvedValue(mockHistory);
      prisma.user.findMany.mockResolvedValue([{ id: '2', name: 'Jane Smith' }]);
      
      const req = mockRequest({ id: '1' });
      const res = mockResponse();
      
      // Call the controller method
      await submissionsController.viewSubmissionDetails(req, res);
      
      // Assertions
      expect(prisma.bcr.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: expect.any(Object)
      });
      expect(res.render).toHaveBeenCalledWith(
        'modules/bcr/submission-details',
        expect.objectContaining({
          title: expect.stringContaining(mockSubmission.bcrNumber),
          submission: mockSubmission,
          comments: mockComments,
          history: mockHistory
        })
      );
    });
    
    it('should handle submission not found and render the error page', async () => {
      // Set up mocks
      prisma.bcr.findUnique.mockResolvedValue(null);
      
      const req = mockRequest({ id: 'nonexistent' });
      const res = mockResponse();
      
      // Call the controller method
      await submissionsController.viewSubmissionDetails(req, res);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.render).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({
          title: 'Not Found',
          message: 'The requested BCR submission could not be found.'
        })
      );
    });
  });
});
