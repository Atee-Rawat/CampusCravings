const fs = require('fs');
const path = require('path');
const net = require('net');
const crypto = require('crypto');
const { spawn } = require('child_process');

const { Chroma } = require('@langchain/community/vectorstores/chroma');
const { GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { HumanMessage, SystemMessage, AIMessage } = require('@langchain/core/messages');

const { User, MenuItem } = require('../../models');
const { buildUserContext } = require('./aiService');

const CHROMA_DIR = path.join(__dirname, '../../chromadb');
const CHROMA_HOST = '127.0.0.1';
const CHROMA_START_PORT = 8000;
const CHROMA_COLLECTION = 'menu_items';
const MAX_HISTORY_MESSAGES = 10;
const MAX_REQUESTS_PER_WINDOW = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

const sessionMemory = new Map();
const rateLimitMemory = new Map();
let vectorStorePromise = null;
let chromaServerProcess = null;
let activeChromaPort = null;

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const getEmbeddings = () => new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GOOGLE_API_KEY,
    modelName: process.env.GOOGLE_EMBEDDING_MODEL || 'gemini-embedding-001'
});

const getChatModel = () => {
    const apiKey = process.env.GOOGLE_API_KEY;
    const modelName = process.env.AI_CHAT_MODEL || 'gemini-2.5-flash-lite';

    if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
        throw new Error('GOOGLE_API_KEY is required to initialize the chat model');
    }

    if (!modelName || typeof modelName !== 'string') {
        throw new Error('AI_CHAT_MODEL must be set to a valid model name');
    }

    try {
        return new ChatGoogleGenerativeAI({
            apiKey: apiKey.trim(),
            modelName: modelName.trim(),
            model: modelName.trim(),
            temperature: Number(process.env.AI_CHAT_TEMPERATURE || 0.4),
            maxOutputTokens: 2048
        });
    } catch (err) {
        console.error('Failed to construct ChatGoogleGenerativeAI — please check @langchain/google-genai compatibility and env vars', {
            modelName: String(modelName).slice(0, 80),
            hasApiKey: Boolean(apiKey)
        });
        throw err;
    }
};

const isPortAvailable = (port) => new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    server.listen(port, CHROMA_HOST);
});

const findAvailablePort = async (startPort = CHROMA_START_PORT, attempts = 20) => {
    for (let port = startPort; port < startPort + attempts; port += 1) {
        if (await isPortAvailable(port)) {
            return port;
        }
    }

    throw new Error(`No available Chroma ports found starting at ${startPort}`);
};

const isChromaServerReady = async (port) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    try {
        const response = await fetch(`http://${CHROMA_HOST}:${port}/api/v2/heartbeat`, {
            signal: controller.signal
        });
        return response.ok;
    } catch {
        return false;
    } finally {
        clearTimeout(timeoutId);
    }
};

const waitForChromaServer = async (port, timeoutMs = 30000) => {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
        if (await isChromaServerReady(port)) {
            return;
        }

        await sleep(500);
    }

    throw new Error(`Timed out waiting for Chroma server on ${CHROMA_HOST}:${port}`);
};

const startChromaServer = async (port) => {
    const cliPath = path.join(__dirname, '../../node_modules/chromadb/dist/cli.mjs');
    const serverProcess = spawn(process.execPath, [
        cliPath,
        'run',
        '--path',
        CHROMA_DIR,
        '--host',
        CHROMA_HOST,
        '--port',
        String(port)
    ], {
        stdio: ['ignore', 'pipe', 'pipe']
    });

    serverProcess.stdout.on('data', (data) => process.stdout.write(data));
    serverProcess.stderr.on('data', (data) => process.stderr.write(data));

    await waitForChromaServer(port);
    return serverProcess;
};

const shutdownChromaServer = () => {
    if (chromaServerProcess && !chromaServerProcess.killed) {
        chromaServerProcess.kill('SIGTERM');
    }
};

