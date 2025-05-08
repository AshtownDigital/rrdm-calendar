/**
 * GOV.UK Frontend Initialization
 * 
 * This module handles the initialization of GOV.UK Frontend components.
 */

/**
 * Initialize all GOV.UK Frontend components
 */
export function initializeGOVUKFrontend() {
  // Initialize all GOV.UK Frontend components
  const components = document.querySelectorAll('[data-module]');
  
  if (!window.GOVUKFrontend) {
    console.warn('GOV.UK Frontend not loaded');
    return;
  }
  
  components.forEach(component => {
    const moduleType = component.dataset.module;
    
    if (moduleType && window.GOVUKFrontend[moduleType]) {
      try {
        new window.GOVUKFrontend[moduleType](component).init();
      } catch (err) {
        console.error(`Error initializing ${moduleType}:`, err);
      }
    }
  });
  
  console.log('GOV.UK Frontend components initialized');
}

/**
 * Initialize a specific GOV.UK Frontend component
 * @param {string} selector - CSS selector for the component
 * @param {string} moduleType - GOV.UK Frontend module type
 */
export function initializeComponent(selector, moduleType) {
  const components = document.querySelectorAll(selector);
  
  if (!window.GOVUKFrontend || !window.GOVUKFrontend[moduleType]) {
    console.warn(`GOV.UK Frontend ${moduleType} not loaded`);
    return;
  }
  
  components.forEach(component => {
    try {
      new window.GOVUKFrontend[moduleType](component).init();
    } catch (err) {
      console.error(`Error initializing ${moduleType}:`, err);
    }
  });
}
