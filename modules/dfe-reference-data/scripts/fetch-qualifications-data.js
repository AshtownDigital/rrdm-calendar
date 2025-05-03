/**
 * Script to fetch qualifications reference data
 * 
 * This script generates data for:
 * - Qualifications
 * - Qualification Types
 * - Qualification Grades
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
 * Fetch qualification types data
 * Based on UK qualification framework
 */
async function fetchQualificationTypes() {
  console.log('Generating qualification_types data...');
  
  const qualificationTypes = [
    // School qualifications
    { id: '1', name: 'GCSE', description: 'General Certificate of Secondary Education', code: 'GCSE', level: '2', category: 'School' },
    { id: '2', name: 'AS Level', description: 'Advanced Subsidiary Level', code: 'AS', level: '3', category: 'School' },
    { id: '3', name: 'A Level', description: 'Advanced Level', code: 'A', level: '3', category: 'School' },
    { id: '4', name: 'International Baccalaureate', description: 'International Baccalaureate Diploma', code: 'IB', level: '3', category: 'School' },
    
    // Vocational qualifications
    { id: '5', name: 'BTEC First', description: 'BTEC First Certificate/Diploma', code: 'BTEC1', level: '2', category: 'Vocational' },
    { id: '6', name: 'BTEC National', description: 'BTEC National Certificate/Diploma', code: 'BTEC3', level: '3', category: 'Vocational' },
    { id: '7', name: 'NVQ', description: 'National Vocational Qualification', code: 'NVQ', level: 'Various', category: 'Vocational' },
    { id: '8', name: 'City & Guilds', description: 'City & Guilds Qualification', code: 'C&G', level: 'Various', category: 'Vocational' },
    { id: '9', name: 'T Level', description: 'Technical Level', code: 'TLVL', level: '3', category: 'Vocational' },
    
    // Higher education qualifications
    { id: '10', name: 'HNC', description: 'Higher National Certificate', code: 'HNC', level: '4', category: 'Higher Education' },
    { id: '11', name: 'HND', description: 'Higher National Diploma', code: 'HND', level: '5', category: 'Higher Education' },
    { id: '12', name: 'Foundation Degree', description: 'Foundation Degree (FdA, FdSc)', code: 'FD', level: '5', category: 'Higher Education' },
    { id: '13', name: 'Bachelor\'s Degree', description: 'Bachelor\'s Degree (BA, BSc, BEng, etc.)', code: 'BACH', level: '6', category: 'Higher Education' },
    { id: '14', name: 'Master\'s Degree', description: 'Master\'s Degree (MA, MSc, MEng, etc.)', code: 'MAST', level: '7', category: 'Higher Education' },
    { id: '15', name: 'PGCE', description: 'Postgraduate Certificate in Education', code: 'PGCE', level: '7', category: 'Higher Education' },
    { id: '16', name: 'PhD', description: 'Doctor of Philosophy', code: 'PHD', level: '8', category: 'Higher Education' },
    
    // Professional qualifications
    { id: '17', name: 'QTS', description: 'Qualified Teacher Status', code: 'QTS', level: '6', category: 'Professional' },
    { id: '18', name: 'CPA', description: 'Certified Public Accountant', code: 'CPA', level: '7', category: 'Professional' },
    { id: '19', name: 'ACCA', description: 'Association of Chartered Certified Accountants', code: 'ACCA', level: '7', category: 'Professional' },
    { id: '20', name: 'CIPD', description: 'Chartered Institute of Personnel and Development', code: 'CIPD', level: 'Various', category: 'Professional' }
  ];
  
  saveToFile('qualification_types', qualificationTypes);
  return qualificationTypes;
}

/**
 * Fetch qualification grades data
 * Based on UK grading systems
 */
