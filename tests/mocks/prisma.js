const mockPrismaClient = {
  $connect: jest.fn().mockResolvedValue(true),
  $disconnect: jest.fn().mockResolvedValue(true),
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  }
};

const PrismaClient = jest.fn(() => mockPrismaClient);

module.exports = { PrismaClient };
