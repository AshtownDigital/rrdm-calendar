/**
 * BCR Status Tag Service
 * Provides utility functions for generating status tags for BCRs
 */

/**
 * Get a status tag object for a BCR based on its status
 * @param {Object} bcr - The BCR object
 * @returns {Object} Status tag with color and text properties
 */
exports.getBcrStatusTag = (bcr) => {
  if (!bcr) return { color: 'gray', text: 'Unknown' };
  
  const status = bcr.status ? bcr.status.toLowerCase() : '';
  
  switch (status) {
    case 'draft':
      return { color: 'blue', text: 'Draft' };
    case 'in-progress':
    case 'in progress':
      return { color: 'green', text: 'In Progress' };
    case 'review':
      return { color: 'orange', text: 'Under Review' };
    case 'approved':
      return { color: 'green', text: 'Approved' };
    case 'rejected':
      return { color: 'red', text: 'Rejected' };
    case 'on-hold':
    case 'on hold':
      return { color: 'yellow', text: 'On Hold' };
    case 'completed':
      return { color: 'purple', text: 'Completed' };
    default:
      return { color: 'gray', text: status || 'Unknown' };
  }
};
