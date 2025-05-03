/**
 * Script to fetch academic reference data
 * 
 * This script fetches and generates data for:
 * - Common Aggregation Hierarchy
 * - Degrees
 * - Degree Types
 * - Degree Grades
 * - Degree Institutions
 * - Degree Subjects
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
 * Fetch degree grades data
 * Uses UK standard degree classification system
 */
async function fetchDegreeGrades() {
  console.log('Generating degree_grades data...');
  
  const degreeGrades = [
    { id: '1', name: 'First-Class Honours (1st)', code: '1', sort_order: 1 },
    { id: '2', name: 'Upper Second-Class Honours (2:1)', code: '2:1', sort_order: 2 },
    { id: '3', name: 'Lower Second-Class Honours (2:2)', code: '2:2', sort_order: 3 },
    { id: '4', name: 'Third-Class Honours (3rd)', code: '3', sort_order: 4 },
    { id: '5', name: 'Ordinary Degree (Pass)', code: 'Pass', sort_order: 5 },
    { id: '6', name: 'Distinction', code: 'Dist', sort_order: 6 },
    { id: '7', name: 'Merit', code: 'Merit', sort_order: 7 },
    { id: '8', name: 'Fail', code: 'Fail', sort_order: 8 },
    { id: '9', name: 'Unclassified', code: 'Unclass', sort_order: 9 },
    { id: '10', name: 'Not Applicable', code: 'N/A', sort_order: 10 }
  ];
  
  saveToFile('degree_grades', degreeGrades);
  return degreeGrades;
}

/**
 * Fetch degree types data
 * Based on common UK degree types
 */
async function fetchDegreeTypes() {
  console.log('Generating degree_types data...');
  
  const degreeTypes = [
    { id: '1', name: 'Bachelor of Arts', code: 'BA', level: 'Undergraduate' },
    { id: '2', name: 'Bachelor of Science', code: 'BSc', level: 'Undergraduate' },
    { id: '3', name: 'Bachelor of Engineering', code: 'BEng', level: 'Undergraduate' },
    { id: '4', name: 'Bachelor of Laws', code: 'LLB', level: 'Undergraduate' },
    { id: '5', name: 'Bachelor of Medicine, Bachelor of Surgery', code: 'MBBS', level: 'Undergraduate' },
    { id: '6', name: 'Bachelor of Education', code: 'BEd', level: 'Undergraduate' },
    { id: '7', name: 'Master of Arts', code: 'MA', level: 'Postgraduate' },
    { id: '8', name: 'Master of Science', code: 'MSc', level: 'Postgraduate' },
    { id: '9', name: 'Master of Business Administration', code: 'MBA', level: 'Postgraduate' },
    { id: '10', name: 'Master of Engineering', code: 'MEng', level: 'Undergraduate' },
    { id: '11', name: 'Master of Laws', code: 'LLM', level: 'Postgraduate' },
    { id: '12', name: 'Master of Education', code: 'MEd', level: 'Postgraduate' },
    { id: '13', name: 'Master of Research', code: 'MRes', level: 'Postgraduate' },
    { id: '14', name: 'Doctor of Philosophy', code: 'PhD', level: 'Doctorate' },
    { id: '15', name: 'Doctor of Education', code: 'EdD', level: 'Doctorate' },
    { id: '16', name: 'Doctor of Business Administration', code: 'DBA', level: 'Doctorate' },
    { id: '17', name: 'Postgraduate Certificate in Education', code: 'PGCE', level: 'Postgraduate' },
    { id: '18', name: 'Postgraduate Diploma', code: 'PGDip', level: 'Postgraduate' },
    { id: '19', name: 'Foundation Degree', code: 'FdA/FdSc', level: 'Undergraduate' },
    { id: '20', name: 'Higher National Diploma', code: 'HND', level: 'Undergraduate' }
  ];
  
  saveToFile('degree_types', degreeTypes);
  return degreeTypes;
}

/**
 * Fetch degree institutions data
 * Uses UK universities from the Complete University Guide
 */
