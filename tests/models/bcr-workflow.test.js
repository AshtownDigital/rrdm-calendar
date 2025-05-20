/**
 * BCR Workflow Model Tests
 * Tests the functionality of the BCR workflow progression with Prisma
 */
const { PrismaClient } = require('@prisma/client');
const bcrModel = require('../../models/bcr/model');

// Mock Prisma client
jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      bcrs: {
        findUnique: jest.fn().mockImplementation((params) => {
          if (params.where.id === 'bcr-123') {
            return Promise.resolve({
              id: 'bcr-123',
              bcrNumber: 'BCR-25/26-001',
              title: 'Test BCR',
              description: 'Test description',
              phase: 'Initial Assessment',
              status: 'new_submission',
              priority: 'Medium',
              createdAt: new Date('2025-05-15T10:00:00Z'),
              updatedAt: new Date('2025-05-15T10:00:00Z'),
              submissionId: 'sub-123'
            });
          } else {
            return Promise.resolve(null);
          }
        }),
        update: jest.fn().mockResolvedValue({
          id: 'bcr-123',
          bcrNumber: 'BCR-25/26-001',
          title: 'Test BCR',
          description: 'Test description',
          phase: 'Detailed Analysis',
          status: 'in_progress',
          priority: 'Medium',
          createdAt: new Date('2025-05-15T10:00:00Z'),
          updatedAt: new Date('2025-05-17T14:30:00Z'),
          submissionId: 'sub-123'
        }),
        create: jest.fn().mockResolvedValue({
          id: 'bcr-123',
          bcrNumber: 'BCR-25/26-001',
          title: 'Test BCR',
          description: 'Test description',
          phase: 'Initial Assessment',
          status: 'new_submission',
          priority: 'Medium',
          createdAt: new Date('2025-05-15T10:00:00Z'),
          updatedAt: new Date('2025-05-15T10:00:00Z'),
          submissionId: 'sub-123'
        })
      },
      bcrWorkflowHistory: {
        create: jest.fn().mockResolvedValue({
          id: 'history-123',
          bcrId: 'bcr-123',
          fromPhase: 'Initial Assessment',
          toPhase: 'Detailed Analysis',
          fromStatus: 'new_submission',
          toStatus: 'in_progress',
          comment: 'Initial assessment complete',
          createdBy: 'user-123',
          createdAt: new Date('2025-05-17T14:30:00Z')
        }),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'history-123',
            bcrId: 'bcr-123',
            fromPhase: 'Initial Assessment',
            toPhase: 'Detailed Analysis',
            fromStatus: 'new_submission',
            toStatus: 'in_progress',
            comment: 'Initial assessment complete',
            createdBy: 'user-123',
            createdAt: new Date('2025-05-17T14:30:00Z')
          }
        ])
      },
      bcrSubmissions: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'sub-123',
          submissionCode: 'SUB-25/26-001',
          fullName: 'Test User',
          emailAddress: 'test@example.com',
          submissionSource: 'Internal',
          briefDescription: 'Test submission',
          justification: 'Testing purposes',
          urgencyLevel: 'Medium',
          impactAreas: ['Funding', 'Systems'],
          createdAt: new Date('2025-05-15T10:00:00Z')
        })
      },
      bcrConfigs: {
        findMany: jest.fn().mockResolvedValue([
          { id: '1', type: 'workflow_phase', name: 'Initial Assessment', value: 'Initial Assessment', displayOrder: 10 },
          { id: '2', type: 'workflow_phase', name: 'Detailed Analysis', value: 'Detailed Analysis', displayOrder: 20 },
          { id: '3', type: 'workflow_phase', name: 'Stakeholder Consultation', value: 'Stakeholder Consultation', displayOrder: 30 },
          { id: '4', type: 'workflow_phase', name: 'Implementation Planning', value: 'Implementation Planning', displayOrder: 40 },
          { id: '5', type: 'workflow_phase', name: 'Approval Process', value: 'Approval Process', displayOrder: 50 },
          { id: '6', type: 'workflow_phase', name: 'Implementation', value: 'Implementation', displayOrder: 60 },
          { id: '7', type: 'workflow_phase', name: 'Testing', value: 'Testing', displayOrder: 70 },
          { id: '8', type: 'workflow_phase', name: 'Go Live', value: 'Go Live', displayOrder: 80 },
          { id: '9', type: 'workflow_phase', name: 'Post-Implementation Review', value: 'Post-Implementation Review', displayOrder: 90 },
          { id: '10', type: 'workflow_phase', name: 'Closure', value: 'Closure', displayOrder: 100 }
        ])
      },
      $disconnect: jest.fn()
    }))
  };
});

