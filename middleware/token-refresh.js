/**
 * Token Refresh Middleware for RRDM application
 * Checks the age of the user's session and refreshes it if needed
 * This helps maintain session continuity for active users
 */

// Token refresh middleware
const tokenRefreshMiddleware = (req, res, next) => {
  // Skip if not authenticated
  if (!req.isAuthenticated()) {
    return next();
  }

  try {
    // Check if session has a lastRefresh timestamp
    if (!req.session.lastRefresh) {
      // First time - set the timestamp
      req.session.lastRefresh = Date.now();
      return next();
    }

    const currentTime = Date.now();
    const lastRefresh = req.session.lastRefresh;
    const refreshInterval = 30 * 60 * 1000; // 30 minutes in milliseconds

    // Check if it's time to refresh the token
    if (currentTime - lastRefresh > refreshInterval) {
      // Update the session with a new timestamp
      req.session.lastRefresh = currentTime;
      
      // Regenerate the session ID to enhance security
      req.session.regenerate((err) => {
        if (err) {
          console.error('Error regenerating session:', err);
          return next();
        }
        
        // Maintain user authentication after regenerating the session
        req.login(req.user, (loginErr) => {
          if (loginErr) {
            console.error('Error re-establishing login after session regeneration:', loginErr);
          }
          
          // Continue with the request
          next();
        });
      });
    } else {
      // No need to refresh yet
      next();
    }
  } catch (error) {
    console.error('Error in token refresh middleware:', error);
    next();
  }
};

module.exports = tokenRefreshMiddleware;