process.on('exit', shutdownChromaServer);
process.on('SIGINT', () => {
    shutdownChromaServer();
    process.exit(130);
});
process.on('SIGTERM', () => {
    shutdownChromaServer();
    process.exit(143);
});

const ensureVectorStore = async () => {
    if (vectorStorePromise) {
        return vectorStorePromise;
    }

    vectorStorePromise = (async () => {
        if (!process.env.GOOGLE_API_KEY) {
            throw new Error('GOOGLE_API_KEY is required for the nutrition chatbot');
        }

        if (!fs.existsSync(CHROMA_DIR)) {
            fs.mkdirSync(CHROMA_DIR, { recursive: true });
        }

        const preferredPort = CHROMA_START_PORT;
        let port = preferredPort;

        try {
            if (await isChromaServerReady(preferredPort)) {
                port = preferredPort;
                activeChromaPort = port;
            } else {
                port = await findAvailablePort(preferredPort);
                activeChromaPort = port;
                chromaServerProcess = await startChromaServer(port);
            }

            const vectorStore = await Chroma.fromExistingCollection(getEmbeddings(), {
                collectionName: CHROMA_COLLECTION,
                url: `http://${CHROMA_HOST}:${port}`
            });

            return vectorStore;
        } catch (error) {
            shutdownChromaServer();
            throw error;
        }
    })().catch((error) => {
        vectorStorePromise = null;
        throw error;
    });

    return vectorStorePromise;
};

const getSessionState = (sessionId) => {
    if (!sessionMemory.has(sessionId)) {
        sessionMemory.set(sessionId, {
            messages: [],
            updatedAt: Date.now()
        });
    }

    return sessionMemory.get(sessionId);
};

const appendSessionMessage = (sessionId, role, content) => {
    const state = getSessionState(sessionId);
    state.messages.push({
        role,
        content,
        createdAt: new Date().toISOString()
    });

    if (state.messages.length > MAX_HISTORY_MESSAGES) {
        state.messages = state.messages.slice(-MAX_HISTORY_MESSAGES);
    }

    state.updatedAt = Date.now();
};

const buildHistoryMessages = (sessionId) => {
    const state = sessionMemory.get(sessionId);
    if (!state?.messages?.length) {
        return [];
    }

    return state.messages.map((message) => {
        if (message.role === 'assistant') {
            return new AIMessage(message.content);
        }

        return new HumanMessage(message.content);
    });
};

const getSessionSummary = (sessionId) => {
    const state = sessionMemory.get(sessionId);
    if (!state?.messages?.length) {
        return 'No prior conversation in this session.';
    }

    return state.messages
        .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
        .join('\n');
};

const isRateLimited = (key) => {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW_MS;
    const requests = rateLimitMemory.get(key) || [];
    const recentRequests = requests.filter((timestamp) => timestamp >= windowStart);

    if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
        const retryAfterMs = RATE_LIMIT_WINDOW_MS - (now - recentRequests[0]);
        return {
            limited: true,
            retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000))
        };
    }

    recentRequests.push(now);
    rateLimitMemory.set(key, recentRequests);
    return { limited: false };
};

const serializeMenuItem = (menuItem) => {
    if (!menuItem) {
        return null;
    }

    return {
        id: menuItem._id?.toString() || menuItem.id?.toString?.() || String(menuItem._id || menuItem.id),
        name: menuItem.name,
        description: menuItem.description,
        price: menuItem.price,
        category: menuItem.category,
        image: menuItem.image,
        prepTime: menuItem.prepTime,
        isVeg: menuItem.isVeg,
        isAvailable: menuItem.isAvailable,
        nutrition: menuItem.nutrition,
        averageRating: menuItem.averageRating,
        reviewCount: menuItem.reviewCount,
        outlet: menuItem.outlet ? {
            id: menuItem.outlet._id?.toString() || menuItem.outlet.id?.toString?.() || String(menuItem.outlet._id || menuItem.outlet.id),
            name: menuItem.outlet.name,
            location: menuItem.outlet.location
        } : null
    };
};

