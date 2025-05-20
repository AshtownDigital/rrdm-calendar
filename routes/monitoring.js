const express = require('express');
const router = express.Router();
const { getAllMetrics } = require('../services/monitoring/performanceMonitor');

router.get('/performance', async (req, res) => {
  try {
    const metrics = await getAllMetrics();
    res.render('modules/monitoring/performance', { 
      title: 'Performance & Monitoring', 
      metrics 
    });
  } catch (error) {
    console.error('Error getting metrics:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while retrieving monitoring metrics',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

module.exports = router;