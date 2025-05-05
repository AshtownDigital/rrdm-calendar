'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create Users table
    await queryInterface.createTable('Users', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      role: {
        type: Sequelize.ENUM('admin', 'business'),
        defaultValue: 'business',
        allowNull: false
      },
      active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      lastLogin: {
        type: Sequelize.DATE,
        allowNull: true
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

    // Create Bcrs table
    await queryInterface.createTable('Bcrs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('draft', 'submitted', 'under_review', 'approved', 'rejected', 'implemented'),
        defaultValue: 'draft',
        allowNull: false
      },
      priority: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'critical'),
        defaultValue: 'medium',
        allowNull: false
      },
      impact: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      requestedBy: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      assignedTo: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      targetDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      implementationDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
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

    // Create ReferenceData table
    await queryInterface.createTable('ReferenceData', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      code: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      category: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      validFrom: {
        type: Sequelize.DATE,
        allowNull: true
      },
      validTo: {
        type: Sequelize.DATE,
        allowNull: true
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      lastUpdatedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      version: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        allowNull: false
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true
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

    // Create Funding table
    await queryInterface.createTable('Fundings', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      trainingRoute: {
        type: Sequelize.STRING,
        allowNull: false
      },
      academicYear: {
        type: Sequelize.STRING,
        allowNull: false
      },
      fundingAmount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      fundingType: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      effectiveDate: {
        type: Sequelize.DATE,
        allowNull: false
      },
      expiryDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      lastUpdatedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true
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

    // Create ReleaseNotes table
    await queryInterface.createTable('ReleaseNotes', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      version: {
        type: Sequelize.STRING,
        allowNull: false
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      environment: {
        type: Sequelize.ENUM('development', 'test', 'staging', 'production'),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('planned', 'in_progress', 'completed', 'failed', 'cancelled'),
        defaultValue: 'planned',
        allowNull: false
      },
      releaseDate: {
        type: Sequelize.DATE,
        allowNull: false
      },
      completedDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      approvedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      changeLog: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      impactedSystems: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
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

    // Create indexes for better performance
    try {
      await queryInterface.addIndex('Users', ['email'], {
        name: 'users_email'
      });
    } catch (error) {
      // Skip if index already exists
      if (!error.message.includes('already exists')) {
        throw error;
      }
    }
    const addIndexSafely = async (table, columns, options = {}) => {
      try {
        await queryInterface.addIndex(table, columns, options);
      } catch (error) {
        if (!error.message.includes('already exists')) {
          throw error;
        }
      }
    };

    await addIndexSafely('Bcrs', ['status'], { name: 'bcrs_status' });
    await addIndexSafely('Bcrs', ['requestedBy'], { name: 'bcrs_requested_by' });
    await addIndexSafely('Bcrs', ['assignedTo'], { name: 'bcrs_assigned_to' });
    await addIndexSafely('ReferenceData', ['code'], { name: 'reference_data_code' });
    await addIndexSafely('ReferenceData', ['category'], { name: 'reference_data_category' });
    await addIndexSafely('ReferenceData', ['isActive'], { name: 'reference_data_is_active' });
    await addIndexSafely('Fundings', ['trainingRoute'], { name: 'fundings_training_route' });
    await addIndexSafely('Fundings', ['academicYear'], { name: 'fundings_academic_year' });
    await addIndexSafely('Fundings', ['isActive'], { name: 'fundings_is_active' });
    await addIndexSafely('ReleaseNotes', ['version'], { name: 'release_notes_version' });
    await addIndexSafely('ReleaseNotes', ['environment'], { name: 'release_notes_environment' });
    await addIndexSafely('ReleaseNotes', ['status'], { name: 'release_notes_status' });
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes safely
    const removeIndexSafely = async (table, indexName) => {
      try {
        await queryInterface.removeIndex(table, indexName);
      } catch (error) {
        // Skip if index doesn't exist
        if (!error.message.includes('does not exist')) {
          throw error;
        }
      }
    };

    await removeIndexSafely('Users', 'users_email');
    await removeIndexSafely('Bcrs', 'bcrs_status');
    await removeIndexSafely('Bcrs', 'bcrs_requested_by');
    await removeIndexSafely('Bcrs', 'bcrs_assigned_to');
    await removeIndexSafely('ReferenceData', 'reference_data_code');
    await removeIndexSafely('ReferenceData', 'reference_data_category');
    await removeIndexSafely('ReferenceData', 'reference_data_is_active');
    await removeIndexSafely('Fundings', 'fundings_training_route');
    await removeIndexSafely('Fundings', 'fundings_academic_year');
    await removeIndexSafely('Fundings', 'fundings_is_active');
    await removeIndexSafely('ReleaseNotes', 'release_notes_version');
    await removeIndexSafely('ReleaseNotes', 'release_notes_environment');
    await removeIndexSafely('ReleaseNotes', 'release_notes_status');

    // Drop tables in reverse order to avoid foreign key constraints
    await queryInterface.dropTable('ReleaseNotes');
    await queryInterface.dropTable('Fundings');
    await queryInterface.dropTable('ReferenceData');
    await queryInterface.dropTable('Bcrs');
    await queryInterface.dropTable('Users');
  }
};
