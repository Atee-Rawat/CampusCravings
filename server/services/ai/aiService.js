/**
 * AI Recommendation Service
 * Implements RAG (Retrieval-Augmented Generation) pipeline using LangChain + Google Gemini + ChromaDB
 * For personalized meal recommendations based on user profile and order history
 */

const { MemoryVectorStore } = require('@langchain/classic/vectorstores/memory');
const { GoogleGenerativeAIEmbeddings } = require('@langchain/google-genai');
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { HumanMessage, SystemMessage } = require('@langchain/core/messages');
const { Document } = require('@langchain/core/documents');
const path = require('path');
const fs = require('fs');

const { MenuItem, User, Order } = require('../../models');

// Global instance for memory vector store
let memoryStore = null;

// Initialize embeddings model
const getEmbeddings = () => {
    const model = process.env.GOOGLE_EMBEDDING_MODEL || 'gemini-embedding-001';
    return new GoogleGenerativeAIEmbeddings({
        apiKey: process.env.GOOGLE_API_KEY,
        modelName: model,
        model: model
    });
};

// Initialize standard Gemini model for complex tasks
const getGeminiModel = () => {
    const envModel = process.env.AI_CHAT_MODEL || process.env.GOOGLE_MODEL;
    const modelName = envModel || 'gemini-2.5-flash';
    return new ChatGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_API_KEY,
        modelName: modelName,
        model: modelName,
        temperature: Number(process.env.AI_CHAT_TEMPERATURE || 0.2),
        maxOutputTokens: Number(process.env.AI_CHAT_MAX_OUTPUT_TOKENS || 2048)
    });
};

/**
 * Initialize or load ChromaDB vector store
 * @returns {Promise<Chroma>} Vector store instance
 */
const initializeVectorStore = async () => {
    try {
        if (memoryStore) {
            return memoryStore;
        }

        const embeddings = getEmbeddings();
        memoryStore = new MemoryVectorStore(embeddings);

        console.log('✓ Memory vector store initialized successfully');
        
        // Auto-index if it's the first time
        await indexMenuItems();

        return memoryStore;
    } catch (error) {
        console.error('Error initializing vector store:', error);
        throw error;
    }
};

/**
 * Index all menu items into vector store
 * Call this periodically to keep embeddings updated
 * @returns {Promise<number>} Number of items indexed
 */
const indexMenuItems = async () => {
    try {
        if (!memoryStore) {
            const embeddings = getEmbeddings();
            memoryStore = new MemoryVectorStore(embeddings);
        }

        // Fetch all available menu items
        const menuItems = await MenuItem.find({ isAvailable: true })
            .populate('outlet', 'name location')
            .lean();

        if (menuItems.length === 0) {
            console.log('No menu items to index');
            return 0;
        }

        // Convert menu items to documents for embedding
        const documents = menuItems.map(item => {
            // Rich text representation for better semantic search
            const textContent = `
            Name: ${item.name}
            Description: ${item.description || 'No description'}
            Category: ${item.category}
            Price: ₹${(item.price / 100).toFixed(2)}
            Outlet: ${item.outlet?.name}
            Vegetarian: ${item.isVeg ? 'Yes' : 'No'}
            Tags: ${(item.tags || []).join(', ')}
            Calories: ${item.nutrition?.calories || 'Unknown'}
            Protein: ${item.nutrition?.protein || 'Unknown'}g
            Carbs: ${item.nutrition?.carbs || 'Unknown'}g
            Rating: ${item.averageRating}/5
            Reviews: ${item.reviewCount}
            Prep Time: ${item.prepTime} minutes
            `;

            return new Document({
                pageContent: textContent,
                metadata: {
                    id: item._id.toString(),
                    name: item.name,
                    price: item.price,
                    category: item.category,
                    outlet: item.outlet?.name,
                    isVeg: item.isVeg,
                    calories: item.nutrition?.calories,
                    protein: item.nutrition?.protein,
                    carbs: item.nutrition?.carbs,
                    rating: item.averageRating,
                    prepTime: item.prepTime
                }
            });
        });

        // Add documents to memory store
        await memoryStore.addDocuments(documents);

        console.log(`✓ Indexed ${menuItems.length} menu items into Memory Store`);
        return menuItems.length;
    } catch (error) {
        console.error('Error indexing menu items:', error);
        throw error;
    }
};

/**
 * Retrieve relevant menu items using semantic search
 * @param {string} query - Natural language query
 * @param {number} limit - Number of results to return
 * @returns {Promise<Array>} Retrieved documents with metadata
 */