async function fetchDegreeInstitutions() {
  console.log('Generating degree_institutions data...');
  
  try {
    // Try to fetch UK universities from an API
    console.log('Attempting to fetch UK universities from API...');
    const response = await fetch('http://universities.hipolabs.com/search?country=United+Kingdom');
    
    if (response.ok) {
      const universities = await response.json();
      
      // Format the data
      const institutions = universities.map((uni, index) => ({
        id: (index + 1).toString(),
        name: uni.name,
        code: uni.alpha_two_code + (index + 1).toString().padStart(3, '0'),
        country: 'United Kingdom',
        website: uni.web_pages[0] || null
      }));
      
      saveToFile('degree_institutions', institutions);
      return institutions;
    } else {
      throw new Error('Failed to fetch from API');
    }
  } catch (error) {
    console.log('Falling back to static university data...');
    
    // Fallback data with top UK universities
    const institutions = [
      { id: '1', name: 'University of Oxford', code: 'GB001', country: 'United Kingdom', website: 'https://www.ox.ac.uk' },
      { id: '2', name: 'University of Cambridge', code: 'GB002', country: 'United Kingdom', website: 'https://www.cam.ac.uk' },
      { id: '3', name: 'Imperial College London', code: 'GB003', country: 'United Kingdom', website: 'https://www.imperial.ac.uk' },
      { id: '4', name: "King's College London", code: 'GB004', country: 'United Kingdom', website: 'https://www.kcl.ac.uk' },
      { id: '5', name: 'London School of Economics', code: 'GB005', country: 'United Kingdom', website: 'https://www.lse.ac.uk' },
      { id: '6', name: 'University College London', code: 'GB006', country: 'United Kingdom', website: 'https://www.ucl.ac.uk' },
      { id: '7', name: 'University of Edinburgh', code: 'GB007', country: 'United Kingdom', website: 'https://www.ed.ac.uk' },
      { id: '8', name: 'University of Manchester', code: 'GB008', country: 'United Kingdom', website: 'https://www.manchester.ac.uk' },
      { id: '9', name: 'University of Bristol', code: 'GB009', country: 'United Kingdom', website: 'https://www.bristol.ac.uk' },
      { id: '10', name: 'University of Warwick', code: 'GB010', country: 'United Kingdom', website: 'https://www.warwick.ac.uk' },
      { id: '11', name: 'University of Glasgow', code: 'GB011', country: 'United Kingdom', website: 'https://www.gla.ac.uk' },
      { id: '12', name: 'University of Birmingham', code: 'GB012', country: 'United Kingdom', website: 'https://www.birmingham.ac.uk' },
      { id: '13', name: 'University of Sheffield', code: 'GB013', country: 'United Kingdom', website: 'https://www.sheffield.ac.uk' },
      { id: '14', name: 'Queen Mary University of London', code: 'GB014', country: 'United Kingdom', website: 'https://www.qmul.ac.uk' },
      { id: '15', name: 'University of Southampton', code: 'GB015', country: 'United Kingdom', website: 'https://www.southampton.ac.uk' },
      { id: '16', name: 'University of Leeds', code: 'GB016', country: 'United Kingdom', website: 'https://www.leeds.ac.uk' },
      { id: '17', name: 'University of Nottingham', code: 'GB017', country: 'United Kingdom', website: 'https://www.nottingham.ac.uk' },
      { id: '18', name: 'University of Exeter', code: 'GB018', country: 'United Kingdom', website: 'https://www.exeter.ac.uk' },
      { id: '19', name: 'University of York', code: 'GB019', country: 'United Kingdom', website: 'https://www.york.ac.uk' },
      { id: '20', name: 'Durham University', code: 'GB020', country: 'United Kingdom', website: 'https://www.durham.ac.uk' },
      { id: '21', name: 'University of Liverpool', code: 'GB021', country: 'United Kingdom', website: 'https://www.liverpool.ac.uk' },
      { id: '22', name: 'University of Leicester', code: 'GB022', country: 'United Kingdom', website: 'https://www.leicester.ac.uk' },
      { id: '23', name: 'Cardiff University', code: 'GB023', country: 'United Kingdom', website: 'https://www.cardiff.ac.uk' },
      { id: '24', name: 'University of Aberdeen', code: 'GB024', country: 'United Kingdom', website: 'https://www.abdn.ac.uk' },
      { id: '25', name: 'University of Bath', code: 'GB025', country: 'United Kingdom', website: 'https://www.bath.ac.uk' }
    ];
    
    saveToFile('degree_institutions', institutions);
    return institutions;
  }
}

/**
 * Fetch degree subjects data
 * Based on HESA JACS codes
 */
