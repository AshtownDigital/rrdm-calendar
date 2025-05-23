const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// Helper function to read JSON data files
function readJsonFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return null;
  }
}

// Helper function to write JSON data files
function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error);
    return false;
  }
}

// Main funding page
router.get('/', (req, res) => {
  res.render('modules/funding/index', {
    title: 'Funding Management'
  });
});

// Funding requirements page
router.get('/requirements', (req, res) => {
  const requirementsPath = path.join(__dirname, '../../data/funding/requirements.json');
  const requirementsData = readJsonFile(requirementsPath) || { trainingRoutes: [] };
  
  res.render('modules/funding/requirements', {
    title: 'Funding Requirements',
    academicYear: requirementsData.academicYear,
    lastUpdated: requirementsData.lastUpdated,
    trainingRoutes: requirementsData.trainingRoutes
  });
});

// Funding requirement detail page
router.get('/requirements/:id', (req, res) => {
  const requirementsPath = path.join(__dirname, '../../data/funding/requirements.json');
  const requirementsData = readJsonFile(requirementsPath) || { trainingRoutes: [] };
  
  const subjectsPath = path.join(__dirname, '../../data/funding/subjects.json');
  const subjectsData = readJsonFile(subjectsPath) || { subjects: [] };
  
  const routeId = parseInt(req.params.id, 10);
  const route = requirementsData.trainingRoutes.find(r => r.id === routeId);
  
  if (!route) {
    return res.status(404).render('error', {
      title: 'Not Found',
      message: 'The requested funding requirement could not be found'
    });
  }
  
  res.render('modules/funding/requirement-detail', {
    title: `${route.name} Funding Details`,
    academicYear: requirementsData.academicYear,
    lastUpdated: requirementsData.lastUpdated,
    route: route,
    subjects: subjectsData.subjects
  });
});

// Edit funding requirement page
router.get('/requirements/:id/edit', (req, res) => {
  const requirementsPath = path.join(__dirname, '../../data/funding/requirements.json');
  const requirementsData = readJsonFile(requirementsPath) || { trainingRoutes: [] };
  
  const subjectsPath = path.join(__dirname, '../../data/funding/subjects.json');
  const subjectsData = readJsonFile(subjectsPath) || { subjects: [] };
  
  const routeId = parseInt(req.params.id, 10);
  const route = requirementsData.trainingRoutes.find(r => r.id === routeId);
  
  if (!route) {
    return res.status(404).render('error', {
      title: 'Not Found',
      message: 'The requested funding requirement could not be found'
    });
  }
  
  // Get the IDs of subjects that are eligible for this route
  const eligibleSubjectIds = route.subjects ? route.subjects.map(s => s.id) : [];
  
  res.render('modules/funding/requirement-edit', {
    title: `Edit ${route.name} Funding`,
    academicYear: requirementsData.academicYear,
    route: route,
    allSubjects: subjectsData.subjects,
    eligibleSubjectIds: eligibleSubjectIds
  });
});

// Update funding requirement
router.post('/requirements/:id/update', (req, res) => {
  const requirementsPath = path.join(__dirname, '../../data/funding/requirements.json');
  const requirementsData = readJsonFile(requirementsPath) || { trainingRoutes: [] };
  
  const subjectsPath = path.join(__dirname, '../../data/funding/subjects.json');
  const subjectsData = readJsonFile(subjectsPath) || { subjects: [] };
  
  const routeId = parseInt(req.params.id, 10);
  const routeIndex = requirementsData.trainingRoutes.findIndex(r => r.id === routeId);
  
  if (routeIndex === -1) {
    return res.status(404).render('error', {
      title: 'Not Found',
      message: 'The requested funding requirement could not be found'
    });
  }
  
  const route = requirementsData.trainingRoutes[routeIndex];
  
  // Update route properties
  route.status = req.body.status;
  
  if (req.body.bursaryAmount !== undefined && route.bursaryAmount !== null) {
    route.bursaryAmount = parseInt(req.body.bursaryAmount, 10);
  }
  
  if (req.body.scholarshipAmount !== undefined && route.scholarshipAmount !== null) {
    route.scholarshipAmount = parseInt(req.body.scholarshipAmount, 10);
  }
  
  if (req.body.grantAmount !== undefined && route.grantAmount !== null) {
    route.grantAmount = parseInt(req.body.grantAmount, 10);
  }
  
  // Update eligible subjects
  const eligibleSubjectIds = req.body.eligibleSubjects ? 
    (Array.isArray(req.body.eligibleSubjects) ? 
      req.body.eligibleSubjects.map(id => parseInt(id, 10)) : 
      [parseInt(req.body.eligibleSubjects, 10)]) : 
    [];
  
  route.subjects = subjectsData.subjects
    .filter(subject => eligibleSubjectIds.includes(subject.id))
    .map(subject => ({
      id: subject.id,
      name: subject.name,
      bursaryEligible: subject.bursaryEligible && route.bursaryAmount !== null,
      scholarshipEligible: subject.scholarshipEligible && route.scholarshipAmount !== null,
      grantEligible: subject.grantEligible && route.grantAmount !== null
    }));
  
  // Update last updated timestamp
  requirementsData.lastUpdated = new Date().toISOString();
  
  // Save changes
  if (writeJsonFile(requirementsPath, requirementsData)) {
    res.redirect(`/funding/requirements/${routeId}`);
  } else {
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to save changes'
    });
  }
});

