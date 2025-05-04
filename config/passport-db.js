/**
 * Passport configuration for RRDM application with database integration
 * Sets up local strategy for authentication using PostgreSQL database
 */
const LocalStrategy = require('passport-local').Strategy;
const userUtils = require('../utils/db-user-utils');

module.exports = function(passport) {
  // Configure local strategy
  passport.use(
    new LocalStrategy(
      { usernameField: 'email' },
      async (email, password, done) => {
        try {
          // Find user by email
          const user = await userUtils.findUserByEmail(email);
          
          // Check if user exists
          if (!user) {
            return done(null, false, { message: 'Invalid email or password' });
          }
          
          // Check if user account is active
          if (user.active === false) {
            return done(null, false, { message: 'Your account has been deactivated. Please contact an administrator.' });
          }
          
          // Validate password
          const isMatch = await user.validatePassword(password);
          
          if (isMatch) {
            // Update last login time
            await userUtils.updateLastLogin(user.id);
            return done(null, user);
          } else {
            return done(null, false, { message: 'Invalid email or password' });
          }
        } catch (error) {
          return done(error);
        }
      }
    )
  );
  
  // Serialize user for session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  
  // Deserialize user from session
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await userUtils.findUserById(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
};
