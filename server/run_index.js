require('dotenv').config();
const mongoose = require('mongoose');
const { indexMenuItems } = require('./services/ai/aiService');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const count = await indexMenuItems();
    console.log('Indexed', count, 'items');
    process.exit(0);
}
run();