// Funding history page
router.get('/history', (req, res) => {
  const historyPath = path.join(__dirname, '../../data/funding/history.json');
  const historyData = readJsonFile(historyPath) || { changes: [] };
  
  res.render('modules/funding/history', {
    title: 'Funding History',
    changes: historyData.changes
  });
});

// Funding history detail page
router.get('/history/:id', (req, res) => {
  const historyPath = path.join(__dirname, '../../data/funding/history.json');
  const historyData = readJsonFile(historyPath) || { changes: [] };
  
  const changeId = parseInt(req.params.id, 10);
  const change = historyData.changes.find(c => c.id === changeId);
  
  if (!change) {
    return res.status(404).render('error', {
      title: 'Not Found',
      message: 'The requested funding history record could not be found'
    });
  }
  
  res.render('modules/funding/history-detail', {
    title: 'Funding Change Details',
    change: change
  });
});

// Funding reports page
router.get('/reports', (req, res) => {
  res.render('modules/funding/reports', {
    title: 'Funding Reports',
    currentDate: new Date().toISOString().split('T')[0]
  });
});

// Structured funding view
router.get('/structured-view', (req, res) => {
  const structuredPath = path.join(__dirname, '../../data/funding/structured-funding.json');
  const structuredData = readJsonFile(structuredPath) || { fundingItems: [] };
  
  // Get filter parameters from query string
  const academicYear = req.query.academicYear || 'all';
  const fundingType = req.query.fundingType || 'all';
  const trainingRoute = req.query.trainingRoute || 'all';
  const subject = req.query.subject || 'all';
  
  // Apply filters if needed
  let filteredData = structuredData.fundingItems;
  
  if (academicYear !== 'all') {
    filteredData = filteredData.filter(item => item.academicYear === academicYear);
  }
  
  if (fundingType !== 'all') {
    filteredData = filteredData.filter(item => item.fundingType === fundingType);
  }
  
  if (trainingRoute !== 'all') {
    filteredData = filteredData.filter(item => item.trainingRoute === trainingRoute);
  }
  
  // Create individual records for each allocation subject
  let expandedRecords = [];
  
  filteredData.forEach(item => {
    // If a subject filter is applied, only include matching subjects
    const subjectsToUse = subject !== 'all'
      ? item.allocationSubjects.filter(subj => subj === subject)
      : item.allocationSubjects;
      
    // Create a separate record for each allocation subject
    subjectsToUse.forEach(subj => {
      expandedRecords.push({
        academicYear: item.academicYear,
        trainingRoute: item.trainingRoute,
        fundingType: item.fundingType,
        amount: item.amount,
        allocationSubject: subj,
        courseSubjectSpecialism: item.courseSubjectSpecialism || '',
        course_study_modes: item.course_study_modes || [],
        bursary_tiers: item.bursary_tiers || [],
        course_education_phases: item.course_education_phases || []
      });
    });
  });
  
  res.render('modules/funding/structured-view', {
    title: 'Structured Funding View',
    filter: {
      academicYear,
      fundingType,
      trainingRoute,
      subject
    },
    fundingItems: expandedRecords
  });
});

// Subject Records View
router.get('/subject-records', (req, res) => {
  const subjectRecordsPath = path.join(__dirname, '../../data/funding/subject-records.json');
  const subjectRecordsData = readJsonFile(subjectRecordsPath) || { subjectRecords: [] };

  // Get filter parameters from query string
  const academicYear = req.query.academicYear || '';
  const fundingType = req.query.fundingType || '';
  const trainingRoute = req.query.trainingRoute || '';
  const allocationSubject = req.query.allocationSubject || '';
  const priority = req.query.priority || '';

  // Extract unique values for filter dropdowns
  const academicYears = [...new Set(subjectRecordsData.subjectRecords.map(item => item.academicYear))];
  const fundingTypes = [...new Set(subjectRecordsData.subjectRecords.map(item => item.fundingType))];
  const trainingRoutes = [...new Set(subjectRecordsData.subjectRecords.map(item => item.trainingRoute))];
  const allocationSubjects = [...new Set(subjectRecordsData.subjectRecords.map(item => item.allocationSubject))];
  const priorities = [...new Set(subjectRecordsData.subjectRecords.map(item => item.priority))];

  // Filter the data based on selected filters
  let filteredData = subjectRecordsData.subjectRecords;
  
  // Add default values for new fields if they don't exist
  filteredData = filteredData.map(record => ({
    ...record,
    course_study_modes: record.course_study_modes || ["full_time", "part_time"],
    bursary_tiers: record.bursary_tiers || ["tier_1"],
    course_education_phases: record.course_education_phases || ["secondary"]
  }));

  if (academicYear) {
    filteredData = filteredData.filter(item => item.academicYear === academicYear);
  }

  if (fundingType) {
    filteredData = filteredData.filter(item => item.fundingType === fundingType);
  }

  if (trainingRoute) {
    filteredData = filteredData.filter(item => item.trainingRoute === trainingRoute);
  }

  if (allocationSubject) {
    filteredData = filteredData.filter(item => item.allocationSubject === allocationSubject);
  }

  if (priority) {
    filteredData = filteredData.filter(item => item.priority === priority);
  }

  res.render('modules/funding/subject-records', {
    title: 'Subject Funding Records',
    academicYears,
    fundingTypes,
    trainingRoutes,
    allocationSubjects,
    priorities,
    selectedFilters: {
      academicYear,
      fundingType,
      trainingRoute,
      allocationSubject,
      priority
    },
    subjectRecords: filteredData
  });
});

module.exports = router;
