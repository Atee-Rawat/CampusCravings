const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

// Load .env from server directory
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const University = require('../models/University');
const Outlet = require('../models/Outlet');
const MenuItem = require('../models/MenuItem');
const User = require('../models/User');

const seedData = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('📦 Connected to MongoDB');

        // Clear existing data (be careful in production!)
        if (process.env.NODE_ENV !== 'production') {
            await University.deleteMany({});
            await Outlet.deleteMany({});
            await MenuItem.deleteMany({});
            await User.deleteMany({});
            console.log('🗑️  Cleared existing data');
        }

        // Seed Universities
        const universities = await University.create([
            {
                name: 'Delhi University',
                code: 'DU',
                emailDomain: 'du.ac.in',
                city: 'New Delhi',
                state: 'Delhi',
                isActive: true
            },
            {
                name: 'Indian Institute of Technology Delhi',
                code: 'IITD',
                emailDomain: 'iitd.ac.in',
                city: 'New Delhi',
                state: 'Delhi',
                isActive: true
            },
            {
                name: 'Jawaharlal Nehru University',
                code: 'JNU',
                emailDomain: 'jnu.ac.in',
                city: 'New Delhi',
                state: 'Delhi',
                isActive: true
            },
            {
                name: 'Birla Institute of Technology and Science, Pilani',
                code: 'BITS',
                emailDomain: 'pilani.bits-pilani.ac.in',
                city: 'Pilani',
                state: 'Rajasthan',
                isActive: true
            },
            {
                name: 'Indian Institute of Science',
                code: 'IISC',
                emailDomain: 'iisc.ac.in',
                city: 'Bangalore',
                state: 'Karnataka',
                isActive: true
            }
        ]);
        console.log(`✅ Created ${universities.length} universities`);

        // Seed a demo outlet for Delhi University
        const duUniversity = universities.find(u => u.code === 'DU');
        const hashedPassword = await bcrypt.hash('demo1234', 10);

        const outlets = await Outlet.create([
            {
                name: 'Campus Chai Point',
                university: duUniversity._id,
                cuisineType: 'Cafe',
                description: 'Your daily dose of chai and snacks. Freshly brewed tea and coffee with delicious bites.',
                location: {
                    building: 'Student Center',
                    landmark: 'Near the Main Library'
                },
                contact: {
                    phone: '9876543210',
                    email: 'chai@demo.com'
                },
                operatingHours: {
                    open: '08:00',
                    close: '22:00'
                },
                isOpen: true,
                isVerified: true,
                owner: {
                    name: 'Demo Owner',
                    phone: '9876543210',
                    email: 'owner@demo.com',
                    password: hashedPassword
                }
            },
            {
                name: 'Pizza Corner',
                university: duUniversity._id,
                cuisineType: 'Pizza',
                description: 'Authentic Italian pizzas with fresh ingredients. Perfect for a quick meal between classes.',
                location: {
                    building: 'Food Court',
                    landmark: 'Ground Floor'
                },
                contact: {
                    phone: '9876543211',
                    email: 'pizza@demo.com'
                },
                operatingHours: {
                    open: '10:00',
                    close: '21:00'
                },
                isOpen: true,
                isVerified: true,
                owner: {
                    name: 'Pizza Owner',
                    phone: '9876543211',
                    email: 'pizzaowner@demo.com',
                    password: hashedPassword
                }
            },
            {
                name: 'Desi Dhaba',
                university: duUniversity._id,
                cuisineType: 'Indian',
                description: 'Authentic North Indian thalis and dishes. Taste of home away from home.',
                location: {
                    building: 'Food Court',
                    landmark: 'First Floor'
                },
                contact: {
                    phone: '9876543212',
                    email: 'dhaba@demo.com'
                },
                operatingHours: {
                    open: '11:00',
                    close: '22:00'
                },
                isOpen: false,
                isVerified: true,
                owner: {
                    name: 'Dhaba Owner',
                    phone: '9876543212',
                    email: 'dhabaowner@demo.com',
                    password: hashedPassword
                }
            }
        ]);
        console.log(`✅ Created ${outlets.length} outlets`);

        // Seed Menu Items for Campus Chai Point
        const chaiPoint = outlets.find(o => o.name === 'Campus Chai Point');
        const pizzaCorner = outlets.find(o => o.name === 'Pizza Corner');

        const menuItems = await MenuItem.create([
            // Chai Point - Beverages
            {
                outlet: chaiPoint._id,
                name: 'Masala Chai',
                description: 'Traditional Indian tea with aromatic spices',
                price: 2000, // ₹20
                category: 'Beverages',
                prepTime: 5,
                isVeg: true,
                tags: ['bestseller', 'hot']
            },
            {
                outlet: chaiPoint._id,
                name: 'Cold Coffee',
                description: 'Creamy iced coffee with chocolate drizzle',
                price: 4500, // ₹45
                category: 'Beverages',
                prepTime: 5,
                isVeg: true,
                tags: ['cold', 'popular']
            },
            {
                outlet: chaiPoint._id,
                name: 'Green Tea',
                description: 'Healthy green tea with lemon',
                price: 2500, // ₹25
                category: 'Beverages',
                prepTime: 5,
                isVeg: true,
                tags: ['healthy']
            },
            // Chai Point - Snacks
            {
                outlet: chaiPoint._id,
                name: 'Samosa',
                description: 'Crispy pastry filled with spiced potatoes',
                price: 1500, // ₹15
                category: 'Snacks',
                prepTime: 3,
                isVeg: true,
                tags: ['bestseller']
            },
            {
                outlet: chaiPoint._id,
                name: 'Bread Pakora',
                description: 'Spiced bread fritters, perfect with chai',
                price: 2000, // ₹20
                category: 'Snacks',
                prepTime: 5,
                isVeg: true,
                tags: []
            },
            {
                outlet: chaiPoint._id,
                name: 'Veg Sandwich',
                description: 'Grilled sandwich with fresh vegetables',
                price: 4000, // ₹40
                category: 'Snacks',
                prepTime: 8,
                isVeg: true,
                tags: ['healthy']
            },
            {
                outlet: chaiPoint._id,
                name: 'Maggi',
                description: 'Classic 2-minute noodles with veggies',
                price: 3500, // ₹35
                category: 'Quick Bites',
                prepTime: 7,
                isVeg: true,
                tags: ['bestseller', 'comfort']
            },

            // Pizza Corner Menu
            {
                outlet: pizzaCorner._id,
                name: 'Margherita Pizza',
                description: 'Classic cheese pizza with fresh basil',
                price: 15000, // ₹150
                category: 'Pizzas',
                prepTime: 15,
                isVeg: true,
                tags: ['bestseller']
            },
            {
                outlet: pizzaCorner._id,
                name: 'Pepperoni Pizza',
                description: 'Loaded with spicy pepperoni',
                price: 20000, // ₹200
                category: 'Pizzas',
                prepTime: 15,
                isVeg: false,
                tags: ['popular', 'spicy']
            },
            {
                outlet: pizzaCorner._id,
                name: 'Veggie Supreme',
                description: 'Loaded with bell peppers, onions, olives, and mushrooms',
                price: 18000, // ₹180
                category: 'Pizzas',
                prepTime: 15,
                isVeg: true,
                tags: []
            },
            {
                outlet: pizzaCorner._id,
                name: 'Garlic Bread',
                description: 'Crispy bread with garlic butter',
                price: 8000, // ₹80
                category: 'Sides',
                prepTime: 8,
                isVeg: true,
                tags: []
            },
            {
                outlet: pizzaCorner._id,
                name: 'Coke',
                description: '300ml bottle',
                price: 4000, // ₹40
                category: 'Beverages',
                prepTime: 1,
                isVeg: true,
                tags: []
            }
        ]);
        console.log(`✅ Created ${menuItems.length} menu items`);

        // Seed a demo user
        const demoUser = await User.create({
            fullName: 'Demo Student',
            email: 'student@du.ac.in',
            phone: '9999999999',
            university: duUniversity._id,
            isVerified: true,
            firebaseUid: 'demo-firebase-uid'
        });
        console.log(`✅ Created demo user: ${demoUser.email}`);

        console.log('\n🎉 Seed completed successfully!\n');
        console.log('📋 Demo Credentials:');
        console.log('   Student: student@du.ac.in (use Firebase Auth)');
        console.log('   Outlet Admin: owner@demo.com / demo1234');
        console.log('   Pizza Admin: pizzaowner@demo.com / demo1234\n');

        process.exit(0);

    } catch (error) {
        console.error('❌ Seed error:', error);
        process.exit(1);
    }
};

seedData();
