// Release Notes API routes for Vercel serverless functions
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Get all release notes
router.get('/', (req, res) => {
  try {
    const releaseNotesPath = path.join(process.cwd(), 'data', 'release-notes.json');
    const releaseNotes = JSON.parse(fs.readFileSync(releaseNotesPath, 'utf8'));
    
    // Apply any filters from query parameters
    let filteredNotes = [...releaseNotes];
    
    if (req.query.academicYear) {
      filteredNotes = filteredNotes.filter(note => 
        note.academicYear === req.query.academicYear
      );
    }
    
    // Sort by academic year in descending order (newest first)
    filteredNotes.sort((a, b) => {
      const yearA = parseInt(a.academicYear.split('/')[0]);
      const yearB = parseInt(b.academicYear.split('/')[0]);
      return yearB - yearA;
    });
    
    res.json(filteredNotes);
  } catch (error) {
    console.error('Error fetching release notes:', error);
    res.status(500).json({ error: 'Failed to fetch release notes' });
  }
});

// Get release notes for a specific academic year
router.get('/:academicYear', (req, res) => {
  try {
    const releaseNotesPath = path.join(process.cwd(), 'data', 'release-notes.json');
    const releaseNotes = JSON.parse(fs.readFileSync(releaseNotesPath, 'utf8'));
    
    const yearNotes = releaseNotes.filter(note => 
      note.academicYear === req.params.academicYear
    );
    
    if (yearNotes.length === 0) {
      return res.status(404).json({ error: 'Release notes not found for specified academic year' });
    }
    
    res.json(yearNotes);
  } catch (error) {
    console.error('Error fetching release notes for year:', error);
    res.status(500).json({ error: 'Failed to fetch release notes' });
  }
});

module.exports = router;
