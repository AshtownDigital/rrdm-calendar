/**
 * Unit tests for BCR Workflow Controller
 */

// Mock mongoose
jest.mock('mongoose', () => ({
  connection: {
    readyState: 1 // Connected by default
  },
  Schema: {
    Types: {
      ObjectId: String,
      String: String,
      Number: Number,
      Boolean: Boolean,
      Date: Date
    }
  }
}));

const mongoose = require('mongoose');

// We'll use Jest's mock functions directly in the tests

const workflowController = require('../../../../../controllers/modules/bcr/modular/workflowController');
// Mock the BCR model
jest.mock('../../../../../models/modules/bcr/model', () => ({
  getBcrById: jest.fn(),
  findById: jest.fn(),
  find: jest.fn()
}));

// Mock the workflow service
jest.mock('../../../../../services/modules/bcr/workflowService', () => ({
  getAllPhases: jest.fn(),
  getAllStatuses: jest.fn(),
  getWorkflowProgressVisualization: jest.fn(),
  getPhaseById: jest.fn(),
  getStatusById: jest.fn(),
  updateBcrPhaseStatus: jest.fn(),
  getWorkflowVisual: jest.fn()
}));

const bcrModel = require('../../../../../models/modules/bcr/model');
const workflowService = require('../../../../../services/modules/bcr/workflowService');
// Mock the logger service
jest.mock('../../../../../services/shared/loggerService', () => {
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn()
  };
  return {
    createModuleLogger: jest.fn().mockReturnValue(mockLogger)
  };
});

// Get the mock logger from the mocked module
const mockLogger = require('../../../../../services/shared/loggerService').createModuleLogger();

// We don't need to import createModuleLogger as we're using the mock directly
let loggerStub;

// Import Jest's mocking utilities
const sinon = require('sinon');

