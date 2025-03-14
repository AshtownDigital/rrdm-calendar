// Dashboard API routes for Vercel serverless functions
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Get dashboard data
router.get('/', (req, res) => {
  try {
    const itemsPath = path.join(process.cwd(), 'data', 'items.json');
    const items = JSON.parse(fs.readFileSync(itemsPath, 'utf8'));
    
    // Process items for dashboard view
    const processedItems = items.map(item => ({
      id: item.id,
      name: item.name,
      status: item.status,
      changeType: item.changeType || 'No Change',
      academicYear: item.academicYear,
      lastUpdated: item.lastUpdated
    }));
    
    res.json(processedItems);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

module.exports = router;
