/**
 * BCR Submission Controller Tests
 * Tests the functionality of the BCR submission controller with live data
 */
const submissionController = require('../../../controllers/bcr-submission/controller');
const submissionModel = require('../../../models/bcr-submission/model');
const bcrModel = require('../../../models/bcr/model');
const impactedAreasModel = require('../../../models/impacted-areas/model');

// Mock the submission model
jest.mock('../../../models/bcr-submission/model', () => ({
  getAllSubmissions: jest.fn(),
  getSubmissionById: jest.fn(),
  createSubmission: jest.fn(),
  markAsReviewed: jest.fn(),
  markAsRejected: jest.fn(),
  softDelete: jest.fn(),
  hardDelete: jest.fn()
}));

// Mock the BCR model
jest.mock('../../../models/bcr/model', () => ({
  createBcrFromSubmission: jest.fn(),
  getBcrById: jest.fn()
}));

// Mock the impacted areas model
jest.mock('../../../models/impacted-areas/model', () => ({
  getAllImpactedAreas: jest.fn()
}));

describe('BCR Submission Controller', () => {
  let mockReq;
  let mockRes;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock request and response objects
    mockReq = {
      user: {
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        role: 'admin'
      },
      params: {},
      query: {},
      body: {},
      csrfToken: jest.fn().mockReturnValue('csrf-token'),
      flash: jest.fn()
    };
    
    mockRes = {
      redirect: jest.fn(),
      status: jest.fn().mockReturnThis(),
      render: jest.fn(),
      json: jest.fn()
    };
  });
  
  describe('list', () => {
    it('should render the submissions list page with real data', async () => {
      // Mock the submission model to return real submissions
      const mockSubmissions = [
        {
          id: 'sub-123',
          submissionCode: 'SUB-25/26-001',
          fullName: 'Test User',
          emailAddress: 'test@example.com',
          submissionSource: 'Internal',
          briefDescription: 'Test submission',
          urgencyLevel: 'Medium',
          createdAt: new Date('2025-05-15T10:00:00Z')
        },
        {
          id: 'sub-456',
          submissionCode: 'SUB-25/26-002',
          fullName: 'Another User',
          emailAddress: 'another@example.com',
          submissionSource: 'External',
          briefDescription: 'Another test',
          urgencyLevel: 'High',
          createdAt: new Date('2025-05-16T11:30:00Z'),
          reviewedAt: new Date('2025-05-17T09:15:00Z')
        }
      ];
      
      submissionModel.getAllSubmissions.mockResolvedValue(mockSubmissions);
      
      // Call the controller method
      await submissionController.list(mockReq, mockRes);
      
      // Verify that the submissions were retrieved
      expect(submissionModel.getAllSubmissions).toHaveBeenCalledTimes(1);
      
      // Verify that the correct template was rendered with the submissions
      expect(mockRes.render).toHaveBeenCalledWith('bcr-submission/list', {
        title: 'BCR Submissions',
        submissions: expect.arrayContaining([
          expect.objectContaining({
            id: 'sub-123',
            submissionCode: 'SUB-25/26-001'
          }),
          expect.objectContaining({
            id: 'sub-456',
            submissionCode: 'SUB-25/26-002'
          })
        ]),
        csrfToken: 'csrf-token',
        user: mockReq.user
      });
    });
  });
  
  describe('reviewForm', () => {
    it('should render the review form for a valid submission', async () => {
      // Mock the submission model to return a specific submission
      const mockSubmission = {
        id: 'sub-123',
        submissionCode: 'SUB-25/26-001',
        fullName: 'Test User',
        emailAddress: 'test@example.com',
        submissionSource: 'Internal',
        organisation: 'Test Org',
        briefDescription: 'Test submission',
        justification: 'Testing purposes',
        urgencyLevel: 'Medium',
        impactAreas: ['Funding', 'Systems'],
        createdAt: new Date('2025-05-15T10:00:00Z')
      };
      
      submissionModel.getSubmissionById.mockResolvedValue(mockSubmission);
      
      // Set up the request parameters
      mockReq.params.id = 'sub-123';
      
      // Call the controller method
      await submissionController.reviewForm(mockReq, mockRes);
      
      // Verify that the submission was retrieved
      expect(submissionModel.getSubmissionById).toHaveBeenCalledWith('sub-123');
      
      // Verify that the correct template was rendered
      expect(mockRes.render).toHaveBeenCalledWith('bcr-submission/review', {
        title: 'Review Submission',
        submission: mockSubmission,
        csrfToken: 'csrf-token',
        user: mockReq.user
      });
    });
    
    it('should render an error page for a non-existent submission', async () => {
      // Mock the submission model to return null
      submissionModel.getSubmissionById.mockResolvedValue(null);
      
      // Set up the request parameters
      mockReq.params.id = 'non-existent';
      
      // Call the controller method
      await submissionController.reviewForm(mockReq, mockRes);
      
      // Verify that the submission was retrieved
      expect(submissionModel.getSubmissionById).toHaveBeenCalledWith('non-existent');
      
      // Verify that the error page was rendered
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.render).toHaveBeenCalledWith('error', {
        title: 'Not Found',
        message: 'Submission not found',
        error: {},
        user: mockReq.user
      });
    });
  });
  
  describe('approve', () => {
    it('should approve a submission and create a BCR', async () => {
      // Mock the submission model to return a specific submission
      const mockSubmission = {
        id: 'sub-123',
        submissionCode: 'SUB-25/26-001',
        fullName: 'Test User',
        emailAddress: 'test@example.com',
        submissionSource: 'Internal',
        organisation: 'Test Org',
        briefDescription: 'Test submission',
        justification: 'Testing purposes',
        urgencyLevel: 'Medium',
        impactAreas: ['Funding', 'Systems'],
        createdAt: new Date('2025-05-15T10:00:00Z')
      };
      
      // Mock the BCR model to return a new BCR
      const mockBcr = {
        id: 'bcr-123',
        bcrCode: 'BCR-25/26-001',
        title: 'Test submission',
        description: 'Testing purposes',
        priority: 'Medium',
        phase: 'Initial Assessment',
        status: 'new_submission',
        createdAt: new Date('2025-05-17T12:00:00Z')
      };
      
      submissionModel.getSubmissionById.mockResolvedValue(mockSubmission);
      bcrModel.createBcrFromSubmission.mockResolvedValue(mockBcr);
      
      // Set up the request parameters
      mockReq.params.id = 'sub-123';
      
      // Call the controller method
      await submissionController.approve(mockReq, mockRes);
      
      // Verify that the submission was retrieved
      expect(submissionModel.getSubmissionById).toHaveBeenCalledWith('sub-123');
      
      // Verify that a BCR was created from the submission
      expect(bcrModel.createBcrFromSubmission).toHaveBeenCalledWith('sub-123');
      
      // Verify that the submission was marked as reviewed
      expect(submissionModel.markAsReviewed).toHaveBeenCalledWith('sub-123');
      
      // Verify that the confirmation page was rendered
      expect(mockRes.render).toHaveBeenCalledWith('bcr-submission/confirm', {
        title: 'BCR Created',
        message: `BCR ${mockBcr.bcrCode} has been created from submission ${mockSubmission.submissionCode}`,
        submission: mockSubmission,
        bcr: mockBcr,
        bcrId: mockBcr.id,
        action: 'approve',
        user: mockReq.user
      });
    });
    
    it('should handle a non-existent submission', async () => {
      // Mock the submission model to return null
      submissionModel.getSubmissionById.mockResolvedValue(null);
      
      // Set up the request parameters
      mockReq.params.id = 'non-existent';
      
      // Call the controller method
      await submissionController.approve(mockReq, mockRes);
      
      // Verify that the submission was retrieved
      expect(submissionModel.getSubmissionById).toHaveBeenCalledWith('non-existent');
      
      // Verify that no BCR was created
      expect(bcrModel.createBcrFromSubmission).not.toHaveBeenCalled();
      
      // Verify that the submission was not marked as reviewed
      expect(submissionModel.markAsReviewed).not.toHaveBeenCalled();
      
      // Verify that the error page was rendered
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.render).toHaveBeenCalledWith('error', {
        title: 'Not Found',
        message: 'Submission not found',
        error: {},
        user: mockReq.user
      });
    });
  });
  
  describe('reject', () => {
    it('should reject a submission', async () => {
      // Mock the submission model to return a specific submission
      const mockSubmission = {
        id: 'sub-123',
        submissionCode: 'SUB-25/26-001',
        fullName: 'Test User',
        emailAddress: 'test@example.com',
        submissionSource: 'Internal',
        organisation: 'Test Org',
        briefDescription: 'Test submission',
        justification: 'Testing purposes',
        urgencyLevel: 'Medium',
        impactAreas: ['Funding', 'Systems'],
        createdAt: new Date('2025-05-15T10:00:00Z')
      };
      
      submissionModel.getSubmissionById.mockResolvedValue(mockSubmission);
      
      // Set up the request parameters
      mockReq.params.id = 'sub-123';
      
      // Call the controller method
      await submissionController.reject(mockReq, mockRes);
      
      // Verify that the submission was retrieved
      expect(submissionModel.getSubmissionById).toHaveBeenCalledWith('sub-123');
      
      // Verify that the submission was marked as rejected
      expect(submissionModel.markAsRejected).toHaveBeenCalledWith('sub-123');
      
      // Verify that the confirmation page was rendered
      expect(mockRes.render).toHaveBeenCalledWith('bcr-submission/confirm', {
        title: 'Submission Rejected',
        message: `Submission ${mockSubmission.submissionCode} has been rejected`,
        submission: mockSubmission,
        action: 'reject',
        user: mockReq.user
      });
    });
    
    it('should handle a non-existent submission', async () => {
      // Mock the submission model to return null
      submissionModel.getSubmissionById.mockResolvedValue(null);
      
      // Set up the request parameters
      mockReq.params.id = 'non-existent';
      
      // Call the controller method
      await submissionController.reject(mockReq, mockRes);
      
      // Verify that the submission was retrieved
      expect(submissionModel.getSubmissionById).toHaveBeenCalledWith('non-existent');
      
      // Verify that the submission was not marked as rejected
      expect(submissionModel.markAsRejected).not.toHaveBeenCalled();
      
      // Verify that the error page was rendered
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.render).toHaveBeenCalledWith('error', {
        title: 'Not Found',
        message: 'Submission not found',
        error: {},
        user: mockReq.user
      });
    });
  });
});
