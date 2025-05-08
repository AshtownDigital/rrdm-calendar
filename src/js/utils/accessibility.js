/**
 * Accessibility Utilities
 * 
 * This module provides utilities for enhancing accessibility across the application.
 * It follows GOV.UK Design System accessibility standards.
 */

/**
 * Set up accessibility features
 */
export function setupAccessibility() {
  // Add skip link functionality
  setupSkipLink();
  
  // Ensure proper focus management
  setupFocusManagement();
  
  // Add ARIA attributes to dynamic elements
  enhanceAriaAttributes();
  
  console.log('Accessibility features initialized');
}

/**
 * Set up skip link functionality
 */
function setupSkipLink() {
  const skipLink = document.querySelector('.govuk-skip-link');
  
  if (skipLink) {
    skipLink.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = this.getAttribute('href').substring(1);
      const targetElement = document.getElementById(targetId);
      
      if (targetElement) {
        // Set tabindex to make the element focusable
        targetElement.setAttribute('tabindex', '-1');
        targetElement.focus();
        
        // Remove tabindex after blur
        targetElement.addEventListener('blur', function() {
          this.removeAttribute('tabindex');
        });
      }
    });
  }
}

/**
 * Set up proper focus management
 */
function setupFocusManagement() {
  // Add focus outline to interactive elements
  document.addEventListener('keydown', function(e) {
    // Add a class to the body when user is navigating with keyboard
    if (e.key === 'Tab') {
      document.body.classList.add('user-is-tabbing');
    }
  });
  
  // Remove the class when user clicks with mouse
  document.addEventListener('mousedown', function() {
    document.body.classList.remove('user-is-tabbing');
  });
  
  // Ensure modals trap focus
  const modals = document.querySelectorAll('[role="dialog"]');
  modals.forEach(setupFocusTrap);
}

/**
 * Set up a focus trap for modal dialogs
 * @param {HTMLElement} modal - The modal element
 */
function setupFocusTrap(modal) {
  if (!modal) return;
  
  const focusableElements = modal.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  if (focusableElements.length === 0) return;
  
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  
  modal.addEventListener('keydown', function(e) {
    if (e.key === 'Tab') {
      // Shift + Tab
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
      // Tab
      else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
    
    // Close on Escape
    if (e.key === 'Escape') {
      const closeButton = modal.querySelector('[data-close-modal]');
      if (closeButton) {
        closeButton.click();
      }
    }
  });
}

/**
 * Enhance ARIA attributes for dynamic elements
 */
function enhanceAriaAttributes() {
  // Add aria-current to current navigation items
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('.govuk-header__navigation-item a');
  
  navLinks.forEach(link => {
    const linkPath = link.getAttribute('href');
    if (linkPath && currentPath.startsWith(linkPath) && linkPath !== '/') {
      link.setAttribute('aria-current', 'page');
      link.parentElement.classList.add('govuk-header__navigation-item--active');
    }
  });
  
  // Ensure all form fields have associated labels
  const formFields = document.querySelectorAll('input, select, textarea');
  
  formFields.forEach(field => {
    const id = field.getAttribute('id');
    if (id) {
      const label = document.querySelector(`label[for="${id}"]`);
      if (!label) {
        console.warn(`Form field with id "${id}" has no associated label`);
      }
    } else {
      console.warn('Form field has no id attribute:', field);
    }
  });
  
  // Add appropriate ARIA attributes to GOV.UK tag elements
  const tags = document.querySelectorAll('.govuk-tag');
  
  tags.forEach(tag => {
    // Add role="status" to tags that represent status
    if (!tag.hasAttribute('role')) {
      tag.setAttribute('role', 'status');
    }
  });
}