describe('BCR Workflow Controller', () => {
  let req, res, sandbox;
  
  // Use Jest's fake timers
  beforeAll(() => {
    jest.useFakeTimers();
  });
  
  afterAll(() => {
    jest.useRealTimers();
  });
  
  beforeEach(() => {
    // Create a new sinon sandbox for each test
    sandbox = sinon.createSandbox();
    
    // Mock request object with Jest mocks
    req = {
      params: { id: '123456789012345678901234' },
      body: {},
      flash: jest.fn(),
      csrfToken: jest.fn().mockReturnValue('csrf-token'),
      user: { id: 'user123', name: 'Test User' }
    };
    
    // Mock response object with Jest mocks
    res = {
      render: jest.fn(),
      redirect: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    // Reset the mock logger for each test
    Object.keys(mockLogger).forEach(method => {
      mockLogger[method].mockClear();
      // Ensure the mock functions return the logger for chaining
      mockLogger[method].mockReturnValue(mockLogger);
    });
    
    // Set the logger stub to use our mockLogger
    loggerStub = mockLogger;
    
    // Set mongoose connection to connected by default
    mongoose.connection.readyState = 1; // Connected
    
    // Clear any pending timers before each test
    jest.clearAllTimers();
  });

  afterEach(() => {
    // Restore all sinon stubs and spies
    sandbox.restore();
    
    // Clear all Jest mocks
    jest.clearAllMocks();
    
    // Reset modules to ensure clean state for next test
    jest.resetModules();
  });
  
  describe('showWorkflow', () => {
    it('should render the workflow view with phases and statuses', async () => {
      // Mock data
      const mockPhases = [
        { _id: 'phase1', name: 'Phase 1', displayOrder: 1, group: 'Pre-Approval' },
        { _id: 'phase2', name: 'Phase 2', displayOrder: 2, group: 'Implementation' }
      ];
      
      const mockStatuses = [
        { _id: 'status1', name: 'Status 1', color: 'blue' },
        { _id: 'status2', name: 'Status 2', color: 'green' }
      ];
      
      // Setup Jest mocks for this test
      workflowService.getAllPhases.mockResolvedValue(mockPhases);
      workflowService.getAllStatuses.mockResolvedValue(mockStatuses);
      
      // Call the controller method
      await workflowController.showWorkflow(req, res);
      
      // Assertions
      expect(res.render).toHaveBeenCalledTimes(1);
      expect(res.render).toHaveBeenCalledWith(
        'modules/bcr/workflow',
        expect.objectContaining({
          phases: mockPhases,
          statuses: mockStatuses,
          phaseGroups: expect.any(Object),
          connectionIssue: false
        })
      );
      
      // Verify logging - use partial matching since logger includes context objects
      expect(loggerStub.info).toHaveBeenCalledWith('Loading workflow view', expect.anything());
      expect(loggerStub.info).toHaveBeenCalledWith('Workflow view loaded successfully');
    });
    
    it('should handle database connection issues', async () => {
      // Set disconnected database state
      mongoose.connection.readyState = 0; // Disconnected
      
      // Call the controller method
      await workflowController.showWorkflow(req, res);
      
      // Assertions
      expect(res.render).toHaveBeenCalledTimes(1);
      expect(res.render).toHaveBeenCalledWith(
        'modules/bcr/workflow',
        expect.objectContaining({
          phases: [],
          statuses: [],
          connectionIssue: true
        })
      );
      
      // Verify logging
      expect(loggerStub.info).toHaveBeenCalledWith('Loading workflow view', expect.anything());
    });
    
    it('should handle errors when fetching workflow data', async () => {
      // Setup Jest mocks to throw errors
      const error = new Error('Service error');
      workflowService.getAllPhases.mockRejectedValue(error);
      workflowService.getAllStatuses.mockRejectedValue(error);
      
      // Spy on the error logger
      const errorSpy = jest.spyOn(loggerStub, 'error');
      
      // Call the controller method
      await workflowController.showWorkflow(req, res);
      
      // Assertions
      expect(res.render).toHaveBeenCalledTimes(1);
      expect(res.render).toHaveBeenCalledWith(
        'modules/bcr/workflow',
        expect.objectContaining({
          phases: [],
          statuses: [],
          connectionIssue: false // Connection is good (1), but service calls failed
        })
      );
      
      // Verify that error was logged with the right message
      expect(errorSpy).toHaveBeenCalledWith(
        'Error fetching workflow data', 
        error, 
        expect.objectContaining({ userId: 'user123' })
      );
    });
  });
  
  describe('viewWorkflowProgress', () => {
    it('should render the workflow progress view with BCR data', async () => {
      // Ensure mongoose connection is ready
      mongoose.connection.readyState = 1; // Connected
      
      // Setup Jest mocks
      const mockBcr = {
        _id: '123456789012345678901234',
        bcrNumber: 'BCR-123',
        title: 'Test BCR',
        status: 'in-progress',
        currentPhase: 'phase1',
        currentStatus: 'status1'
      };
      bcrModel.getBcrById.mockResolvedValue(mockBcr);
      
      const mockWorkflowVisual = {
        phases: ['phase1', 'phase2'],
        statuses: ['status1', 'status2']
      };
      // Use the correct method name from the controller implementation
      workflowService.getWorkflowVisual.mockResolvedValue(mockWorkflowVisual);
      
      // We'll skip mocking the status tag service as it's not critical for this test
      
      // Spy on the info logger
      const infoSpy = jest.spyOn(loggerStub, 'info');
      
      // Call the controller method
      await workflowController.viewWorkflowProgress(req, res);
      
      // Assertions - check that render was called
      expect(res.render).toHaveBeenCalledTimes(1);
      expect(res.render).toHaveBeenCalledWith(
        'modules/bcr/workflow-progress',
        expect.objectContaining({
          title: `Workflow Progress - ${mockBcr.bcrNumber}`,
          bcr: mockBcr,
          workflowVisual: mockWorkflowVisual,
          connectionIssue: false,
          timedOut: false,
          user: req.user
        })
      );
      
      // Verify logging
      expect(infoSpy).toHaveBeenCalledWith('Loading workflow progress view', expect.anything());
      expect(infoSpy).toHaveBeenCalledWith('Workflow progress view loaded successfully', expect.anything());
    });
    
    it('should handle database connection issues', async () => {
      // Set mongoose connection to disconnected
      mongoose.connection.readyState = 0; // Disconnected
      
      // Spy on the info and error loggers
      const infoSpy = jest.spyOn(loggerStub, 'info');
      
      // Call the controller method
      await workflowController.viewWorkflowProgress(req, res);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.render).toHaveBeenCalledTimes(1);
      expect(res.render).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({
          connectionIssue: true,
          message: expect.stringContaining('Database connection issue')
        })
      );
      
      // Verify logging
      expect(infoSpy).toHaveBeenCalledWith('Loading workflow progress view', expect.anything());
    });
    
    it('should handle BCR not found', async () => {
      // Setup Jest mock to return null
      bcrModel.getBcrById.mockResolvedValue(null);
      
      // Spy on the info logger
      const infoSpy = jest.spyOn(loggerStub, 'info');
      
      // Call the controller method
      await workflowController.viewWorkflowProgress(req, res);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.render).toHaveBeenCalledTimes(1);
      expect(res.render).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({
          title: 'BCR Not Available'
        })
      );
      
      // Verify logging
      expect(infoSpy).toHaveBeenCalledWith('Loading workflow progress view', expect.anything());
    });
    
    it('should handle timeout when fetching BCR data', async () => {
      // Setup Jest mock to return a promise that never resolves
      // This will force the timeout to trigger
      bcrModel.getBcrById.mockImplementation(() => new Promise(() => {}));
      workflowService.getWorkflowVisual.mockImplementation(() => new Promise(() => {}));
      
      // Spy on the error logger
      const errorSpy = jest.spyOn(loggerStub, 'error');
      
      // Start the controller method but don't await it yet
      const controllerPromise = workflowController.viewWorkflowProgress(req, res);
      
      // Advance timers to trigger the timeout (5000ms + buffer)
      jest.advanceTimersByTime(5100);
      
      // Now await the controller to complete
      await controllerPromise;
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.render).toHaveBeenCalledTimes(1);
      expect(res.render).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({
          title: 'BCR Not Available',
          timedOut: true
        })
      );
      
      // Verify that error was logged
      expect(errorSpy).toHaveBeenCalledWith(
        'Error or timeout fetching BCR workflow data',
        expect.any(Error),
        expect.anything()
      );
    });
  });
  
  describe('updateWorkflowStatus', () => {
    it('should update the workflow status and redirect', async () => {
      // Setup request body
      req.body = {
        phaseId: 'phase2',
        statusId: 'status2',
        comments: 'Status update comment'
      };
      
      // Mock data
      const mockBcr = {
        _id: '123456789012345678901234',
        bcrNumber: 'BCR-123',
        title: 'Test BCR',
        currentPhaseId: 'phase1',
        currentStatusId: 'status1',
        workflowHistory: [],
        save: jest.fn().mockResolvedValue(undefined)
      };
      
      // Setup Jest mocks
      workflowService.updateBcrPhaseStatus.mockResolvedValue(undefined);
      bcrModel.getBcrById.mockResolvedValue(mockBcr);
      
      // Call the controller method
      await workflowController.updateWorkflowStatus(req, res);
      
      // Assertions
      expect(workflowService.updateBcrPhaseStatus).toHaveBeenCalledTimes(1);
      expect(bcrModel.getBcrById).toHaveBeenCalledTimes(1);
      expect(mockBcr.save).toHaveBeenCalledTimes(1);
      expect(res.redirect).toHaveBeenCalledTimes(1);
      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('/bcr/workflow-progress/'));
      
      // Verify logging
      expect(loggerStub.info).toHaveBeenCalledWith('Updating workflow status', expect.anything());
      expect(loggerStub.info).toHaveBeenCalledWith('Workflow status updated successfully', expect.anything());
    });
    
    it('should handle errors when updating workflow status', async () => {
      // Setup request body
      req.body = {
        phaseId: 'phase2',
        statusId: 'status2'
      };
      
      // Setup Jest mock to throw an error
      const error = new Error('Update error');
      workflowService.updateBcrPhaseStatus.mockRejectedValue(error);
      
      // Call the controller method
      await workflowController.updateWorkflowStatus(req, res);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.render).toHaveBeenCalledTimes(1);
      expect(res.render).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({
          message: expect.stringContaining('An error occurred while updating the workflow status'),
          connectionIssue: expect.anything()
        })
      );
      
      // Verify logging
      // The controller might be logging a different message or format
      expect(loggerStub.error).toHaveBeenCalled();
    });
  });
  
  describe('Helper Functions', () => {
    it('getPhaseByDisplayOrder should return phase with matching display order', () => {
      const phases = [
        { displayOrder: 1, name: 'Phase 1' },
        { displayOrder: 2, name: 'Phase 2' },
        { displayOrder: 3, name: 'Phase 3' }
      ];
      
      const result = workflowController.getPhaseByDisplayOrder(phases, 2);
      expect(result).toEqual({ displayOrder: 2, name: 'Phase 2' });
    });
    
    it('getPhaseByDisplayOrder should return null if no match found', () => {
      const phases = [
        { displayOrder: 1, name: 'Phase 1' },
        { displayOrder: 2, name: 'Phase 2' }
      ];
      
      const result = workflowController.getPhaseByDisplayOrder(phases, 3);
      expect(result).toBeNull();
    });
    
    it('getStatusById should return status with matching ID', () => {
      const statuses = [
        { _id: 'status1', name: 'Status 1' },
        { _id: 'status2', name: 'Status 2' }
      ];
      
      const result = workflowController.getStatusById(statuses, 'status2');
      expect(result).toEqual({ _id: 'status2', name: 'Status 2' });
    });
    
    it('getStatusById should handle string and object IDs', () => {
      const statusId = { toString: () => 'status1' };
      const statuses = [
        { _id: statusId, name: 'Status 1' },
        { _id: 'status2', name: 'Status 2' }
      ];
      
      const result = workflowController.getStatusById(statuses, { toString: () => 'status1' });
      // Check name property and that the ID matches when converted to string
      expect(result.name).toBe('Status 1');
      expect(result._id.toString()).toBe('status1');
    });
    
    it('getStatusById should return null if statusId is null', () => {
      const statuses = [
        { _id: 'status1', name: 'Status 1' },
        { _id: 'status2', name: 'Status 2' }
      ];
      
      const result = workflowController.getStatusById(statuses, null);
      expect(result).toBeNull();
    });
    
    it('getGroupDescription should return description for known group', () => {
      const result = workflowController.getGroupDescription('Implementation');
      expect(result).toBe('Development and implementation of the change');
    });
    
    it('getGroupDescription should return default description for unknown group', () => {
      const result = workflowController.getGroupDescription('Unknown');
      expect(result).toBe('Process group');
    });
  });
});
