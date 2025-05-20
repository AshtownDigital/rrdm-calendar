/**
 * Seed script to populate BCR Impact Areas
 * 
 * This script populates the database with predefined impact areas from the impactareas.md file.
 * It creates both the impact area entries and their descriptions.
 * 
 * Usage: node seeders/populate-impact-areas.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { v4: uuidv4 } = require('uuid');

// Impact areas data from impactareas.md
const impactAreasData = [
  {
    name: 'Backend',
    description: 'Changes to databases, schema design, internal data handling, or system logic.',
    displayOrder: 10
  },
  {
    name: 'Frontend',
    description: 'Updates to UI components, form elements, filters, labels, or layout.',
    displayOrder: 20
  },
  {
    name: 'API',
    description: 'Creation, modification, or removal of API endpoints or request/response formats.',
    displayOrder: 30
  },
  {
    name: 'CSV',
    description: 'Changes to data import/export templates, field order, column definitions.',
    displayOrder: 40
  },
  {
    name: 'Reference Data',
    description: 'Additions, updates, or removals of reference data values (e.g., dropdown options).',
    displayOrder: 50
  },
  {
    name: 'Documentation & Guidance',
    description: 'Updates to internal guidance, user manuals, technical specs, or public-facing help.',
    displayOrder: 60
  },
  {
    name: 'Policy',
    description: 'Changes required due to external policy or legal/regulatory compliance updates.',
    displayOrder: 70
  },
  {
    name: 'Funding',
    description: 'Modifications impacting funding calculations, eligibility, or reporting models.',
    displayOrder: 80
  }
];

/**
 * Seed the impact areas
 */
async function seedImpactAreas() {
  console.log('Starting to seed BCR impact areas...');
  
  try {
    // Check if impact areas already exist
    const existingImpactAreas = await prisma.bcrConfigs.findMany({
      where: {
        type: 'impactArea'
      }
    });
    
    if (existingImpactAreas.length > 0) {
      console.log(`Found ${existingImpactAreas.length} existing impact areas.`);
      
      // Check if we need to update any existing impact areas
      for (const area of impactAreasData) {
        const existingArea = existingImpactAreas.find(a => a.name === area.name);
        
        if (existingArea) {
          console.log(`Updating existing impact area: ${area.name}`);
          
          // Update the impact area
          await prisma.bcrConfigs.update({
            where: { id: existingArea.id },
            data: {
              value: area.name,
              displayOrder: area.displayOrder
            }
          });
          
          // Check if description exists
          const existingDescription = await prisma.bcrConfigs.findFirst({
            where: {
              type: 'impactArea_description',
              name: `description:${area.name}`
            }
          });
          
          if (existingDescription) {
            // Update description
            await prisma.bcrConfigs.update({
              where: { id: existingDescription.id },
              data: {
                value: area.description,
                displayOrder: area.displayOrder
              }
            });
          } else {
            // Create description
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
          }
        } else {
          // Create new impact area and description
          console.log(`Creating new impact area: ${area.name}`);
          
          // Create impact area
          await prisma.bcrConfigs.create({
            data: {
              id: uuidv4(),
              type: 'impactArea',
              name: area.name,
              value: area.name,
              displayOrder: area.displayOrder,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
          
          // Create description
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
        }
      }
    } else {
      console.log('No existing impact areas found. Creating all from scratch...');
      
      // Create all impact areas and descriptions
      for (const area of impactAreasData) {
        console.log(`Creating impact area: ${area.name}`);
        
        // Create impact area
        await prisma.bcrConfigs.create({
          data: {
            id: uuidv4(),
            type: 'impactArea',
            name: area.name,
            value: area.name,
            displayOrder: area.displayOrder,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        
        // Create description
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
      }
    }
    
    console.log('BCR impact areas seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding BCR impact areas:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedImpactAreas()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
