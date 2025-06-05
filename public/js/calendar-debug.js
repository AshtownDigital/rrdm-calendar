// Debug script for Release Diary calendar
document.addEventListener('DOMContentLoaded', function() {
  console.log('Calendar debug script loaded');
  
  // Check if we're on the release diary page
  if (window.location.pathname.includes('/release-diary')) {
    console.log('On release diary page - starting diagnostics');
    
    // Check container
    const calendarEl = document.getElementById('release-calendar');
    console.log('Calendar container:', calendarEl);
    
    // Check for required variables
    const calendarEventsElement = document.querySelector('[data-calendar-events]');
    const releaseDateMapElement = document.querySelector('[data-release-date-map]');
    
    console.log('Calendar events element exists:', !!calendarEventsElement);
    console.log('Release date map element exists:', !!releaseDateMapElement);
    
    // Check if FullCalendar is loaded
    console.log('FullCalendar loaded:', typeof FullCalendar !== 'undefined');
    
    // Add a simple calendar as fallback if needed
    if (calendarEl && typeof FullCalendar !== 'undefined') {
      try {
        // Create a basic test calendar
        const testCalendar = new FullCalendar.Calendar(calendarEl, {
          initialView: 'dayGridMonth',
          height: 600,
          events: [
            {
              title: 'Test Event',
              start: new Date().toISOString().split('T')[0]
            }
          ]
        });
        
        console.log('Test calendar created, attempting to render');
        testCalendar.render();
        console.log('Test calendar rendered successfully');
      } catch (error) {
        console.error('Error creating test calendar:', error);
      }
    }
  }
});
