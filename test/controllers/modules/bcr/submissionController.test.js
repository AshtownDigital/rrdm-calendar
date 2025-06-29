const { expect } = require('chai');
const sinon = require('sinon');
const mongoose = require('mongoose');
const submissionController = require('../../../../controllers/modules/bcr/modular/submissionController');
const bcrModel = require('../../../../models/modules/bcr/model');
const { createModuleLogger } = require('../../../../services/shared/loggerService');

describe('Submission Controller', () => {
  let req, res, loggerStub, bcrModelStub;

  beforeEach(() => {
    // Setup request and response objects
    req = {
      params: { id: 'test-submission-id' },
      body: {
        fullName: 'Test User',
        email: 'test@example.com',
        department: 'Test Department',
        title: 'Test Submission',
        description: 'Test description',
        impactArea: 'test-impact-area',
        urgencyLevel: 'medium'
      },
      user: { id: 'test-user-id', name: 'Test User' },
      query: {}
    };

    res = {
      render: sinon.stub(),
      redirect: sinon.stub(),
      status: sinon.stub().returns({ render: sinon.stub() })
    };

    // Stub the logger
    const logger = {
      info: sinon.stub(),
      error: sinon.stub(),
      warn: sinon.stub(),
      debug: sinon.stub()
    };
    loggerStub = sinon.stub({ createModuleLogger }).returns(logger);
    sinon.replace(require('../../../../services/shared/loggerService'), 'createModuleLogger', loggerStub);

    // Stub mongoose connection
    sinon.stub(mongoose.connection, 'readyState').value(1);

    // Stub BCR model methods
    bcrModelStub = {
      getAllImpactAreas: sinon.stub().resolves(['area1', 'area2']),
      getAllUrgencyLevels: sinon.stub().resolves(['low', 'medium', 'high']),
      createSubmission: sinon.stub().resolves({ _id: 'new-submission-id', submissionCode: 'SUB001' }),
      Submission: {
        findById: sinon.stub().resolves({
          _id: 'test-submission-id',
          submissionCode: 'SUB001',
          fullName: 'Test User',
          email: 'test@example.com',
          department: 'Test Department',
          title: 'Test Submission',
          description: 'Test description',
          impactArea: 'test-impact-area',
          urgencyLevel: 'medium',
          createdAt: new Date(),
          status: 'draft'
        }),
        findByIdAndUpdate: sinon.stub().resolves({})
      }
    };
    sinon.replace(bcrModel, 'getAllImpactAreas', bcrModelStub.getAllImpactAreas);
    sinon.replace(bcrModel, 'getAllUrgencyLevels', bcrModelStub.getAllUrgencyLevels);
    sinon.replace(bcrModel, 'createSubmission', bcrModelStub.createSubmission);
    sinon.replace(bcrModel, 'Submission', bcrModelStub.Submission);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('newSubmissionForm', () => {
    it('should render the new submission form with form data', async () => {
      // Act
      await submissionController.newSubmissionForm(req, res);

      // Assert
      expect(res.render).to.have.been.calledWith('modules/bcr/submissions/new');
      expect(res.render.firstCall.args[1]).to.include.keys('title', 'impactAreas', 'urgencyLevels');
      expect(loggerStub().info).to.have.been.calledWith('Loading new submission form', { userId: req.user.id });
      expect(loggerStub().info).to.have.been.calledWith('New submission form loaded successfully');
    });

    it('should handle database connection issues gracefully', async () => {
      // Arrange
      sinon.stub(mongoose.connection, 'readyState').value(0);

      // Act
      await submissionController.newSubmissionForm(req, res);

      // Assert
      expect(res.render).to.have.been.calledWith('modules/bcr/submissions/new');
      expect(res.render.firstCall.args[1]).to.include.keys('connectionIssue');
      expect(res.render.firstCall.args[1].connectionIssue).to.be.true;
    });

    it('should handle errors when fetching form data', async () => {
      // Arrange
      const error = new Error('Database error');
      bcrModelStub.getAllImpactAreas.rejects(error);

      // Act
      await submissionController.newSubmissionForm(req, res);

      // Assert
      expect(loggerStub().error).to.have.been.calledWith('Error fetching form data', error, { userId: req.user.id });
      expect(res.render).to.have.been.called;
    });
  });

  describe('createSubmission', () => {
    it('should create a submission and redirect to the submission view', async () => {
      // Act
      await submissionController.createSubmission(req, res);

      // Assert
      expect(bcrModelStub.createSubmission).to.have.been.called;
      expect(res.redirect).to.have.been.calledWith('/bcr/submissions/new-submission-id');
      expect(loggerStub().info).to.have.been.calledWith('Creating new submission', { userId: req.user.id });
      expect(loggerStub().info).to.have.been.calledWith('Submission created successfully', { 
        userId: req.user.id, 
        submissionId: 'new-submission-id' 
      });
    });

    it('should handle errors when creating a submission', async () => {
      // Arrange
      const error = new Error('Database error');
      bcrModelStub.createSubmission.rejects(error);

      // Act
      await submissionController.createSubmission(req, res);

      // Assert
      expect(loggerStub().error).to.have.been.calledWith('Error in create submission controller', error, { userId: req.user.id });
      expect(res.status).to.have.been.calledWith(500);
    });
  });

  describe('viewSubmission', () => {
    it('should render the submission view with submission data', async () => {
      // Act
      await submissionController.viewSubmission(req, res);

      // Assert
      expect(bcrModelStub.Submission.findById).to.have.been.calledWith('test-submission-id');
      expect(res.render).to.have.been.calledWith('modules/bcr/submissions/view');
      expect(loggerStub().info).to.have.been.calledWith('Viewing submission', { 
        userId: req.user.id, 
        submissionId: 'test-submission-id' 
      });
    });

    it('should handle submission not found', async () => {
      // Arrange
      bcrModelStub.Submission.findById.resolves(null);

      // Act
      await submissionController.viewSubmission(req, res);

      // Assert
      expect(res.status).to.have.been.calledWith(404);
    });

    it('should handle errors when fetching submission', async () => {
      // Arrange
      const error = new Error('Database error');
      bcrModelStub.Submission.findById.rejects(error);

      // Act
      await submissionController.viewSubmission(req, res);

      // Assert
      expect(loggerStub().error).to.have.been.calledWith('Error in view submission controller', error, { 
        userId: req.user.id, 
        submissionId: 'test-submission-id' 
      });
      expect(res.status).to.have.been.calledWith(500);
    });
  });

  describe('updateSubmission', () => {
    it('should update a submission and redirect to the submission view', async () => {
      // Act
      await submissionController.updateSubmission(req, res);

      // Assert
      expect(bcrModelStub.Submission.findByIdAndUpdate).to.have.been.called;
      expect(res.redirect).to.have.been.calledWith('/bcr/submissions/test-submission-id');
      expect(loggerStub().info).to.have.been.calledWith('Updating submission', { 
        userId: req.user.id, 
        submissionId: 'test-submission-id' 
      });
      expect(loggerStub().info).to.have.been.calledWith('Submission updated successfully', { 
        userId: req.user.id, 
        submissionId: 'test-submission-id' 
      });
    });

    it('should handle errors when updating a submission', async () => {
      // Arrange
      const error = new Error('Database error');
      bcrModelStub.Submission.findByIdAndUpdate.rejects(error);

      // Act
      await submissionController.updateSubmission(req, res);

      // Assert
      expect(loggerStub().error).to.have.been.calledWith('Error in update submission controller', error, { 
        userId: req.user.id, 
        submissionId: 'test-submission-id' 
      });
      expect(res.status).to.have.been.calledWith(500);
    });
  });
});
