/**
 * Authentication Controller
 * Handles user authentication and session management
 * 
 * Enhanced with comprehensive error handling for improved reliability
 */
const passport = require('passport');
const { prisma } = require('../../config/database');
const bcrypt = require('bcryptjs');
const { 
  handleDatabaseError, 
  handleWebError, 
  createError, 
  ErrorTypes, 
  asyncHandler 
} = require('../../utils/error-handler');

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
      // Enhanced error handling for authentication errors
      const authError = createError(
        'An error occurred during authentication', 
        ErrorTypes.AUTHENTICATION, 
        { originalError: err }
      );
      
      // Log the error with context
      req.flash('error_msg', authError.message);
      return res.redirect('/access/login');
    }
    
    if (!user) {
      // Authentication failed - create a validation error
      const validationError = createError(
        info.message || 'Invalid email or password',
        ErrorTypes.VALIDATION
      );
      
      req.flash('error_msg', validationError.message);
      return res.redirect('/access/login');
    }
    
    // Authentication successful, log the user in
    req.logIn(user, (err) => {
      if (err) {
        // Enhanced error handling for login errors
        const loginError = createError(
          'An error occurred during login',
          ErrorTypes.AUTHENTICATION,
          { originalError: err }
        );
        
        req.flash('error_msg', loginError.message);
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
      // Enhanced error handling for logout errors
      const logoutError = createError(
        'Failed to log out', 
        ErrorTypes.SERVER, 
        { originalError: err }
      );
      
      return handleWebError(logoutError, req, res, {
        viewPath: 'error',
        defaultStatusCode: 500
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
const processRegistration = asyncHandler(async (req, res) => {
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
    try {
      const existingUser = await prisma.users.findUnique({
        where: { email }
      });
      
      if (existingUser) {
        errors.push('Email is already registered');
      }
    } catch (dbError) {
      // Enhanced database error handling
      const enhancedError = handleDatabaseError(dbError, {
        logLevel: 'error',
        includeStack: true
      });
      
      throw createError(
        'Error checking user existence', 
        ErrorTypes.DATABASE, 
        { originalError: enhancedError }
      );
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
    
    // Create user with enhanced error handling
    try {
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
    } catch (dbError) {
      // Enhanced database error handling for user creation
      const enhancedError = handleDatabaseError(dbError, {
        logLevel: 'error',
        includeStack: true
      });
      
      throw createError(
        'Failed to create user account', 
        ErrorTypes.DATABASE, 
        { originalError: enhancedError }
      );
    }
  } catch (error) {
    // If it's already a typed error from createError, pass it through
    if (error.type) {
      return handleWebError(error, req, res, {
        viewPath: 'error',
        defaultStatusCode: 500,
        defaultMessage: 'Failed to register user'
      });
    }
    
    // Otherwise, create a generic server error
    const serverError = createError(
      'An unexpected error occurred during registration',
      ErrorTypes.SERVER,
      { originalError: error }
    );
    
    return handleWebError(serverError, req, res, {
      viewPath: 'error',
      defaultStatusCode: 500
    });
  }
});

module.exports = {
  showLoginForm,
  processLogin,
  logout,
  showRegisterForm,
  processRegistration
};
