/**
 * Core reference data functionality
 * 
 * This module provides the main functionality for accessing DFE Reference Data lists.
 * It implements a similar interface to the original DFE Reference Data gem but adapted
 * for JavaScript and the RRDM application.
 */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// Cache for reference data lists
const referenceDataCache = new Map();

/**
 * Get a reference list by its ID
 * 
 * @param {string} listId - The ID of the reference list to retrieve
 * @param {Object} options - Options for retrieving the list
 * @returns {Promise<Object>} - The reference list data
 */
async function getReferenceList(listId, options = {}) {
  // Set default options
  const defaultOptions = {
    allowRemoteFetch: true,  // Enable remote fetching by default
    saveToLocal: true        // Save fetched data to local files by default
  };
  
  // Merge with provided options
  options = { ...defaultOptions, ...options };
  
  // Check if we have the list in cache
  if (referenceDataCache.has(listId) && !options.forceRefresh) {
    return referenceDataCache.get(listId);
  }

  try {
    // First try to load from local data directory
    const localDataPath = path.join(__dirname, '../data', `${listId}.json`);
    
    if (fs.existsSync(localDataPath)) {
      const data = JSON.parse(fs.readFileSync(localDataPath, 'utf8'));
      referenceDataCache.set(listId, data);
      return data;
    }
    
    // If not available locally and remote fetching is enabled, try to fetch from GitHub
    if (options.allowRemoteFetch) {
      console.log(`Fetching reference list '${listId}' from GitHub...`);
      const data = await fetchFromGitHub(listId);
      
      // Save to cache
      referenceDataCache.set(listId, data);
      
      // Optionally save to local file
      if (options.saveToLocal) {
        const dirPath = path.join(__dirname, '../data');
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }
        fs.writeFileSync(localDataPath, JSON.stringify(data, null, 2));
        console.log(`Saved reference list '${listId}' to local file.`);
      }
      
      return data;
    }
    
    throw new Error(`Reference list '${listId}' not found`);
  } catch (error) {
    console.error(`Error retrieving reference list '${listId}':`, error);
    throw error;
  }
}

/**
 * Get all available reference lists
 * 
 * @param {Object} options - Options for retrieving the lists
 * @returns {Promise<Object>} - Object containing all reference lists
 */
async function getAllReferenceLists(options = {}) {
  try {
    const dataDir = path.join(__dirname, '../data');
    
    // Ensure the data directory exists
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Get all JSON files in the data directory
    const files = fs.readdirSync(dataDir)
      .filter(file => file.endsWith('.json'))
      .map(file => file.replace('.json', ''));
    
    // Load all reference lists
    const lists = {};
    for (const listId of files) {
      lists[listId] = await getReferenceList(listId, options);
    }
    
    return lists;
  } catch (error) {
    console.error('Error retrieving all reference lists:', error);
    throw error;
  }
}

/**
 * Fetch reference data from GitHub
 * 
 * @param {string} listId - The ID of the reference list to fetch
 * @returns {Promise<Object>} - The reference list data
 */
async function fetchFromGitHub(listId) {
  try {
    // Base URL for raw GitHub content
    const baseUrl = 'https://raw.githubusercontent.com/DFE-Digital/dfe-reference-data/main/data';
    
    // Fetch the data
    const response = await fetch(`${baseUrl}/${listId}.json`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch reference list '${listId}' from GitHub: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching reference list '${listId}' from GitHub:`, error);
    throw error;
  }
}

module.exports = {
  getReferenceList,
  getAllReferenceLists
};
