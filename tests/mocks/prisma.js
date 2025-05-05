// In-memory storage for test data
const testData = {
  users: new Map([
    ['admin-123', {
      id: 'admin-123',
      email: 'admin@test.com',
      name: 'Admin User',
      role: 'admin',
      password: '$2a$10$1234567890123456789012',
      lastLogin: new Date()
    }],
    ['user-123', {
      id: 'user-123',
      email: 'user@test.com',
      name: 'Business User',
      role: 'business',
      password: '$2a$10$1234567890123456789012',
      lastLogin: new Date()
    }]
  ]),
  sessions: new Map(),
  nextUserId: 3
};

const mockPrismaClient = {
  $connect: jest.fn().mockResolvedValue(true),
  $disconnect: jest.fn().mockResolvedValue(true),
  users: {
    findMany: () => Promise.resolve([...testData.users.values()]),
    findUnique: ({ where }) => {
      if (where.id) {
        return Promise.resolve(testData.users.get(where.id));
      } else if (where.email) {
        return Promise.resolve([...testData.users.values()].find(user => user.email === where.email));
      }
      return Promise.resolve(null);
    },
    create: ({ data }) => {
      const id = data.id || `user-${testData.nextUserId++}`;
      const user = { id, ...data };
      testData.users.set(id, user);
      return Promise.resolve(user);
    },
    update: ({ where, data }) => {
      const user = testData.users.get(where.id);
      if (!user) {
        return Promise.reject(new Error('User not found'));
      }
      const updatedUser = { ...user, ...data };
      testData.users.set(where.id, updatedUser);
      return Promise.resolve(updatedUser);
    },
    delete: ({ where }) => {
      const user = testData.users.get(where.id);
      if (!user) {
        return Promise.reject(new Error('User not found'));
      }
      testData.users.delete(where.id);
      return Promise.resolve(user);
    },
    deleteMany: jest.fn((args) => {
      if (args.where.email?.in) {
        const emails = args.where.email.in;
        let count = 0;
        for (const [id, user] of testData.users.entries()) {
          if (emails.includes(user.email)) {
            testData.users.delete(id);
            count++;
          }
        }
        return Promise.resolve({ count });
      }
      testData.users.clear();
      return Promise.resolve({ count: 0 });
    })
  },
  session: {
    create: jest.fn((args) => {
      const session = { ...args.data };
      testData.sessions.set(session.id, session);
      return Promise.resolve(session);
    }),
    findFirst: jest.fn((args) => {
      const { where } = args;
      if (where.id) return Promise.resolve(testData.sessions.get(where.id));
      return Promise.resolve(null);
    }),
    delete: jest.fn((args) => {
      const session = testData.sessions.get(args.where.id);
      if (!session) return Promise.resolve(null);
      testData.sessions.delete(args.where.id);
      return Promise.resolve(session);
    }),
    deleteMany: jest.fn(() => {
      const count = testData.sessions.size;
      testData.sessions.clear();
      return Promise.resolve({ count });
    })
  }
};

const PrismaClient = jest.fn(() => mockPrismaClient);

module.exports = { PrismaClient };
