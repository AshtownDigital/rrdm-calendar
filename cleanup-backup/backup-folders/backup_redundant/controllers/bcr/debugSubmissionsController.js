/**
 * Debug version of the BCR Submissions Controller
 * Simplified to help identify the specific issue
 */
// Using centralized Prisma client
const { Bcr, BcrConfig } = require('../../models');
require('../../config/database.mongo');
// Prisma client is imported from centralized config
const bcrService = require('../../services/bcrService');
const bcrConfigService = require('../../services/bcrConfigService');

/**
 * Debug version of the listSubmissions function
 */
async function debugListSubmissions(req, res) {
  console.log('==== DEBUG BCR listSubmissions called ====');
  
  try {
    // Step 1: Get all BCRs
    console.log('1. Getting all BCRs...');
    const submissions = await bcrService.getAllBcrs();
    console.log(`Retrieved ${submissions.length} BCRs`);
    
    if (submissions.length === 0) {
      console.log('No BCRs found in the database');
      return res.render('modules/bcr/submissions/index', { 
        submissions: [], 
        title: 'BCR Submissions (No BCRs found)' 
      });
    }
    
    // Step 2: Get all phases
    console.log('2. Getting all phases...');
    const phaseConfigs = await BcrConfig.find({ type: 'phase' }).sort({ displayOrder: 1 });
    console.log(`Retrieved ${phaseConfigs.length} phases`);
    
    // Step 3: Get all statuses
    console.log('3. Getting all statuses...');
    const statusConfigs = await BcrConfig.find({ type: 'status' }).sort({ displayOrder: 1 });
    console.log(`Retrieved ${statusConfigs.length} statuses`);
    
    // Step 4: Get all impact areas
    console.log('4. Getting all impact areas...');
    const impactAreas = await bcrConfigService.getConfigsByType('impact_area');
    console.log(`Retrieved ${impactAreas.length} impact areas`);
    
    // Log sample data for debugging
    if (phaseConfigs.length > 0) {
      console.log('Sample phase:', {
        id: phaseConfigs[0].id,
        name: phaseConfigs[0].name,
        value: phaseConfigs[0].value,
        type: phaseConfigs[0].type
      });
    }
    
    if (statusConfigs.length > 0) {
      console.log('Sample status:', {
        id: statusConfigs[0].id,
        name: statusConfigs[0].name,
        value: statusConfigs[0].value,
        type: statusConfigs[0].type
      });
    }
    
    // Step 5: Create a simplified version without any complex mapping
    console.log('5. Creating simplified view data...');
    
    const simplifiedSubmissions = bcrs.map(submission => {
      return {
        id: submission.id,
        title: submission.title,
        bcrNumber: submission.bcrNumber,
        status: submission.status,
        createdAt: submission.createdAt,
        updatedAt: submission.updatedAt
      };
    });
    
    // Step 6: Render the view with simplified data
    console.log('6. Rendering view with simplified data...');
    return res.render('modules/bcr/submissions/index', { 
      submissions: simplifiedSubmissions, 
      title: 'BCR Submissions (Debug Mode)',
      phases: phases,
      statuses: allStatuses,
      impactAreas: impactAreas
    });
    
  } catch (error) {
    console.error('Error in debugListSubmissions:', error);
    return res.status(500).send(`
      <h1>Debug Error Information</h1>
      <h2>Error Message</h2>
      <pre>${error.message}</pre>
      <h2>Error Stack</h2>
      <pre>${error.stack}</pre>
      <h2>Error Code</h2>
      <pre>${error.code || 'N/A'}</pre>
    `);
  }
}

module.exports = {
  debugListSubmissions
};