const hydrateMenuItems = async (itemIds) => {
    if (!itemIds?.length) {
        return [];
    }

    const uniqueIds = [...new Set(itemIds.filter(Boolean).map(String))];
    const menuItems = await MenuItem.find({ _id: { $in: uniqueIds } })
        .populate('outlet', 'name location')
        .lean();

    const byId = new Map(menuItems.map((item) => [String(item._id), item]));
    return uniqueIds.map((id) => byId.get(id)).filter(Boolean);
};

const fetchCurrentMenuItem = async (currentMenuItemId) => {
    if (!currentMenuItemId) {
        return null;
    }

    const menuItem = await MenuItem.findById(currentMenuItemId)
        .populate('outlet', 'name location')
        .lean();

    return menuItem ? serializeMenuItem(menuItem) : null;
};

const buildRetrievalQuery = ({ message, user, currentMenuItem, historySummary }) => {
    const goalText = user.healthGoals?.join(', ') || 'balanced eating';
    const preferenceText = user.dietaryPreferences?.join(', ') || 'general preferences';
    const allergyText = user.allergies?.length ? user.allergies.join(', ') : 'no known allergies';
    const cuisineText = user.preferredCuisines?.join(', ') || 'campus menu options';

    return [
        `Student asks: ${message}`,
        `User goals: ${goalText}`,
        `Dietary preferences: ${preferenceText}`,
        `Allergies: ${allergyText}`,
        `Preferred cuisines: ${cuisineText}`,
        `Budget per meal: ₹${((user.budgetPerMeal || 0) / 100).toFixed(2)}`,
        `Daily calorie target: ${user.dailyCalorieTarget || 'unknown'}`,
        currentMenuItem ? `Current menu item: ${currentMenuItem.name} - ${currentMenuItem.description || ''}` : '',
        `Conversation summary: ${historySummary}`
    ].filter(Boolean).join('\n');
};

const buildMenuItemBrief = (item) => {
    const price = typeof item.price === 'number' ? `₹${(item.price / 100).toFixed(2)}` : 'N/A';
    const calories = item.nutrition?.calories ?? 'unknown';
    const protein = item.nutrition?.protein ?? 'unknown';
    const carbs = item.nutrition?.carbs ?? 'unknown';
    const outletName = item.outlet?.name || 'Unknown outlet';

    return [
        `ID: ${item._id}`,
        `Name: ${item.name}`,
        `Category: ${item.category}`,
        `Price: ${price}`,
        `Calories: ${calories}`,
        `Protein: ${protein}g`,
        `Carbs: ${carbs}g`,
        `Veg: ${item.isVeg ? 'yes' : 'no'}`,
        `Outlet: ${outletName}`,
        `Description: ${item.description || 'No description'}`
    ].join('\n');
};

