const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const net = require('net');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const connectDB = require('../../config/database');
const { MenuItem } = require('../../models');
const { Chroma } = require('@langchain/community/vectorstores/chroma');
const { GoogleGenerativeAIEmbeddings } = require('@langchain/google-genai');
const { Document } = require('@langchain/core/documents');

const CHROMA_DIR = path.join(__dirname, '../../chromadb');
const CHROMA_HOST = '127.0.0.1';
const CHROMA_START_PORT = 8000;
const COLLECTION_NAME = 'campuscravings_menu_items';

const buildMenuItemText = (menuItem) => {
    const nutritionalInfo = menuItem.nutritionalInfo || menuItem.nutrition || {};
    const priceInRupees = typeof menuItem.price === 'number' ? (menuItem.price / 100).toFixed(2) : '0.00';
    const outletLocation = formatOutletLocation(menuItem.outlet?.location);

    return [
        `Name: ${menuItem.name || ''}`,
        `Description: ${menuItem.description || ''}`,
        `Category: ${menuItem.category || ''}`,
        `Price: ₹${priceInRupees}`,
        `Outlet: ${menuItem.outlet?.name || ''}`,
        `Outlet Location: ${outletLocation}`,
        `Calories: ${nutritionalInfo.calories ?? 'unknown'}`,
        `Protein: ${nutritionalInfo.protein ?? 'unknown'}g`,
        `Carbs: ${nutritionalInfo.carbs ?? 'unknown'}g`,
        `Fats: ${nutritionalInfo.fats ?? 'unknown'}g`,
        `Tags: ${(menuItem.tags || []).join(', ')}`,
        `Veg: ${menuItem.isVeg ? 'yes' : 'no'}`,
        `Available: ${menuItem.isAvailable ? 'yes' : 'no'}`
    ].join('\n');
};

const formatOutletLocation = (location) => {
    if (!location) {
        return '';
    }

    if (typeof location === 'string') {
        return location;
    }

    if (typeof location === 'object') {
        return [location.building, location.landmark].filter(Boolean).join(', ');
    }

    return String(location);
};

const createEmbeddings = () => {
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
        throw new Error('GOOGLE_API_KEY is not set in the environment');
    }

    return new GoogleGenerativeAIEmbeddings({
        apiKey,
        modelName: process.env.GOOGLE_EMBEDDING_MODEL || 'gemini-embedding-001'
    });
};

const ensureEmptyPersistDirectory = () => {
    if (fs.existsSync(CHROMA_DIR)) {
        fs.rmSync(CHROMA_DIR, { recursive: true, force: true });
    }

    fs.mkdirSync(CHROMA_DIR, { recursive: true });
};

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const isPortAvailable = (port) => new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', () => resolve(false));
    server.once('listening', () => {
        server.close(() => resolve(true));
    });

    server.listen(port, CHROMA_HOST);
});

const findAvailablePort = async (startPort = CHROMA_START_PORT, maxAttempts = 20) => {
    for (let port = startPort; port < startPort + maxAttempts; port += 1) {
        if (await isPortAvailable(port)) {
            return port;
        }
    }

    throw new Error(`No available ports found starting at ${startPort}`);
};

const isChromaServerReady = async (port) => {
    try {
        const response = await fetch(`http://${CHROMA_HOST}:${port}/api/v2/heartbeat`);
        return response.ok;
    } catch {
        return false;
    }
};

const waitForChromaServer = async (port, { timeoutMs = 30000 } = {}) => {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
        if (await isChromaServerReady(port)) {
            return;
        }

        await sleep(500);
    }

    throw new Error(`Timed out waiting for Chroma server on ${CHROMA_HOST}:${port}`);
};

const startLocalChromaServer = async (port) => {
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

    serverProcess.stdout.on('data', (data) => {
        process.stdout.write(data);
    });

    serverProcess.stderr.on('data', (data) => {
        process.stderr.write(data);
    });

    serverProcess.on('exit', (code) => {
        if (code !== null && code !== 0) {
            console.warn(`Chroma server exited with code ${code}`);
        }
    });

    await waitForChromaServer(port);
    return serverProcess;
};

const initializeVectorStore = async () => {
    console.log('Starting ChromaDB vector store initialization...');
    let chromaServer = null;

    await connectDB();
    console.log('Connected to MongoDB');

    if (!process.env.GOOGLE_API_KEY) {
        throw new Error('GOOGLE_API_KEY is required to generate embeddings');
    }

    ensureEmptyPersistDirectory();
    console.log(`Prepared ChromaDB directory at ${CHROMA_DIR}`);

    const chromaPort = await findAvailablePort();
    console.log(`Starting local Chroma server on http://${CHROMA_HOST}:${chromaPort} ...`);
    try {
        chromaServer = await startLocalChromaServer(chromaPort);
        console.log('Local Chroma server is ready');

        const menuItems = await MenuItem.find({})
            .populate('outlet', 'name location')
            .select('name description nutritionalInfo nutrition price category outlet tags isVeg isAvailable')
            .lean();

        console.log(`Fetched ${menuItems.length} menu items from MongoDB`);

        if (!menuItems.length) {
            console.log('No menu items found. Vector store initialization skipped.');
            return {
                indexedCount: 0,
                collectionName: COLLECTION_NAME,
                persistDirectory: CHROMA_DIR
            };
        }

        const documents = menuItems.map((menuItem) => {
            const itemId = menuItem._id.toString();
            const outletId = menuItem.outlet?._id?.toString() || menuItem.outlet?.toString() || null;
            const nutritionalInfo = menuItem.nutritionalInfo || menuItem.nutrition || {};
            const outletLocation = formatOutletLocation(menuItem.outlet?.location);
            const tagsText = (menuItem.tags || []).filter(Boolean).join(', ');

            return new Document({
                pageContent: buildMenuItemText(menuItem),
                metadata: {
                    itemId,
                    outletId,
                    outletName: menuItem.outlet?.name || null,
                    outletLocation: outletLocation || null,
                    name: menuItem.name || null,
                    description: menuItem.description || null,
                    category: menuItem.category || null,
                    price: menuItem.price ?? null,
                    calories: nutritionalInfo.calories ?? null,
                    protein: nutritionalInfo.protein ?? null,
                    carbs: nutritionalInfo.carbs ?? null,
                    fats: nutritionalInfo.fats ?? null,
                    tags: tagsText || null,
                    isVeg: Boolean(menuItem.isVeg),
                    isAvailable: Boolean(menuItem.isAvailable),
                    source: 'campuscravings'
                }
            });
        });

        console.log('Generating embeddings and writing documents to ChromaDB...');
        const embeddings = createEmbeddings();

        await Chroma.fromDocuments(documents, embeddings, {
            collectionName: COLLECTION_NAME,
            url: `http://${CHROMA_HOST}:${chromaPort}`
        });

        console.log(`Indexed ${documents.length} menu items into ChromaDB`);
        console.log('Vector store initialization complete');

        return {
            indexedCount: documents.length,
            collectionName: COLLECTION_NAME,
            persistDirectory: CHROMA_DIR
        };
    } finally {
        if (chromaServer && !chromaServer.killed) {
            chromaServer.kill('SIGTERM');
        }
    }
};

if (require.main === module) {
    initializeVectorStore()
        .then((result) => {
            console.log(`Done. Indexed ${result.indexedCount} items.`);
            process.exit(0);
        })
        .catch((error) => {
            console.error('Failed to initialize vector store:');
            console.error(error);
            process.exit(1);
        });
}

module.exports = {
    initializeVectorStore
};
