/**
 * Generate JSON files from DFE Reference Data
 * 
 * This script fetches reference data from the DFE Reference Data GitHub repository
 * and generates JSON files in the data directory.
 */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { LISTS } = require('../lib/data-lists');

// Base URL for raw GitHub content
const BASE_URL = 'https://raw.githubusercontent.com/DFE-Digital/dfe-reference-data/main/data';

// Directory to save the JSON files
const DATA_DIR = path.join(__dirname, '../data');

/**
 * Fetch a reference list from GitHub
 * 
 * @param {string} listId - The ID of the reference list to fetch
 * @returns {Promise<Object>} - The reference list data
 */
async function fetchReferenceList(listId) {
  try {
    console.log(`Fetching reference list: ${listId}`);
    
    // Fetch the data
    const response = await fetch(`${BASE_URL}/${listId}.json`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch reference list '${listId}' from GitHub: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching reference list '${listId}' from GitHub:`, error);
    return null;
  }
}

/**
 * Save a reference list to a JSON file
 * 
 * @param {string} listId - The ID of the reference list
 * @param {Object} data - The reference list data
 */
function saveReferenceList(listId, data) {
  try {
    // Ensure the data directory exists
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    // Save the data to a JSON file
    const filePath = path.join(DATA_DIR, `${listId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    
    console.log(`Saved reference list to: ${filePath}`);
  } catch (error) {
    console.error(`Error saving reference list '${listId}':`, error);
  }
}

/**
 * Generate all reference lists
 */
async function generateAllReferenceLists() {
  try {
    console.log('Generating reference lists...');
    
    // Get all list IDs
    const listIds = Object.values(LISTS);
    
    // Fetch and save each reference list
    for (const listId of listIds) {
      const data = await fetchReferenceList(listId);
      
      if (data) {
        saveReferenceList(listId, data);
      }
    }
    
    console.log('Done generating reference lists.');
  } catch (error) {
    console.error('Error generating reference lists:', error);
  }
}

// Generate all reference lists
generateAllReferenceLists();
