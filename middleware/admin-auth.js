/**
 * Admin authentication middleware for RRDM application
 * Checks if the user has admin role
 * 
 * This middleware is specifically for protecting routes that should only be accessible
 * to administrators, such as the Access Management module routes.
 */
const adminAuth = (req, res, next) => {
  // Check if user is authenticated and is an admin
  if (!req.isAuthenticated()) {
    // Not authenticated at all - redirect to login
    req.session.returnTo = req.originalUrl;
    req.flash('error', 'Please log in to access this page');
    return res.redirect('/access/login');
  }
  
  // Check if user is an admin
  if (req.user.role !== 'admin') {
    // Authenticated but not admin - show unauthorized page
    return res.status(403).render('unauthorized', {
      user: req.user || {},
      requestedUrl: req.originalUrl
    });
  }
  
  // User is authenticated and has admin role - allow access
  return next();
};

module.exports = adminAuth;
