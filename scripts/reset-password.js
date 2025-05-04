const { findUserByEmail, updateUserPassword } = require('../utils/user-utils');

async function resetPassword() {
  try {
    const user = findUserByEmail('admin@email.com');
    if (!user) {
      console.error('User not found');
      process.exit(1);
    }

    await updateUserPassword(user.id, 'Password1254');
    console.log('Password successfully reset for admin@email.com');
  } catch (error) {
    console.error('Error resetting password:', error);
    process.exit(1);
  }
}

resetPassword();
