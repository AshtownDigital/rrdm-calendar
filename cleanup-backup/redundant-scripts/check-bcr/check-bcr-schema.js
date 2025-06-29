/**
 * Check BCR Schema Script
 * 
 * This script checks the actual database schema for BCRs table
 * to understand what values are expected for enum fields
 */
require('dotenv').config({ path: '.env.development' });
const mongoose = require('mongoose');
const { Bcr } = require('../models');
require('../config/database.mongo');

async function main() {
  try {
    console.log('Checking BCR schema in database...');
    
    // Get schema information from Mongoose model
    const schema = Bcr.schema;
    
    // Check status enum values
    console.log('\nStatus Enum Values in Schema:');
    const statusPath = schema.path('status');
    if (statusPath && statusPath.enumValues) {
      statusPath.enumValues.forEach(value => {
        console.log(`- ${value}`);
      });
    } else {
      console.log('No enum values found for status');
    }
    
    // Check priority/urgencyLevel enum values
    console.log('\nUrgency Level Enum Values in Schema:');
    const urgencyPath = schema.path('urgencyLevel');
    if (urgencyPath && urgencyPath.enumValues) {
      urgencyPath.enumValues.forEach(value => {
        console.log(`- ${value}`);
      });
    } else {
      console.log('No enum values found for urgency level');
    }
    
    // Check the BCR schema structure
    console.log('\nBCR Schema Structure:');
    schema.eachPath((path, schemaType) => {
      const type = schemaType.instance;
      const required = schemaType.isRequired ? 'required' : 'optional';
      const enumValues = schemaType.enumValues ? ` (enum: ${schemaType.enumValues.join(', ')})` : '';
      console.log(`- ${path}: ${type} (${required})${enumValues}`);
    });
    
  } catch (error) {
    console.error('Error checking BCR schema:', error);
  } finally {
    await mongoose.disconnect();
  }
}

main();
