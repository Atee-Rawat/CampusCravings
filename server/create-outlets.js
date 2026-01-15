// Script to create multiple outlets for Bennett University
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

const outlets = [
    {
        name: 'Kathi Junction',
        slug: 'kathi-junction',
        cuisineType: 'North Indian Wraps',
        description: 'Delicious kathi rolls and wraps at Bennett University',
        location: { building: 'Food Court', landmark: 'Near Main Gate' },
        contact: { phone: '9876543301', email: 'kathi@test.com' },
        operatingHours: { open: '10:00', close: '22:00' },
        owner: { name: 'Kathi Junction Admin', phone: '9876543301', email: 'kathi@test.com' },
        password: 'kathi123'
    },
    {
        name: 'Southern Stories',
        slug: 'southern-stories',
        cuisineType: 'South Indian',
        description: 'Authentic dosas, idlis and South Indian delights',
        location: { building: 'Food Court', landmark: 'Block B' },
        contact: { phone: '9876543302', email: 'southern@test.com' },
        operatingHours: { open: '08:00', close: '21:00' },
        owner: { name: 'Southern Stories Admin', phone: '9876543302', email: 'southern@test.com' },
        password: 'south123'
    },
    {
        name: 'FitShack',
        slug: 'fitshack',
        cuisineType: 'Healthy & Fitness',
        description: 'Protein bowls, smoothies and healthy meals for fitness enthusiasts',
        location: { building: 'Gym Area', landmark: 'Sports Complex' },
        contact: { phone: '9876543303', email: 'fitshack@test.com' },
        operatingHours: { open: '06:00', close: '20:00' },
        owner: { name: 'FitShack Admin', phone: '9876543303', email: 'fitshack@test.com' },
        password: 'fit123'
    },
    {
        name: 'Maggie Point',
        slug: 'maggie-point',
        cuisineType: 'Quick Bites',
        description: 'Hot Maggi varieties and instant noodles - student favorite!',
        location: { building: 'Hostel Area', landmark: 'Near Boys Hostel' },
        contact: { phone: '9876543304', email: 'maggie@test.com' },
        operatingHours: { open: '09:00', close: '02:00' },
        owner: { name: 'Maggie Point Admin', phone: '9876543304', email: 'maggie@test.com' },
        password: 'maggie123'
    }
];

async function createOutlets() {
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
        console.log('\n' + '='.repeat(50));

        for (const outlet of outlets) {
            // Check if already exists
            const existing = await Outlet.findOne({ slug: outlet.slug });
            if (existing) {
                console.log(`⏩ ${outlet.name} already exists, skipping...`);
                continue;
            }

            const hashedPassword = await bcrypt.hash(outlet.password, 10);

            await Outlet.create({
                name: outlet.name,
                slug: outlet.slug,
                university: bennett._id,
                cuisineType: outlet.cuisineType,
                description: outlet.description,
                location: outlet.location,
                contact: outlet.contact,
                operatingHours: outlet.operatingHours,
                isOpen: true,
                isVerified: true,
                owner: {
                    name: outlet.owner.name,
                    phone: outlet.owner.phone,
                    email: outlet.owner.email,
                    password: hashedPassword
                }
            });
            console.log(`✅ Created ${outlet.name}`);
        }

        console.log('\n' + '='.repeat(50));
        console.log('OUTLET ADMIN CREDENTIALS:');
        console.log('='.repeat(50));
        for (const outlet of outlets) {
            console.log(`\n${outlet.name}:`);
            console.log(`  Email:    ${outlet.owner.email}`);
            console.log(`  Password: ${outlet.password}`);
        }
        console.log('\n' + '='.repeat(50));
        console.log('\nLogin at: http://localhost:5173/admin/login');

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

createOutlets();
