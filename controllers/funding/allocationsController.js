/**
 * Funding Allocations Controller
 * Handles funding allocations management
 */
const { prisma } = require('../../config/database');

/**
 * Display the funding allocations list
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const listAllocations = async (req, res) => {
  try {
    // Get allocations from the database
    const allocations = await prisma.fundingAllocation.findMany({
      include: {
        fundingData: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Render the template with data
    res.render('modules/funding/allocations', {
      title: 'Funding Allocations',
      allocations,
      user: req.user
    });
  } catch (error) {
    console.error('Error listing funding allocations:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load funding allocations',
      error,
      user: req.user
    });
  }
};

/**
 * Display the add allocation form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showAddAllocationForm = async (req, res) => {
  try {
    // Get funding data for the dropdown
    const fundingItems = await prisma.fundingData.findMany({
      orderBy: { name: 'asc' }
    });
    
    // Render the template with data
    res.render('modules/funding/add-allocation', {
      title: 'Add Funding Allocation',
      fundingItems,
      user: req.user
    });
  } catch (error) {
    console.error('Error showing add allocation form:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load add allocation form',
      error,
      user: req.user
    });
  }
};

/**
 * Process add allocation form submission
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const processAddAllocation = async (req, res) => {
  try {
    const { fundingId, amount, description, startDate, endDate } = req.body;
    
    // Validation
    if (!fundingId || !amount || !description || !startDate || !endDate) {
      req.flash('error_msg', 'Please fill in all fields');
      return res.redirect('/funding/allocations/add');
    }
    
    // Create allocation
    await prisma.fundingAllocation.create({
      data: {
        fundingDataId: fundingId,
        amount: parseFloat(amount),
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        createdBy: req.user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    req.flash('success_msg', 'Funding allocation added successfully');
    res.redirect('/funding/allocations');
  } catch (error) {
    console.error('Error adding funding allocation:', error);
    req.flash('error_msg', 'Failed to add funding allocation');
    res.redirect('/funding/allocations/add');
  }
};

/**
 * Display the edit allocation form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showEditAllocationForm = async (req, res) => {
  try {
    const allocationId = req.params.id;
    
    // Get the allocation from the database
    const allocation = await prisma.fundingAllocation.findUnique({
      where: { id: allocationId },
      include: {
        fundingData: true
      }
    });
    
    if (!allocation) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Funding allocation not found',
        user: req.user
      });
    }
    
    // Get funding data for the dropdown
    const fundingItems = await prisma.fundingData.findMany({
      orderBy: { name: 'asc' }
    });
    
    // Format dates for the form
    const formattedStartDate = allocation.startDate.toISOString().split('T')[0];
    const formattedEndDate = allocation.endDate.toISOString().split('T')[0];
    
    // Render the template with data
    res.render('modules/funding/edit-allocation', {
      title: 'Edit Funding Allocation',
      allocation: {
        ...allocation,
        startDate: formattedStartDate,
        endDate: formattedEndDate
      },
      fundingItems,
      user: req.user
    });
  } catch (error) {
    console.error('Error showing edit allocation form:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load edit allocation form',
      error,
      user: req.user
    });
  }
};

/**
 * Process edit allocation form submission
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateAllocation = async (req, res) => {
  try {
    const allocationId = req.params.id;
    const { fundingId, amount, description, startDate, endDate } = req.body;
    
    // Validation
    if (!fundingId || !amount || !description || !startDate || !endDate) {
      req.flash('error_msg', 'Please fill in all fields');
      return res.redirect(`/funding/allocations/edit/${allocationId}`);
    }
    
    // Update allocation
    await prisma.fundingAllocation.update({
      where: { id: allocationId },
      data: {
        fundingDataId: fundingId,
        amount: parseFloat(amount),
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        updatedAt: new Date()
      }
    });
    
    req.flash('success_msg', 'Funding allocation updated successfully');
    res.redirect('/funding/allocations');
  } catch (error) {
    console.error('Error updating funding allocation:', error);
    req.flash('error_msg', 'Failed to update funding allocation');
    res.redirect(`/funding/allocations/edit/${req.params.id}`);
  }
};

/**
 * Delete a funding allocation
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteAllocation = async (req, res) => {
  try {
    const allocationId = req.params.id;
    
    // Delete allocation
    await prisma.fundingAllocation.delete({
      where: { id: allocationId }
    });
    
    res.json({
      success: true,
      message: 'Funding allocation deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting funding allocation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete funding allocation'
    });
  }
};

/**
 * Display the funding requirements list
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const listRequirements = async (req, res) => {
  try {
    // Get requirements data from JSON file
    const path = require('path');
    const fs = require('fs');
    const requirementsPath = path.join(__dirname, '../../data/funding/requirements.json');
    
    let requirementsData;
    try {
      const data = fs.readFileSync(requirementsPath, 'utf8');
      requirementsData = JSON.parse(data);
    } catch (error) {
      console.error(`Error reading file ${requirementsPath}:`, error);
      requirementsData = { trainingRoutes: [] };
    }
    
    res.render('modules/funding/requirements', {
      title: 'Funding Requirements',
      academicYear: requirementsData.academicYear,
      lastUpdated: requirementsData.lastUpdated,
      trainingRoutes: requirementsData.trainingRoutes,
      user: req.user
    });
  } catch (error) {
    console.error('Error loading funding requirements:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load funding requirements',
      error,
      user: req.user
    });
  }
};

/**
 * Display the funding requirement details
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const viewRequirementDetails = async (req, res) => {
  try {
    // Get requirements data from JSON file
    const path = require('path');
    const fs = require('fs');
    const requirementsPath = path.join(__dirname, '../../data/funding/requirements.json');
    const subjectsPath = path.join(__dirname, '../../data/funding/subjects.json');
    
    let requirementsData, subjectsData;
    try {
      const reqData = fs.readFileSync(requirementsPath, 'utf8');
      requirementsData = JSON.parse(reqData);
      
      const subData = fs.readFileSync(subjectsPath, 'utf8');
      subjectsData = JSON.parse(subData);
    } catch (error) {
      console.error(`Error reading files:`, error);
      return res.status(500).render('error', {
        title: 'Error',
        message: 'Failed to load requirement details',
        error,
        user: req.user
      });
    }
    
    const routeId = parseInt(req.params.id, 10);
    const route = requirementsData.trainingRoutes.find(r => r.id === routeId);
    
    if (!route) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'The requested funding requirement could not be found',
        user: req.user
      });
    }
    
    res.render('modules/funding/requirement-detail', {
      title: `${route.name} Funding Details`,
      academicYear: requirementsData.academicYear,
      lastUpdated: requirementsData.lastUpdated,
      route: route,
      subjects: subjectsData.subjects,
      user: req.user
    });
  } catch (error) {
    console.error('Error viewing requirement details:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load requirement details',
      error,
      user: req.user
    });
  }
};

/**
 * Display the edit requirement form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showEditRequirementForm = async (req, res) => {
  try {
    // Get requirements data from JSON file
    const path = require('path');
    const fs = require('fs');
    const requirementsPath = path.join(__dirname, '../../data/funding/requirements.json');
    const subjectsPath = path.join(__dirname, '../../data/funding/subjects.json');
    
    let requirementsData, subjectsData;
    try {
      const reqData = fs.readFileSync(requirementsPath, 'utf8');
      requirementsData = JSON.parse(reqData);
      
      const subData = fs.readFileSync(subjectsPath, 'utf8');
      subjectsData = JSON.parse(subData);
    } catch (error) {
      console.error(`Error reading files:`, error);
      return res.status(500).render('error', {
        title: 'Error',
        message: 'Failed to load edit requirement form',
        error,
        user: req.user
      });
    }
    
    const routeId = parseInt(req.params.id, 10);
    const route = requirementsData.trainingRoutes.find(r => r.id === routeId);
    
    if (!route) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'The requested funding requirement could not be found',
        user: req.user
      });
    }
    
    // Get the IDs of subjects that are eligible for this route
    const eligibleSubjectIds = route.subjects ? route.subjects.map(s => s.id) : [];
    
    res.render('modules/funding/requirement-edit', {
      title: `Edit ${route.name} Funding`,
      academicYear: requirementsData.academicYear,
      route: route,
      allSubjects: subjectsData.subjects,
      eligibleSubjectIds: eligibleSubjectIds,
      user: req.user
    });
  } catch (error) {
    console.error('Error showing edit requirement form:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load edit requirement form',
      error,
      user: req.user
    });
  }
};

/**
 * Process update requirement form submission
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateRequirement = async (req, res) => {
  try {
    // Helper function to write JSON data files
    const path = require('path');
    const fs = require('fs');
    const requirementsPath = path.join(__dirname, '../../data/funding/requirements.json');
    const subjectsPath = path.join(__dirname, '../../data/funding/subjects.json');
    
    const writeJsonFile = (filePath, data) => {
      try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        return true;
      } catch (error) {
        console.error(`Error writing file ${filePath}:`, error);
        return false;
      }
    };
    
    // Read the current data
    let requirementsData, subjectsData;
    try {
      const reqData = fs.readFileSync(requirementsPath, 'utf8');
      requirementsData = JSON.parse(reqData);
      
      const subData = fs.readFileSync(subjectsPath, 'utf8');
      subjectsData = JSON.parse(subData);
    } catch (error) {
      console.error(`Error reading files:`, error);
      return res.status(500).render('error', {
        title: 'Error',
        message: 'Failed to update requirement',
        error,
        user: req.user
      });
    }
    
    const routeId = parseInt(req.params.id, 10);
    const routeIndex = requirementsData.trainingRoutes.findIndex(r => r.id === routeId);
    
    if (routeIndex === -1) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'The requested funding requirement could not be found',
        user: req.user
      });
    }
    
    // Get the route to update
    const route = requirementsData.trainingRoutes[routeIndex];
    
    // Update the route with form data
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
    
    // Get the subject objects from the IDs
    route.subjects = subjectsData.subjects
      .filter(subject => eligibleSubjectIds.includes(subject.id))
      .map(subject => ({
        id: subject.id,
        name: subject.name
      }));
    
    // Update the last updated timestamp
    requirementsData.lastUpdated = new Date().toISOString();
    
    // Save changes
    if (writeJsonFile(requirementsPath, requirementsData)) {
      res.redirect(`/funding/requirements/${routeId}`);
    } else {
      res.status(500).render('error', {
        title: 'Error',
        message: 'Failed to save changes',
        user: req.user
      });
    }
  } catch (error) {
    console.error('Error updating requirement:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to update requirement',
      error,
      user: req.user
    });
  }
};

/**
 * Display the funding history page
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const viewFundingHistory = async (req, res) => {
  try {
    // Get history data from JSON file
    const path = require('path');
    const fs = require('fs');
    const historyPath = path.join(__dirname, '../../data/funding/history.json');
    
    let historyData;
    try {
      const data = fs.readFileSync(historyPath, 'utf8');
      historyData = JSON.parse(data);
    } catch (error) {
      console.error(`Error reading file ${historyPath}:`, error);
      historyData = { changes: [] };
    }
    
    // Group changes by year
    const changesByYear = {};
    historyData.changes.forEach(change => {
      const year = change.academicYear;
      if (!changesByYear[year]) {
        changesByYear[year] = [];
      }
      changesByYear[year].push(change);
    });
    
    res.render('modules/funding/history', {
      title: 'Funding History',
      changesByYear,
      user: req.user
    });
  } catch (error) {
    console.error('Error loading funding history:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load funding history',
      error,
      user: req.user
    });
  }
};

/**
 * Display the funding reports page
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const viewReports = async (req, res) => {
  try {
    res.render('modules/funding/reports', {
      title: 'Funding Reports',
      currentDate: new Date().toISOString().split('T')[0],
      user: req.user
    });
  } catch (error) {
    console.error('Error loading funding reports:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load funding reports',
      error,
      user: req.user
    });
  }
};

/**
 * Display the structured funding view
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const viewStructuredFunding = async (req, res) => {
  try {
    // Get structured funding data from JSON file
    const path = require('path');
    const fs = require('fs');
    const structuredPath = path.join(__dirname, '../../data/funding/structured-funding.json');
    
    let structuredData;
    try {
      const data = fs.readFileSync(structuredPath, 'utf8');
      structuredData = JSON.parse(data);
    } catch (error) {
      console.error(`Error reading file ${structuredPath}:`, error);
      structuredData = { fundingItems: [] };
    }
    
    // Get filter parameters from query string
    const academicYear = req.query.academicYear || 'all';
    const fundingType = req.query.fundingType || 'all';
    const trainingRoute = req.query.trainingRoute || 'all';
    const subject = req.query.subject || 'all';
    
    // Filter the data based on selected filters
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
      fundingItems: expandedRecords,
      user: req.user
    });
  } catch (error) {
    console.error('Error loading structured funding view:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load structured funding view',
      error,
      user: req.user
    });
  }
};

/**
 * Display the subject records view
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const viewSubjectRecords = async (req, res) => {
  try {
    // Get subject records data from JSON file
    const path = require('path');
    const fs = require('fs');
    const subjectRecordsPath = path.join(__dirname, '../../data/funding/subject-records.json');
    
    let subjectRecordsData;
    try {
      const data = fs.readFileSync(subjectRecordsPath, 'utf8');
      subjectRecordsData = JSON.parse(data);
    } catch (error) {
      console.error(`Error reading file ${subjectRecordsPath}:`, error);
      subjectRecordsData = { subjectRecords: [] };
    }

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
      subjectRecords: filteredData,
      user: req.user
    });
  } catch (error) {
    console.error('Error loading subject records:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load subject records',
      error,
      user: req.user
    });
  }
};

module.exports = {
  listAllocations,
  showAddAllocationForm,
  processAddAllocation,
  showEditAllocationForm,
  updateAllocation,
  deleteAllocation,
  // New exports for funding routes
  listRequirements,
  viewRequirementDetails,
  showEditRequirementForm,
  updateRequirement,
  viewFundingHistory,
  viewReports,
  viewStructuredFunding,
  viewSubjectRecords
};
