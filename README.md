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
- [ ] Phase 2: Project Setup
- [ ] Phase 3: Backend Development
- [ ] Phase 4: Student Frontend
- [ ] Phase 5: Admin Portal
- [ ] Phase 6: Polish & Testing

## License

MIT © CampusCravings Team