async function fetchDegreeSubjects() {
  console.log('Generating degree_subjects data...');
  
  const degreeSubjects = [
    { id: '1', name: 'Medicine & Dentistry', code: 'A', category: 'Medicine & Health' },
    { id: '2', name: 'Medicine', code: 'A1', category: 'Medicine & Health', parent_code: 'A' },
    { id: '3', name: 'Dentistry', code: 'A2', category: 'Medicine & Health', parent_code: 'A' },
    { id: '4', name: 'Subjects allied to Medicine', code: 'B', category: 'Medicine & Health' },
    { id: '5', name: 'Nursing', code: 'B7', category: 'Medicine & Health', parent_code: 'B' },
    { id: '6', name: 'Pharmacy', code: 'B2', category: 'Medicine & Health', parent_code: 'B' },
    { id: '7', name: 'Biological Sciences', code: 'C', category: 'Sciences' },
    { id: '8', name: 'Biology', code: 'C1', category: 'Sciences', parent_code: 'C' },
    { id: '9', name: 'Zoology', code: 'C3', category: 'Sciences', parent_code: 'C' },
    { id: '10', name: 'Genetics', code: 'C4', category: 'Sciences', parent_code: 'C' },
    { id: '11', name: 'Microbiology', code: 'C5', category: 'Sciences', parent_code: 'C' },
    { id: '12', name: 'Sports Science', code: 'C6', category: 'Sciences', parent_code: 'C' },
    { id: '13', name: 'Psychology', code: 'C8', category: 'Sciences', parent_code: 'C' },
    { id: '14', name: 'Veterinary Sciences', code: 'D', category: 'Sciences' },
    { id: '15', name: 'Veterinary Medicine', code: 'D1', category: 'Sciences', parent_code: 'D' },
    { id: '16', name: 'Agriculture & related subjects', code: 'D0', category: 'Sciences', parent_code: 'D' },
    { id: '17', name: 'Physical Sciences', code: 'F', category: 'Sciences' },
    { id: '18', name: 'Chemistry', code: 'F1', category: 'Sciences', parent_code: 'F' },
    { id: '19', name: 'Physics', code: 'F3', category: 'Sciences', parent_code: 'F' },
    { id: '20', name: 'Astronomy', code: 'F5', category: 'Sciences', parent_code: 'F' },
    { id: '21', name: 'Geology', code: 'F6', category: 'Sciences', parent_code: 'F' },
    { id: '22', name: 'Ocean Sciences', code: 'F7', category: 'Sciences', parent_code: 'F' },
    { id: '23', name: 'Mathematical Sciences', code: 'G', category: 'Sciences' },
    { id: '24', name: 'Mathematics', code: 'G1', category: 'Sciences', parent_code: 'G' },
    { id: '25', name: 'Operational Research', code: 'G2', category: 'Sciences', parent_code: 'G' },
    { id: '26', name: 'Statistics', code: 'G3', category: 'Sciences', parent_code: 'G' },
    { id: '27', name: 'Computer Science', code: 'I', category: 'Sciences' },
    { id: '28', name: 'Computer Science', code: 'I1', category: 'Sciences', parent_code: 'I' },
    { id: '29', name: 'Information Systems', code: 'I2', category: 'Sciences', parent_code: 'I' },
    { id: '30', name: 'Software Engineering', code: 'I3', category: 'Sciences', parent_code: 'I' },
    { id: '31', name: 'Artificial Intelligence', code: 'I4', category: 'Sciences', parent_code: 'I' },
    { id: '32', name: 'Engineering & Technology', code: 'H', category: 'Engineering' },
    { id: '33', name: 'General Engineering', code: 'H1', category: 'Engineering', parent_code: 'H' },
    { id: '34', name: 'Civil Engineering', code: 'H2', category: 'Engineering', parent_code: 'H' },
    { id: '35', name: 'Mechanical Engineering', code: 'H3', category: 'Engineering', parent_code: 'H' },
    { id: '36', name: 'Aerospace Engineering', code: 'H4', category: 'Engineering', parent_code: 'H' },
    { id: '37', name: 'Electronic & Electrical Engineering', code: 'H6', category: 'Engineering', parent_code: 'H' },
    { id: '38', name: 'Architecture, Building & Planning', code: 'K', category: 'Engineering' },
    { id: '39', name: 'Architecture', code: 'K1', category: 'Engineering', parent_code: 'K' },
    { id: '40', name: 'Building', code: 'K2', category: 'Engineering', parent_code: 'K' },
    { id: '41', name: 'Planning', code: 'K4', category: 'Engineering', parent_code: 'K' },
    { id: '42', name: 'Social Studies', code: 'L', category: 'Social Sciences' },
    { id: '43', name: 'Economics', code: 'L1', category: 'Social Sciences', parent_code: 'L' },
    { id: '44', name: 'Politics', code: 'L2', category: 'Social Sciences', parent_code: 'L' },
    { id: '45', name: 'Sociology', code: 'L3', category: 'Social Sciences', parent_code: 'L' },
    { id: '46', name: 'Social Policy', code: 'L4', category: 'Social Sciences', parent_code: 'L' },
    { id: '47', name: 'Social Work', code: 'L5', category: 'Social Sciences', parent_code: 'L' },
    { id: '48', name: 'Anthropology', code: 'L6', category: 'Social Sciences', parent_code: 'L' },
    { id: '49', name: 'Geography', code: 'L7', category: 'Social Sciences', parent_code: 'L' },
    { id: '50', name: 'Law', code: 'M', category: 'Social Sciences' }
  ];
  
  saveToFile('degree_subjects', degreeSubjects);
  return degreeSubjects;
}

