/**
 * BCR Module JavaScript
 * 
 * This is the entry point for BCR module-specific JavaScript.
 * It handles functionality related to Business Change Requests.
 */
import { initializeGOVUKFrontend } from './utils/govuk';
import { setupBcrFilters } from './components/bcrFilters';
import { setupBcrWorkflow } from './components/bcrWorkflow';
import { setupStatusTags } from './components/statusTags';

// Initialize BCR module functionality
document.addEventListener('DOMContentLoaded', () => {
  // Initialize GOVUK Frontend components
  initializeGOVUKFrontend();
  
  // Set up BCR-specific components
  setupBcrFilters();
  setupBcrWorkflow();
  setupStatusTags();
  
  console.log('BCR module initialized');
});
