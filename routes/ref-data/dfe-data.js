/**
 * DFE Reference Data Routes
 * 
 * This file demonstrates how to integrate the DFE Reference Data module
 * with the RRDM application.
 */

const express = require('express');
const router = express.Router();
const dfeReferenceData = require('../../modules/dfe-reference-data');

// Display the DFE Reference Data dashboard
router.get('/', async (req, res) => {
  try {
    // Get all reference lists grouped by category
    const listsByCategory = dfeReferenceData.lists.getListsByCategory();
    
    res.render('modules/ref-data/dfe-data/index', {
      title: 'DFE Reference Data',
      listsByCategory
    });
  } catch (error) {
    console.error('Error retrieving reference lists:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to retrieve reference lists'
    });
  }
});

// Display a specific reference list
router.get('/list/:listId', async (req, res) => {
  try {
    const { listId } = req.params;
    
    // Get the reference list
    const list = await dfeReferenceData.getReferenceList(listId);
    
    // Get metadata for the list
    const metadata = dfeReferenceData.lists.getListMetadata(listId);
    
    res.render('modules/ref-data/dfe-data/list', {
      title: metadata.name,
      description: metadata.description,
      category: metadata.category,
      listId,
      list
    });
  } catch (error) {
    console.error(`Error retrieving reference list '${req.params.listId}':`, error);
    res.status(500).render('error', {
      title: 'Error',
      message: `Failed to retrieve reference list '${req.params.listId}'`
    });
  }
});

// Display a specific item from a reference list
router.get('/list/:listId/item/:itemId', async (req, res) => {
  try {
    const { listId, itemId } = req.params;
    
    // Get the item
    const item = await dfeReferenceData.getItemById(listId, itemId);
    
    // Get metadata for the list
    const metadata = dfeReferenceData.lists.getListMetadata(listId);
    
    res.render('modules/ref-data/dfe-data/item', {
      title: `${item.name || item.text || itemId}`,
      listName: metadata.name,
      listId,
      item
    });
  } catch (error) {
    console.error(`Error retrieving item '${req.params.itemId}' from reference list '${req.params.listId}':`, error);
    res.status(500).render('error', {
      title: 'Error',
      message: `Failed to retrieve item '${req.params.itemId}' from reference list '${req.params.listId}'`
    });
  }
});

// Search a reference list
router.get('/list/:listId/search', async (req, res) => {
  try {
    const { listId } = req.params;
    const { q } = req.query;
    
    // Get the reference list
    const list = await dfeReferenceData.getReferenceList(listId);
    
    // Search the list
    const results = dfeReferenceData.utils.search(list, q);
    
    // Get metadata for the list
    const metadata = dfeReferenceData.lists.getListMetadata(listId);
    
    res.render('modules/ref-data/dfe-data/search', {
      title: `Search ${metadata.name}`,
      listId,
      listName: metadata.name,
      searchTerm: q,
      results
    });
  } catch (error) {
    console.error(`Error searching reference list '${req.params.listId}':`, error);
    res.status(500).render('error', {
      title: 'Error',
      message: `Failed to search reference list '${req.params.listId}'`
    });
  }
});

// API endpoint to get a reference list
router.get('/api/list/:listId', async (req, res) => {
  try {
    const { listId } = req.params;
    
    // Get the reference list
    const list = await dfeReferenceData.getReferenceList(listId);
    
    res.json(list);
  } catch (error) {
    console.error(`Error retrieving reference list '${req.params.listId}':`, error);
    res.status(500).json({
      error: `Failed to retrieve reference list '${req.params.listId}'`
    });
  }
});

// API endpoint to get a specific item from a reference list
router.get('/api/list/:listId/item/:itemId', async (req, res) => {
  try {
    const { listId, itemId } = req.params;
    
    // Get the item
    const item = await dfeReferenceData.getItemById(listId, itemId);
    
    res.json(item);
  } catch (error) {
    console.error(`Error retrieving item '${req.params.itemId}' from reference list '${req.params.listId}':`, error);
    res.status(500).json({
      error: `Failed to retrieve item '${req.params.itemId}' from reference list '${req.params.listId}'`
    });
  }
});

module.exports = router;
