// Items API routes for Vercel serverless functions
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Get all items
router.get('/', (req, res) => {
  try {
    const itemsPath = path.join(process.cwd(), 'data', 'items.json');
    const items = JSON.parse(fs.readFileSync(itemsPath, 'utf8'));
    
    // Apply any filters from query parameters
    let filteredItems = [...items];
    
    if (req.query.academicYear) {
      filteredItems = filteredItems.filter(item => 
        item.academicYear === req.query.academicYear
      );
    }
    
    // Sort items alphabetically by name as per the directory-style approach
    filteredItems.sort((a, b) => a.name.localeCompare(b.name));
    
    res.json(filteredItems);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// Get item by ID
router.get('/:id', (req, res) => {
  try {
    const itemsPath = path.join(process.cwd(), 'data', 'items.json');
    const items = JSON.parse(fs.readFileSync(itemsPath, 'utf8'));
    
    const item = items.find(item => item.id === req.params.id);
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    res.json(item);
  } catch (error) {
    console.error('Error fetching item:', error);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

module.exports = router;