const retrieveRelevantItems = async (query, limit = 20) => {
    try {
        const vectorStore = await initializeVectorStore();

        const results = await vectorStore.similaritySearch(query, limit);

        return results;
    } catch (error) {
        console.error('Error retrieving relevant items:', error);
        throw error;
    }
};

/**
 * Build user context from profile and order history
 * @param {Object} user - User document
 * @returns {Promise<string>} Formatted context string for AI
 */
const buildUserContext = async (user) => {
    try {
        // Fetch last 10 orders for context
        const recentOrders = await Order.find({ userId: user._id })
            .populate('items.menuItem', 'name category price')
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

        // Get favorite items
        const favoriteItems = await MenuItem.find({
            _id: { $in: user.favoriteItems.map(f => f.item) }
        }).select('name category').lean();

        // Build context prompt
        let context = `
User Profile:
- Health Goals: ${user.healthGoals?.join(', ') || 'Balanced diet'}
- Dietary Preferences: ${user.dietaryPreferences?.join(', ') || 'No specific preferences'}
- Allergies: ${user.allergies?.length ? user.allergies.join(', ') : 'None reported'}
- Budget per meal: ₹${(user.budgetPerMeal / 100).toFixed(2)}
- Daily calorie target: ${user.dailyCalorieTarget} kcal
- Preferred cuisines: ${user.preferredCuisines?.join(', ') || 'All cuisines'}

Recent Order History (Last 10 Orders):
        `;

        recentOrders.forEach((order, index) => {
            const itemsList = order.items.map(i => i.menuItem?.name).join(', ');
            context += `\n${index + 1}. ${itemsList}`;
        });

        context += `

Favorite Items:
${favoriteItems.map(item => `- ${item.name} (${item.category})`).join('\n')}
        `;

        return context;
    } catch (error) {
        console.error('Error building user context:', error);
        throw error;
    }
};

/**
 * Generate personalized recommendations using RAG
 * @param {string} userId - User ID
 * @param {Object} options - Filters and options
 * @param {number} options.limit - Number of recommendations (default: 8)
 * @param {string} options.outlet - Optional outlet filter
 * @returns {Promise<Array>} Array of recommendations with explanations
 */
