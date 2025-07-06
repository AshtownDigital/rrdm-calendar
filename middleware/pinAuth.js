/**
 * Simple PIN authentication middleware.
 * If `req.session.authenticated` is truthy user proceeds.
 * Otherwise redirect to /login and save requested URL.
 */
module.exports = (req, res, next) => {
  const openPaths = ['/login', '/logout', '/assets', '/public'];
  if (openPaths.some(p => req.path.startsWith(p))) {
    return next();
  }
  if (req.session && req.session.authenticated) {
    return next();
  }
  req.session.returnTo = req.originalUrl;
  req.flash('warning', 'You must sign in to access that page.');
  return res.redirect('/login');
};
