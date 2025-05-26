/**
 * Utility for generating submission codes in the format SUB-24/25-001
 * Includes submitter and source information
 */

/**
 * Generate a submission code in the format SUB-24/25-001-INT
 * The format includes academic year, sequential number, and submitter type
 * 
 * @param {Object} options - Options for generating the code
 * @param {String} options.submitterType - Type of submitter (e.g., 'INT' for internal, 'EXT' for external)
 * @param {Number} options.sequentialNumber - Sequential number for the submission
 * @returns {String} The generated submission code
 */
const generateSubmissionCode = (options = {}) => {
  // Get current academic year (e.g., 24/25 for 2024/2025)
  const now = new Date();
  const currentYear = now.getFullYear();
  const academicYearStart = now.getMonth() >= 8 ? currentYear : currentYear - 1; // Academic year starts in September
  const academicYearEnd = academicYearStart + 1;
  const academicYear = `${academicYearStart.toString().slice(-2)}/${academicYearEnd.toString().slice(-2)}`;
  
  // Get submitter type code
  const submitterType = options.submitterType || 'GEN'; // Default to GEN (General)
  
  // Get sequential number (padded to 3 digits)
  const sequentialNumber = options.sequentialNumber || 1;
  const paddedNumber = sequentialNumber.toString().padStart(3, '0');
  
  // Generate the code
  return `SUB-${academicYear}-${paddedNumber}-${submitterType}`;
};

/**
 * Get submitter type code based on submission source
 * 
 * @param {String} source - The submission source (e.g., 'Internal', 'External')
 * @returns {String} The submitter type code
 */
const getSubmitterTypeCode = (source) => {
  switch (source?.toLowerCase()) {
    case 'internal':
      return 'INT';
    case 'external':
      return 'EXT';
    case 'partner':
      return 'PTR';
    default:
      return 'GEN'; // General/Other
  }
};

module.exports = {
  generateSubmissionCode,
  getSubmitterTypeCode
};
