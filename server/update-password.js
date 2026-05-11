const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/demo';

(async () => {
  try {
    await mongoose.connect(mongoUri);
    const User = require('./models/User');
    
    const user = await User.findOne({ email: 'rawatateeshay4002@gmail.com' });
    if (user) {
      const correctPassword = '70785@Ar';
      
      console.log('Updating password with:', correctPassword);
      user.password = correctPassword;
      await user.save();
      console.log('✅ Password updated successfully');
      
      // Verify the new password
      const isMatch = await user.comparePassword(correctPassword);
      console.log('Password verification:', isMatch);
    } else {
      console.log('❌ User NOT found');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.connection.close();
  }
})();
