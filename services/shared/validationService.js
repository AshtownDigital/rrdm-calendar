/**
 * Validation Service
 * Centralized service for form validation across the application
 */

/**
 * Validate a BCR submission
 * @param {Object} submissionData - Submission data to validate
 * @returns {Object} - Validation result with isValid flag and errors object
 */
exports.validateSubmission = (submissionData) => {
  const errors = {};
  
  // Validate required fields
  if (!submissionData.fullName || submissionData.fullName.trim() === '') {
    errors.fullName = 'Full name is required';
  }
  
  if (!submissionData.emailAddress || submissionData.emailAddress.trim() === '') {
    errors.emailAddress = 'Email address is required';
  } else if (!isValidEmail(submissionData.emailAddress)) {
    errors.emailAddress = 'Please enter a valid email address';
  }
  
  if (!submissionData.organisation || submissionData.organisation.trim() === '') {
    errors.organisation = 'Organisation is required';
  }
  
  if (!submissionData.briefDescription || submissionData.briefDescription.trim() === '') {
    errors.briefDescription = 'Brief description is required';
  }
  
  if (!submissionData.justification || submissionData.justification.trim() === '') {
    errors.justification = 'Justification is required';
  }
  
  if (!submissionData.urgencyLevel) {
    errors.urgencyLevel = 'Urgency level is required';
  }
  
  if (!submissionData.impactAreas || 
      (Array.isArray(submissionData.impactAreas) && submissionData.impactAreas.length === 0) ||
      submissionData.impactAreas === '') {
    errors.impactAreas = 'At least one impact area must be selected';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validate an impact area
 * @param {Object} impactAreaData - Impact area data to validate
 * @returns {Object} - Validation result with isValid flag and errors object
 */
exports.validateImpactArea = (impactAreaData) => {
  const errors = {};
  
  // Validate required fields
  if (!impactAreaData.name || impactAreaData.name.trim() === '') {
    errors.name = 'Name is required';
  }
  
  if (!impactAreaData.description || impactAreaData.description.trim() === '') {
    errors.description = 'Description is required';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validate a BCR workflow transition
 * @param {Object} transitionData - Transition data to validate
 * @returns {Object} - Validation result with isValid flag and errors object
 */
exports.validateWorkflowTransition = (transitionData) => {
  const errors = {};
  
  // Validate required fields
  if (!transitionData.phaseId) {
    errors.phaseId = 'Phase is required';
  }
  
  if (!transitionData.statusId) {
    errors.statusId = 'Status is required';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Helper function to validate an email address
 * @param {string} email - Email address to validate
 * @returns {boolean} - Whether the email is valid
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
