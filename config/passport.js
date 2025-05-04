/**
 * Passport configuration for RRDM application
 * Sets up local strategy for authentication
 */
const LocalStrategy = require('passport-local').Strategy;
const userUtils = require('../utils/user-utils');

module.exports = function(passport) {
  // Configure local strategy
  passport.use(
    new LocalStrategy(
      { usernameField: 'email' },
      async (email, password, done) => {
        try {
          // Find user by email
          const user = userUtils.findUserByEmail(email);
          
          // Check if user exists
          if (!user) {
            return done(null, false, { message: 'Invalid email or password' });
          }
          
          // Check if user account is active
          if (user.active === false) {
            return done(null, false, { message: 'Your account has been deactivated. Please contact an administrator.' });
          }
          
          // Validate password
          const isMatch = await userUtils.validatePassword(password, user.password);
          
          if (isMatch) {
            // Update last login time
            userUtils.updateLastLogin(user.id);
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
  passport.deserializeUser((id, done) => {
    try {
      const user = userUtils.findUserById(id);
      if (!user) {
        // Handle case where user no longer exists
        console.warn(`User with ID ${id} not found during session deserialization`);
        return done(null, false);
      }
      
      // Check if user account is active
      if (user.active === false) {
        console.warn(`Inactive user with ID ${id} attempted to access the application`);
        return done(null, false);
      }
      
      done(null, user);
    } catch (error) {
      console.error(`Error deserializing user with ID ${id}:`, error);
      done(error);
    }
  });
};
