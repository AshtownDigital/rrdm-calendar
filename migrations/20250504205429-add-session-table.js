'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Session', {
      id: {
        type: Sequelize.STRING,
        primaryKey: true
      },
      sid: {
        type: Sequelize.STRING,
        unique: true
      },
      data: {
        type: Sequelize.TEXT
      },
      expiresAt: {
        type: Sequelize.DATE
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex('Session', ['expiresAt']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Session');
  }
};
