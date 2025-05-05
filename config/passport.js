/**
 * Passport configuration for RRDM application
 * Sets up local strategy for authentication
 */
const LocalStrategy = require('passport-local').Strategy;
const userUtils = require('../utils/user-utils');
const { prisma } = require('./prisma');

module.exports = function(passport) {
  // Configure local strategy
  passport.use(
    new LocalStrategy(
      { usernameField: 'email' },
      async (email, password, done) => {
        try {
          console.log('Attempting login for:', email);
          
          // Find user by email
          const user = await userUtils.findUserByEmail(email);
          console.log('User found:', user ? 'yes' : 'no');
          
          // Check if user exists
          if (!user) {
            console.log('User not found');
            return done(null, false, { message: 'Invalid email or password' });
          }
          
          // Check if user account is active
          if (!user.active) {
            console.log('User account is inactive');
            return done(null, false, { message: 'Your account has been deactivated. Please contact an administrator.' });
          }
          
          // Validate password
          console.log('Validating password...');
          const isMatch = await userUtils.validatePassword(password, user.password);
          console.log('Password match:', isMatch ? 'yes' : 'no');
          
          if (isMatch) {
            // Update last login time
            console.log('Updating last login time...');
            await userUtils.updateLastLogin(user.id);
            // Remove sensitive data
            const { password: _, ...userWithoutPassword } = user;
            console.log('Login successful');
            return done(null, userWithoutPassword);
          } else {
            console.log('Invalid password');
            return done(null, false, { message: 'Invalid email or password' });
          }
        } catch (error) {
          console.error('Authentication error:', error);
          return done(error);
        }
      }
    )
  );
  
  // Serialize user for session
  passport.serializeUser((user, done) => {
    console.log('Serializing user:', user.id);
    done(null, user.id);
  });
  
  // Deserialize user from session
  passport.deserializeUser(async (id, done) => {
    try {
      console.log('Deserializing user:', id);
      const user = await userUtils.findUserById(id);
      console.log('User found:', user ? 'yes' : 'no');
      
      if (!user) {
        console.log('User not found during deserialization');
        return done(null, false);
      }
      
      if (!user.active) {
        console.log('User account is inactive');
        return done(null, false);
      }
      
      // Remove sensitive data
      const { password, ...userWithoutPassword } = user;
      console.log('Deserialization successful');
      done(null, userWithoutPassword);
    } catch (error) {
      console.error('Deserialization error:', error);
      done(error);
    }
  });
};
