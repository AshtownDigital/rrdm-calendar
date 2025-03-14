const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const { format } = require('date-fns');

// Get timeline data from JSON file
const getTimelineData = async () => {
  try {
    const timelineFile = path.join(__dirname, '../../data/timeline.json');
    const timelineData = JSON.parse(await fs.readFile(timelineFile, 'utf8'));
    return timelineData;
  } catch (err) {
    console.error('Error reading timeline data:', err);
    return { timeline: [] };
  }
};

// Get detailed release summary data from JSON file
const getReleaseSummaryData = async () => {
  try {
    const summaryFile = path.join(__dirname, '../../data/release-summary.json');
    const summaryData = JSON.parse(await fs.readFile(summaryFile, 'utf8'));
    return summaryData;
  } catch (err) {
    console.error('Error reading release summary data:', err);
    return {};
  }
};

// Get release data from JSON files
const getReleaseData = async () => {
  const releaseNotesDir = path.join(__dirname, '../../data/release-notes');
  const alternateDir = path.join(__dirname, '../../data/release_notes');
  let files = [];
  let baseDir = releaseNotesDir;
  
  // Try both directory paths
  try {
    files = await fs.readdir(releaseNotesDir);
  } catch (err) {
    try {
      files = await fs.readdir(alternateDir);
      baseDir = alternateDir;
    } catch (innerErr) {
      console.error('Error reading release notes directories:', err);
      return { academicYears: [], releases: {} };
    }
  }
  
  // Get all academic years from filenames
  const academicYears = files
    .filter(file => file.match(/^\d{4}[-_]\d{4}\.json$/))
    .map(file => file.replace(/[-_]/, '/').replace('.json', ''))
    .sort((a, b) => b.localeCompare(a)); // Sort descending

  // Read all release data
  const releases = {};
  for (const file of files) {
    if (file.match(/^\d{4}[-_]\d{4}\.json$/)) {
      const academicYear = file.replace(/[-_]/, '/').replace('.json', '');
      const filePath = path.join(baseDir, file);
      try {
        const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
        
        // Normalize the data structure
        const changes = data.changes || {};
        changes.new = changes.new || {};
        
        // Handle both data structures
        const newItems = changes.new.items || [];
        const normalizedItems = newItems.map(item => ({
          name: item.name,
          type: item.type || item.changeType || 'Unknown',
          category: item.category || item.status || 'Unknown',
          values: Array.isArray(item.values) ? item.values : []
        }));

        releases[academicYear] = {
          ...data,
          changes: {
            new: {
              items: normalizedItems,
              values: changes.new.values || []
            },
            updated: changes.updated || [],
            removed: changes.removed || [],
            noChange: changes.noChange || []
          }
        };
      } catch (err) {
        console.error(`Error processing file ${file}:`, err);
        releases[academicYear] = {
          changes: {
            new: { items: [], values: [] },
            updated: [],
            removed: [],
            noChange: []
          }
        };
      }
    }
  }

  return { academicYears, releases };
};

// Helper to validate academic year
const isValidYear = (year, validYears) => {
  return year && validYears.includes(year);
};

// Release Notes landing page and all views
router.get('/', async (req, res) => {
  try {
    const data = await getReleaseData();
    // If no year selected, redirect to latest year with summary view
    if (!req.query.year) {
      return res.redirect(`/release-notes?year=${data.academicYears[0]}&view=summary`);
    }

    // Validate view type and year
    const validViews = ['summary', 'timeline', 'list'];
    const view = validViews.includes(req.query.view) ? req.query.view : 'summary';
    const selectedYear = isValidYear(req.query.year, data.academicYears) ? req.query.year : data.academicYears[0];

    // Get timeline data if needed
    let timelineData = {};
    if (view === 'timeline') {
      timelineData = await getTimelineData();
    }
    
    // Get detailed release summary data if needed
    let releaseSummaryData = {};
    if (view === 'summary') {
      releaseSummaryData = await getReleaseSummaryData();
    }

    // Common template data
    const templateData = {
      view,
      selectedYear,
      academicYears: data.academicYears,
      releaseNotes: data.releases[selectedYear],
      releases: data.releases,
      serviceName: 'Reference Data Management',
      currentDate: format(new Date(), 'yyyy-MM-dd'),
      // Add items data for list view
      items: data.releases[selectedYear]?.changes?.new?.items || [],
      // Add timeline data
      timeline: timelineData,
      // Add detailed release summary data if available
      detailedReleaseNotes: releaseSummaryData[selectedYear] || data.releases[selectedYear]
    };

    // Map view type to template name
    const templateMap = {
      'list': 'list.njk',
      'summary': 'summary.njk',
      'timeline': 'timeline.njk'
    };

    // Render the appropriate view template
    res.render(`modules/release-notes/${templateMap[view]}`, templateData);
  } catch (error) {
    console.error('Error loading release notes:', error);
    res.status(500).render('error', {
      message: 'Error loading release notes',
      error: { status: 500, stack: error.stack },
      serviceName: 'Reference Data Management'
    });
  }
});

module.exports = router;

