const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

// Add body parser middleware
router.use(express.json());

// Get list of restore points
async function getRestorePoints() {
  const restorePointsDir = path.join(__dirname, '../data/restore-points');
  if (!fsSync.existsSync(restorePointsDir)) {
    await fs.mkdir(restorePointsDir, { recursive: true });
    return [];
  }

  const files = await fs.readdir(restorePointsDir);
  const restorePoints = await Promise.all(
    files
      .filter(file => file.endsWith('.json'))
      .map(async file => {
        const filePath = path.join(restorePointsDir, file);
        const metadata = JSON.parse(await fs.readFile(filePath, 'utf8'));
        return {
          id: path.basename(file, '.json'),
          timestamp: metadata.timestamp,
          description: metadata.description,
          academicYear: metadata.academicYear,
          type: metadata.type,
          user: metadata.user
        };
      })
  );

  return restorePoints.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

// Create a restore point
async function createRestorePoint(description, academicYear, type, user) {
  const timestamp = new Date().toISOString();
  const id = `restore-${timestamp.replace(/[:.]/g, '-')}`;
  const metadata = {
    timestamp,
    description,
    academicYear,
    type,
    user
  };

  // Save metadata
  const restorePointPath = path.join(__dirname, '../data/restore-points', `${id}.json`);
  await fs.writeFile(restorePointPath, JSON.stringify(metadata, null, 2));

  // Create backup of data files
  const dataDir = path.join(__dirname, '../data');
  const backupDir = path.join(restorePointPath, '.backup');
  await fs.mkdir(backupDir, { recursive: true });

  // Copy relevant data files
  for (const item of ['items.json', 'values.json', 'release-notes']) {
    const sourcePath = path.join(dataDir, item);
    const targetPath = path.join(backupDir, item);
    
    if (fsSync.existsSync(sourcePath)) {
      if (fsSync.lstatSync(sourcePath).isDirectory()) {
        await fs.cp(sourcePath, targetPath, { recursive: true });
      } else {
        await fs.copyFile(sourcePath, targetPath);
      }
    }
  }

  return { id, ...metadata };
}

// Restore from a restore point
async function restoreFromPoint(id) {
  const restorePointPath = path.join(__dirname, '../data/restore-points', `${id}.json`);
  if (!fsSync.existsSync(restorePointPath)) {
    throw new Error('Restore point not found');
  }

  const backupDir = path.join(restorePointPath, '.backup');
  const dataDir = path.join(__dirname, '../data');

  // Restore files from backup
  for (const item of ['items.json', 'values.json', 'release-notes']) {
    const sourcePath = path.join(backupDir, item);
    const targetPath = path.join(dataDir, item);
    
    if (fsSync.existsSync(sourcePath)) {
      if (fsSync.lstatSync(sourcePath).isDirectory()) {
        await fs.rm(targetPath, { recursive: true, force: true });
        await fs.cp(sourcePath, targetPath, { recursive: true });
      } else {
        await fs.copyFile(sourcePath, targetPath);
      }
    }
  }

  return true;
}

// Get academic years for dropdown
async function getAcademicYears() {
  const releaseNotesDir = path.join(__dirname, '../data/release-notes');
  try {
    const files = await fs.readdir(releaseNotesDir);
    return files
      .filter(file => file.endsWith('.json'))
      .map(file => file.replace('.json', ''))
      .map(year => year.replace('-', '/'))
      .sort((a, b) => b.localeCompare(a));
  } catch (err) {
    return [];
  }
}

// Routes
router.get('/', async (req, res) => {
  try {
    const [restorePoints, academicYears] = await Promise.all([
      getRestorePoints(),
      getAcademicYears()
    ]);

    res.render('modules/restore-points/restore-points', {
      title: 'Restore Points',
      restorePoints,
      academicYears
    });
  } catch (error) {
    console.error('Error loading restore points:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load restore points'
    });
  }
});

router.post('/create', async (req, res) => {
  const { description, academicYear, type } = req.body;
  const user = 'system'; // Replace with actual user when auth is implemented

  try {
    const restorePoint = await createRestorePoint(description, academicYear, type, user);
    res.json(restorePoint);
  } catch (error) {
    console.error('Error creating restore point:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/restore/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await restoreFromPoint(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error restoring from point:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
