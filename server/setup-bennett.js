// Script to create Bennett University and a test outlet
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI;

// Define schemas inline
const universitySchema = new mongoose.Schema({
    name: String,
    code: String,
    emailDomain: String,
    city: String,
    state: String,
    isActive: { type: Boolean, default: true }
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

async function setupBennett() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB\n');

        // Check if Bennett University exists
        let bennett = await University.findOne({ name: /bennett/i });

        if (!bennett) {
            bennett = await University.create({
                name: 'Bennett University',
                code: 'BU',
                emailDomain: 'bennett.edu.in',
                city: 'Greater Noida',
                state: 'Uttar Pradesh',
                isActive: true
            });
            console.log('✅ Created Bennett University');
        } else {
            console.log('✅ Bennett University already exists');
        }
        console.log('   ID:', bennett._id);
        console.log('   Email Domain:', bennett.emailDomain);

        // Check if Bennett cafe already exists
        let bennettCafe = await Outlet.findOne({ 'owner.email': 'bennett.cafe@test.com' });

        if (!bennettCafe) {
            const hashedPassword = await bcrypt.hash('bennett123', 10);

            bennettCafe = await Outlet.create({
                name: 'Bennett Cafe',
                slug: 'bennett-cafe',
                university: bennett._id,
                cuisineType: 'Cafe & Snacks',
                description: 'The official campus cafe at Bennett University',
                location: {
                    building: 'Student Hub',
                    landmark: 'Near Central Library'
                },
                contact: {
                    phone: '9876543211',
                    email: 'bennett.cafe@test.com'
                },
                operatingHours: {
                    open: '08:00',
                    close: '22:00'
                },
                isOpen: true,
                isVerified: true,
                owner: {
                    name: 'Bennett Cafe Admin',
                    phone: '9876543211',
                    email: 'bennett.cafe@test.com',
                    password: hashedPassword
                }
            });
            console.log('\n✅ Created Bennett Cafe outlet');
        } else {
            console.log('\n✅ Bennett Cafe already exists');
        }

        console.log('\n' + '━'.repeat(50));
        console.log('ADMIN LOGIN CREDENTIALS:');
        console.log('━'.repeat(50));
        console.log('Email:     bennett.cafe@test.com');
        console.log('Password:  bennett123');
        console.log('━'.repeat(50));

        console.log('\n' + '━'.repeat(50));
        console.log('STUDENT REGISTRATION:');
        console.log('━'.repeat(50));
        console.log('Go to: http://localhost:5173/register');
        console.log('Select: Bennett University');
        console.log('Use any @bennett.edu.in email');
        console.log('━'.repeat(50));

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

setupBennett();
