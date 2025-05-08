/**
 * Ensure HTTP Consistency
 * This script checks and ensures consistency in HTTP structure across the RRDM application
 */
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const prisma = new PrismaClient();

async function ensureHttpConsistency() {
  console.log('🔍 Checking HTTP structure consistency...');
  
  try {
    // 1. Check environment variables for HTTP configuration
    console.log('\n📋 Checking environment configuration...');
    const envPath = path.join(__dirname, '..', '.env.development');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      
      // Check port configuration
      const portMatch = envContent.match(/PORT=(\d+)/);
      if (portMatch && portMatch[1] === '3000') {
        console.log('✅ Development port is correctly set to 3000');
      } else {
        console.log('⚠️ Development port is not set to 3000, updating...');
        const updatedEnv = envContent.replace(/PORT=\d+/, 'PORT=3000');
        fs.writeFileSync(envPath, updatedEnv);
        console.log('✅ Updated development port to 3000');
      }
    }
    
    // 2. Ensure Session table exists and has correct structure
    console.log('\n🔄 Checking Session table structure...');
    try {
      // Check if Session table exists
      const tableExists = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'Session'
        );
      `;
      
      if (tableExists[0].exists) {
        console.log('✅ Session table exists');
        
        // Check if Session table has correct structure
        const columns = await prisma.$queryRaw`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'Session';
        `;
        
        const requiredColumns = ['id', 'sid', 'data', 'expiresAt'];
        const missingColumns = requiredColumns.filter(
          col => !columns.some(c => c.column_name === col)
        );
        
        if (missingColumns.length === 0) {
          console.log('✅ Session table has correct structure');
        } else {
          console.log(`⚠️ Session table is missing columns: ${missingColumns.join(', ')}`);
          
          // Drop and recreate Session table
          await prisma.$executeRaw`DROP TABLE IF EXISTS "Session" CASCADE;`;
          await prisma.$executeRaw`
            CREATE TABLE "Session" (
              "id" TEXT NOT NULL,
              "sid" TEXT NOT NULL,
              "data" TEXT NOT NULL,
              "expiresAt" TIMESTAMP(3) NOT NULL,
              CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
            );
          `;
          await prisma.$executeRaw`CREATE UNIQUE INDEX "Session_sid_key" ON "Session"("sid");`;
          console.log('✅ Recreated Session table with correct structure');
        }
      } else {
        console.log('⚠️ Session table does not exist, creating...');
        
        // Create Session table
        await prisma.$executeRaw`
          CREATE TABLE "Session" (
            "id" TEXT NOT NULL,
            "sid" TEXT NOT NULL,
            "data" TEXT NOT NULL,
            "expiresAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
          );
        `;
        await prisma.$executeRaw`CREATE UNIQUE INDEX "Session_sid_key" ON "Session"("sid");`;
        console.log('✅ Created Session table with correct structure');
      }
    } catch (error) {
      console.error('❌ Error checking/creating Session table:', error.message);
    }
    
    // 3. Create a README note about HTTP in development
    console.log('\n📝 Checking README for HTTP information...');
    const readmePath = path.join(__dirname, '..', 'README.md');
    let readmeContent = '';
    
    if (fs.existsSync(readmePath)) {
      readmeContent = fs.readFileSync(readmePath, 'utf8');
    }
    
    if (!readmeContent.includes('HTTP in development')) {
      console.log('⚠️ README does not contain information about HTTP in development, updating...');
      
      const httpNote = `
## Development Environment

### HTTP vs HTTPS

The development environment uses HTTP only, not HTTPS. When accessing the application locally, use:

\`\`\`
http://localhost:3000
\`\`\`

Do not use \`https://\` in development as no SSL certificates are configured locally.

`;
      
      if (readmeContent.trim() === '') {
        readmeContent = `# RRDM Application\n\n${httpNote}`;
      } else {
        readmeContent += `\n${httpNote}`;
      }
      
      fs.writeFileSync(readmePath, readmeContent);
      console.log('✅ Updated README with HTTP information');
    } else {
      console.log('✅ README already contains information about HTTP in development');
    }
    
    console.log('\n✨ HTTP consistency check complete!');
    console.log('\nAccess the application at: http://localhost:3000/access/login');
    
  } catch (error) {
    console.error('❌ An unexpected error occurred:', error);
  } finally {
    await prisma.$disconnect();
  }
}

ensureHttpConsistency();
