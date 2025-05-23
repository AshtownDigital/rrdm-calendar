/**
 * Setup Vercel Environment Variables
 * 
 * This script helps configure the necessary environment variables for
 * deploying the RRDM application to Vercel with a Neon PostgreSQL database.
 */
const { execSync } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Prompt for input with a default value
function prompt(question, defaultValue) {
  return new Promise((resolve) => {
    rl.question(`${question} (${defaultValue}): `, (answer) => {
      resolve(answer || defaultValue);
    });
  });
}

// Main function
async function main() {
  console.log('=== RRDM Vercel Environment Setup ===');
  console.log('This script will help you configure the environment variables for Vercel deployment.');
  console.log('You will need your Neon PostgreSQL database connection string.');
  console.log('If you don\'t have a Neon PostgreSQL database yet, create one at https://neon.tech\n');
  
  // Get database connection string
  const databaseUrl = await prompt(
    'Enter your Neon PostgreSQL connection string (postgresql://user:password@db.neon.tech/dbname)',
    'postgresql://user:password@db.neon.tech/dbname?pgbouncer=true&pool_timeout=10'
  );
  
  // Get project name
  const projectName = await prompt(
    'Enter your Vercel project name',
    'rrdm'
  );
  
  // Create .env.production file
  const envContent = `# Production environment variables for Vercel deployment
NODE_ENV=production
DATABASE_URL="${databaseUrl}"
PRISMA_CLIENT_ENGINE_TYPE=dataproxy
VERCEL=1
SESSION_PERSISTENCE=true
REDIS_ENABLED=true
REDIS_MOCK=true
RATE_LIMIT_ENABLED=true
`;

  fs.writeFileSync(path.join(__dirname, '..', '.env.production'), envContent);
  console.log('\n✅ Created .env.production file with your settings');
  
  // Create vercel.json if it doesn't exist
  const vercelJsonPath = path.join(__dirname, '..', 'vercel.json');
  if (!fs.existsSync(vercelJsonPath)) {
    const vercelJsonContent = `{
  "version": 2,
  "builds": [
    {
      "src": "server-start.js",
      "use": "@vercel/node"
    },
    {
      "src": "public/**",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    { 
      "src": "/assets/css/(.*)", 
      "dest": "/public/stylesheets/$1",
      "headers": { "Cache-Control": "public, max-age=31536000, immutable" }
    },
    { 
      "src": "/assets/images/(.*)", 
      "dest": "/public/images/$1",
      "headers": { "Cache-Control": "public, max-age=31536000, immutable" }
    },
    { 
      "src": "/assets/(.*)", 
      "dest": "/public/$1",
      "headers": { "Cache-Control": "public, max-age=31536000, immutable" }
    },
    { 
      "src": "/stylesheets/(.*)", 
      "dest": "/public/stylesheets/$1",
      "headers": { "Cache-Control": "public, max-age=31536000, immutable" }
    },
    { "src": "/(.*)", "dest": "/server-start.js" }
  ],
  "env": {
    "NODE_ENV": "production",
    "VERCEL": "1",
    "SESSION_PERSISTENCE": "true",
    "PRISMA_CLIENT_ENGINE_TYPE": "dataproxy",
    "REDIS_ENABLED": "true",
    "REDIS_MOCK": "true",
    "RATE_LIMIT_ENABLED": "true",
    "DATABASE_URL": "${databaseUrl}"
  }
}`;
    fs.writeFileSync(vercelJsonPath, vercelJsonContent);
    console.log('✅ Created vercel.json file with your settings');
  } else {
    console.log('ℹ️ vercel.json already exists, not overwriting');
  }
  
  // Instructions for deployment
  console.log('\n=== Deployment Instructions ===');
  console.log('1. Install Vercel CLI if you haven\'t already:');
  console.log('   npm install -g vercel');
  console.log('\n2. Login to Vercel:');
  console.log('   vercel login');
  console.log('\n3. Deploy to Vercel:');
  console.log('   vercel deploy --prod');
  console.log('\n4. Set environment variables on Vercel:');
  console.log('   vercel env add DATABASE_URL');
  console.log('   vercel env add PRISMA_CLIENT_ENGINE_TYPE');
  console.log('\n5. Redeploy with the new environment variables:');
  console.log('   vercel deploy --prod');
  
  rl.close();
}

main().catch(error => {
  console.error('Error:', error);
  rl.close();
});
