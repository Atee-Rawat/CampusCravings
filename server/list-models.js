// Script to list all available Gemini models for your API key
require('dotenv').config();

async function listModels() {
    try {
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error('GEMINI_API_KEY not found in .env');
            return;
        }

        console.log('Fetching available models...\n');

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
        );

        if (!response.ok) {
            const error = await response.json();
            console.error('API Error:', error);
            return;
        }

        const data = await response.json();

        console.log('='.repeat(70));
        console.log('AVAILABLE MODELS FOR YOUR API KEY:');
        console.log('='.repeat(70));

        data.models.forEach(model => {
            const supportsGenerate = model.supportedGenerationMethods?.includes('generateContent');
            if (supportsGenerate) {
                console.log(`\n✅ ${model.name.replace('models/', '')}`);
                console.log(`   Display: ${model.displayName}`);
                console.log(`   Methods: ${model.supportedGenerationMethods?.join(', ')}`);
            }
        });

        console.log('\n' + '='.repeat(70));
        console.log('Use any model name shown above (without "models/" prefix)');
        console.log('='.repeat(70));

    } catch (error) {
        console.error('Error listing models:', error.message);
    }
}

listModels();
