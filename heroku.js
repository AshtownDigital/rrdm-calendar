// Heroku configuration for RRDM application
const express = require('express');
const path = require('path');
const nunjucks = require('nunjucks');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const helmet = require('helmet');
const morgan = require('morgan');
const dateFilter = require('nunjucks-date-filter');

// Initialize Express app
const app = express();

// Set up port for Heroku
const PORT = process.env.PORT || 3000;

// Configure view engine
app.set('view engine', 'njk');

// Configure Nunjucks
const nunjucksEnvironment = nunjucks.configure(['views'], {
  autoescape: true,
  express: app
});
nunjucksEnvironment.addFilter('date', dateFilter);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false
}));

// Logging
app.use(morgan('dev'));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'heroku-session-secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    ttl: 14 * 24 * 60 * 60, // 14 days
    autoRemove: 'native'
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 1 day
    secure: process.env.NODE_ENV === 'production'
  }
}));

// Flash messages
app.use(flash());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log('Connected to MongoDB');
})
.catch(err => {
  console.error('MongoDB connection error:', err);
});

// Global variables
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  next();
});

// Basic routes
app.get('/', (req, res) => {
  res.render('index', {
    title: 'RRDM - Green Staging',
    environment: process.env.NODE_ENV || 'staging'
  });
});

// BCR Dashboard route
app.get('/bcr/dashboard', (req, res) => {
  res.render('modules/bcr/dashboard', {
    title: 'BCR Dashboard',
    counters: {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      implemented: 0
    },
    impactAreas: [
      { name: 'Backend', description: 'Backend systems and services', type: 'blue' },
      { name: 'Frontend', description: 'User interface and experience', type: 'blue' },
      { name: 'API', description: 'Application programming interfaces', type: 'blue' },
      { name: 'CSV', description: 'CSV data handling', type: 'blue' },
      { name: 'Reference Data', description: 'Reference data management', type: 'blue' },
      { name: 'Documentation & Guidance', description: 'Documentation and user guides', type: 'green' },
      { name: 'Policy', description: 'Policy changes and updates', type: 'green' },
      { name: 'Funding', description: 'Funding-related changes', type: 'green' },
      { name: 'Other', description: 'Other impact areas', type: 'red' }
    ],
    recentBcrs: []
  });
});

// Health check endpoint for Heroku
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'staging',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'staging'} mode`);
});

module.exports = app;
