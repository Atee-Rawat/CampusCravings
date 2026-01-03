// Script to create Chai Point outlet for Bennett University
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI;

const universitySchema = new mongoose.Schema({ name: String });
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
    }
}, { timestamps: true });

const University = mongoose.models.University || mongoose.model('University', universitySchema);
const Outlet = mongoose.models.Outlet || mongoose.model('Outlet', outletSchema);

async function createChaiPoint() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB\n');

        // Find Bennett University
        const bennett = await University.findOne({ name: /bennett/i });
        if (!bennett) {
            console.log('Bennett University not found!');
            process.exit(1);
        }
        console.log('Found Bennett University:', bennett._id);

        // Check if already exists
        const existing = await Outlet.findOne({ slug: 'chai-point' });
        if (existing) {
            console.log('\nChai Point already exists!');
        } else {
            const hashedPassword = await bcrypt.hash('chai123', 10);

            await Outlet.create({
                name: 'Chai Point',
                slug: 'chai-point',
                university: bennett._id,
                cuisineType: 'Beverages & Snacks',
                description: 'Fresh chai and quick bites at Bennett University',
                location: {
                    building: 'Food Court',
                    landmark: 'Ground Floor'
                },
                contact: {
                    phone: '9876543212',
                    email: 'chaipoint@test.com'
                },
                operatingHours: {
                    open: '07:00',
                    close: '23:00'
                },
                isOpen: true,
                isVerified: true,
                owner: {
                    name: 'Chai Point Admin',
                    phone: '9876543212',
                    email: 'chaipoint@test.com',
                    password: hashedPassword
                }
            });
            console.log('\nCreated Chai Point outlet!');
        }

        console.log('\n' + '='.repeat(40));
        console.log('CHAI POINT ADMIN CREDENTIALS:');
        console.log('='.repeat(40));
        console.log('Email:    chaipoint@test.com');
        console.log('Password: chai123');
        console.log('='.repeat(40));
        console.log('\nLogin at: http://localhost:5173/admin/login');

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

createChaiPoint();
