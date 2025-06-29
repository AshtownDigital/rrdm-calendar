/**
 * Unit tests for BCR View Controller
 */

const chai = require('chai');
const sinon = require('sinon');
const { expect } = chai;
const mongoose = require('mongoose');
const viewController = require('../../../../controllers/modules/bcr/modular/viewController');
const bcrModel = require('../../../../models/modules/bcr/model');
const workflowService = require('../../../../services/modules/bcr/workflowService');
const loggerService = require('../../../../services/shared/loggerService');

describe('BCR View Controller', () => {
  let req, res, loggerStub;
  
  beforeEach(() => {
    // Mock request and response objects
    req = {
      params: { id: '123456789012345678901234' },
      user: { id: 'user123', name: 'Test User' },
      csrfToken: () => 'csrf-token',
      query: {},
      flash: sinon.stub()
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
    sinon.stub(loggerService, 'createModuleLogger').returns(loggerStub);
    
    // Stub mongoose connection state
    sinon.stub(mongoose.connection, 'readyState').value(1);
  });
  
  afterEach(() => {
    // Restore all stubs
    sinon.restore();
  });
  
  describe('viewBcr', () => {
    it('should render the BCR view when BCR is found', async () => {
      // Mock data
      const mockBcr = {
        _id: '123456789012345678901234',
        bcrNumber: 'BCR-123',
        title: 'Test BCR',
        description: 'Test description',
        currentPhaseId: 'phase123',
        currentStatusId: 'status123',
        submissionId: 'submission123',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const mockSubmission = {
        _id: 'submission123',
        submissionCode: 'SUB-123',
        briefDescription: 'Test submission',
        justification: 'Test justification'
      };
      
      const mockPhase = {
        _id: 'phase123',
        name: 'Test Phase'
      };
      
      const mockStatus = {
        _id: 'status123',
        name: 'Test Status',
        color: 'blue'
      };
      
      const mockWorkflowHistory = [
        { action: 'Created', timestamp: new Date() }
      ];
      
      const mockImpactAreas = [
        { name: 'Area 1' },
        { name: 'Area 2' }
      ];
      
      // Stub the model and service methods
      sinon.stub(bcrModel, 'getBcrById').resolves(mockBcr);
      sinon.stub(bcrModel, 'getSubmissionById').resolves(mockSubmission);
      sinon.stub(workflowService, 'getPhaseById').resolves(mockPhase);
      sinon.stub(workflowService, 'getStatusById').resolves(mockStatus);
      sinon.stub(workflowService, 'getStatusTag').returns({ class: 'govuk-tag govuk-tag--blue' });
      sinon.stub(workflowService, 'getWorkflowHistoryForBcr').resolves(mockWorkflowHistory);
      sinon.stub(bcrModel, 'getAllImpactAreas').resolves(mockImpactAreas);
      
      // Call the controller method
      await viewController.viewBcr(req, res);
      
      // Assertions
      expect(res.render.calledOnce).to.be.true;
      expect(res.render.firstCall.args[0]).to.equal('modules/bcr/view-modular');
      expect(res.render.firstCall.args[1]).to.have.property('title').that.includes('BCR-123');
      expect(res.render.firstCall.args[1]).to.have.property('bcr');
      expect(res.render.firstCall.args[1]).to.have.property('submission');
      expect(res.render.firstCall.args[1]).to.have.property('currentPhase', 'Test Phase');
      expect(res.render.firstCall.args[1]).to.have.property('workflowStatus', 'Test Status');
      
      // Verify logging
      expect(loggerStub.info.calledWith('Viewing BCR details', { userId: 'user123', bcrId: '123456789012345678901234' })).to.be.true;
      expect(loggerStub.info.calledWith('BCR view loaded successfully')).to.be.true;
    });
    
    it('should handle invalid BCR ID format', async () => {
      // Set an invalid ID
      req.params.id = 'invalid-id';
      
      // Call the controller method
      await viewController.viewBcr(req, res);
      
      // Assertions
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.render.calledOnce).to.be.true;
      expect(res.render.firstCall.args[0]).to.equal('error');
      
      // Verify logging
      expect(loggerStub.warn.calledWith('Invalid BCR ID format')).to.be.true;
    });
    
    it('should handle database connection issues', async () => {
      // Set disconnected database state
      sinon.stub(mongoose.connection, 'readyState').value(0);
      
      // Call the controller method
      await viewController.viewBcr(req, res);
      
      // Assertions
      expect(res.status.calledWith(503)).to.be.true;
      expect(res.render.calledOnce).to.be.true;
      expect(res.render.firstCall.args[0]).to.equal('error');
      expect(res.render.firstCall.args[1]).to.have.property('connectionIssue', true);
      
      // Verify logging
      expect(loggerStub.warn.calledWith('Database connection issue detected')).to.be.true;
    });
    
    it('should redirect if BCR and submission are not found', async () => {
      // Stub the model methods to return null
      sinon.stub(bcrModel, 'getBcrById').resolves(null);
      sinon.stub(bcrModel, 'getSubmissionById').resolves(null);
      
      // Call the controller method
      await viewController.viewBcr(req, res);
      
      // Assertions
      expect(res.redirect.calledOnce).to.be.true;
      expect(res.redirect.firstCall.args[0]).to.equal('/bcr/business-change-requests');
      
      // Verify logging
      expect(loggerStub.warn.calledWith('BCR or submission not found')).to.be.true;
    });
    
    it('should handle errors when fetching BCR details', async () => {
      // Stub the model method to throw an error
      const error = new Error('Database error');
      sinon.stub(bcrModel, 'getBcrById').throws(error);
      
      // Call the controller method
      await viewController.viewBcr(req, res);
      
      // Assertions
      expect(res.status.calledWith(500)).to.be.true;
      expect(res.render.calledOnce).to.be.true;
      expect(res.render.firstCall.args[0]).to.equal('error');
      
      // Verify logging
      expect(loggerStub.error.calledWith('Error viewing BCR details')).to.be.true;
    });
  });
  
  describe('listApprovedBcrs', () => {
    it('should render the approved BCRs list', async () => {
      // Mock data
      const mockBcrs = [
        {
          _id: '123456789012345678901234',
          bcrNumber: 'BCR-123',
          title: 'Test BCR 1',
          status: 'Approved',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          _id: '123456789012345678901235',
          bcrNumber: 'BCR-124',
          title: 'Test BCR 2',
          status: 'Implemented',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      // Stub the model methods
      sinon.stub(bcrModel, 'getApprovedBcrs').resolves(mockBcrs);
      sinon.stub(workflowService, 'getStatusTag').returns({ class: 'govuk-tag govuk-tag--green' });
      
      // Call the controller method
      await viewController.listApprovedBcrs(req, res);
      
      // Assertions
      expect(res.render.calledOnce).to.be.true;
      expect(res.render.firstCall.args[0]).to.equal('modules/bcr/bcrs/list');
      expect(res.render.firstCall.args[1]).to.have.property('bcrs').with.lengthOf(2);
      expect(res.render.firstCall.args[1]).to.have.property('connectionIssue', false);
      
      // Verify logging
      expect(loggerStub.info.calledWith('Listing approved BCRs')).to.be.true;
      expect(loggerStub.debug.calledWith('Retrieved approved BCRs')).to.be.true;
      expect(loggerStub.info.calledWith('Approved BCRs list loaded successfully')).to.be.true;
    });
    
    it('should handle database connection issues', async () => {
      // Set disconnected database state
      sinon.stub(mongoose.connection, 'readyState').value(0);
      
      // Call the controller method
      await viewController.listApprovedBcrs(req, res);
      
      // Assertions
      expect(res.render.calledOnce).to.be.true;
      expect(res.render.firstCall.args[0]).to.equal('modules/bcr/bcrs/list');
      expect(res.render.firstCall.args[1]).to.have.property('bcrs').that.is.empty;
      expect(res.render.firstCall.args[1]).to.have.property('connectionIssue', true);
      
      // Verify logging
      expect(loggerStub.warn.calledWith('Database connection issue detected')).to.be.true;
    });
    
    it('should handle timeout when fetching approved BCRs', async () => {
      // Stub the model method to simulate a timeout
      const timeoutError = new Error('Timeout fetching approved BCRs');
      sinon.stub(bcrModel, 'getApprovedBcrs').rejects(timeoutError);
      
      // Call the controller method
      await viewController.listApprovedBcrs(req, res);
      
      // Assertions
      expect(res.render.calledOnce).to.be.true;
      expect(res.render.firstCall.args[0]).to.equal('modules/bcr/bcrs/list');
      expect(res.render.firstCall.args[1]).to.have.property('bcrs').that.is.empty;
      
      // Verify logging
      expect(loggerStub.error.calledWith('Error fetching approved BCRs')).to.be.true;
    });
    
    it('should handle errors when rendering the list', async () => {
      // Stub the model method to throw an error
      const error = new Error('Unexpected error');
      sinon.stub(bcrModel, 'getApprovedBcrs').throws(error);
      
      // Call the controller method
      await viewController.listApprovedBcrs(req, res);
      
      // Assertions
      expect(res.status.calledWith(500)).to.be.true;
      expect(res.render.calledOnce).to.be.true;
      expect(res.render.firstCall.args[0]).to.equal('error');
      
      // Verify logging
      expect(loggerStub.error.calledWith('Error listing approved BCRs')).to.be.true;
    });
  });
  
  describe('viewWorkflowProgress', () => {
    it('should render the workflow progress view', async () => {
      // Mock data
      const mockBcr = {
        _id: '123456789012345678901234',
        bcrNumber: 'BCR-123',
        title: 'Test BCR',
        currentPhaseId: 'phase123',
        currentStatusId: 'status123',
        submissionId: 'submission123',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const mockSubmission = {
        _id: 'submission123',
        submissionCode: 'SUB-123'
      };
      
      const mockPhase = {
        _id: 'phase123',
        name: 'Test Phase',
        displayOrder: 2
      };
      
      const mockStatus = {
        _id: 'status123',
        name: 'Test Status',
        color: 'blue'
      };
      
      const mockAllPhases = [
        { _id: 'phase001', name: 'Initial Phase', displayOrder: 1 },
        { _id: 'phase123', name: 'Test Phase', displayOrder: 2 },
        { _id: 'phase456', name: 'Final Phase', displayOrder: 3 }
      ];
      
      const mockAllStatuses = [
        { _id: 'status001', name: 'Draft', color: 'grey' },
        { _id: 'status123', name: 'Test Status', color: 'blue' },
        { _id: 'status456', name: 'Approved', color: 'green' }
      ];
      
      // Stub the model and service methods
      sinon.stub(bcrModel, 'getBcrById').resolves(mockBcr);
      sinon.stub(bcrModel.constructor, 'findById').resolves(mockSubmission);
      sinon.stub(workflowService, 'getPhaseById').resolves(mockPhase);
      sinon.stub(workflowService, 'getStatusById').resolves(mockStatus);
      sinon.stub(bcrModel, 'getAllPhases').resolves(mockAllPhases);
      sinon.stub(bcrModel, 'getAllStatuses').resolves(mockAllStatuses);
      
      // Call the controller method
      await viewController.viewWorkflowProgress(req, res);
      
      // Assertions
      expect(res.render.calledOnce).to.be.true;
      expect(res.render.firstCall.args[0]).to.equal('modules/bcr/bcrs/workflow-progress');
      expect(res.render.firstCall.args[1]).to.have.property('title').that.includes('BCR-123');
      expect(res.render.firstCall.args[1]).to.have.property('bcr');
      expect(res.render.firstCall.args[1]).to.have.property('currentPhase', 'Test Phase');
      expect(res.render.firstCall.args[1]).to.have.property('workflowStatus', 'Test Status');
      expect(res.render.firstCall.args[1]).to.have.property('workflowProgress').that.is.an('array');
      
      // Verify logging
      expect(loggerStub.info.calledWith('Viewing workflow progress')).to.be.true;
      expect(loggerStub.debug.calledWith('Found BCR for workflow progress')).to.be.true;
      expect(loggerStub.info.calledWith('Workflow progress view loaded successfully')).to.be.true;
    });
    
    it('should handle database connection issues', async () => {
      // Set disconnected database state
      sinon.stub(mongoose.connection, 'readyState').value(0);
      
      // Call the controller method
      await viewController.viewWorkflowProgress(req, res);
      
      // Assertions
      expect(res.status.calledWith(503)).to.be.true;
      expect(res.render.calledOnce).to.be.true;
      expect(res.render.firstCall.args[0]).to.equal('error');
      expect(res.render.firstCall.args[1]).to.have.property('connectionIssue', true);
      
      // Verify logging
      expect(loggerStub.warn.calledWith('Database connection issue detected')).to.be.true;
    });
    
    it('should redirect if BCR is not found', async () => {
      // Stub the model method to return null
      sinon.stub(bcrModel, 'getBcrById').resolves(null);
      
      // Call the controller method
      await viewController.viewWorkflowProgress(req, res);
      
      // Assertions
      expect(req.flash.calledOnce).to.be.true;
      expect(req.flash.firstCall.args[0]).to.equal('error');
      expect(res.redirect.calledOnce).to.be.true;
      expect(res.redirect.firstCall.args[0]).to.equal('/bcr/business-change-requests');
      
      // Verify logging
      expect(loggerStub.warn.calledWith('BCR not found for workflow progress view')).to.be.true;
    });
    
    it('should handle errors when fetching workflow data', async () => {
      // Stub the model method to throw an error
      const error = new Error('Database error');
      sinon.stub(bcrModel, 'getBcrById').throws(error);
      
      // Call the controller method
      await viewController.viewWorkflowProgress(req, res);
      
      // Assertions
      expect(res.status.calledWith(500)).to.be.true;
      expect(res.render.calledOnce).to.be.true;
      expect(res.render.firstCall.args[0]).to.equal('error');
      
      // Verify logging
      expect(loggerStub.error.calledWith('Error viewing workflow progress')).to.be.true;
    });
    
    it('should handle missing phase and status data', async () => {
      // Mock data with missing phase and status
      const mockBcr = {
        _id: '123456789012345678901234',
        bcrNumber: 'BCR-123',
        title: 'Test BCR',
        currentPhaseId: 'missing-phase',
        currentStatusId: 'missing-status',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Stub methods to simulate missing data
      sinon.stub(bcrModel, 'getBcrById').resolves(mockBcr);
      sinon.stub(workflowService, 'getPhaseById').resolves(null);
      sinon.stub(workflowService, 'getStatusById').resolves(null);
      sinon.stub(bcrModel, 'getAllPhases').resolves([]);
      sinon.stub(bcrModel, 'getAllStatuses').resolves([]);
      
      // Call the controller method
      await viewController.viewWorkflowProgress(req, res);
      
      // Assertions
      expect(res.render.calledOnce).to.be.true;
      expect(res.render.firstCall.args[1]).to.have.property('currentPhase', 'Unknown');
      expect(res.render.firstCall.args[1]).to.have.property('workflowStatus', 'Unknown');
      expect(res.render.firstCall.args[1]).to.have.property('workflowProgress').that.is.an('array').that.is.empty;
      
      // Verify logging
      expect(loggerStub.info.calledWith('Workflow progress view loaded successfully')).to.be.true;
    });
  });
});
