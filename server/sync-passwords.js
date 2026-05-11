const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/demo';

(async () => {
  try {
    await mongoose.connect(mongoUri);
    const User = require('./models/User');
    
    const correctPassword = '70785@Ar';
    
    // Update main account
    console.log('Updating rawatateeshay4002@gmail.com...');
    const user1 = await User.findOne({ email: 'rawatateeshay4002@gmail.com' });
    if (user1) {
      user1.password = correctPassword;
      await user1.save();
      console.log('✅ Main account updated');
    } else {
      console.log('❌ Main account NOT found');
    }
    
    // Find and update demo account
    console.log('\nLooking for demo account...');
    const demoUser = await User.findOne({ email: 'rawatateeshay@gmail.com' });
    if (demoUser) {
      console.log('Found demo account:', demoUser.email);
      demoUser.password = correctPassword;
      await demoUser.save();
      console.log('✅ Demo account updated to use same password');
    } else {
      console.log('Demo account not found, checking all users:');
      const allUsers = await User.find({}, 'email fullName').limit(10);
      allUsers.forEach(u => console.log('  -', u.email, '(' + u.fullName + ')'));
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.connection.close();
  }
})();
