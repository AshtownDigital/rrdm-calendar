/**
 * Notifications Component
 * 
 * This module handles notification banners and messages throughout the application.
 * It follows the GOV.UK Design System standards for notifications.
 */

/**
 * Set up notification functionality
 */
export function setupNotifications() {
  // Initialize notification banners
  const notificationBanners = document.querySelectorAll('.govuk-notification-banner');
  
  notificationBanners.forEach(banner => {
    // Add auto-dismiss functionality for success notifications after 5 seconds
    if (banner.classList.contains('govuk-notification-banner--success')) {
      setTimeout(() => {
        dismissNotification(banner);
      }, 5000);
    }
    
    // Add dismiss button functionality
    const dismissButton = banner.querySelector('.js-dismiss-notification');
    if (dismissButton) {
      dismissButton.addEventListener('click', (event) => {
        event.preventDefault();
        dismissNotification(banner);
      });
    }
  });
}

/**
 * Create a notification banner programmatically
 * @param {string} type - The notification type (success, error)
 * @param {string} message - The notification message
 * @param {boolean} autoDismiss - Whether to auto-dismiss the notification
 */
export function createNotification(type, message, autoDismiss = false) {
  // Create the notification banner
  const banner = document.createElement('div');
  banner.className = `govuk-notification-banner ${type === 'success' ? 'govuk-notification-banner--success' : ''}`;
  banner.setAttribute('role', 'alert');
  banner.setAttribute('data-module', 'govuk-notification-banner');
  
  // Create the banner header
  const header = document.createElement('div');
  header.className = 'govuk-notification-banner__header';
  
  const title = document.createElement('h2');
  title.className = 'govuk-notification-banner__title';
  title.textContent = type === 'success' ? 'Success' : 'Important';
  
  header.appendChild(title);
  banner.appendChild(header);
  
  // Create the banner content
  const content = document.createElement('div');
  content.className = 'govuk-notification-banner__content';
  
  const paragraph = document.createElement('p');
  paragraph.className = 'govuk-notification-banner__heading';
  paragraph.textContent = message;
  
  content.appendChild(paragraph);
  banner.appendChild(content);
  
  // Add dismiss button
  if (autoDismiss) {
    setTimeout(() => {
      dismissNotification(banner);
    }, 5000);
  }
  
  // Add the notification to the page
  const container = document.querySelector('.govuk-width-container');
  if (container) {
    container.insertBefore(banner, container.firstChild);
  } else {
    document.body.insertBefore(banner, document.body.firstChild);
  }
  
  return banner;
}

/**
 * Dismiss a notification banner with animation
 * @param {HTMLElement} banner - The notification banner element
 */
function dismissNotification(banner) {
  banner.style.transition = 'opacity 0.3s, height 0.3s';
  banner.style.opacity = '0';
  
  setTimeout(() => {
    const height = banner.offsetHeight;
    banner.style.height = `${height}px`;
    banner.style.overflow = 'hidden';
    
    setTimeout(() => {
      banner.style.height = '0';
      banner.style.marginTop = '0';
      banner.style.marginBottom = '0';
      banner.style.paddingTop = '0';
      banner.style.paddingBottom = '0';
      
      setTimeout(() => {
        banner.remove();
      }, 300);
    }, 10);
  }, 300);
}
