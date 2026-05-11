#!/usr/bin/env node

/**
 * Initialize AI Recommendation Engine
 * Script to set up ChromaDB and index menu items for RAG pipeline
 * 
 * Usage:
 *   node server/initialize-ai.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const connectDB = require('./config/database');
const { indexMenuItems, initializeVectorStore } = require('./services/ai/aiService');

const initializeAI = async () => {
    try {
        console.log('🚀 Starting AI Recommendation Engine Initialization...\n');

        // Step 1: Connect to MongoDB
        console.log('📦 Connecting to MongoDB...');
        await connectDB();
        console.log('✅ Connected to MongoDB\n');

        // Step 2: Initialize vector store
        console.log('🔧 Initializing ChromaDB vector store...');
        try {
            await initializeVectorStore();
            console.log('✅ Vector store initialized\n');
        } catch (error) {
            console.warn('⚠️  Vector store initialization note:', error.message);
            console.log('   (This is normal if Chroma server is not running locally)\n');
        }

        // Step 3: Index all menu items
        console.log('📚 Indexing menu items into vector store...');
        const count = await indexMenuItems();
        console.log(`✅ Successfully indexed ${count} menu items\n`);

        // Step 4: Display completion message
        console.log('🎉 AI Recommendation Engine initialized successfully!\n');
        console.log('📝 Next steps:');
        console.log('   1. Configure user profiles with health goals and preferences');
        console.log('   2. Test recommendations via POST /api/ai/recommend/:userId');
        console.log('   3. Set up scheduled reindexing for new menu items\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error initializing AI engine:', error);
        console.error(error.stack);
        process.exit(1);
    }
};

// Run initialization
initializeAI();
