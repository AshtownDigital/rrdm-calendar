/**
 * Passport configuration for RRDM application with MongoDB integration
 * Sets up local strategy for authentication using MongoDB
 */
const LocalStrategy = require('passport-local').Strategy;
const userUtils = require('../utils/mongo-user-utils');

module.exports = function(passport) {
  // Configure local strategy
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password'
      },
      async (email, password, done) => {
        try {
          // Find user by email
          const user = await userUtils.findUserByEmail(email);
          
          if (!user) {
            console.log(`User not found with email: ${email}`);
            return done(null, false, { message: 'Invalid email or password' });
          }
          
          // Check if user is active
          if (!user.active) {
            console.log(`User account is inactive: ${email}`);
            return done(null, false, { message: 'Your account is inactive. Please contact an administrator.' });
          }
          
          // Validate password
          const isMatch = await userUtils.validatePassword(password, user.password);
          
          if (isMatch) {
            // Update last login time
            await userUtils.updateLastLogin(user._id);
            
            // Remove sensitive data
            const userObj = user.toObject();
            delete userObj.password;
            
            return done(null, userObj);
          } else {
            console.log(`Invalid password for user: ${email}`);
            return done(null, false, { message: 'Invalid email or password' });
          }
        } catch (error) {
          console.error('Error in passport authentication:', error);
          return done(error);
        }
      }
    )
  );

  // Serialize user for session
  passport.serializeUser((user, done) => {
    done(null, user._id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await userUtils.findUserById(id);
      if (!user) {
        return done(null, false);
      }
      
      // Remove sensitive data
      const userObj = user.toObject();
      delete userObj.password;
      
      done(null, userObj);
    } catch (error) {
      done(error);
    }
  });
};
