/**
 * Status Tag Service
 * Centralized service for generating consistent status tags across the application
 */

/**
 * Get color-coded tag for a status object
 * Using standardized GOV.UK Design System colors
 * @param {Object} status - Status object with name property
 * @returns {Object} Tag object with text and class properties
 */
exports.getStatusTag = (status) => {
  if (!status) {
    return { text: 'Unknown', class: 'govuk-tag govuk-tag--grey' };
  }
  
  const statusName = status.name ? status.name.toLowerCase() : '';
  
  // Status type mapping to tag colors following GOV.UK Design System
  switch (statusName) {
    // Completed statuses (green)
    case 'completed':
    case 'approved':
    case 'closed':
    case 'done':
      return { text: status.name, class: 'govuk-tag govuk-tag--green' };
    
    // In progress statuses (blue shades)
    case 'in progress':
    case 'pending':
    case 'review':
    case 'analysis':
      return { text: status.name, class: 'govuk-tag govuk-tag--blue' };
    
    // Active/in-use statuses (turquoise)
    case 'active':
    case 'in use':
    case 'implementation':
      return { text: status.name, class: 'govuk-tag govuk-tag--turquoise' };
    
    // Rejected/error statuses (red)
    case 'rejected':
    case 'error':
    case 'failed':
      return { text: status.name, class: 'govuk-tag govuk-tag--red' };
    
    // Warning/delayed statuses (yellow)
    case 'delayed':
    case 'waiting':
    case 'on hold':
      return { text: status.name, class: 'govuk-tag govuk-tag--yellow' };
      
    // Inactive/neutral statuses (grey)
    case 'inactive':
    case 'draft':
    case 'n/a':
      return { text: status.name, class: 'govuk-tag govuk-tag--grey' };
      
    // Default tag (blue)
    default:
      return { text: status.name, class: 'govuk-tag' };
  }
};

/**
 * Get color-coded tag for a submission status string
 * @param {string} status - Status string
 * @returns {Object} Tag object with text and class properties
 */
exports.getSubmissionStatusTag = (status) => {
  if (!status) {
    return { text: 'Unknown', class: 'govuk-tag govuk-tag--grey' };
  }
  
  const statusLower = typeof status === 'string' ? status.toLowerCase() : '';
  
  switch (statusLower) {
    case 'approved':
      return { text: 'Approved', class: 'govuk-tag govuk-tag--green' };
    case 'rejected':
      return { text: 'Rejected', class: 'govuk-tag govuk-tag--red' };
    case 'paused':
    case 'on hold':
      return { text: 'Paused', class: 'govuk-tag govuk-tag--yellow' };
    case 'closed':
      return { text: 'Closed', class: 'govuk-tag govuk-tag--grey' };
    case 'more info required':
      return { text: 'More Info Required', class: 'govuk-tag govuk-tag--blue' };
    case 'pending':
    default:
      return { text: 'Pending', class: 'govuk-tag govuk-tag--purple' };
  }
};

/**
 * Get status tag for a BCR object
 * @param {Object} bcr - BCR object with status properties
 * @returns {Object} Tag object with text and class properties
 */
exports.getBcrStatusTag = (bcr) => {
  if (!bcr) {
    return { text: 'Unknown', class: 'govuk-tag govuk-tag--grey' };
  }
  
  // First check for the workflowStatus field (new field)
  if (bcr.workflowStatus) {
    return exports.getSubmissionStatusTag(bcr.workflowStatus);
  }
  // Then check for currentStatusId (populated reference)
  else if (bcr.currentStatusId && bcr.currentStatusId.name) {
    return exports.getStatusTag(bcr.currentStatusId);
  }
  // Finally fall back to the legacy status field
  else if (bcr.status) {
    return exports.getSubmissionStatusTag(bcr.status);
  }
  
  return { text: 'Unknown', class: 'govuk-tag govuk-tag--grey' };
};
