/**
 * Authentication Controller
 * Handles user authentication for the BCR module
 */
// Using centralized Prisma client
const { prisma } = require('../config/prisma');
// Prisma client is imported from centralized config
const bcrypt = require('bcryptjs');
const passport = require('passport');

/**
 * Render an error page with consistent formatting
 */
function renderError(res, { status = 500, title = 'Error', message = 'An error occurred', error = {}, user = null }) {
  return res.status(status).render('error', {
    title,
    message,
    error: process.env.NODE_ENV === 'development' ? error : {},
    user
  });
}

/**
 * Display login form
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
function loginForm(req, res) {
  // If user is already logged in, redirect to home
  if (req.user) {
    return res.redirect('/');
  }
  
  // Render the login form
  res.render('modules/bcr/auth/login.njk', {
    title: 'Login',
    error: req.flash('error'),
    user: null
  });
}

/**
 * Process login request
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function login(req, res, next) {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      console.error('Login error:', err);
      return next(err);
    }
    
    if (!user) {
      req.flash('error', info.message || 'Invalid email or password');
      return res.redirect('/bcr/login');
    }
    
    req.logIn(user, (loginErr) => {
      if (loginErr) {
        console.error('Login error:', loginErr);
        return next(loginErr);
      }
      
      // Redirect to the intended URL or home page
      const redirectTo = req.session.returnTo || '/';
      delete req.session.returnTo;
      return res.redirect(redirectTo);
    });
  })(req, res, next);
}

/**
 * Process logout request
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
function logout(req, res) {
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
      return renderError(res, {
        status: 500,
        title: 'Error',
        message: 'Failed to log out',
        error: err
      });
    }
    
    req.flash('success', 'You have been logged out successfully');
    res.redirect('/bcr/login');
  });
}

module.exports = {
  loginForm,
  login,
  logout
};