const defaultNutritionResponse = ({ message, user, currentMenuItem, retrievedItems = [] }) => {
    const lowerMessage = String(message || '').toLowerCase();

    const rankedItems = [...retrievedItems]
        .filter(Boolean)
        .sort((a, b) => {
            const proteinA = Number(a.nutrition?.protein || 0);
            const proteinB = Number(b.nutrition?.protein || 0);
            if (proteinB !== proteinA) return proteinB - proteinA;

            const ratingA = Number(a.averageRating || 0);
            const ratingB = Number(b.averageRating || 0);
            return ratingB - ratingA;
        })
        .slice(0, 3);

    const suggestions = rankedItems.map((item) => ({
        menuItem: serializeMenuItem(item),
        reason: `${Number(item.nutrition?.protein || 0)}g protein${item.category ? ` • ${item.category}` : ''}`
    }));

    if (currentMenuItem && !suggestions.some((suggestion) => suggestion.menuItem?.id === String(currentMenuItem.id))) {
        suggestions.unshift({
            menuItem: currentMenuItem,
            reason: 'I used the current item as context for your nutrition question.'
        });
    }

    const sources = [...new Set([
        ...(currentMenuItem ? [String(currentMenuItem.id)] : []),
        ...suggestions.map((suggestion) => `MenuItem ID ${suggestion.menuItem.id}`)
    ])];

    // Always return suggestions if available, regardless of the query type
    if (suggestions.length > 0) {
        const response = lowerMessage.includes('protein')
            ? `Here are the best high-protein menu options with ${Math.max(...rankedItems.map(item => Number(item.nutrition?.protein || 0)))}g+ protein each.`
            : `Based on your request and profile, here are some great options from the campus menu.`;
        
        return {
            response,
            suggestions,
            sources
        };
    }

    // Fallback when no items available
    const response = lowerMessage.includes('protein')
        ? 'I could not find high-protein menu items right now, but I can help refine the search if you want.'
        : lowerMessage.includes('allergy')
            ? 'For allergies, I recommend avoiding any item that could contain the allergen and double-checking ingredients with the outlet. I can suggest safe menu options if you want me to search the campus menu.'
            : `Based on your profile, a good rule of thumb is to choose meals that stay within ₹${((user.budgetPerMeal || 0) / 100).toFixed(2)} and align with your calorie target of ${user.dailyCalorieTarget || 'your target'} calories.`;

    return {
        response,
        suggestions,
        sources
    };
};

const parseModelJson = (rawText) => {
    if (!rawText) {
        throw new Error('Empty model response');
    }

    if (typeof rawText !== 'string') {
        return rawText;
    }

    const cleanedText = rawText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

    try {
        return JSON.parse(cleanedText);
    } catch {
        const match = cleanedText.match(/\{[\s\S]*\}/);
        if (match) {
            return JSON.parse(match[0]);
        }
        throw new Error('Unable to parse model JSON response');
    }
};

