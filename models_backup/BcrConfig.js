/**
 * BCR Configuration model for RRDM application
 * Defines the schema for BCR configuration previously stored in JSON
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const BcrConfig = sequelize.define('BcrConfig', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  value: {
    type: DataTypes.STRING,
    allowNull: false
  },
  displayOrder: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

// Static method to get all config items of a specific type
BcrConfig.getByType = async function(type) {
  return await this.findAll({
    where: { type },
    order: [['displayOrder', 'ASC']]
  });
};

module.exports = BcrConfig;
