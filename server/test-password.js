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
      const testPassword = '70785@Atee';
      const isMatch = await user.comparePassword(testPassword);
      console.log('Testing password:', testPassword);
      console.log('Password match:', isMatch);
      
      if (!isMatch) {
        console.log('\n⚠️ Password does NOT match!');
        console.log('This might be the issue. Let me set the correct password...');
        
        // Set the password
        user.password = testPassword;
        await user.save();
        console.log('✅ Password updated');
        
        // Verify new password
        const newMatch = await user.comparePassword(testPassword);
        console.log('New password match:', newMatch);
      } else {
        console.log('\n✅ Password is correct!');
      }
    } else {
      console.log('❌ User NOT found');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.connection.close();
  }
})();
