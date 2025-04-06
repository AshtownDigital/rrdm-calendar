// Values API routes for Vercel serverless functions
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Get all values
router.get('/', (req, res) => {
  try {
    const valuesPath = path.join(process.cwd(), 'data', 'values.json');
    const values = JSON.parse(fs.readFileSync(valuesPath, 'utf8'));
    
    // Apply any filters from query parameters
    let filteredValues = [...values];
    
    if (req.query.itemId) {
      filteredValues = filteredValues.filter(value => 
        value.itemId === req.query.itemId
      );
    }
    
    if (req.query.academicYear) {
      filteredValues = filteredValues.filter(value => 
        value.academicYear === req.query.academicYear
      );
    }
    
    res.json(filteredValues);
  } catch (error) {
    console.error('Error fetching values:', error);
    res.status(500).json({ error: 'Failed to fetch values' });
  }
});

// Get values for a specific item
router.get('/item/:itemId', (req, res) => {
  try {
    const valuesPath = path.join(process.cwd(), 'data', 'values.json');
    const values = JSON.parse(fs.readFileSync(valuesPath, 'utf8'));
    
    const itemValues = values.filter(value => value.itemId === req.params.itemId);
    
    res.json(itemValues);
  } catch (error) {
    console.error('Error fetching item values:', error);
    res.status(500).json({ error: 'Failed to fetch item values' });
  }
});

module.exports = router;
