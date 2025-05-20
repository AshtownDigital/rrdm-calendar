/**
 * Script to update impact areas in the database with the specified list
 * and create a table structure for displaying them
 */
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const prisma = new PrismaClient();

async function updateImpactAreasTable() {
  try {
    console.log('Updating impact areas in the database...');
    
    // Define the specified impact areas
    const impactAreas = [
      { name: 'Backend', value: 'backend', displayOrder: 10, description: 'Changes to server-side code or database' },
      { name: 'Frontend', value: 'frontend', displayOrder: 20, description: 'Changes to user interface or client-side code' },
      { name: 'API', value: 'api', displayOrder: 30, description: 'Changes to API endpoints or integrations' },
      { name: 'CSV', value: 'csv', displayOrder: 40, description: 'Changes to CSV imports or exports' },
      { name: 'Reference Data', value: 'reference-data', displayOrder: 50, description: 'Changes to reference data or lookup tables' },
      { name: 'Documentation and Guidance', value: 'documentation', displayOrder: 60, description: 'Changes to documentation or user guidance' },
      { name: 'Policy', value: 'policy', displayOrder: 70, description: 'Changes to policy or business rules' },
      { name: 'Funding', value: 'funding', displayOrder: 80, description: 'Changes to funding calculations or allocations' }
    ];
    
    // Clear existing impact areas
    console.log('Clearing existing impact areas...');
    await prisma.bcrConfigs.deleteMany({
      where: { 
        OR: [
          { type: 'impactArea' },
          { type: 'impactArea_description' }
        ]
      }
    });
    
    // Create the new impact areas
    console.log('Creating new impact areas...');
    for (const area of impactAreas) {
      // Create the main impact area entry
      const impactArea = await prisma.bcrConfigs.create({
        data: {
          id: uuidv4(),
          type: 'impactArea',
          name: area.name,
          value: area.value,
          displayOrder: area.displayOrder,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      // Create a separate entry for the description
      await prisma.bcrConfigs.create({
        data: {
          id: uuidv4(),
          type: 'impactArea_description',
          name: `description:${area.name}`,
          value: area.description,
          displayOrder: area.displayOrder,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      console.log(`Created impact area: ${area.name}`);
    }
    
    console.log('Impact areas updated successfully!');
  } catch (error) {
    console.error('Error updating impact areas:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
updateImpactAreasTable();