async function fetchQualificationGrades() {
  console.log('Generating qualification_grades data...');
  
  const qualificationGrades = [
    // GCSE grades (9-1)
    { id: '1', name: 'Grade 9', code: '9', qualification_type: 'GCSE', sort_order: 1, description: 'Highest grade in the new GCSE system' },
    { id: '2', name: 'Grade 8', code: '8', qualification_type: 'GCSE', sort_order: 2 },
    { id: '3', name: 'Grade 7', code: '7', qualification_type: 'GCSE', sort_order: 3, description: 'Equivalent to grade A in the old system' },
    { id: '4', name: 'Grade 6', code: '6', qualification_type: 'GCSE', sort_order: 4 },
    { id: '5', name: 'Grade 5', code: '5', qualification_type: 'GCSE', sort_order: 5, description: 'Strong pass' },
    { id: '6', name: 'Grade 4', code: '4', qualification_type: 'GCSE', sort_order: 6, description: 'Standard pass, equivalent to grade C in the old system' },
    { id: '7', name: 'Grade 3', code: '3', qualification_type: 'GCSE', sort_order: 7 },
    { id: '8', name: 'Grade 2', code: '2', qualification_type: 'GCSE', sort_order: 8 },
    { id: '9', name: 'Grade 1', code: '1', qualification_type: 'GCSE', sort_order: 9, description: 'Lowest grade in the new GCSE system' },
    { id: '10', name: 'U', code: 'U', qualification_type: 'GCSE', sort_order: 10, description: 'Ungraded' },
    
    // GCSE grades (A*-G, old system)
    { id: '11', name: 'A*', code: 'A*', qualification_type: 'GCSE-old', sort_order: 1, description: 'Highest grade in the old GCSE system' },
    { id: '12', name: 'A', code: 'A', qualification_type: 'GCSE-old', sort_order: 2 },
    { id: '13', name: 'B', code: 'B', qualification_type: 'GCSE-old', sort_order: 3 },
    { id: '14', name: 'C', code: 'C', qualification_type: 'GCSE-old', sort_order: 4, description: 'Considered a standard pass' },
    { id: '15', name: 'D', code: 'D', qualification_type: 'GCSE-old', sort_order: 5 },
    { id: '16', name: 'E', code: 'E', qualification_type: 'GCSE-old', sort_order: 6 },
    { id: '17', name: 'F', code: 'F', qualification_type: 'GCSE-old', sort_order: 7 },
    { id: '18', name: 'G', code: 'G', qualification_type: 'GCSE-old', sort_order: 8, description: 'Lowest passing grade in the old GCSE system' },
    { id: '19', name: 'U', code: 'U', qualification_type: 'GCSE-old', sort_order: 9, description: 'Ungraded' },
    
    // A Level grades
    { id: '20', name: 'A*', code: 'A*', qualification_type: 'A', sort_order: 1, description: 'Highest grade in A Level' },
    { id: '21', name: 'A', code: 'A', qualification_type: 'A', sort_order: 2 },
    { id: '22', name: 'B', code: 'B', qualification_type: 'A', sort_order: 3 },
    { id: '23', name: 'C', code: 'C', qualification_type: 'A', sort_order: 4 },
    { id: '24', name: 'D', code: 'D', qualification_type: 'A', sort_order: 5 },
    { id: '25', name: 'E', code: 'E', qualification_type: 'A', sort_order: 6, description: 'Lowest passing grade in A Level' },
    { id: '26', name: 'U', code: 'U', qualification_type: 'A', sort_order: 7, description: 'Ungraded' },
    
    // BTEC grades
    { id: '27', name: 'Distinction*', code: 'D*', qualification_type: 'BTEC', sort_order: 1, description: 'Highest BTEC grade' },
    { id: '28', name: 'Distinction', code: 'D', qualification_type: 'BTEC', sort_order: 2 },
    { id: '29', name: 'Merit', code: 'M', qualification_type: 'BTEC', sort_order: 3 },
    { id: '30', name: 'Pass', code: 'P', qualification_type: 'BTEC', sort_order: 4, description: 'Lowest passing BTEC grade' },
    { id: '31', name: 'Fail', code: 'F', qualification_type: 'BTEC', sort_order: 5 },
    
    // Degree classifications
    { id: '32', name: 'First-Class Honours (1st)', code: '1', qualification_type: 'BACH', sort_order: 1, description: 'Highest classification for bachelor\'s degrees' },
    { id: '33', name: 'Upper Second-Class Honours (2:1)', code: '2:1', qualification_type: 'BACH', sort_order: 2 },
    { id: '34', name: 'Lower Second-Class Honours (2:2)', code: '2:2', qualification_type: 'BACH', sort_order: 3 },
    { id: '35', name: 'Third-Class Honours (3rd)', code: '3', qualification_type: 'BACH', sort_order: 4 },
    { id: '36', name: 'Ordinary Degree (Pass)', code: 'Pass', qualification_type: 'BACH', sort_order: 5, description: 'Degree without honours' },
    
    // Master's degree classifications
    { id: '37', name: 'Distinction', code: 'Dist', qualification_type: 'MAST', sort_order: 1, description: 'Highest classification for master\'s degrees' },
    { id: '38', name: 'Merit', code: 'Merit', qualification_type: 'MAST', sort_order: 2 },
    { id: '39', name: 'Pass', code: 'Pass', qualification_type: 'MAST', sort_order: 3 },
    { id: '40', name: 'Fail', code: 'Fail', qualification_type: 'MAST', sort_order: 4 }
  ];
  
  saveToFile('qualification_grades', qualificationGrades);
  return qualificationGrades;
}

