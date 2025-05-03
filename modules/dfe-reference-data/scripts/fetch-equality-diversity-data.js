/**
 * Script to fetch equality and diversity reference data
 * 
 * This script generates data for:
 * - Disabilities
 * - Ethnicities
 * - Genders
 * - Sexual Orientations
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
 * Fetch disabilities data
 * Based on HESA disability codes and UK Equality Act 2010
 */
async function fetchDisabilities() {
  console.log('Generating disabilities data...');
  
  const disabilities = [
    { id: '1', name: 'No known disability', code: 'A', description: 'No disability has been reported' },
    { id: '2', name: 'Specific learning difficulty', code: 'B', description: 'Such as dyslexia, dyspraxia or AD(H)D' },
    { id: '3', name: 'Social/communication impairment', code: 'C', description: "Such as Asperger's syndrome/other autistic spectrum disorder" },
    { id: '4', name: 'Long standing illness or health condition', code: 'D', description: 'Such as cancer, HIV, diabetes, chronic heart disease, or epilepsy' },
    { id: '5', name: 'Mental health condition', code: 'E', description: 'Such as depression, schizophrenia or anxiety disorder' },
    { id: '6', name: 'Physical impairment or mobility issues', code: 'F', description: 'Such as difficulty using arms or using a wheelchair or crutches' },
    { id: '7', name: 'Deaf or serious hearing impairment', code: 'G', description: 'Deaf or serious hearing impairment' },
    { id: '8', name: 'Blind or serious visual impairment', code: 'H', description: 'Blind or serious visual impairment uncorrected by glasses' },
    { id: '9', name: 'Multiple disabilities', code: 'I', description: 'Two or more conditions' },
    { id: '10', name: 'Disability, impairment or medical condition not listed above', code: 'J', description: 'A disability, impairment or medical condition that is not listed above' },
    { id: '11', name: 'Information refused', code: 'Z', description: 'Information about disability has been refused' }
  ];
  
  saveToFile('disabilities', disabilities);
  return disabilities;
}

/**
 * Fetch ethnicities data
 * Based on UK census categories
 */
async function fetchEthnicities() {
  console.log('Generating ethnicities data...');
  
  const ethnicities = [
    // White
    { id: '1', name: 'White - English/Welsh/Scottish/Northern Irish/British', code: 'A', category: 'White' },
    { id: '2', name: 'White - Irish', code: 'B', category: 'White' },
    { id: '3', name: 'White - Gypsy or Irish Traveller', code: 'C', category: 'White' },
    { id: '4', name: 'White - Any other White background', code: 'D', category: 'White' },
    
    // Mixed/Multiple ethnic groups
    { id: '5', name: 'Mixed/Multiple ethnic groups - White and Black Caribbean', code: 'E', category: 'Mixed/Multiple ethnic groups' },
    { id: '6', name: 'Mixed/Multiple ethnic groups - White and Black African', code: 'F', category: 'Mixed/Multiple ethnic groups' },
    { id: '7', name: 'Mixed/Multiple ethnic groups - White and Asian', code: 'G', category: 'Mixed/Multiple ethnic groups' },
    { id: '8', name: 'Mixed/Multiple ethnic groups - Any other Mixed/Multiple ethnic background', code: 'H', category: 'Mixed/Multiple ethnic groups' },
    
    // Asian/Asian British
    { id: '9', name: 'Asian/Asian British - Indian', code: 'I', category: 'Asian/Asian British' },
    { id: '10', name: 'Asian/Asian British - Pakistani', code: 'J', category: 'Asian/Asian British' },
    { id: '11', name: 'Asian/Asian British - Bangladeshi', code: 'K', category: 'Asian/Asian British' },
    { id: '12', name: 'Asian/Asian British - Chinese', code: 'L', category: 'Asian/Asian British' },
    { id: '13', name: 'Asian/Asian British - Any other Asian background', code: 'M', category: 'Asian/Asian British' },
    
    // Black/African/Caribbean/Black British
    { id: '14', name: 'Black/African/Caribbean/Black British - African', code: 'N', category: 'Black/African/Caribbean/Black British' },
    { id: '15', name: 'Black/African/Caribbean/Black British - Caribbean', code: 'O', category: 'Black/African/Caribbean/Black British' },
    { id: '16', name: 'Black/African/Caribbean/Black British - Any other Black/African/Caribbean background', code: 'P', category: 'Black/African/Caribbean/Black British' },
    
    // Other ethnic group
    { id: '17', name: 'Other ethnic group - Arab', code: 'Q', category: 'Other ethnic group' },
    { id: '18', name: 'Other ethnic group - Any other ethnic group', code: 'R', category: 'Other ethnic group' },
    
    // Not provided
    { id: '19', name: 'Not provided', code: 'S', category: 'Not provided' },
    { id: '20', name: 'Information refused', code: 'Z', category: 'Not provided' }
  ];
  
  saveToFile('ethnicities', ethnicities);
  return ethnicities;
}

/**
 * Fetch genders data
 * Based on UK census categories with additional options
 */
async function fetchGenders() {
  console.log('Generating genders data...');
  
  const genders = [
    { id: '1', name: 'Female', code: 'F', description: 'Female' },
    { id: '2', name: 'Male', code: 'M', description: 'Male' },
    { id: '3', name: 'Non-binary', code: 'X', description: 'Non-binary' },
    { id: '4', name: 'Other', code: 'O', description: 'Other gender identity' },
    { id: '5', name: 'Prefer to self-describe', code: 'S', description: 'Prefer to self-describe' },
    { id: '6', name: 'Prefer not to say', code: 'Z', description: 'Prefer not to say' }
  ];
  
  saveToFile('genders', genders);
  return genders;
}

/**
 * Fetch sexual orientations data
 * Based on UK census categories
 */
async function fetchSexualOrientations() {
  console.log('Generating sexual_orientations data...');
  
  const sexualOrientations = [
    { id: '1', name: 'Heterosexual or Straight', code: 'H', description: 'Heterosexual or Straight' },
    { id: '2', name: 'Gay or Lesbian', code: 'G', description: 'Gay or Lesbian' },
    { id: '3', name: 'Bisexual', code: 'B', description: 'Bisexual' },
    { id: '4', name: 'Pansexual', code: 'P', description: 'Pansexual' },
    { id: '5', name: 'Asexual', code: 'A', description: 'Asexual' },
    { id: '6', name: 'Other sexual orientation', code: 'O', description: 'Other sexual orientation not listed' },
    { id: '7', name: 'Prefer to self-describe', code: 'S', description: 'Prefer to self-describe' },
    { id: '8', name: 'Prefer not to say', code: 'Z', description: 'Prefer not to say' }
  ];
  
  saveToFile('sexual_orientations', sexualOrientations);
  return sexualOrientations;
}

/**
 * Run all equality and diversity data fetching functions
 */
async function fetchAllEqualityDiversityData() {
  try {
    await fetchDisabilities();
    await fetchEthnicities();
    await fetchGenders();
    await fetchSexualOrientations();
    
    console.log('All equality and diversity reference data generated successfully!');
  } catch (error) {
    console.error('Error generating equality and diversity reference data:', error);
  }
}

// Run the script
fetchAllEqualityDiversityData();
