/**
 * Script to generate all reference data files
 * 
 * This script will fetch all reference data lists from the DFE GitHub repository
 * and save them to the local data directory.
 */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { LISTS } = require('../lib/data-lists');

// Base URL for raw GitHub content
const baseUrl = 'https://raw.githubusercontent.com/DFE-Digital/dfe-reference-data/main/data';

// Directory to save the data files
const dataDir = path.join(__dirname, '../data');

// Ensure the data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Sample data for lists that might not be available in the DFE repository
const sampleData = {
  // Equality and Diversity
  disabilities: [
    { id: '1', name: 'No known disability', code: 'A' },
    { id: '2', name: 'Specific learning difficulty', code: 'B' },
    { id: '3', name: 'Hearing impairment', code: 'C' },
    { id: '4', name: 'Visual impairment', code: 'D' },
    { id: '5', name: 'Physical impairment', code: 'E' },
    { id: '6', name: 'Mental health condition', code: 'F' },
    { id: '7', name: 'Social/communication impairment', code: 'G' },
    { id: '8', name: 'Long standing illness or health condition', code: 'H' },
    { id: '9', name: 'Other disability', code: 'I' },
    { id: '10', name: 'Multiple disabilities', code: 'J' },
    { id: '11', name: 'Prefer not to say', code: 'Z' }
  ],
  ethnicities: [
    { id: '1', name: 'White - British', code: 'A' },
    { id: '2', name: 'White - Irish', code: 'B' },
    { id: '3', name: 'White - Other', code: 'C' },
    { id: '4', name: 'Black or Black British - Caribbean', code: 'D' },
    { id: '5', name: 'Black or Black British - African', code: 'E' },
    { id: '6', name: 'Black or Black British - Other', code: 'F' },
    { id: '7', name: 'Asian or Asian British - Indian', code: 'G' },
    { id: '8', name: 'Asian or Asian British - Pakistani', code: 'H' },
    { id: '9', name: 'Asian or Asian British - Bangladeshi', code: 'I' },
    { id: '10', name: 'Asian or Asian British - Other', code: 'J' },
    { id: '11', name: 'Mixed - White and Black Caribbean', code: 'K' },
    { id: '12', name: 'Mixed - White and Black African', code: 'L' },
    { id: '13', name: 'Mixed - White and Asian', code: 'M' },
    { id: '14', name: 'Mixed - Other', code: 'N' },
    { id: '15', name: 'Other ethnic group', code: 'O' },
    { id: '16', name: 'Not provided', code: 'Z' }
  ],
  genders: [
    { id: '1', name: 'Male', code: 'M' },
    { id: '2', name: 'Female', code: 'F' },
    { id: '3', name: 'Other', code: 'O' },
    { id: '4', name: 'Prefer not to say', code: 'Z' }
  ],
  sexual_orientations: [
    { id: '1', name: 'Heterosexual/Straight', code: 'H' },
    { id: '2', name: 'Gay man', code: 'G' },
    { id: '3', name: 'Gay woman/Lesbian', code: 'L' },
    { id: '4', name: 'Bisexual', code: 'B' },
    { id: '5', name: 'Other', code: 'O' },
    { id: '6', name: 'Prefer not to say', code: 'Z' }
  ],
  // Initial Teacher Training
  itt_providers: [
    { id: '1', name: 'University of Oxford', code: 'O01' },
    { id: '2', name: 'University of Cambridge', code: 'C01' },
    { id: '3', name: 'University College London', code: 'L01' },
    { id: '4', name: "King's College London", code: 'K01' },
    { id: '5', name: 'University of Manchester', code: 'M01' },
    { id: '6', name: 'University of Birmingham', code: 'B01' },
    { id: '7', name: 'University of Nottingham', code: 'N01' },
    { id: '8', name: 'University of Leeds', code: 'L02' },
    { id: '9', name: 'University of Sheffield', code: 'S01' },
    { id: '10', name: 'University of Bristol', code: 'B02' }
  ],
  itt_subjects: [
    { id: '1', name: 'Mathematics', code: 'G1' },
    { id: '2', name: 'English', code: 'Q3' },
    { id: '3', name: 'Physics', code: 'F3' },
    { id: '4', name: 'Chemistry', code: 'F1' },
    { id: '5', name: 'Biology', code: 'C1' },
    { id: '6', name: 'Computing', code: 'I1' },
    { id: '7', name: 'Modern Languages', code: 'R' },
    { id: '8', name: 'Geography', code: 'L7' },
    { id: '9', name: 'History', code: 'V1' },
    { id: '10', name: 'Art and Design', code: 'W1' },
    { id: '11', name: 'Music', code: 'W3' },
    { id: '12', name: 'Physical Education', code: 'C6' },
    { id: '13', name: 'Religious Education', code: 'V6' },
    { id: '14', name: 'Design and Technology', code: 'W9' }
  ],
  // Degrees
  degree_types: [
    { id: '1', name: 'Bachelor of Arts', code: 'BA' },
    { id: '2', name: 'Bachelor of Science', code: 'BSc' },
    { id: '3', name: 'Bachelor of Education', code: 'BEd' },
    { id: '4', name: 'Master of Arts', code: 'MA' },
    { id: '5', name: 'Master of Science', code: 'MSc' },
    { id: '6', name: 'Master of Education', code: 'MEd' },
    { id: '7', name: 'Doctor of Philosophy', code: 'PhD' },
    { id: '8', name: 'Postgraduate Certificate in Education', code: 'PGCE' }
  ],
  degree_institutions: [
    { id: '1', name: 'University of Oxford', code: 'O01' },
    { id: '2', name: 'University of Cambridge', code: 'C01' },
    { id: '3', name: 'University College London', code: 'L01' },
    { id: '4', name: "King's College London", code: 'K01' },
    { id: '5', name: 'University of Manchester', code: 'M01' },
    { id: '6', name: 'University of Birmingham', code: 'B01' },
    { id: '7', name: 'University of Nottingham', code: 'N01' },
    { id: '8', name: 'University of Leeds', code: 'L02' },
    { id: '9', name: 'University of Sheffield', code: 'S01' },
    { id: '10', name: 'University of Bristol', code: 'B02' }
  ],
  degree_subjects: [
    { id: '1', name: 'Mathematics', code: 'G100' },
    { id: '2', name: 'English Literature', code: 'Q320' },
    { id: '3', name: 'Physics', code: 'F300' },
    { id: '4', name: 'Chemistry', code: 'F100' },
    { id: '5', name: 'Biology', code: 'C100' },
    { id: '6', name: 'Computer Science', code: 'I100' },
    { id: '7', name: 'French', code: 'R100' },
    { id: '8', name: 'Geography', code: 'L700' },
    { id: '9', name: 'History', code: 'V100' },
    { id: '10', name: 'Art and Design', code: 'W100' },
    { id: '11', name: 'Music', code: 'W300' },
    { id: '12', name: 'Physical Education', code: 'C600' },
    { id: '13', name: 'Religious Studies', code: 'V600' },
    { id: '14', name: 'Design and Technology', code: 'W900' }
  ],
  // Qualifications
  qualification_types: [
    { id: '1', name: 'GCSE', description: 'General Certificate of Secondary Education', code: 'GCSE' },
    { id: '2', name: 'A Level', description: 'Advanced Level', code: 'A' },
    { id: '3', name: 'AS Level', description: 'Advanced Subsidiary Level', code: 'AS' },
    { id: '4', name: 'BTEC', description: 'Business and Technology Education Council', code: 'BTEC' },
    { id: '5', name: 'NVQ', description: 'National Vocational Qualification', code: 'NVQ' },
    { id: '6', name: 'HNC', description: 'Higher National Certificate', code: 'HNC' },
    { id: '7', name: 'HND', description: 'Higher National Diploma', code: 'HND' },
    { id: '8', name: 'Degree', description: "Bachelor's Degree", code: 'DEG' }
  ],
  qualification_grades: [
    { id: '1', name: 'A*', code: 'A*', sort_order: 1 },
    { id: '2', name: 'A', code: 'A', sort_order: 2 },
    { id: '3', name: 'B', code: 'B', sort_order: 3 },
    { id: '4', name: 'C', code: 'C', sort_order: 4 },
    { id: '5', name: 'D', code: 'D', sort_order: 5 },
    { id: '6', name: 'E', code: 'E', sort_order: 6 },
    { id: '7', name: 'F', code: 'F', sort_order: 7 },
    { id: '8', name: 'G', code: 'G', sort_order: 8 },
    { id: '9', name: 'U', code: 'U', sort_order: 9 },
    { id: '10', name: 'Pass', code: 'P', sort_order: 10 },
    { id: '11', name: 'Merit', code: 'M', sort_order: 11 },
    { id: '12', name: 'Distinction', code: 'D', sort_order: 12 }
  ]
};

/**
 * Fetch a reference list from GitHub
 * 
 * @param {string} listId - The ID of the reference list to fetch
 * @returns {Promise<Object>} - The reference list data
 */
async function fetchFromGitHub(listId) {
  try {
    console.log(`Fetching ${listId} from GitHub...`);
    
    // Fetch the data
    const response = await fetch(`${baseUrl}/${listId}.json`);
    
    if (!response.ok) {
      console.log(`Failed to fetch ${listId} from GitHub, using sample data.`);
      return sampleData[listId] || [];
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${listId} from GitHub:`, error);
    return sampleData[listId] || [];
  }
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
 * Generate all reference data files
 */
async function generateAllData() {
  // Get all list IDs
  const listIds = Object.values(LISTS);
  
  // Fetch and save each list
  for (const listId of listIds) {
    const data = await fetchFromGitHub(listId);
    saveToFile(listId, data);
  }
  
  console.log('All reference data files generated successfully!');
}

// Run the generator
generateAllData().catch(error => {
  console.error('Error generating reference data files:', error);
  process.exit(1);
});