describe('BCR Workflow Model', () => {
  let prisma;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    prisma = new PrismaClient();
  });
  
  afterEach(() => {
    // Disconnect Prisma client after each test
    prisma.$disconnect();
  });
  
  describe('createBcrFromSubmission', () => {
    it('should create a BCR from a submission', async () => {
      const submissionId = 'sub-123';
      const bcr = await bcrModel.createBcrFromSubmission(submissionId);
      
      expect(bcr).toBeDefined();
      expect(bcr.id).toBe('bcr-123');
      expect(bcr.bcrNumber).toBe('BCR-25/26-001');
      expect(bcr.phase).toBe('Initial Assessment');
      expect(bcr.status).toBe('new_submission');
      expect(prisma.bcrs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            submissionId: 'sub-123'
          })
        })
      );
    });
  });
  
  describe('updateBcrPhase', () => {
    it('should update a BCR phase and status', async () => {
      const bcrId = 'bcr-123';
      const phase = 'Detailed Analysis';
      const status = 'in_progress';
      const comment = 'Initial assessment complete';
      const updatedBy = 'user-123';
      
      const updatedBcr = await bcrModel.updateBcrPhase(bcrId, phase, status, comment, updatedBy);
      
      expect(updatedBcr).toBeDefined();
      expect(updatedBcr.phase).toBe('Detailed Analysis');
      expect(updatedBcr.status).toBe('in_progress');
      
      // Verify BCR was updated
      expect(prisma.bcrs.update).toHaveBeenCalledWith({
        where: { id: bcrId },
        data: expect.objectContaining({
          phase,
          status,
          updatedBy
        })
      });
      
      // Verify workflow history was created
      expect(prisma.bcrWorkflowHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          bcrId,
          fromPhase: 'Initial Assessment',
          toPhase: phase,
          fromStatus: 'new_submission',
          toStatus: status,
          comment,
          createdBy: updatedBy
        })
      });
    });
  });
  
  describe('autoAdvancePhase', () => {
    it('should automatically advance to the next phase', async () => {
      const bcrId = 'bcr-123';
      
      // Mock the getBcrById method to return a BCR with a completed status
      prisma.bcrs.findUnique.mockResolvedValueOnce({
        id: 'bcr-123',
        bcrNumber: 'BCR-25/26-001',
        phase: 'Initial Assessment',
        status: 'completed',
        priority: 'Medium'
      });
      
      // Mock the bcrConfigs to return workflow phases
      prisma.bcrConfigs.findMany.mockResolvedValueOnce([
        { id: '1', type: 'workflow_phase', name: 'Initial Assessment', value: 'Initial Assessment', displayOrder: 10 },
        { id: '2', type: 'workflow_phase', name: 'Detailed Analysis', value: 'Detailed Analysis', displayOrder: 20 }
      ]);
      
      // Mock the update method to return the updated BCR
      prisma.bcrs.update.mockResolvedValueOnce({
        id: 'bcr-123',
        bcrNumber: 'BCR-25/26-001',
        phase: 'Detailed Analysis',
        status: 'pending',
        priority: 'Medium'
      });
      
      await bcrModel.autoAdvancePhase(bcrId);
      
      // Verify that the BCR was updated to the next phase
      expect(prisma.bcrs.update).toHaveBeenCalledWith({
        where: { id: bcrId },
        data: expect.objectContaining({
          phase: 'Detailed Analysis',
          status: expect.any(String)
        })
      });
      
      // Verify that a workflow history entry was created
      expect(prisma.bcrWorkflowHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          bcrId,
          fromPhase: 'Initial Assessment',
          toPhase: 'Detailed Analysis'
        })
      });
    });
  });
  
  describe('getWorkflowHistory', () => {
    it('should retrieve the workflow history for a BCR', async () => {
      const bcrId = 'bcr-123';
      
      const history = await bcrModel.getWorkflowHistory(bcrId);
      
      expect(history).toBeDefined();
      expect(history).toHaveLength(1);
      expect(history[0].fromPhase).toBe('Initial Assessment');
      expect(history[0].toPhase).toBe('Detailed Analysis');
      
      expect(prisma.bcrWorkflowHistory.findMany).toHaveBeenCalledWith({
        where: { bcrId },
        orderBy: { createdAt: 'desc' }
      });
    });
  });
});