const generateNutritionistReply = async ({ message, userId, sessionId, currentMenuItemId }) => {
    if (!message || !message.trim()) {
        const error = new Error('message is required');
        error.statusCode = 400;
        throw error;
    }

    if (!userId) {
        const error = new Error('userId is required');
        error.statusCode = 400;
        throw error;
    }

    const rateLimitKey = `${userId}:${sessionId || 'default'}`;
    const rateLimitResult = isRateLimited(rateLimitKey);
    if (rateLimitResult.limited) {
        const error = new Error(`Rate limit exceeded. Try again in ${rateLimitResult.retryAfterSeconds} seconds.`);
        error.statusCode = 429;
        error.retryAfterSeconds = rateLimitResult.retryAfterSeconds;
        throw error;
    }

    const normalizedSessionId = sessionId || crypto.randomUUID();
    const user = await User.findById(userId).select(
        'fullName healthGoals dietaryPreferences allergies budgetPerMeal dailyCalorieTarget preferredCuisines favoriteItems'
    ).lean();

    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }

    const currentMenuItem = await fetchCurrentMenuItem(currentMenuItemId);
    const chatHistory = buildHistoryMessages(normalizedSessionId);
    const historySummary = getSessionSummary(normalizedSessionId);
    const userContext = await buildUserContext({
        ...user,
        _id: userId,
        favoriteItems: user.favoriteItems || []
    });

    const vectorStore = await ensureVectorStore();
    const retrievalQuery = buildRetrievalQuery({
        message,
        user,
        currentMenuItem,
        historySummary
    });

    const retrievedDocs = await vectorStore.similaritySearch(retrievalQuery, 6);
    const retrievedItems = await hydrateMenuItems(retrievedDocs.map((doc) => doc.metadata?.itemId || doc.metadata?.id));

    const llm = getChatModel();
    const systemPrompt = `You are CampusCravings Smart AI Nutritionist.

Behavior:
- Be helpful, encouraging, accurate, and concise.
- Use campus menu items and the user's health profile to answer nutrition questions.
- Never present yourself as a doctor. If the user mentions severe allergy, medical condition, or emergency, advise them to seek professional medical help.
- Respect allergies and dietary restrictions strictly.
- Prefer recommending menu items that match the user profile, calorie target, budget, and the current menu item context.
- If a question is about a specific menu item, use the retrieved menu context and the current item context.
- If no relevant menu items are available, still provide useful general nutrition guidance.

Return ONLY valid JSON with this shape:
{
  "response": "string",
  "suggestions": [
    {
      "menuItemId": "string",
      "reason": "string"
    }
  ],
  "sources": ["MenuItem ID ..."]
}

Rules for suggestions:
- Use menuItemId values from the retrieved menu items when possible.
- Keep suggestions to at most 4 items.
- Include sources for every recommended item.
- If you cannot find a menu item match, return an empty suggestions array.`;

    const userPrompt = [
        `User profile:\n${userContext}`,
        currentMenuItem ? `Current menu item:\n${buildMenuItemBrief({
            _id: currentMenuItem.id,
            name: currentMenuItem.name,
            description: currentMenuItem.description,
            category: currentMenuItem.category,
            price: currentMenuItem.price,
            nutrition: currentMenuItem.nutrition,
            isVeg: currentMenuItem.isVeg,
            outlet: currentMenuItem.outlet
        })}` : '',
        retrievedItems.length ? `Relevant menu items:\n${retrievedItems.map(buildMenuItemBrief).join('\n\n---\n\n')}` : 'No directly relevant menu items were found in retrieval.',
        `Conversation history:\n${historySummary}`,
        `Student question: ${message}`,
        'If the user asks for meal suggestions (for example: high protein, refreshing, low calorie, budget meals), prioritize actual campus menu items and return actionable suggestions the user can add to cart.'
    ].filter(Boolean).join('\n\n');

    appendSessionMessage(normalizedSessionId, 'user', message);

    const messages = [
        new SystemMessage(systemPrompt),
        ...chatHistory,
        new HumanMessage(userPrompt)
    ];

    let modelPayload;
    try {
        const completion = await llm.invoke(messages);
        const rawText = typeof completion.content === 'string'
            ? completion.content
            : Array.isArray(completion.content)
                ? completion.content.map((part) => (typeof part === 'string' ? part : part?.text || '')).join('')
                : String(completion.content || '');

        modelPayload = parseModelJson(rawText);
    } catch (error) {
        console.warn('Nutritionist model failed, using fallback:', error.message);
        modelPayload = defaultNutritionResponse({ message, user, currentMenuItem, retrievedItems });
    }

    const suggestionIds = (modelPayload.suggestions || [])
        .map((suggestion) => suggestion.menuItemId)
        .filter(Boolean);

    const hydratedSuggestions = await hydrateMenuItems(suggestionIds);
    const suggestionMap = new Map(hydratedSuggestions.map((item) => [String(item._id), item]));

    const suggestions = (modelPayload.suggestions || [])
        .map((suggestion) => {
            const menuItem = suggestionMap.get(String(suggestion.menuItemId));
            if (!menuItem) {
                return null;
            }

            return {
                menuItem: serializeMenuItem(menuItem),
                reason: suggestion.reason
            };
        })
        .filter(Boolean)
        .slice(0, 4);

    const sources = [...new Set([
        ...(modelPayload.sources || []),
        ...suggestions.map((suggestion) => `MenuItem ID ${suggestion.menuItem.id}`)
    ])];

    const responseText = typeof modelPayload.response === 'string' && modelPayload.response.trim()
        ? modelPayload.response.trim()
        : defaultNutritionResponse({ message, user, currentMenuItem, retrievedItems }).response;

    appendSessionMessage(normalizedSessionId, 'assistant', responseText);

    return {
        sessionId: normalizedSessionId,
        response: responseText,
        suggestions,
        sources
    };
};

module.exports = {
    generateNutritionistReply,
    getSessionState
};
