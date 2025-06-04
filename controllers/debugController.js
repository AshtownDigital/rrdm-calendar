/**
 * Debug Controller
 * Provides diagnostic endpoints for troubleshooting
 */
const Release = require('../models/Release');
const BCR = require('../models/Bcr');

// Debug info endpoint
exports.getDiagnostics = async (req, res) => {
  try {
    // Return server status and calendar info
    res.json({
      status: 'ok',
      serverTime: new Date().toISOString(),
      message: 'Server is running correctly',
      calendar: {
        templateUsed: 'diary/release-diary-fixed.njk',
        eventsAvailable: true
      }
    });
  } catch (error) {
    console.error('Error in diagnostics:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Simple calendar page that uses minimal configuration
exports.simpleCalendarPage = async (req, res) => {
  try {
    res.render('diary/release-diary-simple', {
      title: 'Simple Calendar Test',
    });
  } catch (error) {
    console.error('Error rendering simple calendar:', error);
    res.status(500).send('Error rendering simple calendar: ' + error.message);
  }
};

// Test calendar render endpoint
exports.testCalendarRender = async (req, res) => {
  try {
    // Return a minimal HTML page that checks if calendar can render
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Calendar Test</title>
        <link href="https://cdn.jsdelivr.net/npm/fullcalendar@5.10.0/main.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/fullcalendar@5.10.0/main.min.js"></script>
      </head>
      <body>
        <div id="test-status">Testing calendar...</div>
        <div id="calendar-test" style="width: 400px; height: 300px;"></div>
        
        <script>
          document.addEventListener('DOMContentLoaded', function() {
            try {
              const calendarEl = document.getElementById('calendar-test');
              const calendar = new FullCalendar.Calendar(calendarEl, {
                initialView: 'dayGridMonth',
                events: [
                  {
                    title: 'Test Event',
                    start: '2025-06-04'
                  }
                ]
              });
              
              calendar.render();
              document.getElementById('test-status').innerHTML = '<b style="color:green">✓ FullCalendar library loaded and rendered successfully!</b>';
            } catch (e) {
              document.getElementById('test-status').innerHTML = '<b style="color:red">✗ Error: ' + e.message + '</b>';
            }
          });
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Error in calendar test:', error);
    res.status(500).send('Error testing calendar: ' + error.message);
  }
};