/**
 * Fetch qualifications data
 * Sample qualifications combining types and subjects
 */
async function fetchQualifications() {
  console.log('Generating qualifications data...');
  
  const qualifications = [
    // GCSEs
    { id: '1', name: 'GCSE English Language', code: 'GCSE-ENGL', type_id: '1', subject: 'English Language' },
    { id: '2', name: 'GCSE English Literature', code: 'GCSE-ELIT', type_id: '1', subject: 'English Literature' },
    { id: '3', name: 'GCSE Mathematics', code: 'GCSE-MATH', type_id: '1', subject: 'Mathematics' },
    { id: '4', name: 'GCSE Biology', code: 'GCSE-BIOL', type_id: '1', subject: 'Biology' },
    { id: '5', name: 'GCSE Chemistry', code: 'GCSE-CHEM', type_id: '1', subject: 'Chemistry' },
    { id: '6', name: 'GCSE Physics', code: 'GCSE-PHYS', type_id: '1', subject: 'Physics' },
    { id: '7', name: 'GCSE Combined Science', code: 'GCSE-CSCI', type_id: '1', subject: 'Combined Science' },
    { id: '8', name: 'GCSE History', code: 'GCSE-HIST', type_id: '1', subject: 'History' },
    { id: '9', name: 'GCSE Geography', code: 'GCSE-GEOG', type_id: '1', subject: 'Geography' },
    { id: '10', name: 'GCSE French', code: 'GCSE-FREN', type_id: '1', subject: 'French' },
    
    // A Levels
    { id: '11', name: 'A Level Mathematics', code: 'A-MATH', type_id: '3', subject: 'Mathematics' },
    { id: '12', name: 'A Level Further Mathematics', code: 'A-FMAT', type_id: '3', subject: 'Further Mathematics' },
    { id: '13', name: 'A Level Physics', code: 'A-PHYS', type_id: '3', subject: 'Physics' },
    { id: '14', name: 'A Level Chemistry', code: 'A-CHEM', type_id: '3', subject: 'Chemistry' },
    { id: '15', name: 'A Level Biology', code: 'A-BIOL', type_id: '3', subject: 'Biology' },
    { id: '16', name: 'A Level English Literature', code: 'A-ELIT', type_id: '3', subject: 'English Literature' },
    { id: '17', name: 'A Level History', code: 'A-HIST', type_id: '3', subject: 'History' },
    { id: '18', name: 'A Level Geography', code: 'A-GEOG', type_id: '3', subject: 'Geography' },
    { id: '19', name: 'A Level Psychology', code: 'A-PSYC', type_id: '3', subject: 'Psychology' },
    { id: '20', name: 'A Level Economics', code: 'A-ECON', type_id: '3', subject: 'Economics' },
    
    // BTECs
    { id: '21', name: 'BTEC Level 3 Extended Diploma in Applied Science', code: 'BTEC-ASCI', type_id: '6', subject: 'Applied Science' },
    { id: '22', name: 'BTEC Level 3 Extended Diploma in Business', code: 'BTEC-BUSI', type_id: '6', subject: 'Business' },
    { id: '23', name: 'BTEC Level 3 Extended Diploma in Health and Social Care', code: 'BTEC-HSC', type_id: '6', subject: 'Health and Social Care' },
    { id: '24', name: 'BTEC Level 3 Extended Diploma in Information Technology', code: 'BTEC-IT', type_id: '6', subject: 'Information Technology' },
    { id: '25', name: 'BTEC Level 3 Extended Diploma in Sport', code: 'BTEC-SPOR', type_id: '6', subject: 'Sport' },
    
    // Degrees
    { id: '26', name: 'Bachelor of Arts in English Literature', code: 'BA-ELIT', type_id: '13', subject: 'English Literature' },
    { id: '27', name: 'Bachelor of Science in Computer Science', code: 'BSC-COMP', type_id: '13', subject: 'Computer Science' },
    { id: '28', name: 'Bachelor of Science in Mathematics', code: 'BSC-MATH', type_id: '13', subject: 'Mathematics' },
    { id: '29', name: 'Bachelor of Engineering in Mechanical Engineering', code: 'BENG-MECH', type_id: '13', subject: 'Mechanical Engineering' },
    { id: '30', name: 'Bachelor of Arts in History', code: 'BA-HIST', type_id: '13', subject: 'History' },
    
    // Master's degrees
    { id: '31', name: 'Master of Science in Computer Science', code: 'MSC-COMP', type_id: '14', subject: 'Computer Science' },
    { id: '32', name: 'Master of Arts in English Literature', code: 'MA-ELIT', type_id: '14', subject: 'English Literature' },
    { id: '33', name: 'Master of Business Administration', code: 'MBA', type_id: '14', subject: 'Business Administration' },
    { id: '34', name: 'Master of Education', code: 'MED', type_id: '14', subject: 'Education' },
    { id: '35', name: 'Master of Engineering in Civil Engineering', code: 'MENG-CIVIL', type_id: '14', subject: 'Civil Engineering' },
    
    // Professional qualifications
    { id: '36', name: 'Qualified Teacher Status', code: 'QTS', type_id: '17', subject: 'Teaching' },
    { id: '37', name: 'PGCE Secondary Mathematics', code: 'PGCE-SMATH', type_id: '15', subject: 'Secondary Mathematics' },
    { id: '38', name: 'PGCE Primary Education', code: 'PGCE-PRIM', type_id: '15', subject: 'Primary Education' },
    { id: '39', name: 'ACCA Professional Qualification', code: 'ACCA-PROF', type_id: '19', subject: 'Accounting' },
    { id: '40', name: 'CIPD Level 7 Advanced Diploma in Human Resource Management', code: 'CIPD-L7', type_id: '20', subject: 'Human Resource Management' }
  ];
  
  saveToFile('qualifications', qualifications);
  return qualifications;
}

/**
 * Run all qualifications data fetching functions
 */
async function fetchAllQualificationsData() {
  try {
    await fetchQualificationTypes();
    await fetchQualificationGrades();
    await fetchQualifications();
    
    console.log('All qualifications reference data generated successfully!');
  } catch (error) {
    console.error('Error generating qualifications reference data:', error);
  }
}

// Run the script
fetchAllQualificationsData();