/**
 * Fetch Common Aggregation Hierarchy data
 * Based on HESA CAH codes
 */
async function fetchCommonAggregationHierarchy() {
  console.log('Generating common_aggregation_hierarchy data...');
  
  const cahData = [
    { id: '1', name: 'Medicine and dentistry', code: 'CAH01', level: 1 },
    { id: '2', name: 'Medicine and dentistry', code: 'CAH01-01', level: 2, parent_code: 'CAH01' },
    { id: '3', name: 'Subjects allied to medicine', code: 'CAH02', level: 1 },
    { id: '4', name: 'Nursing', code: 'CAH02-01', level: 2, parent_code: 'CAH02' },
    { id: '5', name: 'Pharmacology, toxicology and pharmacy', code: 'CAH02-02', level: 2, parent_code: 'CAH02' },
    { id: '6', name: 'Complementary and alternative medicine', code: 'CAH02-03', level: 2, parent_code: 'CAH02' },
    { id: '7', name: 'Biological and sport sciences', code: 'CAH03', level: 1 },
    { id: '8', name: 'Biosciences', code: 'CAH03-01', level: 2, parent_code: 'CAH03' },
    { id: '9', name: 'Sport and exercise sciences', code: 'CAH03-02', level: 2, parent_code: 'CAH03' },
    { id: '10', name: 'Psychology', code: 'CAH04', level: 1 },
    { id: '11', name: 'Psychology', code: 'CAH04-01', level: 2, parent_code: 'CAH04' },
    { id: '12', name: 'Veterinary sciences', code: 'CAH05', level: 1 },
    { id: '13', name: 'Veterinary sciences', code: 'CAH05-01', level: 2, parent_code: 'CAH05' },
    { id: '14', name: 'Agriculture, food and related studies', code: 'CAH06', level: 1 },
    { id: '15', name: 'Agriculture, food and related studies', code: 'CAH06-01', level: 2, parent_code: 'CAH06' },
    { id: '16', name: 'Physical sciences', code: 'CAH07', level: 1 },
    { id: '17', name: 'Chemistry', code: 'CAH07-01', level: 2, parent_code: 'CAH07' },
    { id: '18', name: 'Physics and astronomy', code: 'CAH07-02', level: 2, parent_code: 'CAH07' },
    { id: '19', name: 'Physical, material and forensic sciences', code: 'CAH07-03', level: 2, parent_code: 'CAH07' },
    { id: '20', name: 'General and others in sciences', code: 'CAH07-04', level: 2, parent_code: 'CAH07' }
  ];
  
  saveToFile('common_aggregation_hierarchy', cahData);
  return cahData;
}

/**
 * Fetch degrees data
 * Combines degree types, subjects, and institutions
 */
async function fetchDegrees() {
  console.log('Generating degrees data...');
  
  // This would typically be a more complex dataset
  // Here we're creating a simplified version
  const degrees = [
    { id: '1', name: 'BA English Literature', type_id: '1', subject_id: '2', institution_id: '1' },
    { id: '2', name: 'BSc Mathematics', type_id: '2', subject_id: '24', institution_id: '2' },
    { id: '3', name: 'BSc Computer Science', type_id: '2', subject_id: '28', institution_id: '3' },
    { id: '4', name: 'BEng Mechanical Engineering', type_id: '3', subject_id: '35', institution_id: '4' },
    { id: '5', name: 'LLB Law', type_id: '4', subject_id: '50', institution_id: '5' },
    { id: '6', name: 'MBBS Medicine', type_id: '5', subject_id: '2', institution_id: '1' },
    { id: '7', name: 'BEd Education', type_id: '6', subject_id: '47', institution_id: '7' },
    { id: '8', name: 'MA English Literature', type_id: '7', subject_id: '2', institution_id: '1' },
    { id: '9', name: 'MSc Computer Science', type_id: '8', subject_id: '28', institution_id: '3' },
    { id: '10', name: 'MBA Business Administration', type_id: '9', subject_id: '43', institution_id: '5' }
  ];
  
  saveToFile('degrees', degrees);
  return degrees;
}

/**
 * Run all academic data fetching functions
 */
async function fetchAllAcademicData() {
  try {
    await fetchDegreeGrades();
    await fetchDegreeTypes();
    await fetchDegreeInstitutions();
    await fetchDegreeSubjects();
    await fetchCommonAggregationHierarchy();
    await fetchDegrees();
    
    console.log('All academic reference data generated successfully!');
  } catch (error) {
    console.error('Error generating academic reference data:', error);
  }
}

// Run the script
fetchAllAcademicData();
