/**
 * Reset Local Database Script
 * 
 * This script completely resets the local PostgreSQL database for development.
 * It drops the existing database if it exists, creates a new one, and sets up the schema.
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load development environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.development') });

console.log('🔄 Resetting local development database...');

// Function to check if PostgreSQL is installed
function checkPostgresInstallation() {
  try {
    execSync('which psql', { stdio: 'pipe' });
    console.log('✅ PostgreSQL is installed');
    return true;
  } catch (error) {
    console.error('❌ PostgreSQL is not installed. Please install PostgreSQL first.');
    console.log('You can install it using Homebrew:');
    console.log('  brew install postgresql@14');
    console.log('  brew services start postgresql@14');
    return false;
  }
}

// Function to drop the database if it exists
function dropDatabase() {
  try {
    // Parse DATABASE_URL to get database name
    const dbUrl = process.env.DATABASE_URL;
    const dbName = dbUrl.split('/').pop().split('?')[0];
    
    console.log(`Dropping database if it exists: ${dbName}`);
    
    // Drop connections to the database
    execSync(`psql -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '${dbName}' AND pid <> pg_backend_pid();" postgres`, { 
      stdio: 'inherit'
    });
    
    // Drop the database
    execSync(`dropdb --if-exists ${dbName}`, { 
      stdio: 'inherit'
    });
    
    console.log(`✅ Database '${dbName}' dropped successfully`);
    return true;
  } catch (error) {
    console.error('Error dropping database:', error.message);
    return false;
  }
}

// Function to create the database
function createDatabase() {
  try {
    // Parse DATABASE_URL to get database name
    const dbUrl = process.env.DATABASE_URL;
    const dbName = dbUrl.split('/').pop().split('?')[0];
    
    console.log(`Creating database: ${dbName}`);
    
    // Create the database
    execSync(`createdb ${dbName}`, { stdio: 'inherit' });
    
    console.log(`✅ Database '${dbName}' created successfully`);
    return true;
  } catch (error) {
    console.error('Error creating database:', error.message);
    return false;
  }
}

// Function to push the schema directly to the database
function pushPrismaSchema() {
  try {
    console.log('Pushing Prisma schema to database...');
    
    // Generate Prisma client
    execSync('npx prisma generate', { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    
    // Push schema to database
    execSync('npx prisma db push --force-reset', { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    
    console.log('✅ Prisma schema pushed to database successfully');
    return true;
  } catch (error) {
    console.error('Error pushing Prisma schema:', error.message);
    return false;
  }
}

// Function to seed the database with initial data
function seedDatabase() {
  try {
    console.log('Seeding database with initial data...');
    
    // Create admin user
    const seedQuery = `
      INSERT INTO "Users" (id, email, password, name, role, active, "createdAt", "updatedAt")
      VALUES (
        '00000000-0000-0000-0000-000000000000',
        'admin@example.com',
        '$2a$10$JcV6Y0UYqbXnGR.pGxXeV.9jGOA.9HnAYfQtKbAjg0yWMvxSHdpZe', -- password: admin123
        'Admin User',
        'admin',
        true,
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO NOTHING;
    `;
    
    // Write the seed query to a temporary file
    const tempDir = path.join(__dirname, '..', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const seedFile = path.join(tempDir, 'seed.sql');
    fs.writeFileSync(seedFile, seedQuery);
    
    // Parse DATABASE_URL to get database name
    const dbUrl = process.env.DATABASE_URL;
    const dbName = dbUrl.split('/').pop().split('?')[0];
    
    // Execute the seed query
    execSync(`psql -d ${dbName} -f ${seedFile}`, { stdio: 'inherit' });
    
    // Clean up
    fs.unlinkSync(seedFile);
    
    console.log('✅ Database seeded successfully');
    console.log('Default admin credentials:');
    console.log('  Email: admin@example.com');
    console.log('  Password: admin123');
    
    return true;
  } catch (error) {
    console.error('Error seeding database:', error.message);
    return false;
  }
}

// Main function
async function main() {
  // Check if PostgreSQL is installed
  if (!checkPostgresInstallation()) {
    process.exit(1);
  }
  
  // Drop the database if it exists
  if (!dropDatabase()) {
    process.exit(1);
  }
  
  // Create a new database
  if (!createDatabase()) {
    process.exit(1);
  }
  
  // Push Prisma schema to database
  if (!pushPrismaSchema()) {
    process.exit(1);
  }
  
  // Seed the database
  if (!seedDatabase()) {
    process.exit(1);
  }
  
  console.log('🎉 Local development database reset complete!');
  console.log('You can now run the application with:');
  console.log('  npm run dev');
}

// Run the main function
main().catch(error => {
  console.error('Reset failed:', error);
  process.exit(1);
});
