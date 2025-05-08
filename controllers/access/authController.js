/**
 * Authentication Controller
 * Handles user authentication and session management
 */
const passport = require('passport');
const { prisma } = require('../../config/database');
const bcrypt = require('bcryptjs');

/**
 * Display the login form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showLoginForm = (req, res) => {
  // Get error messages if any
  const errorMsg = req.flash('error_msg');
  const errors = [];
  
  if (errorMsg && errorMsg.length > 0) {
    errors.push({ field: 'email', message: errorMsg[0] });
  }
  
  res.render('modules/access/login', {
    title: 'Login',
    layout: 'layouts/auth',
    errors: errors,
    email: req.body ? req.body.email : '',
    user: req.user
  });
};

/**
 * Process login form submission
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const processLogin = (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      console.error('Authentication error:', err);
      req.flash('error_msg', 'An error occurred during authentication');
      return res.redirect('/access/login');
    }
    
    if (!user) {
      // Authentication failed
      req.flash('error_msg', info.message || 'Invalid email or password');
      return res.redirect('/access/login');
    }
    
    // Authentication successful, log the user in
    req.logIn(user, (err) => {
      if (err) {
        console.error('Login error:', err);
        req.flash('error_msg', 'An error occurred during login');
        return res.redirect('/access/login');
      }
      // Redirect to the home page after successful login
      return res.redirect('/');
    });
  })(req, res, next);
};

/**
 * Log out the user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const logout = (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Error during logout:', err);
      return res.status(500).render('error', {
        title: 'Error',
        message: 'Failed to log out',
        error: err
      });
    }
    req.flash('success_msg', 'You are logged out');
    res.redirect('/access/login');
  });
};

/**
 * Display the registration form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const showRegisterForm = (req, res) => {
  res.render('modules/access/register', {
    title: 'Register',
    error: req.flash('error'),
    user: req.user
  });
};

/**
 * Process registration form submission
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const processRegistration = async (req, res) => {
  try {
    const { name, email, password, password2 } = req.body;
    
    // Validation
    const errors = [];
    
    if (!name || !email || !password || !password2) {
      errors.push('Please fill in all fields');
    }
    
    if (password !== password2) {
      errors.push('Passwords do not match');
    }
    
    if (password.length < 6) {
      errors.push('Password should be at least 6 characters');
    }
    
    // Check if user already exists
    const existingUser = await prisma.users.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      errors.push('Email is already registered');
    }
    
    if (errors.length > 0) {
      return res.render('modules/access/register', {
        title: 'Register',
        errors,
        name,
        email,
        user: req.user
      });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create user
    await prisma.users.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'user',
        active: true
      }
    });
    
    req.flash('success_msg', 'You are now registered and can log in');
    res.redirect('/access/login');
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to register user',
      error,
      user: req.user
    });
  }
};

module.exports = {
  showLoginForm,
  processLogin,
  logout,
  showRegisterForm,
  processRegistration
};
