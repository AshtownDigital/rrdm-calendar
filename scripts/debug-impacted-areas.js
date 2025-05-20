// Debug script to check impacted areas data structure
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugImpactedAreas() {
  try {
    console.log('Fetching all impacted areas from database...');
    
    // Get all impacted areas
    const impactedAreas = await prisma.impactedArea.findMany({
      orderBy: {
        order: 'asc'
      }
    });
    
    console.log('Total impacted areas found:', impactedAreas.length);
    console.log('Impacted areas data structure:');
    console.log(JSON.stringify(impactedAreas, null, 2));
    
    // Check if the variable name matches what's expected in the template
    console.log('\nTemplate expects variable named "impactAreas" with properties:');
    console.log('- id: Used for checkbox value and label "for" attribute');
    console.log('- name: Used for checkbox label text');
    console.log('- description: Used for hint text (optional)');
    
    // Check if the data structure matches what's expected
    const hasCorrectStructure = impactedAreas.every(area => 
      area.id !== undefined && 
      area.name !== undefined
    );
    
    console.log('\nData structure check:');
    console.log('Has correct structure (id and name properties):', hasCorrectStructure);
    
    // Check the controller variable name
    console.log('\nController check:');
    console.log('Controller passes variable as "impactedAreas" but template expects "impactAreas"');
    
    // Close the database connection
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error debugging impacted areas:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Run the debug function
debugImpactedAreas();
