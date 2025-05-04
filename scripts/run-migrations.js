/**
 * Database migration script for RRDM application
 * Runs all pending migrations to update the database schema
 */
require('dotenv').config();
const { Sequelize } = require('sequelize');
const { execSync } = require('child_process');
const path = require('path');

async function runMigrations() {
  console.log('Starting database migrations...');
  
  try {
    // Test database connection first
    const sequelize = new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      },
      logging: false
    });
    
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Run migrations using sequelize-cli
    console.log('Running migrations...');
    const result = execSync('npx sequelize-cli db:migrate', {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit'
    });
    
    console.log('Migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
}

// Run the migrations
runMigrations();
