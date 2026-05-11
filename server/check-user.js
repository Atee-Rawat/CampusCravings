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
      console.log('✅ User found:');
      console.log('  Email:', user.email);
      console.log('  Phone:', user.phone);
      console.log('  Has Password:', !!user.password);
      console.log('  Full Name:', user.fullName);
    } else {
      console.log('❌ User NOT found');
      console.log('Checking what users exist:');
      const allUsers = await User.find({}, 'email phone fullName').limit(5);
      console.log('Existing users:', allUsers);
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.connection.close();
  }
})();
