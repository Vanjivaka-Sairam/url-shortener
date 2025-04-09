# URL Shortener Application

A modern URL shortening service with analytics, built with React, Node.js, and MongoDB.

## Features

- Create short URLs from long URLs
-  View detailed analytics for each URL
  - Click statistics over time
  - Device distribution
  - Browser usage
- User authentication
- Bulk URL management
- QR code generation
- Responsive design for all devices

## Tech Stack

- **Frontend**: React.js, Tailwind CSS, Chart.js
- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Authentication**: JWT

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/url-shortener.git
cd url-shortener
```

2. Install dependencies for both frontend and backend:
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

3. Create a `.env` file in the backend directory:
```env
MONGODB_URI=mongodb://localhost:27017/url-shortener
JWT_SECRET=your_jwt_secret_here
PORT=3000
```

4. Start the development servers:
```bash
# Start backend server
cd backend
npm run dev

# Start frontend server
cd ../frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend: http://localhost:3000

## Test deatils
-signup using email
-login with your created email and password 
-start using the service


## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user info

### URLs
- `POST /api/url` - Create a new short URL
- `GET /api/urls` - Get all URLs for current user
- `GET /api/url/:shortId` - Get URL details
- `DELETE /api/url/:shortId` - Delete a URL
- `PATCH /api/url/:shortId/toggle` - Toggle URL status
- `GET /api/analytics/:shortId` - Get URL analytics
