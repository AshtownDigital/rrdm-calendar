/**
 * Unit tests for BCR Workflow Controller
 */

const mongoose = require('mongoose');
const workflowController = require('../../../../controllers/modules/bcr/modular/workflowController');
const bcrModel = require('../../../../models/modules/bcr/model');
const workflowService = require('../../../../services/modules/bcr/workflowService');
const { createModuleLogger } = require('../../../../services/shared/loggerService');

// Import Jest's mocking utilities
const sinon = require('sinon');

// Make Jest globals available
const { describe, it, beforeEach, afterEach } = global;

describe('BCR Workflow Controller', () => {
  let req, res, loggerStub;
  
  beforeEach(() => {
    // Mock request and response objects
    req = {
      params: { id: '123456789012345678901234' },
      user: { id: 'user123', name: 'Test User' },
      csrfToken: () => 'csrf-token',
      query: {},
      flash: sinon.stub(),
      body: {}
    };
    
    res = {
      render: sinon.spy(),
      redirect: sinon.spy(),
      status: sinon.stub().returnsThis()
    };
    
    // Mock the logger
    loggerStub = {
      info: sinon.spy(),
      warn: sinon.spy(),
      error: sinon.spy(),
      debug: sinon.spy()
    };
    
    // Stub the createModuleLogger to return our mock logger
    sinon.stub(createModuleLogger).returns(loggerStub);
    
    // Stub mongoose connection state
    sinon.stub(mongoose.connection, 'readyState').value(1);
  });
  
  afterEach(() => {
    // Restore all stubs
    sinon.restore();
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
      
      // Stub the service methods
      sinon.stub(workflowService, 'getAllPhases').resolves(mockPhases);
      sinon.stub(workflowService, 'getAllStatuses').resolves(mockStatuses);
      
      // Call the controller method
      await workflowController.showWorkflow(req, res);
      
      // Assertions
      expect(res.render).toHaveBeenCalledTimes(1);
      expect(res.render.firstCall.args[0]).toBe('modules/bcr/workflow');
      expect(res.render.firstCall.args[1]).toHaveProperty('phases');
      expect(res.render.firstCall.args[1].phases).toHaveLength(2);
      expect(res.render.firstCall.args[1]).toHaveProperty('statuses');
      expect(res.render.firstCall.args[1].statuses).toHaveLength(2);
      expect(res.render.firstCall.args[1]).toHaveProperty('phaseGroups');
      expect(res.render.firstCall.args[1]).toHaveProperty('connectionIssue', false);
      
      // Verify logging
      expect(loggerStub.info.calledWith('Loading workflow view')).toBe(true);
      expect(loggerStub.info.calledWith('Workflow view loaded successfully')).toBe(true);
    });
    
    it('should handle database connection issues', async () => {
      // Set disconnected database state
      sinon.stub(mongoose.connection, 'readyState').value(0);
      
      // Call the controller method
      await workflowController.showWorkflow(req, res);
      
      // Assertions
      expect(res.render).toHaveBeenCalledTimes(1);
      expect(res.render.firstCall.args[0]).toBe('modules/bcr/workflow');
      expect(res.render.firstCall.args[1]).toHaveProperty('phases');
      expect(res.render.firstCall.args[1].phases).toEqual([]);
      expect(res.render.firstCall.args[1]).toHaveProperty('statuses');
      expect(res.render.firstCall.args[1].statuses).toEqual([]);
      expect(res.render.firstCall.args[1]).toHaveProperty('connectionIssue', true);
      
      // Verify logging
      expect(loggerStub.info.calledWith('Loading workflow view')).toBe(true);
    });
    
    it('should handle errors when fetching workflow data', async () => {
      // Stub the service methods to throw errors
      const error = new Error('Service error');
      sinon.stub(workflowService, 'getAllPhases').rejects(error);
      sinon.stub(workflowService, 'getAllStatuses').rejects(error);
      
      // Call the controller method
      await workflowController.showWorkflow(req, res);
      
      // Assertions
      expect(res.render).toHaveBeenCalledTimes(1);
      expect(res.render.firstCall.args[0]).toBe('modules/bcr/workflow');
      expect(res.render.firstCall.args[1]).toHaveProperty('phases');
      expect(res.render.firstCall.args[1].phases).toEqual([]);
      expect(res.render.firstCall.args[1]).toHaveProperty('statuses');
      expect(res.render.firstCall.args[1].statuses).toEqual([]);
      
      // Verify logging
      expect(loggerStub.error.calledWith('Error fetching workflow data')).toBe(true);
    });
  });
  
  describe('viewWorkflowProgress', () => {
    it('should render the workflow progress view with BCR data', async () => {
      // Mock data
      const mockBcr = {
        _id: '123456789012345678901234',
        title: 'Test BCR',
        status: 'in-progress',
        currentPhase: 'phase1',
        currentStatus: 'status1'
      };
      
      const mockWorkflowProgress = {
        phases: ['phase1', 'phase2'],
        statuses: ['status1', 'status2'],
        currentPhase: 'phase1',
        currentStatus: 'status1'
      };
      
      const mockPhase = { id: 'phase1', name: 'Phase 1', description: 'First phase' };
      const mockStatus = { id: 'status1', name: 'Status 1', description: 'First status' };
      
      // Stub the model and service methods
      sinon.stub(bcrModel, 'getBcrById').resolves(mockBcr);
      sinon.stub(workflowService, 'getWorkflowProgressVisualization').returns(mockWorkflowProgress);
      sinon.stub(workflowService, 'getPhaseById').resolves(mockPhase);
      sinon.stub(workflowService, 'getStatusById').resolves(mockStatus);
      
      // Call the controller method
      await workflowController.viewWorkflowProgress(req, res);
      
      // Assertions
      expect(res.render).toHaveBeenCalledTimes(1);
      expect(res.render.firstCall.args[0]).toBe('modules/bcr/workflow-progress');
      expect(res.render.firstCall.args[1]).toHaveProperty('title');
      expect(res.render.firstCall.args[1].title).toContain('BCR-123');
      expect(res.render.firstCall.args[1]).toHaveProperty('bcr');
      expect(res.render.firstCall.args[1]).toHaveProperty('workflowVisual');
      expect(res.render.firstCall.args[1]).toHaveProperty('statusTag');
      
      // Verify logging
      expect(loggerStub.info.calledWith('Loading workflow progress view')).toBe(true);
      expect(loggerStub.info.calledWith('Workflow progress view loaded successfully')).toBe(true);
    });
    
    it('should handle database connection issues', async () => {
      // Set disconnected database state
      sinon.stub(mongoose.connection, 'readyState').value(0);
      
      // Call the controller method
      await workflowController.viewWorkflowProgress(req, res);
      
      // Assertions
      expect(res.status.calledWith(404)).to.be.true;
      expect(res.render.calledOnce).to.be.true;
      expect(res.render.firstCall.args[0]).to.equal('error');
      expect(res.render.firstCall.args[1]).to.have.property('connectionIssue', true);
      
      // Verify logging
      expect(loggerStub.info.calledWith('Loading workflow progress view')).to.be.true;
    });
    
    it('should handle BCR not found', async () => {
      // Stub the model method to return null
      sinon.stub(bcrModel, 'getBcrById').resolves(null);
      
      // Call the controller method
      await workflowController.viewWorkflowProgress(req, res);
      
      // Assertions
      expect(res.status).toHaveBeenCalledTimes(1);
      expect(res.status.firstCall.args[0]).toBe(404);
      expect(res.render).toHaveBeenCalledTimes(1);
      expect(res.render.firstCall.args[0]).toBe('error');
      
      // Verify logging
      expect(loggerStub.info.calledWith('Loading workflow progress view')).toBe(true);
    });
    
    it('should handle timeout when fetching BCR data', async () => {
      // Stub the model method to simulate a timeout
      const timeoutError = new Error('Database operation timed out');
      sinon.stub(bcrModel, 'getBcrById').rejects(timeoutError);
      
      // Call the controller method
      await workflowController.viewWorkflowProgress(req, res);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.render).toHaveBeenCalledTimes(1);
      expect(res.render.firstCall.args[0]).toBe('error');
      
      // Verify logging
      expect(loggerStub.error.calledWith('Error or timeout fetching BCR workflow data')).toBe(true);
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
        save: sinon.stub().resolves()
      };
      
      // Stub the service methods
      sinon.stub(workflowService, 'updateBcrPhaseStatus').resolves();
      sinon.stub(bcrModel, 'getBcrById').resolves(mockBcr);
      
      // Call the controller method
      await workflowController.updateWorkflowStatus(req, res);
      
      // Assertions
      expect(workflowService.updateBcrPhaseStatus).toHaveBeenCalledTimes(1);
      expect(bcrModel.getBcrById).toHaveBeenCalledTimes(1);
      expect(mockBcr.save).toHaveBeenCalledTimes(1);
      expect(res.redirect).toHaveBeenCalledTimes(1);
      expect(res.redirect.firstCall.args[0]).toContain('/bcr/workflow-progress/');
      
      // Verify logging
      expect(loggerStub.info.calledWith('Updating workflow status')).toBe(true);
      expect(loggerStub.info.calledWith('Workflow status updated successfully')).toBe(true);
    });
    
    it('should handle errors when updating workflow status', async () => {
      // Setup request body
      req.body = {
        phaseId: 'phase2',
        statusId: 'status2'
      };
      
      // Stub the service method to throw an error
      const error = new Error('Update error');
      sinon.stub(workflowService, 'updateBcrPhaseStatus').rejects(error);
      
      // Call the controller method
      await workflowController.updateWorkflowStatus(req, res);
      
      // Assertions
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.render).toHaveBeenCalledTimes(1);
      expect(res.render.firstCall.args[0]).toBe('error');
      
      // Verify logging
      expect(loggerStub.error.calledWith('Error in update workflow status controller')).toBe(true);
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
      const statuses = [
        { _id: { toString: () => 'status1' }, name: 'Status 1' },
        { _id: 'status2', name: 'Status 2' }
      ];
      
      const result = workflowController.getStatusById(statuses, { toString: () => 'status1' });
      expect(result).toEqual({ _id: { toString: () => 'status1' }, name: 'Status 1' });
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
