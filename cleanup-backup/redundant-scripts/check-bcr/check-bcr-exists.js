/**
 * Script to check if a BCR exists by ID
 */
const mongoose = require('mongoose');
const { Bcr } = require('../models');
require('../config/database.mongo');

async function checkBcr() {
  try {
    console.log('Checking if BCR exists...');
    
    const bcrId = 'ed33ca62-d724-4948-9001-2e1012c774e0';
    
    const bcr = await Bcr.findById(bcrId).populate('submission');
    
    console.log('BCR found:', bcr ? 'Yes' : 'No');
    
    if (bcr) {
      console.log('BCR details:', JSON.stringify(bcr, null, 2));
    }
    
  } catch (error) {
    console.error('Error checking BCR:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the function
checkBcr();
