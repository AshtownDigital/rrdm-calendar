/**
 * Script to generate 10 academic years starting from the current year
 * Run with: node scripts/generate-academic-years.js
 */

// Import required modules
const mongoose = require('mongoose');
const path = require('path');

// Import the AcademicYear model
require(path.join(__dirname, '../models/academicYear'));
const AcademicYear = mongoose.model('AcademicYear');

// Setup mock MongoDB connection for testing
const mockMongoose = {
  connect: () => {
    console.log('Mock MongoDB connection established');
    return Promise.resolve();
  }
};

// Use mock or real connection based on environment
const db = process.env.NODE_ENV === 'test' ? mockMongoose : mongoose;

// Generate academic years
async function generateAcademicYears(startYear, count) {
  console.log(`Generating ${count} academic years starting from ${startYear}...`);
  
  const years = [];
  
  for (let i = 0; i < count; i++) {
    const year = startYear + i;
    const academicYear = {
      name: `${year}/${year + 1}`,
      startDate: new Date(`${year}-09-01`),
      endDate: new Date(`${year + 1}-08-31`),
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log(`Creating academic year: ${academicYear.name}`);
    
    try {
      // In test mode, just collect the data
      years.push(academicYear);
    } catch (error) {
      console.error(`Error creating academic year ${academicYear.name}:`, error);
    }
  }
  
  return years;
}

// Function to make API request to create academic years
async function createAcademicYearsViaAPI(years) {
  const http = require('http');
  
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      academicYears: years
    });
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/academic-years/bulk',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsedData = JSON.parse(responseData);
            resolve(parsedData);
          } catch (e) {
            resolve(responseData);
          }
        } else {
          reject(new Error(`API request failed with status code ${res.statusCode}: ${responseData}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.write(data);
    req.end();
  });
}

// Main function
async function main() {
  const currentYear = new Date().getFullYear();
  const count = 10;
  
  try {
    const years = await generateAcademicYears(currentYear, count);
    console.log('\nGenerated academic years:');
    years.forEach((year, index) => {
      console.log(`${index + 1}. ${year.name} (${year.startDate.toISOString().split('T')[0]} to ${year.endDate.toISOString().split('T')[0]})`);
    });
    
    console.log('\nAttempting to create academic years via API...');
    try {
      const result = await createAcademicYearsViaAPI(years);
      console.log('\nSuccess! Academic years created:');
      console.log(result);
    } catch (apiError) {
      console.error('\nAPI Error:', apiError.message);
      console.log('\nSince the API call failed, here\'s the JSON you can use to manually create the academic years:');
      console.log(JSON.stringify(years, null, 2));
    }
    
  } catch (error) {
    console.error('Error generating academic years:', error);
  }
}

// Run the script
main().catch(console.error);
