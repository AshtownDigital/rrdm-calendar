/**
 * Debug script for BCR submission form
 * This script helps diagnose issues with impact areas in the BCR submission form
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const impactedAreasModel = require('../models/impacted-areas/model');

async function debugBcrForm() {
  try {
    console.log('=== DEBUG: BCR SUBMISSION FORM ===');
    
    // 1. Check if we can get impact areas from the model
    console.log('\n1. Checking if we can get impact areas from the model...');
    try {
      const impactedAreas = await impactedAreasModel.getAllImpactedAreas();
      console.log(`Retrieved ${impactedAreas.length} impact areas from the model`);
      
      if (impactedAreas.length > 0) {
        console.log('\nFirst impact area:');
        console.log(impactedAreas[0]);
      }
    } catch (error) {
      console.error('Error getting impact areas from model:', error);
    }
    
    // 2. Check if we can get impact areas directly from Prisma
    console.log('\n2. Checking if we can get impact areas directly from Prisma...');
    try {
      const impactedAreas = await prisma.impactedArea.findMany({
        orderBy: {
          order: 'asc'
        }
      });
      
      console.log(`Retrieved ${impactedAreas.length} impact areas directly from Prisma`);
      
      if (impactedAreas.length > 0) {
        console.log('\nFirst impact area:');
        console.log(impactedAreas[0]);
      }
    } catch (error) {
      console.error('Error getting impact areas directly from Prisma:', error);
    }
    
    // 3. Check the template variable name
    console.log('\n3. Checking template variable name...');
    console.log('The BCR submission form template is expecting a variable named "impactedAreas"');
    console.log('The controller is passing a variable named "impactedAreas"');
    
    // 4. Check if the impact areas have the expected structure
    console.log('\n4. Checking if the impact areas have the expected structure...');
    try {
      const impactedAreas = await impactedAreasModel.getAllImpactedAreas();
      
      if (impactedAreas.length > 0) {
        const firstArea = impactedAreas[0];
        console.log('Expected structure:');
        console.log('- id: UUID string');
        console.log('- name: String');
        console.log('- description: String');
        
        console.log('\nActual structure:');
        console.log(`- id: ${typeof firstArea.id} (${firstArea.id})`);
        console.log(`- name: ${typeof firstArea.name} (${firstArea.name})`);
        console.log(`- description: ${typeof firstArea.description} (${firstArea.description})`);
      }
    } catch (error) {
      console.error('Error checking impact area structure:', error);
    }
    
  } catch (error) {
    console.error('Error in debug script:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug function
debugBcrForm();
