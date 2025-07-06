/**
 * Unit test for submissionController.create
 * Ensures a minimal valid payload saves and redirects to the new submission view
 */

// --- Mock models and services BEFORE importing controller ---

afterEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
});

jest.mock('../../../models/Submission', () => {
  // Mock constructor
  return function(data) {
    // expose input for assertions if needed
    this.data = data;
    this._id = 'mock-id-123';
    this.save = jest.fn().mockResolvedValue(this);
  };
});

jest.mock('../../../models/BcrService', () => ({
  getAllImpactAreas: jest.fn().mockResolvedValue([])
}));

jest.mock('../../../models/ReferenceDataArea', () => ({
  find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) })
}));

const submissionController = require('../../../controllers/submissionController');

describe('submissionController.create', () => {
  it('should save submission and redirect to its view page', async () => {
    // Arrange minimal valid payload
    const validBody = {
      fullName: 'Test User',
      emailAddress: 'test@example.com',
      briefDescription: 'desc',
      justification: 'just',
      urgencyLevel: 'Low',
      submissionSource: 'Internal DfE',
      impactAreas: ['Reference Data'],
      technicalDependencies: 'none',
      declaration: 'true'
    };

    const mockReq = { body: validBody };
    const mockRes = { redirect: jest.fn() };

    // Act
    await submissionController.create(mockReq, mockRes, jest.fn());

    // Assert
    expect(mockRes.redirect).toHaveBeenCalledWith('/submissions/mock-id-123');
  });
});
