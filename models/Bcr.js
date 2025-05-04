/**
 * BCR (Business Change Request) model for RRDM application
 * Defines the schema and methods for business change requests
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const Bcr = sequelize.define('Bcr', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('draft', 'submitted', 'under_review', 'approved', 'rejected', 'implemented'),
    defaultValue: 'draft',
    allowNull: false
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    defaultValue: 'medium',
    allowNull: false
  },
  impact: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  requestedBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  assignedTo: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: User,
      key: 'id'
    }
  },
  targetDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  implementationDate: {
    type: DataTypes.DATE,
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
Bcr.belongsTo(User, { as: 'requester', foreignKey: 'requestedBy' });
Bcr.belongsTo(User, { as: 'assignee', foreignKey: 'assignedTo' });

// Instance method to get formatted BCR ID (BCR-1234)
Bcr.prototype.getFormattedId = function() {
  return `BCR-${this.id.slice(0, 8).toUpperCase()}`;
};

module.exports = Bcr;
