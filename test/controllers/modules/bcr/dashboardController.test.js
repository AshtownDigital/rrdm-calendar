/**
 * Unit tests for the dashboard controller
 */

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const { expect } = chai;
chai.use(sinonChai);

const mongoose = require('mongoose');
const dashboardViewModel = require('../../../../viewModels/dashboardViewModel');
const dashboardController = require('../../../../controllers/modules/bcr/modular/dashboardController');
const { createModuleLogger } = require('../../../../services/shared/loggerService');

describe('Dashboard Controller', () => {
  let req, res, viewModelStub, loggerStub;

  beforeEach(() => {
    // Create request and response objects
    req = {
      user: { id: 'user123', name: 'Test User' }
    };
    
    res = {
      render: sinon.spy(),
      status: sinon.stub().returns({ render: sinon.spy() })
    };
    
    // Stub the view model
    viewModelStub = sinon.stub(dashboardViewModel, 'prepareDashboardData');
    
    // Create a mock logger
    loggerStub = {
      info: sinon.spy(),
      error: sinon.spy(),
      warn: sinon.spy(),
      debug: sinon.spy()
    };
    
    // Replace the real logger with our stub
    sinon.stub(createModuleLogger).returns(loggerStub);
  });
  
  afterEach(() => {
    // Restore all stubs
    sinon.restore();
  });
  
  describe('dashboard()', () => {
    it('should render the dashboard view with data from view model', async () => {
      // Arrange
      const mockDashboardData = {
        counters: { total: 10, approved: 5 },
        phases: [{ id: 'phase1', name: 'Phase 1' }],
        recentBcrs: [{ id: 'bcr1', title: 'BCR 1' }]
      };
      
      viewModelStub.resolves(mockDashboardData);
      
      // Act
      await dashboardController.dashboard(req, res);
      
      // Assert
      expect(viewModelStub).to.have.been.calledOnce;
      expect(res.render).to.have.been.calledWith('modules/bcr/dashboard', {
        title: 'Business Change Request Dashboard',
        ...mockDashboardData,
        user: req.user
      });
      expect(loggerStub.info).to.have.been.calledWith('Loading dashboard', { userId: 'user123' });
      expect(loggerStub.info).to.have.been.calledWith('Dashboard loaded successfully');
    });
    
    it('should handle errors and render error page', async () => {
      // Arrange
      const error = new Error('Test error');
      viewModelStub.rejects(error);
      
      // Mock mongoose connection state
      sinon.stub(mongoose.connection, 'readyState').value(0);
      
      // Act
      await dashboardController.dashboard(req, res);
      
      // Assert
      expect(viewModelStub).to.have.been.calledOnce;
      expect(loggerStub.error).to.have.been.calledWith('Error loading dashboard', error, { userId: 'user123' });
      expect(res.status).to.have.been.calledWith(500);
      expect(res.status().render).to.have.been.calledWith('error', {
        title: 'Error',
        message: 'An error occurred while loading the dashboard',
        error: {},
        connectionIssue: true,
        user: req.user
      });
    });
  });
  
  describe('statistics()', () => {
    it('should render the statistics view with data from view model', async () => {
      // Arrange
      const mockStatisticsData = {
        counters: { total: 100, approved: 50 },
        phases: [{ id: 'phase1', name: 'Phase 1' }],
        recentBcrs: Array(100).fill({ id: 'bcr', title: 'BCR' })
      };
      
      viewModelStub.resolves(mockStatisticsData);
      
      // Act
      await dashboardController.statistics(req, res);
      
      // Assert
      expect(viewModelStub).to.have.been.calledOnce;
      expect(res.render).to.have.been.calledWith('modules/bcr/statistics', {
        title: 'BCR Statistics and Metrics',
        ...mockStatisticsData,
        user: req.user
      });
      expect(loggerStub.info).to.have.been.calledWith('Loading statistics', { userId: 'user123' });
      expect(loggerStub.info).to.have.been.calledWith('Statistics loaded successfully');
    });
  });
});
