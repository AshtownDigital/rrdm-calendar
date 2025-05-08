/**
 * Status Tags Component
 * 
 * This module handles the styling and behavior of status tags throughout the application.
 * It follows the GOV.UK Design System standards for tag colors and semantic meanings.
 */

/**
 * Set up status tags with appropriate colors based on their semantic meaning
 */
export function setupStatusTags() {
  const statusTags = document.querySelectorAll('.govuk-tag[data-status]');
  
  statusTags.forEach(tag => {
    const status = tag.dataset.status.toLowerCase();
    applyTagStyle(tag, status);
  });
  
  console.log('Status tags initialized');
}

/**
 * Apply the appropriate tag style based on status
 * @param {HTMLElement} tag - The tag element
 * @param {string} status - The status value
 */
function applyTagStyle(tag, status) {
  // Remove any existing tag color classes
  const colorClasses = [
    'govuk-tag--grey',
    'govuk-tag--green',
    'govuk-tag--turquoise',
    'govuk-tag--blue',
    'govuk-tag--light-blue',
    'govuk-tag--purple',
    'govuk-tag--pink',
    'govuk-tag--red',
    'govuk-tag--orange',
    'govuk-tag--yellow'
  ];
  
  colorClasses.forEach(cls => {
    tag.classList.remove(cls);
  });
  
  // Apply the appropriate class based on status
  // Following the standard GOV.UK Design System tag colors with their semantic meanings
  switch (status) {
    // Active/default states - blue
    case 'active':
    case 'current':
    case 'default':
      // Default blue tag (no additional class needed)
      break;
      
    // Inactive/neutral states - grey
    case 'inactive':
    case 'neutral':
    case 'cancelled':
      tag.classList.add('govuk-tag--grey');
      break;
      
    // Success/completed states - green
    case 'completed':
    case 'approved':
    case 'success':
      tag.classList.add('govuk-tag--green');
      break;
      
    // Active/in-use states - turquoise
    case 'in-use':
    case 'published':
      tag.classList.add('govuk-tag--turquoise');
      break;
      
    // New/pending states - blue
    case 'new':
    case 'pending':
      tag.classList.add('govuk-tag--blue');
      break;
      
    // In-progress states - light blue
    case 'in-progress':
    case 'reviewing':
      tag.classList.add('govuk-tag--light-blue');
      break;
      
    // Received states - purple
    case 'received':
    case 'submitted':
      tag.classList.add('govuk-tag--purple');
      break;
      
    // Sent states - pink
    case 'sent':
    case 'dispatched':
      tag.classList.add('govuk-tag--pink');
      break;
      
    // Rejected/urgent/error states - red
    case 'rejected':
    case 'urgent':
    case 'error':
      tag.classList.add('govuk-tag--red');
      break;
      
    // Declined/warning states - orange
    case 'declined':
    case 'warning':
      tag.classList.add('govuk-tag--orange');
      break;
      
    // Delayed/waiting states - yellow
    case 'delayed':
    case 'waiting':
      tag.classList.add('govuk-tag--yellow');
      break;
      
    // Default to blue for unknown statuses
    default:
      // Use default blue tag
      break;
  }
}
