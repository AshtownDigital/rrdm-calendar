/**
 * Debug script for impact areas
 * This script helps diagnose issues with impact areas in the BCR submission form
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugImpactAreas() {
  try {
    console.log('=== DEBUG: IMPACT AREAS ===');
    
    // 1. Check if there are any impact areas in the ImpactedArea table
    console.log('\n1. Checking for impact areas in the ImpactedArea table...');
    const impactedAreaCount = await prisma.impactedArea.count();
    console.log(`Total impact areas in ImpactedArea table: ${impactedAreaCount}`);
    
    if (impactedAreaCount > 0) {
      const impactedAreas = await prisma.impactedArea.findMany({
        orderBy: {
          order: 'asc'
        }
      });
      
      console.log('\nImpact areas in ImpactedArea table:');
      impactedAreas.forEach((area, i) => {
        console.log(`\nImpact Area ${i + 1}:`);
        console.log(`ID: ${area.id}`);
        console.log(`Name: ${area.name}`);
        console.log(`Description: ${area.description}`);
        console.log(`Order: ${area.order}`);
      });
    }
    
    // 2. Check if there are any impact areas in the BcrConfigs table
    console.log('\n2. Checking for impact areas in the BcrConfigs table...');
    const bcrConfigsCount = await prisma.bcrConfigs.count({
      where: { type: 'impactArea' }
    });
    console.log(`Total impact areas in BcrConfigs table: ${bcrConfigsCount}`);
    
    if (bcrConfigsCount > 0) {
      const bcrConfigsAreas = await prisma.bcrConfigs.findMany({
        where: { type: 'impactArea' },
        orderBy: {
          displayOrder: 'asc'
        }
      });
      
      console.log('\nImpact areas in BcrConfigs table:');
      bcrConfigsAreas.forEach((area, i) => {
        console.log(`\nImpact Area ${i + 1}:`);
        console.log(`ID: ${area.id}`);
        console.log(`Name: ${area.name}`);
        console.log(`Description: ${area.description}`);
        console.log(`Value: ${area.value}`);
        console.log(`Display Order: ${area.displayOrder}`);
      });
    }
    
    // 3. Check the schema of the ImpactedArea table
    console.log('\n3. Checking the schema of the ImpactedArea table...');
    try {
      // This is a hacky way to get the schema, but it works for debugging
      const schemaQuery = await prisma.$queryRaw`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'ImpactedArea'
      `;
      
      console.log('ImpactedArea table schema:');
      console.log(schemaQuery);
    } catch (error) {
      console.error('Error getting schema:', error.message);
    }
    
    // 4. Check if we need to migrate data from BcrConfigs to ImpactedArea
    console.log('\n4. Checking if we need to migrate data from BcrConfigs to ImpactedArea...');
    if (impactedAreaCount === 0 && bcrConfigsCount > 0) {
      console.log('Migration needed: ImpactedArea table is empty but BcrConfigs has impact areas');
      
      // Migrate data
      console.log('\nMigrating impact areas from BcrConfigs to ImpactedArea...');
      for (const area of bcrConfigsAreas) {
        try {
          const newArea = await prisma.impactedArea.create({
            data: {
              id: area.id, // Use the same ID for consistency
              name: area.name,
              description: area.description || '',
              order: area.displayOrder || 10
            }
          });
          console.log(`Migrated: ${area.name} (${area.id})`);
        } catch (error) {
          console.error(`Error migrating ${area.name}: ${error.message}`);
        }
      }
      
      // Verify migration
      const afterMigrationCount = await prisma.impactedArea.count();
      console.log(`\nAfter migration: ${afterMigrationCount} impact areas in ImpactedArea table`);
    } else {
      console.log('Migration not needed or already done');
    }
    
  } catch (error) {
    console.error('Error in debug script:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug function
debugImpactAreas();
