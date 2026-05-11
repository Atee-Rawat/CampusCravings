const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/demo';

(async () => {
  try {
    await mongoose.connect(mongoUri);
    const User = require('./models/User');
    
    const demoUser = await User.findOne({ email: 'rawatateeshay@gmail.com' });
    if (demoUser) {
      console.log('Demo account found');
      const testPassword = '70785@Ar';
      const isMatch = await demoUser.comparePassword(testPassword);
      
      if (isMatch) {
        console.log('✅ Demo account already has the correct password');
      } else {
        console.log('❌ Password does not match, updating...');
        demoUser.password = testPassword;
        await demoUser.save();
        console.log('✅ Demo account password updated');
      }
    } else {
      console.log('❌ Demo account not found');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.connection.close();
  }
})();
