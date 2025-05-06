/**
 * Vercel Deployment Helper
 * 
 * This script helps prepare the application for deployment to Vercel
 * by setting up Prisma for serverless environments.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Paths
const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env');
const vercelEnvPath = path.join(rootDir, '.env.production');

/**
 * Prepare the environment for Vercel deployment
 */
function prepareForVercel() {
  console.log('Preparing for Vercel deployment...');
  
  try {
    // Create a production .env file if it doesn't exist
    if (!fs.existsSync(vercelEnvPath)) {
      // Read the current .env file
      let envContent = '';
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
      }
      
      // Add or update environment variables for Vercel
      const envLines = envContent.split('\n');
      const envVars = {};
      
      // Parse existing variables
      envLines.forEach(line => {
        if (line.trim() && !line.startsWith('#')) {
          const [key, ...valueParts] = line.split('=');
          const value = valueParts.join('=');
          if (key && value) {
            envVars[key.trim()] = value.trim();
          }
        }
      });
      
      // Set Vercel-specific variables
      envVars['PRISMA_CLIENT_ENGINE_TYPE'] = 'dataproxy';
      envVars['NODE_ENV'] = 'production';
      
      // Convert back to string
      const newEnvContent = Object.entries(envVars)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
      
      // Write to .env.production
      fs.writeFileSync(vercelEnvPath, newEnvContent);
      console.log('Created .env.production file for Vercel');
    }
    
    // Generate Prisma client
    console.log('Generating Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit', cwd: rootDir });
    
    // Create database indexes
    console.log('Creating database indexes...');
    execSync('node prisma/index.js', { stdio: 'inherit', cwd: rootDir });
    
    console.log('Vercel deployment preparation complete!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Commit your changes to git');
    console.log('2. Link your repository to Vercel');
    console.log('3. Set up the following environment variables in the Vercel dashboard:');
    console.log('   - DATABASE_URL: Your Neon PostgreSQL connection string');
    console.log('   - SESSION_SECRET: A secure random string for session encryption');
    console.log('   - PORT: Not required (Vercel manages this)');
    console.log('4. Deploy your application');
    
  } catch (error) {
    console.error('Error preparing for Vercel deployment:', error);
    process.exit(1);
  }
}

// If this file is run directly, prepare for Vercel
if (require.main === module) {
  prepareForVercel();
}

module.exports = { prepareForVercel };
