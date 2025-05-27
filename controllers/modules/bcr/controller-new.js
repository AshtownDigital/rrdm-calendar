/**
 * Updated newSubmissionForm function to properly handle urgency levels
 */
exports.newSubmissionForm = async (req, res) => {
  try {
    // Get impact areas and urgency levels for the form
    const impactAreas = await bcrModel.getAllImpactAreas();
    const urgencyLevels = await bcrModel.getAllUrgencyLevels();
    
    console.log('Impact areas for form:', impactAreas);
    console.log('Urgency levels from database:', urgencyLevels);
    
    // Map impact areas to the format expected by the form
    const mappedImpactAreas = impactAreas.map(area => {
      // Use the name from the database, or extract it from the description if not available
      let areaName = area.name;
      if (!areaName) {
        // If we have a description that matches one of our known areas, use that name
        const descriptions = {
          'Changes to databases, schema design, internal data handling, or system logic.': 'Backend',
          'Updates to UI components, form elements, filters, labels, or layout.': 'Frontend',
          'Creation, modification, or removal of API endpoints or request/response formats.': 'API',
          'Changes to data import/export templates, field order, column definitions.': 'CSV',
          'Additions, updates, or removals of reference data values (e.g., dropdown options).': 'Reference Data',
          'Updates to internal guidance, user manuals, technical specs, or public-facing help.': 'Documentation & Guidance',
          'Changes required due to external policy or legal/regulatory compliance updates.': 'Policy',
          'Modifications impacting funding calculations, eligibility, or reporting models.': 'Funding'
        };
        areaName = descriptions[area.value] || 'Unknown Area';
      }
      
      return {
        id: area._id,
        name: areaName,
        description: area.value || ''
      };
    });
    
    // Map urgency levels to the format expected by the form with color information
    const mappedUrgencyLevels = urgencyLevels.map(level => {
      // Get color from metadata or assign default based on name
      let color = level.metadata && level.metadata.color ? level.metadata.color : 'grey';
      
      // Fallback color assignment if metadata is not available
      if (color === 'grey') {
        switch(level.name) {
          case 'Critical':
            color = 'red';
            break;
          case 'High':
            color = 'orange';
            break;
          case 'Medium':
            color = 'yellow';
            break;
          case 'Low':
            color = 'green';
            break;
          case 'Planning':
            color = 'blue';
            break;
        }
      }
      
      return {
        name: level.name,
        value: level.name,
        description: level.value,
        color: color
      };
    });
    
    console.log('Mapped urgency levels:', mappedUrgencyLevels);
    
    res.render('bcr-submission/new', {
      title: 'New BCR Submission',
      impactAreas: mappedImpactAreas,
      urgencyLevels: mappedUrgencyLevels,
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      user: req.user
    });
  } catch (error) {
    console.error('Error in new submission form controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the submission form',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};
