# 🚀 Setup Guide - Separate Frontend & Backend

## 📋 Prerequisites
- Node.js (v16 or higher)
- MongoDB running locally or MongoDB Atlas connection
- Two terminal windows/tabs

## 🔧 Backend Setup

1. **Navigate to server directory:**
   ```bash
   cd server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment:**
   ```bash
   cp env.example .env
   # Edit .env with your MongoDB URI
   ```

4. **Seed the database (optional - automatic on startup):**
   ```bash
   # Automatic seeding happens when server starts
   # Or manually run:
   npm run seed
   ```

5. **Start the backend server:**
   ```bash
   npm start
   # or for development with auto-restart:
   npm run dev
   ```

   Backend will run on: http://localhost:5000

## 🎨 Frontend Setup

1. **Open a new terminal and navigate to client directory:**
   ```bash
   cd client
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the React app:**
   ```bash
   npm start
   ```

   Frontend will run on: http://localhost:3000

## 🌐 Access Points

- **Frontend (Suggestion Form):** http://localhost:3000
- **Admin Login:** http://localhost:3000/admin/login
- **Backend API:** http://localhost:5000
- **Health Check:** http://localhost:5000/api/health

## 🔑 Default Admin Credentials

- **Email:** admin@company.com
- **Password:** admin123
- **Role:** HR

## 📝 Notes

- Backend must be running before frontend can submit suggestions
- Frontend proxies API calls to backend automatically
- Each service runs independently - restart them separately as needed
- Database seeding happens automatically on startup (no manual action needed)
