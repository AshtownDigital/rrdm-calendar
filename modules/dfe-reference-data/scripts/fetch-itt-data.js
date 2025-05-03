/**
 * Script to fetch Initial Teacher Training (ITT) reference data
 * 
 * This script generates data for:
 * - ITT Providers
 * - ITT Subjects
 */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// Directory to save the data files
const dataDir = path.join(__dirname, '../data');

// Ensure the data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

/**
 * Save data to a local file
 * 
 * @param {string} listId - The ID of the reference list
 * @param {Object} data - The data to save
 */
function saveToFile(listId, data) {
  const filePath = path.join(dataDir, `${listId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`Saved ${listId} to ${filePath}`);
}

/**
 * Fetch ITT providers data
 * Based on UK teacher training providers
 */
async function fetchITTProviders() {
  console.log('Generating itt_providers data...');
  
  const ittProviders = [
    { id: '1', name: 'University of Oxford', code: 'O01', region: 'South East', provider_type: 'HEI' },
    { id: '2', name: 'University of Cambridge', code: 'C01', region: 'East of England', provider_type: 'HEI' },
    { id: '3', name: 'University College London', code: 'L01', region: 'London', provider_type: 'HEI' },
    { id: '4', name: "King's College London", code: 'K01', region: 'London', provider_type: 'HEI' },
    { id: '5', name: 'University of Manchester', code: 'M01', region: 'North West', provider_type: 'HEI' },
    { id: '6', name: 'University of Birmingham', code: 'B01', region: 'West Midlands', provider_type: 'HEI' },
    { id: '7', name: 'University of Nottingham', code: 'N01', region: 'East Midlands', provider_type: 'HEI' },
    { id: '8', name: 'University of Leeds', code: 'L02', region: 'Yorkshire and the Humber', provider_type: 'HEI' },
    { id: '9', name: 'University of Sheffield', code: 'S01', region: 'Yorkshire and the Humber', provider_type: 'HEI' },
    { id: '10', name: 'University of Bristol', code: 'B02', region: 'South West', provider_type: 'HEI' },
    { id: '11', name: 'University of Exeter', code: 'E01', region: 'South West', provider_type: 'HEI' },
    { id: '12', name: 'University of York', code: 'Y01', region: 'Yorkshire and the Humber', provider_type: 'HEI' },
    { id: '13', name: 'Durham University', code: 'D01', region: 'North East', provider_type: 'HEI' },
    { id: '14', name: 'University of Warwick', code: 'W01', region: 'West Midlands', provider_type: 'HEI' },
    { id: '15', name: 'Newcastle University', code: 'N02', region: 'North East', provider_type: 'HEI' },
    { id: '16', name: 'University of Southampton', code: 'S02', region: 'South East', provider_type: 'HEI' },
    { id: '17', name: 'University of Liverpool', code: 'L03', region: 'North West', provider_type: 'HEI' },
    { id: '18', name: 'University of Edinburgh', code: 'E02', region: 'Scotland', provider_type: 'HEI' },
    { id: '19', name: 'University of Glasgow', code: 'G01', region: 'Scotland', provider_type: 'HEI' },
    { id: '20', name: 'Cardiff University', code: 'C02', region: 'Wales', provider_type: 'HEI' },
    { id: '21', name: "Queen's University Belfast", code: 'Q01', region: 'Northern Ireland', provider_type: 'HEI' },
    { id: '22', name: 'Bath Spa University', code: 'B03', region: 'South West', provider_type: 'HEI' },
    { id: '23', name: 'University of Brighton', code: 'B04', region: 'South East', provider_type: 'HEI' },
    { id: '24', name: 'Canterbury Christ Church University', code: 'C03', region: 'South East', provider_type: 'HEI' },
    { id: '25', name: 'University of Chester', code: 'C04', region: 'North West', provider_type: 'HEI' },
    { id: '26', name: 'Teach First', code: 'T01', region: 'National', provider_type: 'SCITT' },
    { id: '27', name: 'ARK Teacher Training', code: 'A01', region: 'London', provider_type: 'SCITT' },
    { id: '28', name: 'Harris Initial Teacher Education', code: 'H01', region: 'London', provider_type: 'SCITT' },
    { id: '29', name: 'United Teaching National SCITT', code: 'U01', region: 'National', provider_type: 'SCITT' },
    { id: '30', name: 'The OAKS (Ormiston and Keele SCITT)', code: 'O02', region: 'West Midlands', provider_type: 'SCITT' }
  ];
  
  saveToFile('itt_providers', ittProviders);
  return ittProviders;
}

/**
 * Fetch ITT subjects data
 * Based on DfE teacher training subject classifications
 */
async function fetchITTSubjects() {
  console.log('Generating itt_subjects data...');
  
  const ittSubjects = [
    // Primary
    { id: '1', name: 'Primary', code: 'P', category: 'Primary', description: 'General primary education (ages 5-11)' },
    { id: '2', name: 'Primary with Mathematics', code: 'PM', category: 'Primary', description: 'Primary education with mathematics specialism' },
    { id: '3', name: 'Early Years', code: 'EY', category: 'Primary', description: 'Early years education (ages 3-7)' },
    
    // English
    { id: '4', name: 'English', code: 'E', category: 'English', description: 'Secondary English (ages 11-16 or 11-18)' },
    
    // Mathematics
    { id: '5', name: 'Mathematics', code: 'M', category: 'Mathematics', description: 'Secondary mathematics (ages 11-16 or 11-18)' },
    
    // Sciences
    { id: '6', name: 'Biology', code: 'B', category: 'Sciences', description: 'Secondary biology (ages 11-16 or 11-18)' },
    { id: '7', name: 'Chemistry', code: 'C', category: 'Sciences', description: 'Secondary chemistry (ages 11-16 or 11-18)' },
    { id: '8', name: 'Physics', code: 'P', category: 'Sciences', description: 'Secondary physics (ages 11-16 or 11-18)' },
    { id: '9', name: 'Science', code: 'S', category: 'Sciences', description: 'Combined/general science (ages 11-16 or 11-18)' },
    
    // Modern Foreign Languages
    { id: '10', name: 'French', code: 'FR', category: 'Modern Foreign Languages', description: 'Secondary French (ages 11-16 or 11-18)' },
    { id: '11', name: 'German', code: 'GE', category: 'Modern Foreign Languages', description: 'Secondary German (ages 11-16 or 11-18)' },
    { id: '12', name: 'Spanish', code: 'SP', category: 'Modern Foreign Languages', description: 'Secondary Spanish (ages 11-16 or 11-18)' },
    { id: '13', name: 'Modern Languages', code: 'ML', category: 'Modern Foreign Languages', description: 'Other modern languages (ages 11-16 or 11-18)' },
    
    // Humanities
    { id: '14', name: 'Geography', code: 'GG', category: 'Humanities', description: 'Secondary geography (ages 11-16 or 11-18)' },
    { id: '15', name: 'History', code: 'HI', category: 'Humanities', description: 'Secondary history (ages 11-16 or 11-18)' },
    { id: '16', name: 'Religious Education', code: 'RE', category: 'Humanities', description: 'Secondary religious education (ages 11-16 or 11-18)' },
    
    // Arts
    { id: '17', name: 'Art and Design', code: 'AD', category: 'Arts', description: 'Secondary art and design (ages 11-16 or 11-18)' },
    { id: '18', name: 'Music', code: 'MU', category: 'Arts', description: 'Secondary music (ages 11-16 or 11-18)' },
    { id: '19', name: 'Drama', code: 'DR', category: 'Arts', description: 'Secondary drama (ages 11-16 or 11-18)' },
    
    // Technology
    { id: '20', name: 'Design and Technology', code: 'DT', category: 'Technology', description: 'Secondary design and technology (ages 11-16 or 11-18)' },
    { id: '21', name: 'Computing', code: 'CP', category: 'Technology', description: 'Secondary computing (ages 11-16 or 11-18)' },
    { id: '22', name: 'Business Studies', code: 'BS', category: 'Technology', description: 'Secondary business studies (ages 11-16 or 11-18)' },
    
    // Other
    { id: '23', name: 'Physical Education', code: 'PE', category: 'Other', description: 'Secondary physical education (ages 11-16 or 11-18)' },
    { id: '24', name: 'Citizenship', code: 'CT', category: 'Other', description: 'Secondary citizenship (ages 11-16 or 11-18)' },
    { id: '25', name: 'Psychology', code: 'PS', category: 'Other', description: 'Secondary psychology (ages 11-16 or 11-18)' },
    { id: '26', name: 'Social Sciences', code: 'SS', category: 'Other', description: 'Secondary social sciences (ages 11-16 or 11-18)' },
    { id: '27', name: 'Economics', code: 'EC', category: 'Other', description: 'Secondary economics (ages 11-16 or 11-18)' },
    
    // Special Educational Needs
    { id: '28', name: 'Special Educational Needs', code: 'SEN', category: 'Special Educational Needs', description: 'Special educational needs teaching' },
    { id: '29', name: 'Special Educational Needs - Hearing Impairment', code: 'SEN-HI', category: 'Special Educational Needs', description: 'Teaching for pupils with hearing impairment' },
    { id: '30', name: 'Special Educational Needs - Visual Impairment', code: 'SEN-VI', category: 'Special Educational Needs', description: 'Teaching for pupils with visual impairment' }
  ];
  
  saveToFile('itt_subjects', ittSubjects);
  return ittSubjects;
}

/**
 * Run all ITT data fetching functions
 */
async function fetchAllITTData() {
  try {
    await fetchITTProviders();
    await fetchITTSubjects();
    
    console.log('All ITT reference data generated successfully!');
  } catch (error) {
    console.error('Error generating ITT reference data:', error);
  }
}

// Run the script
fetchAllITTData();
