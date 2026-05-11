  # CampusCravings 🍕

A mobile-first food ordering web application designed exclusively for university campuses.

## Features

- 📱 **Mobile-First Design** - Optimized for students on the go
- ⏱️ **Real-Time Timer** - Know exactly when your food is ready
- 💳 **UPI Payments** - Seamless Razorpay integration
- 🏪 **Multi-Outlet Support** - All campus food vendors in one place
- 👨‍🍳 **Admin Portal** - Easy menu and order management for outlets

## Tech Stack

- **Frontend**: React.js (Vite), Socket.io Client
- **Backend**: Node.js, Express.js, Socket.io
- **Database**: MongoDB Atlas
- **Auth**: Firebase Authentication
- **Payments**: Razorpay
- **Images**: Cloudinary

## Quick Start

### Prerequisites

- Node.js 18+ 
- MongoDB Atlas account (free tier)
- Firebase project
- Razorpay test account
- Cloudinary account (free tier)

### Installation

```bash
# Clone and install dependencies
npm run install:all

# Copy environment variables
cp .env.example server/.env

# Start development servers
npm run dev
```

The app will be available at:
- Frontend: http://localhost:5173
- Backend: http://localhost:5000

## Project Structure

```
CampusCartel/
├── client/          # React frontend
├── server/          # Express backend
├── package.json     # Root scripts
└── README.md
```

## Development Phases

- [x] Phase 1: Planning & Architecture
- [x] Phase 2: Project Setup
- [x] Phase 3: Backend Development
- [x] Phase 4: Student Frontend
- [x] Phase 5: Admin Portal
- [x] Phase 6: Polish & Testing

## License

MIT © CampusCravings Team

## AI Nutrition Chatbot (new)

We added an in-app AI-powered nutrition assistant that can suggest campus menu items, rank them (for example, by protein), and let users add suggested items directly to the cart from the chat UI.

Key points:
- Uses a local Chroma vector store (bundled under `/chromadb`) with embeddings from Google Generative AI.
- The chat LLM integration uses the `@langchain/google-genai` client to call Gemini-style chat models.
- If the model fails or returns non-actionable text, the backend now falls back to a retrieval-based actionable suggestion: it ranks retrieved menu items by protein (then rating) and returns the top 3 items as clickable suggestions.
- The chat endpoint preserves outlet context so items added from chat go into the cart with the correct outlet.

Developer notes:
- Demo login button on the login page uses the demo account (email `rawatateeshay@gmail.com`) with password `70785@Ar` for quick testing.
- The chatbot is hidden on the `/cart` page to avoid overlapping checkout controls.

Running AI features locally:

1. Make sure `GOOGLE_API_KEY` is set in `server/.env` (see `server/.env.example`). The app will start a local Chroma server automatically if one is not already running.
2. Start the backend normally (`npm run dev:server` or `node server/server.js`) — the chat service will initialize the vector store on demand.


## AI Recommendations (new)

The project includes an AI-driven recommendation engine and nutrition assistant that work together:

- **Recommendation Engine (`aiService`)**: server-side module that scores and returns recommended menu items based on user profile, favorites, and contextual signals. It produces recommendation payloads used in the frontend `RecommendationsList` and `RecommendationCard` components.
- **Nutrition Chat (`chatService`)**: conversational agent that retrieves relevant menu items from the Chroma vector store, queries the LLM for contextual advice, and — when needed — falls back to retrieval-ranked actionable suggestions (e.g., top high-protein items).
- **Frontend integration**: suggestions from chat and recommendations render as cards with `Add to cart` actions; outlet context and ID normalization are preserved so items added from AI behave identically to normal menu adds.

Files of interest:
- `server/services/ai/aiService.js` — recommendation scoring, user-context building
- `server/services/ai/chatService.js` — chat endpoint, retrieval + LLM orchestration, fallback logic
- `client/src/components/AIChatbot.jsx` — chat UI and suggestion rendering
- `client/src/components/RecommendationsList.jsx` and `RecommendationCard.jsx` — recommendation UI
