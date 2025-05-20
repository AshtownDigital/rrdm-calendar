/**
 * Script to show the BCR status enum model and data
 * This displays:
 * 1. The database column type for status
 * 2. The current BCRs with their status values
 * 3. The enum values if it's an enum type
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function showBcrStatusData() {
  console.log('Checking BCR status column and data...');
  
  try {
    // Step 1: Check the column type for status
    console.log('\n1. COLUMN TYPE INFORMATION:');
    const columnInfo = await prisma.$queryRaw`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'Bcrs' AND column_name = 'status'
    `;
    
    console.log(JSON.stringify(columnInfo, null, 2));
    
    // Step 2: If it's an enum type, show the enum values
    if (columnInfo[0]?.data_type === 'USER-DEFINED') {
      console.log('\n2. ENUM VALUES (if applicable):');
      const enumValues = await prisma.$queryRaw`
        SELECT e.enumlabel
        FROM pg_type t 
        JOIN pg_enum e ON t.oid = e.enumtypid  
        JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'enum_Bcrs_status'
        ORDER BY e.enumsortorder
      `;
      console.log(JSON.stringify(enumValues, null, 2));
    } else {
      console.log('\n2. ENUM VALUES: Not applicable (column is not an enum type)');
    }
    
    // Step 3: Show the current BCRs with their status values
    console.log('\n3. CURRENT BCR STATUS DATA:');
    const bcrs = await prisma.$queryRaw`
      SELECT id, "bcrNumber", title, status, "createdAt"
      FROM "Bcrs"
      ORDER BY "createdAt" DESC
    `;
    
    console.log(JSON.stringify(bcrs, null, 2));
    
    // Step 4: Show distinct status values in use
    console.log('\n4. DISTINCT STATUS VALUES IN USE:');
    const distinctStatuses = await prisma.$queryRaw`
      SELECT DISTINCT status, COUNT(*)::text as count
      FROM "Bcrs"
      GROUP BY status
      ORDER BY count DESC
    `;
    
    console.log(JSON.stringify(distinctStatuses, null, 2));
    
    return true;
  } catch (error) {
    console.error('Error retrieving BCR status data:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
showBcrStatusData()
  .then(() => {
    console.log('\nQuery completed successfully.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
