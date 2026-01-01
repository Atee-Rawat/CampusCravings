const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI;

        if (!mongoUri) {
            console.error('❌ MONGODB_URI is not defined!');
            console.error('   Please create a .env file in the /server directory with your MongoDB connection string.');
            console.error('   Example: MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname');
            process.exit(1);
        }

        const conn = await mongoose.connect(mongoUri, {
            // Mongoose 8 defaults are good, no need for deprecated options
        });

        console.log(`📦 MongoDB Connected: ${conn.connection.host}`);

        // Handle connection events
        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('MongoDB disconnected. Attempting to reconnect...');
        });

        mongoose.connection.on('reconnected', () => {
            console.log('MongoDB reconnected');
        });

    } catch (error) {
        console.error('Error connecting to MongoDB:', error.message);
        process.exit(1);
    }
};

module.exports = connectDB;