const recommendMeals = async (userId, options = {}) => {
    try {
        const { limit = 8, outlet = null } = options;

        // Fetch user
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Check if profile is complete for recommendations
        if (!user.healthGoals?.length && !user.dietaryPreferences?.length) {
            console.warn('User profile not fully configured for recommendations');
        }

        // Step 1: Build user context
        const userContext = await buildUserContext(user);

        // Step 2: Create semantic search query from user profile
        const searchQuery = `
        ${user.healthGoals?.join(' ')} food items
        ${user.dietaryPreferences?.join(' ')}
        under ₹${(user.budgetPerMeal / 100).toFixed(2)}
        with ${user.dailyCalorieTarget} calories target
        ${user.preferredCuisines?.length ? `preferring ${user.preferredCuisines.join(', ')} cuisines` : ''}
        `;

        // Step 3: Retrieve relevant items using RAG
        const retrievedDocs = await retrieveRelevantItems(searchQuery, Math.min(limit * 3, 30));

        if (retrievedDocs.length === 0) {
            console.warn('No relevant items found for recommendations');
            return [];
        }

        // Step 4: Use Gemini for final ranking and reasoning
        const gemini = getGeminiModel();

        const systemPrompt = `You are a personalized meal recommendation AI assistant for a campus food ordering platform.
Your job is to rank and explain menu items based on the user's health goals, dietary preferences, allergies, budget, and order history.

Return ONLY a valid JSON array with exactly this structure, no markdown, no extra text:
[
  {
    "menuItemId": "id from metadata",
    "matchScore": number 0-100,
    "personalizedReason": "brief explanation why this fits the user",
    "nutritionalHighlights": "key nutritional benefits"
  }
]

Rules:
- NEVER recommend items with ingredients the user is allergic to
- Filter by budget constraint and health goals
- Consider order history patterns
- Provide diverse recommendations across categories
- Return top ${limit} items only
- Include in matchScore calculation: budget fit, health goal alignment, calorie target fit, and order history patterns
`;

        const userMessage = `
${userContext}

Available menu items to rank:
${retrievedDocs.map((doc, i) => `${i + 1}. ID: ${doc.metadata.id}\n${doc.pageContent}`).join('\n---\n')}

Rank and filter these items for personalized recommendations based on the user profile above.
Return ONLY the top ${limit} items in the specified JSON format.
        `;

        const messages = [
            new SystemMessage(systemPrompt),
            new HumanMessage(userMessage)
        ];

        const response = await gemini.invoke(messages);
        const responseText = typeof response.content === 'string' ? response.content : String(response.content || '');

        // Robust JSON array extraction: strip code fences and language tags,
        // then find first '[' and last ']' and parse that slice.
        const cleanAndParse = (text) => {
            if (!text || typeof text !== 'string') return null;
            // Remove triple-backtick fences with optional language (e.g. ```json)
            let cleaned = text.replace(/```(?:json)?\s*/i, '');
            cleaned = cleaned.replace(/\s*```$/i, '');
            cleaned = cleaned.trim();

            // Find JSON array boundaries
            const firstBracket = cleaned.indexOf('[');
            const lastBracket = cleaned.lastIndexOf(']');
            if (firstBracket === -1 || lastBracket === -1 || lastBracket <= firstBracket) {
                return null;
            }

            const candidate = cleaned.slice(firstBracket, lastBracket + 1);
            try {
                return JSON.parse(candidate);
            } catch (e) {
                // Try a looser cleanup: remove non-printable chars
                const relaxed = candidate.replace(/[^\x20-\x7E\n\r\t\[\]\{\}:,\"\'\\]/g, '');
                try {
                    return JSON.parse(relaxed);
                } catch (e2) {
                    return null;
                }
            }
        };

        let recommendations = cleanAndParse(responseText);
        if (!Array.isArray(recommendations)) {
            console.error('Error parsing Gemini response: could not extract valid JSON array');
            console.error('Response text:', responseText);
            // Fallback: return top items sorted by retrieval score
            recommendations = retrievedDocs.slice(0, limit).map((doc, i) => ({
                menuItemId: doc.metadata.id,
                matchScore: Math.max(0, 100 - i * 10),
                personalizedReason: 'Relevant to your preferences',
                nutritionalHighlights: `Calories: ${doc.metadata.calories || 'N/A'}, Protein: ${doc.metadata.protein || 'N/A'}g`
            }));
        }

        // Step 5: Fetch full menu item details for response
        const menuItemIds = recommendations.map(rec => rec.menuItemId);
        const menuItems = await MenuItem.find({ _id: { $in: menuItemIds } })
            .populate('outlet', 'name location')
            .lean();

        // Merge recommendations with menu item details
        const enrichedRecommendations = recommendations
            .map(rec => {
                const menuItem = menuItems.find(m => m._id.toString() === rec.menuItemId);
                return menuItem ? {
                    menuItem: {
                        _id: menuItem._id,
                        id: menuItem._id,
                        name: menuItem.name,
                        description: menuItem.description,
                        price: menuItem.price,
                        category: menuItem.category,
                        outlet: menuItem.outlet ? {
                            _id: menuItem.outlet._id,
                            id: menuItem.outlet._id,
                            name: menuItem.outlet.name,
                            location: menuItem.outlet.location
                        } : null,
                        image: menuItem.image,
                        prepTime: menuItem.prepTime,
                        isVeg: menuItem.isVeg,
                        nutrition: menuItem.nutrition,
                        rating: menuItem.averageRating,
                        reviewCount: menuItem.reviewCount
                    },
                    matchScore: rec.matchScore,
                    personalizedReason: rec.personalizedReason,
                    nutritionalHighlights: rec.nutritionalHighlights
                } : null;
            })
            .filter(Boolean)
            .slice(0, limit);

        return enrichedRecommendations;
    } catch (error) {
        console.error('Error generating recommendations:', error);
        throw error;
    }
};

/**
 * Get recommendation statistics for analytics
 * @returns {Promise<Object>} Statistics about recommendations
 */
const getRecommendationStats = async () => {
    try {
        const totalMenuItems = await MenuItem.countDocuments({ isAvailable: true });
        const totalUsers = await User.countDocuments();
        const usersWithProfile = await User.countDocuments({ profileCompleted: true });

        return {
            totalMenuItems,
            totalUsers,
            usersWithCompleteProfile: usersWithProfile,
            profileCompletionRate: totalUsers > 0 ? ((usersWithProfile / totalUsers) * 100).toFixed(2) + '%' : '0%'
        };
    } catch (error) {
        console.error('Error fetching recommendation stats:', error);
        throw error;
    }
};

module.exports = {
    initializeVectorStore,
    indexMenuItems,
    retrieveRelevantItems,
    buildUserContext,
    recommendMeals,
    getRecommendationStats
};
