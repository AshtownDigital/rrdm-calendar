/**
 * Consolidated BCR check utility script
 * 
 * Usage:
 * node scripts/utilities/check-bcr-utility.js --id=<bcr_id>           # Check specific BCR by ID
 * node scripts/utilities/check-bcr-utility.js --number=<bcr_number>   # Check BCR by number
 * node scripts/utilities/check-bcr-utility.js --list                  # List all BCRs (paginated)
 * node scripts/utilities/check-bcr-utility.js --schema                # Check BCR schema
 * node scripts/utilities/check-bcr-utility.js --routes                # Check BCR routes
 * node scripts/utilities/check-bcr-utility.js --duplicates           # Check BCR workflow duplicates
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  if (arg.startsWith('--')) {
    const [key, value] = arg.slice(2).split('=');
    acc[key] = value || true;
  }
  return acc;
}, {});

async function checkBcrById(id) {
  try {
    console.log(`Checking if BCR with ID ${id} exists...`);
    
    // Try to find the BCR directly by ID
    const bcr = await prisma.bcrs.findUnique({
      where: { id }
    });
    
    if (bcr) {
      console.log('✅ BCR found:', {
        id: bcr.id,
        bcrNumber: bcr.bcrNumber,
        title: bcr.title,
        status: bcr.status
      });
      return bcr;
    } else {
      console.log('❌ BCR not found with that ID');
      return null;
    }
  } catch (error) {
    console.error('Error checking BCR ID:', error);
    return null;
  }
}

async function checkBcrByNumber(bcrNumber) {
  try {
    console.log(`Checking if BCR with number ${bcrNumber} exists...`);
    
    // Try to find the BCR by number
    const bcr = await prisma.bcrs.findFirst({
      where: { bcrNumber }
    });
    
    if (bcr) {
      console.log('✅ BCR found:', {
        id: bcr.id,
        bcrNumber: bcr.bcrNumber,
        title: bcr.title,
        status: bcr.status
      });
      return bcr;
    } else {
      console.log('❌ BCR not found with that number');
      return null;
    }
  } catch (error) {
    console.error('Error checking BCR number:', error);
    return null;
  }
}

async function listBcrs(page = 1, pageSize = 10) {
  try {
    const skip = (page - 1) * pageSize;
    
    // Get total count for pagination
    const totalCount = await prisma.bcrs.count();
    const totalPages = Math.ceil(totalCount / pageSize);
    
    // Get paginated BCRs
    const bcrs = await prisma.bcrs.findMany({
      select: {
        id: true,
        bcrNumber: true,
        title: true,
        status: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize
    });
    
    console.log(`Found ${totalCount} BCRs in total (showing page ${page} of ${totalPages}):`);
    
    bcrs.forEach((bcr, index) => {
      console.log(`${skip + index + 1}. ${bcr.bcrNumber} - ${bcr.title} (${bcr.status}) - ID: ${bcr.id}`);
    });
    
    // Pagination info
    console.log(`\nPage ${page} of ${totalPages}`);
    if (page < totalPages) {
      console.log(`For next page, run: node scripts/utilities/check-bcr-utility.js --list --page=${page + 1}`);
    }
    
    return bcrs;
  } catch (error) {
    console.error('Error listing BCRs:', error);
    return [];
  }
}

async function checkBcrSchema() {
  try {
    console.log('Checking BCR schema...');
    
    // Get a sample BCR to inspect schema
    const sample = await prisma.bcrs.findFirst({
      select: {
        id: true,
        bcrNumber: true,
        title: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    if (!sample) {
      console.log('❌ No BCRs found to check schema');
      return;
    }
    
    console.log('✅ BCR schema properties found:', Object.keys(sample));
    console.log('Sample BCR:', sample);
    
  } catch (error) {
    console.error('Error checking BCR schema:', error);
  }
}

async function checkBcrWorkflowDuplicates() {
  try {
    console.log('Checking for duplicate BCR workflow mappings...');
    
    // This is a simplified version - implement the detailed check as needed
    const result = await prisma.$queryRaw`
      SELECT phase_id, COUNT(*) as count 
      FROM bcr_workflow_phases 
      GROUP BY phase_id 
      HAVING COUNT(*) > 1
    `;
    
    if (result.length === 0) {
      console.log('✅ No duplicate BCR workflow mappings found');
    } else {
      console.log('❌ Found duplicate BCR workflow mappings:', result);
    }
    
    return result;
  } catch (error) {
    console.error('Error checking BCR workflow duplicates:', error);
    return [];
  }
}

// Main function to orchestrate checks based on arguments
async function main() {
  try {
    if (args.id) {
      await checkBcrById(args.id);
    } 
    else if (args.number) {
      await checkBcrByNumber(args.number);
    }
    else if (args.list) {
      const page = parseInt(args.page) || 1;
      await listBcrs(page);
    }
    else if (args.schema) {
      await checkBcrSchema();
    }
    else if (args.duplicates) {
      await checkBcrWorkflowDuplicates();
    }
    else {
      console.log('Please specify what to check. Usage examples:');
      console.log('  --id=<bcr_id>        Check BCR by ID');
      console.log('  --number=<bcr_number> Check BCR by number');
      console.log('  --list               List all BCRs');
      console.log('  --schema             Check BCR schema');
      console.log('  --duplicates         Check for workflow duplicates');
    }
  } catch (error) {
    console.error('Error in BCR utility:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the main function
main();
