/**
 * Data Lists
 * 
 * This module defines the available reference data lists and their metadata.
 * It provides constants for accessing the lists in a type-safe manner.
 */

/**
 * Available reference data lists
 * Based on the lists available in the DFE Reference Data repository
 */
const REFERENCE_LISTS = {
  // Common Aggregation Hierarchy
  CAH: 'common_aggregation_hierarchy',
  
  // Countries and Territories
  COUNTRIES: 'countries_and_territories',
  
  // Degrees
  DEGREES: 'degrees',
  DEGREE_TYPES: 'degree_types',
  DEGREE_GRADES: 'degree_grades',
  DEGREE_INSTITUTIONS: 'degree_institutions',
  DEGREE_SUBJECTS: 'degree_subjects',
  
  // Equality and Diversity
  DISABILITIES: 'disabilities',
  ETHNICITIES: 'ethnicities',
  GENDERS: 'genders',
  SEXUAL_ORIENTATIONS: 'sexual_orientations',
  
  // Initial Teacher Training
  ITT_PROVIDERS: 'itt_providers',
  ITT_SUBJECTS: 'itt_subjects',
  
  // Qualifications
  QUALIFICATIONS: 'qualifications',
  QUALIFICATION_TYPES: 'qualification_types',
  QUALIFICATION_GRADES: 'qualification_grades'
};

/**
 * Metadata for each reference list
 */
const LIST_METADATA = {
  [REFERENCE_LISTS.CAH]: {
    name: 'Common Aggregation Hierarchy',
    description: 'Hierarchical classification of academic subjects',
    category: 'Academic'
  },
  [REFERENCE_LISTS.COUNTRIES]: {
    name: 'Countries and Territories',
    description: 'List of countries and territories with ISO codes',
    category: 'Geographic'
  },
  [REFERENCE_LISTS.DEGREES]: {
    name: 'Degrees',
    description: 'Types of academic degrees',
    category: 'Academic'
  },
  [REFERENCE_LISTS.DEGREE_TYPES]: {
    name: 'Degree Types',
    description: 'Types of academic degrees',
    category: 'Academic'
  },
  [REFERENCE_LISTS.DEGREE_GRADES]: {
    name: 'Degree Grades',
    description: 'Classification of degree results',
    category: 'Academic'
  },
  [REFERENCE_LISTS.DEGREE_INSTITUTIONS]: {
    name: 'Degree Institutions',
    description: 'Higher education institutions',
    category: 'Academic'
  },
  [REFERENCE_LISTS.DEGREE_SUBJECTS]: {
    name: 'Degree Subjects',
    description: 'Academic subjects for degrees',
    category: 'Academic'
  },
  [REFERENCE_LISTS.DISABILITIES]: {
    name: 'Disabilities',
    description: 'Disability classifications',
    category: 'Equality and Diversity'
  },
  [REFERENCE_LISTS.ETHNICITIES]: {
    name: 'Ethnicities',
    description: 'Ethnicity classifications',
    category: 'Equality and Diversity'
  },
  [REFERENCE_LISTS.GENDERS]: {
    name: 'Genders',
    description: 'Gender classifications',
    category: 'Equality and Diversity'
  },
  [REFERENCE_LISTS.SEXUAL_ORIENTATIONS]: {
    name: 'Sexual Orientations',
    description: 'Sexual orientation classifications',
    category: 'Equality and Diversity'
  },
  [REFERENCE_LISTS.ITT_PROVIDERS]: {
    name: 'ITT Providers',
    description: 'Initial Teacher Training providers',
    category: 'Education'
  },
  [REFERENCE_LISTS.ITT_SUBJECTS]: {
    name: 'ITT Subjects',
    description: 'Initial Teacher Training subjects',
    category: 'Education'
  },
  [REFERENCE_LISTS.QUALIFICATIONS]: {
    name: 'Qualifications',
    description: 'Educational qualifications',
    category: 'Education'
  },
  [REFERENCE_LISTS.QUALIFICATION_TYPES]: {
    name: 'Qualification Types',
    description: 'Types of educational qualifications',
    category: 'Education'
  },
  [REFERENCE_LISTS.QUALIFICATION_GRADES]: {
    name: 'Qualification Grades',
    description: 'Grades for educational qualifications',
    category: 'Education'
  }
};

/**
 * Get metadata for a reference list
 * 
 * @param {string} listId - The ID of the reference list
 * @returns {Object} - The metadata for the reference list
 */
function getListMetadata(listId) {
  return LIST_METADATA[listId] || { 
    name: listId,
    description: 'No description available',
    category: 'Uncategorized'
  };
}

/**
 * Get all reference lists grouped by category
 * 
 * @returns {Object} - Reference lists grouped by category
 */
function getListsByCategory() {
  const categories = {};
  
  Object.keys(REFERENCE_LISTS).forEach(key => {
    const listId = REFERENCE_LISTS[key];
    const metadata = getListMetadata(listId);
    
    if (!categories[metadata.category]) {
      categories[metadata.category] = [];
    }
    
    categories[metadata.category].push({
      id: listId,
      ...metadata
    });
  });
  
  return categories;
}

module.exports = {
  LISTS: REFERENCE_LISTS,
  getListMetadata,
  getListsByCategory
};
