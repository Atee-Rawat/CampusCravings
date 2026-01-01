const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const MenuItem = require('../models/MenuItem');
const { verifyToken } = require('../middleware/auth');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Analyze nutrition for a menu item using AI
router.post('/nutrition', verifyToken, async (req, res) => {
    try {
        const { itemName, description, isVeg } = req.body;

        if (!itemName) {
            return res.status(400).json({
                success: false,
                message: 'Item name is required'
            });
        }

        // Check if Gemini API key is configured
        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({
                success: false,
                message: 'AI service not configured'
            });
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

        const prompt = `Analyze the following food item and provide nutritional information. Return ONLY a valid JSON object with no markdown formatting, no code blocks, just the raw JSON.

Food Item: ${itemName}
Description: ${description || 'No description available'}
Type: ${isVeg ? 'Vegetarian' : 'Non-Vegetarian'}

Return this exact JSON structure with estimated values:
{
    "calories": <number between 50-800>,
    "protein": <number in grams between 2-50>,
    "carbs": <number in grams between 5-100>,
    "isHealthy": <true if generally healthy, false if high in calories/fat/sugar>
}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Parse the JSON response
        let nutritionData;
        try {
            // Clean up the response - remove any markdown code blocks if present
            const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            nutritionData = JSON.parse(cleanedText);
        } catch (parseError) {
            console.error('Failed to parse AI response:', text);
            // Return fallback values
            nutritionData = {
                calories: 250,
                protein: 10,
                carbs: 30,
                isHealthy: true
            };
        }

        res.json({
            success: true,
            data: {
                nutrition: {
                    calories: Math.round(nutritionData.calories) || 250,
                    protein: Math.round(nutritionData.protein) || 10,
                    carbs: Math.round(nutritionData.carbs) || 30
                },
                isHealthy: Boolean(nutritionData.isHealthy)
            }
        });

    } catch (error) {
        console.error('Nutrition analysis error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to analyze nutrition'
        });
    }
});

// Batch analyze nutrition for multiple items
router.post('/nutrition/batch', verifyToken, async (req, res) => {
    try {
        const { items } = req.body;

        if (!items || !Array.isArray(items)) {
            return res.status(400).json({
                success: false,
                message: 'Items array is required'
            });
        }

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({
                success: false,
                message: 'AI service not configured'
            });
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

        // Create a batch prompt for efficiency
        const itemsList = items.map((item, idx) =>
            `${idx + 1}. ${item.name}${item.description ? ` - ${item.description}` : ''} (${item.isVeg ? 'Veg' : 'Non-Veg'})`
        ).join('\n');

        const prompt = `Analyze the following food items and provide nutritional information for each. Return ONLY a valid JSON array with no markdown formatting.

Food Items:
${itemsList}

Return a JSON array where each object has:
{
    "index": <1-based index>,
    "calories": <number>,
    "protein": <grams>,
    "carbs": <grams>,
    "isHealthy": <boolean>
}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        let nutritionArray;
        try {
            const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            nutritionArray = JSON.parse(cleanedText);
        } catch (parseError) {
            console.error('Failed to parse batch AI response:', text);
            // Return fallback values for all items
            nutritionArray = items.map((_, idx) => ({
                index: idx + 1,
                calories: 250,
                protein: 10,
                carbs: 30,
                isHealthy: true
            }));
        }

        // Map back to items
        const results = items.map((item, idx) => {
            const nutrition = nutritionArray.find(n => n.index === idx + 1) || {
                calories: 250,
                protein: 10,
                carbs: 30,
                isHealthy: true
            };
            return {
                itemId: item._id,
                nutrition: {
                    calories: Math.round(nutrition.calories),
                    protein: Math.round(nutrition.protein),
                    carbs: Math.round(nutrition.carbs)
                },
                isHealthy: Boolean(nutrition.isHealthy)
            };
        });

        res.json({
            success: true,
            data: results
        });

    } catch (error) {
        console.error('Batch nutrition analysis error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to analyze nutrition'
        });
    }
});

module.exports = router;
