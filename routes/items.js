const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

// Get list of academic years from release notes directory
async function getAcademicYears() {
  const releaseNotesDir = path.join(__dirname, '../data/release-notes');
  try {
    const files = await fs.readdir(releaseNotesDir);
    return files
      .filter(file => file.endsWith('.json'))
      .map(file => file.replace('.json', ''))
      .map(year => year.replace('-', '/'))
      .sort((a, b) => b.localeCompare(a)); // Sort in descending order
  } catch (err) {
    return [];
  }
}

// Get reference data items for a specific academic year
async function getReferenceDataItems(academicYear) {
  try {
    const releaseNotesPath = path.join(
      __dirname,
      '../data/release-notes',
      `${academicYear.replace('/', '-')}.json`
    );

    const releaseNotes = JSON.parse(
      await fs.readFile(releaseNotesPath, 'utf8')
    );

    // Combine all items from the release notes
    const items = [
      ...releaseNotes.changes.new.items.map(item => ({
        ...item,
        changeType: 'New'
      })),
      ...releaseNotes.changes.updated.map(item => ({
        ...item,
        changeType: 'Updated'
      })),
      ...releaseNotes.changes.noChange.map(item => ({
        ...item,
        changeType: 'No Change'
      }))
    ];

    // Add status and description if missing
    return items.map(item => ({
      ...item,
      status: item.status || 'Active',
      description: item.description || (
        item.values && item.values.length > 0
          ? `Contains ${item.values.length} reference values for ${item.name.toLowerCase()}`
          : `Reference data for ${item.name.toLowerCase()}`
      )
    }));
  } catch (err) {
    console.error(`Error getting reference data items for ${academicYear}:`, err);
    return [];
  }
}

// Get all reference data items across academic years
async function getAllReferenceDataItems() {
  try {
    const releaseNotesDir = path.join(__dirname, '../data/release-notes');
    const files = await fs.readdir(releaseNotesDir);
    const items = new Map(); // Use Map to deduplicate by HESA code

    // Process each academic year's release notes
    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const academicYear = file.replace('.json', '').replace('-', '/');
      const releaseNotesPath = path.join(releaseNotesDir, file);
      const releaseNotes = JSON.parse(
        await fs.readFile(releaseNotesPath, 'utf8')
      );

      // Add items from each category
      const yearItems = [
        ...releaseNotes.changes.new.items,
        ...releaseNotes.changes.updated,
        ...releaseNotes.changes.noChange
      ];

      // Update items map with latest version of each item
      for (const item of yearItems) {
        // Determine change type based on which array the item came from
        let changeType = 'No Change';
        if (releaseNotes.changes.new.items.some(i => i.hesaCode === item.hesaCode)) {
          changeType = 'New';
        } else if (releaseNotes.changes.updated.some(i => i.hesaCode === item.hesaCode)) {
          changeType = 'Updated';
        }

        // Generate a description if none exists
        let description = item.description;
        if (!description) {
          if (item.values && item.values.length > 0) {
            description = `Contains ${item.values.length} reference values for ${item.name.toLowerCase()}`;
          } else {
            description = `Reference data for ${item.name.toLowerCase()}`;
          }
        }

        items.set(item.hesaCode, {
          ...item,
          latestYear: academicYear,
          changeType: changeType,
          status: item.status || 'Active', // Default to Active if not specified
          description: description
        });
      }
    }

    // Convert Map to array and sort by name
    return Array.from(items.values())
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (err) {
    console.error('Error getting all reference data items:', err);
    return [];
  }
}

// Route for listing all items
router.get('/', async (req, res) => {
  try {
    const items = await getAllReferenceDataItems();
    res.render('items/index', {
      title: 'Reference Data Item Directory',
      items
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load reference data items'
    });
  }
});

// Route for specific item
router.get('/:hesaCode', async (req, res) => {
  try {
    const academicYears = await getAcademicYears();
    const selectedYear = req.query.year ? 
      req.query.year.replace('-', '/') : 
      academicYears[0];

    // Validate year format
    if (!/^\d{4}\/\d{4}$/.test(selectedYear)) {
      return res.status(400).render('error', {
        title: 'Invalid Academic Year Format',
        message: 'Academic years must be in the format YYYY/YYYY (e.g., 2025/2026)'
      });
    }

    // Check if year exists
    if (!academicYears.includes(selectedYear)) {
      return res.status(404).render('error', {
        title: 'Academic Year Not Found',
        message: `No reference data found for academic year ${selectedYear}`
      });
    }

    const items = await getReferenceDataItems(selectedYear);
    const item = items.find(i => i.hesaCode === req.params.hesaCode);

    if (!item) {
      return res.status(404).render('error', {
        title: 'Reference Data Item Not Found',
        message: `No reference data item found with HESA code: ${req.params.hesaCode}`
      });
    }

    // Format names for CSV and API
    const formatName = (name) => {
      return name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '') // Remove special characters
        .replace(/\s+/g, '') // Remove spaces
        .replace(/^[0-9]/, 'n$&'); // Prefix with 'n' if starts with number
    };

    res.render('items/detail', {
      title: `${item.name} - ${selectedYear}`,
      item: {
        ...item,
        csvName: formatName(item.name),
        apiName: formatName(item.name)
      },
      selectedYear,
      academicYears
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load reference data item'
    });
  }
});

module.exports = router;
