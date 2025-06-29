/**
 * Script to add mock academic years directly to the application's in-memory store
 * Run with: node scripts/add-mock-academic-years.js
 */

// Import required modules
const path = require('path');
const fs = require('fs');

// Generate academic years data
function generateAcademicYears(startYear, count) {
  console.log(`Generating ${count} academic years starting from ${startYear}...`);
  
  const years = [];
  
  for (let i = 0; i < count; i++) {
    const year = startYear + i;
    const academicYear = {
      _id: `mock-academic-year-${i + 1}`,
      name: `${year}/${year + 1}`,
      startDate: new Date(`${year}-09-01`),
      endDate: new Date(`${year + 1}-08-31`),
      status: i === 0 ? 'Current' : i === 1 ? 'Next' : 'Future',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log(`Creating academic year: ${academicYear.name}`);
    years.push(academicYear);
  }
  
  return years;
}

// Main function
async function main() {
  const currentYear = new Date().getFullYear();
  const count = 10;
  
  try {
    const years = generateAcademicYears(currentYear, count);
    
    // Create mock data directory if it doesn't exist
    const mockDataDir = path.join(__dirname, '../mock-data');
    if (!fs.existsSync(mockDataDir)) {
      fs.mkdirSync(mockDataDir, { recursive: true });
    }
    
    // Write academic years to mock data file
    const mockDataPath = path.join(mockDataDir, 'academic-years.json');
    fs.writeFileSync(mockDataPath, JSON.stringify(years, null, 2));
    
    console.log(`\nSuccessfully wrote ${years.length} academic years to ${mockDataPath}`);
    console.log('\nTo use this data in your application:');
    console.log('1. Import this file in your academicYearService.js');
    console.log('2. Use the data for mock responses in test mode');
    
    // Create a sample implementation file
    const implementationPath = path.join(__dirname, '../mock-implementation.js');
    const implementationCode = `
// Example implementation for using mock academic years
const mockAcademicYears = require('./mock-data/academic-years.json');

// In your academicYearService.js
function getAllAcademicYears() {
  if (process.env.NODE_ENV === 'test') {
    return Promise.resolve(mockAcademicYears);
  }
  
  // Regular database query for production
  return AcademicYear.find().sort({ startDate: 1 });
}
`;
    
    fs.writeFileSync(implementationPath, implementationCode);
    console.log(`\nSample implementation written to ${implementationPath}`);
    
  } catch (error) {
    console.error('Error generating academic years:', error);
  }
}

// Run the script
main().catch(console.error);
