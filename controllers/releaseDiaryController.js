const BCR = require('../models/Bcr'); // Fix the import to use the correct BCR model
const releaseService = require('../services/releaseService');

exports.renderReleaseDiaryPage = async (req, res) => {
  console.log('Rendering release diary page');
  try {
    // Get releases from database
    const releasesData = await releaseService.getAllReleases({ limit: 0 });
    const allReleases = releasesData.releases || [];
    
    // Get BCRs with associated releases
    const bcrsWithReleases = await BCR.find({
      associatedReleaseId: { $exists: true, $ne: null }
    }).populate('associatedReleaseId').lean();
    
    console.log(`Found ${bcrsWithReleases.length} BCRs with associated releases`);
    
    // Create simple array to store calendar events
    let calendarEvents = [];
    
    // Create a simple map of dates to release info for debugging
    const releaseDateMap = {};
    
    // Process releases to create calendar events
    allReleases.forEach(release => {
      // Skip releases without dates
      if (!release.GoLiveDate) return;
      
      // Format the date as YYYY-MM-DD
      const date = new Date(release.GoLiveDate);
      const dateStr = date.toISOString().split('T')[0];
      
      // Track dates with releases
      if (!releaseDateMap[dateStr]) {
        releaseDateMap[dateStr] = [];
      }
      releaseDateMap[dateStr].push(release.ReleaseCode || 'Unnamed');
      
      // Determine color based on release type
      let color = '#505a5f'; // Default gray
      const type = (release.ReleaseType || '').toLowerCase();
      let releaseType = 'other';
      
      if (type.includes('baseline')) {
        color = '#1d70b8'; // Blue
        releaseType = 'baseline';
      } else if (type.includes('year')) {
        color = '#00703c'; // Green
        releaseType = 'in-year';
      } else if (type.includes('hoc')) {
        color = '#f47738'; // Orange
        releaseType = 'adhoc';
      }
      
      // Create a simple event
      calendarEvents.push({
        title: release.ReleaseCode || 'Release',
        start: dateStr,
        backgroundColor: color,
        borderColor: color,
        textColor: '#ffffff',
        description: `${release.ReleaseNameDetails || 'No details'}`,
        releaseType: releaseType, // Add releaseType for filtering
        isBCR: false // Flag to distinguish from BCRs
      });
    });
    
    // Add BCR events
    bcrsWithReleases.forEach(bcr => {
      if (!bcr.associatedReleaseId || !bcr.associatedReleaseId.GoLiveDate) return;
      
      const date = new Date(bcr.associatedReleaseId.GoLiveDate);
      const dateStr = date.toISOString().split('T')[0];
      
      calendarEvents.push({
        title: `BCR #${bcr.recordNumber || bcr.bcrNumber}`,
        start: dateStr,
        backgroundColor: '#d4351c', // Red for BCRs
        borderColor: '#d4351c',
        textColor: '#ffffff',
        description: `BCR #${bcr.recordNumber || bcr.bcrNumber} - ${bcr.title || 'No title'}`,
        releaseType: 'bcr', // Add releaseType for consistency
        isBCR: true // Flag for filtering BCRs
      });
    });
    
    // Log some debugging info
    console.log('Calendar events:', calendarEvents.length);
    console.log('Release date map entries:', Object.keys(releaseDateMap).length);
    
    // Create release code options for dropdowns
    const releaseOptions = allReleases
      .filter(release => release.ReleaseCode) // Only include releases with codes
      .map(release => ({
        code: release.ReleaseCode,
        type: release.ReleaseType || 'Unknown'
      }));
      
    // Get unique release codes
    const uniqueReleaseCodes = [...new Set(releaseOptions.map(r => r.code))];
    
    // Verify we have data to display
    console.log('Calendar events:', calendarEvents.length);
    console.log('Release date map entries:', Object.keys(releaseDateMap).length);
    console.log('Unique release codes for dropdown:', uniqueReleaseCodes.length);
    
    // Add direct access to the event properties for easier debugging
    calendarEvents.forEach((event, index) => {
      event.id = index; // Add unique IDs to each event
      event.title = event.title || 'Unnamed Event';
      
      // Ensure extendedProps exists
      if (!event.extendedProps) {
        event.extendedProps = {};
      }
      
      // Move properties up to extendedProps for consistency
      if (event.releaseType && !event.extendedProps.releaseType) {
        event.extendedProps.releaseType = event.releaseType;
      }
      
      if (event.isBCR !== undefined && event.extendedProps.isBCR === undefined) {
        event.extendedProps.isBCR = event.isBCR;
      }
      
      if (event.description && !event.extendedProps.description) {
        event.extendedProps.description = event.description;
      }
    });
    
    // Pass the data to the template
    res.render('diary/release-diary-fully-fixed', {
      title: 'Release Diary',
      // Use JSON.stringify with spacing for better readability in case of inspection
      calendarEvents: JSON.stringify(calendarEvents, null, 2),
      releaseDateMap: JSON.stringify(releaseDateMap, null, 2),
      calendarEventsCount: calendarEvents.length,
      releaseDateMapCount: Object.keys(releaseDateMap).length
    });
    
  } catch (error) {
    console.error('Error rendering Release Diary page:', error);
    req.flash('error', 'Could not load the Release Diary. ' + error.message);
    res.redirect('/dashboard');
  }
};

// Helper function to get colors based on BCR status
function getStatusColor(status) {
  const statusColors = {
    'Draft': '#505a5f',          // GOV.UK Grey
    'Submitted': '#1d70b8',      // GOV.UK Blue
    'In Review': '#f47738',      // GOV.UK Orange
    'Approved': '#00703c',       // GOV.UK Green
    'Rejected': '#d4351c',       // GOV.UK Red
    'Implemented': '#28a197',    // GOV.UK Turquoise
    'On Hold': '#4c2c92'         // GOV.UK Purple
  };
  
  return statusColors[status] || '#505a5f'; // Default to GOV.UK Grey
}

// Helper function to get release type color
function getReleaseTypeColor(type) {
  // Normalize release type to handle different format variations
  const normalizedType = normalizeReleaseType(type);
  
  switch(normalizedType) {
    case 'baseline':
      return '#1d70b8';  // GOV.UK Blue
    case 'inyear':
      return '#00703c';  // GOV.UK Green
    case 'adhoc':
      return '#f47738';  // GOV.UK Orange
    default:
      return '#505a5f';  // GOV.UK Grey
  }
}

// Helper function to normalize release types from different formats
function normalizeReleaseType(type) {
  // Handle null/undefined
  if (!type) return 'unknown';
  
  // Convert to lowercase and remove spaces
  const normalized = type.toString().toLowerCase().replace(/\s+/g, '');
  
  // Map different variations to standard types
  if (normalized.includes('baseline') || normalized === 'bl') {
    return 'baseline';
  } else if (normalized.includes('inyear') || normalized.includes('in-year') || 
             normalized.includes('periodic') || normalized.includes('iy')) {
    return 'inyear';
  } else if (normalized.includes('adhoc') || normalized.includes('ad-hoc') || 
             normalized.includes('ad_hoc') || normalized.includes('ah')) {
    return 'adhoc';
  } else {
    return 'unknown';
  }
}

// Convert normalized type to display name
function normalizedTypeToDisplayName(normalizedType) {
  switch(normalizedType) {
    case 'baseline':
      return 'Baseline';
    case 'inyear':
      return 'In Year';
    case 'adhoc':
      return 'Ad Hoc';
    default:
      return 'Unknown';
  }
}
