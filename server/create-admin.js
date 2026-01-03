// Script to create a test admin (outlet owner) account
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI;

// Define schemas inline to avoid import issues
const universitySchema = new mongoose.Schema({
    name: String,
    code: String
});

const outletSchema = new mongoose.Schema({
    name: String,
    slug: String,
    university: { type: mongoose.Schema.Types.ObjectId, ref: 'University' },
    cuisineType: String,
    description: String,
    location: { building: String, landmark: String },
    contact: { phone: String, email: String },
    operatingHours: { open: String, close: String },
    isOpen: Boolean,
    isVerified: Boolean,
    owner: {
        name: String,
        phone: String,
        email: String,
        password: String
    },
    stats: {
        totalOrders: { type: Number, default: 0 },
        totalRevenue: { type: Number, default: 0 },
        avgRating: { type: Number, default: 0 }
    }
}, { timestamps: true });

const University = mongoose.models.University || mongoose.model('University', universitySchema);
const Outlet = mongoose.models.Outlet || mongoose.model('Outlet', outletSchema);

async function createTestAdmin() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find or create a university
        let university = await University.findOne();
        if (!university) {
            university = await University.create({
                name: 'Demo University',
                code: 'DU'
            });
            console.log('Created Demo University');
        }
        console.log('Using university:', university.name);

        // Check if test outlet already exists
        const existingOutlet = await Outlet.findOne({ 'owner.email': 'admin@test.com' });
        if (existingOutlet) {
            console.log('\n✅ Test admin already exists!');
            console.log('━'.repeat(40));
            console.log('Email:    admin@test.com');
            console.log('Password: admin123');
            console.log('━'.repeat(40));
            await mongoose.disconnect();
            return;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash('admin123', 10);

        // Create test outlet with admin owner
        const outlet = await Outlet.create({
            name: 'Test Cafe',
            slug: 'test-cafe',
            university: university._id,
            cuisineType: 'Multi-Cuisine',
            description: 'A test cafe for development',
            location: {
                building: 'Main Block',
                landmark: 'Near Library'
            },
            contact: {
                phone: '9876543210',
                email: 'admin@test.com'
            },
            operatingHours: {
                open: '09:00',
                close: '21:00'
            },
            isOpen: true,
            isVerified: true,  // Important: must be verified to login
            owner: {
                name: 'Test Admin',
                phone: '9876543210',
                email: 'admin@test.com',
                password: hashedPassword
            }
        });

        console.log('\n✅ Test admin account created successfully!');
        console.log('━'.repeat(40));
        console.log('Outlet:   ', outlet.name);
        console.log('Email:    admin@test.com');
        console.log('Password: admin123');
        console.log('━'.repeat(40));
        console.log('\nGo to: http://localhost:5173/admin/login');

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

createTestAdmin();
