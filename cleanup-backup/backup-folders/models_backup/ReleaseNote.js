/**
 * Release Note model for RRDM application
 * Defines the schema and methods for release notes and data releases
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const ReleaseNote = sequelize.define('ReleaseNote', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  version: {
    type: DataTypes.STRING,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  environment: {
    type: DataTypes.ENUM('development', 'test', 'staging', 'production'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('planned', 'in_progress', 'completed', 'failed', 'cancelled'),
    defaultValue: 'planned',
    allowNull: false
  },
  releaseDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  completedDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  approvedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: User,
      key: 'id'
    }
  },
  changeLog: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  impactedSystems: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

// Define the relationship with User model
ReleaseNote.belongsTo(User, { as: 'creator', foreignKey: 'createdBy' });
ReleaseNote.belongsTo(User, { as: 'approver', foreignKey: 'approvedBy' });

module.exports = ReleaseNote;
