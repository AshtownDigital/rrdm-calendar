/**
 * Mock database configuration for testing
 */

const { mockPrisma } = require('./prisma');

// Mock Sequelize
const mockSequelize = {
  define: jest.fn().mockReturnValue({
    findAll: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue([1]),
    destroy: jest.fn().mockResolvedValue(1),
    findByPk: jest.fn().mockResolvedValue({}),
    hasMany: jest.fn(),
    belongsTo: jest.fn(),
    belongsToMany: jest.fn(),
    sync: jest.fn().mockResolvedValue(true)
  }),
  transaction: jest.fn().mockImplementation((cb) => {
    if (cb) {
      const t = {
        commit: jest.fn().mockResolvedValue(),
        rollback: jest.fn().mockResolvedValue()
      };
      return cb(t);
    }
    return {
      commit: jest.fn().mockResolvedValue(),
      rollback: jest.fn().mockResolvedValue()
    };
  }),
  Op: {
    eq: Symbol('eq'),
    ne: Symbol('ne'),
    gt: Symbol('gt'),
    gte: Symbol('gte'),
    lt: Symbol('lt'),
    lte: Symbol('lte'),
    in: Symbol('in'),
    notIn: Symbol('notIn'),
    like: Symbol('like'),
    notLike: Symbol('notLike'),
    iLike: Symbol('iLike'),
    notILike: Symbol('notILike'),
    and: Symbol('and'),
    or: Symbol('or')
  }
};

module.exports = {
  sequelize: mockSequelize,
  prisma: {
    ...mockPrisma,
    $connect: jest.fn().mockResolvedValue(true),
    $disconnect: jest.fn().mockResolvedValue(true)
  }
};
