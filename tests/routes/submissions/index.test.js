/**
 * Tests for submissions routes
 */
const submissionsRouter = require('../../../routes/submissions');

// Mock dependencies used by the controller
jest.mock('../../../models/BcrService', () => ({
  getAllImpactAreas: jest.fn().mockResolvedValue([
    { _id: '1', name: 'Reference Data' },
    { _id: '2', name: 'Funding' }
  ])
}));

jest.mock('../../../models/ReferenceDataArea', () => ({
  find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) })
}));

// Import controller after mocks so it uses mocked modules
const submissionController = require('../../../controllers/submissionController');

describe('Submissions Routes', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    mockReq = { user: { id: 'user-1' } };
    mockRes = { render: jest.fn() };
    jest.clearAllMocks();
  });

  it('GET /new should render the submissions/new template', async () => {
    // Locate the GET /new handler on the router
    const layer = submissionsRouter.stack.find(l => l.route && l.route.path === '/new' && l.route.methods.get);
    const handler = layer.route.stack[0].handle;

    await handler(mockReq, mockRes);

    expect(mockRes.render).toHaveBeenCalledWith(
      'submissions/new',
      expect.objectContaining({
        impactAreas: expect.any(Array),
        title: 'New Submission'
      })
    );
  });
});
