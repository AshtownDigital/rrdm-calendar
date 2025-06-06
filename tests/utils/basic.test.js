/**
 * Basic utility tests to verify our mock setup
 */

// No need to import minimal-setup.js as it's already loaded by Jest via setupFilesAfterEnv

describe('Basic utility tests', () => {
  // Test that our mock setup works
  test('Jest globals are defined', () => {
    expect(describe).toBeDefined();
    expect(test).toBeDefined();
    expect(expect).toBeDefined();
    expect(beforeAll).toBeDefined();
    expect(afterAll).toBeDefined();
    expect(beforeEach).toBeDefined();
    expect(afterEach).toBeDefined();
  });

  // Test that our Prisma mock works
  test('Prisma client mock works', () => {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    expect(prisma.$connect).toBeDefined();
    expect(prisma.users).toBeDefined();
    expect(prisma.users.findUnique).toBeDefined();
  });

  // Test that our Redis mock works
  test('Redis mock works', () => {
    const Redis = require('ioredis');
    const redis = new Redis();
    expect(redis.connect).toBeDefined();
    expect(redis.get).toBeDefined();
    expect(redis.set).toBeDefined();
  });

  // Test that our Mongoose mock works
  test('Mongoose mock works', () => {
    const mongoose = require('mongoose');
    expect(mongoose.Schema).toBeDefined();
    expect(mongoose.model).toBeDefined();
    expect(mongoose.connect).toBeDefined();
  });

  // Test that our Express mock works
  test('Express mock works', () => {
    const express = require('express');
    const app = express();
    expect(app.get).toBeDefined();
    expect(app.post).toBeDefined();
    expect(app.use).toBeDefined();
  });

  // Test that our Sequelize mock works
  test('Sequelize mock works', () => {
    const Sequelize = require('sequelize');
    const sequelize = new Sequelize('database', 'username', 'password', { dialect: 'sqlite' });
    expect(sequelize.define).toBeDefined();
    expect(sequelize.authenticate).toBeDefined();
    expect(sequelize.transaction).toBeDefined();
  });
});
