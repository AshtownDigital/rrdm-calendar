/**
 * Main JavaScript Entry Point
 * 
 * This is the main entry point for the application's JavaScript.
 * It imports and initializes common components used across the application.
 */
import { initializeGOVUKFrontend } from './utils/govuk';
import { setupNotifications } from './components/notifications';
import { setupAccessibility } from './utils/accessibility';
import './utils/polyfills';

// Initialize GOVUK Frontend components
document.addEventListener('DOMContentLoaded', () => {
  // Initialize GOVUK Frontend
  initializeGOVUKFrontend();
  
  // Set up notifications
  setupNotifications();
  
  // Set up accessibility features
  setupAccessibility();
  
  console.log('RRDM application initialized');
});
