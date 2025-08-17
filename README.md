# 🚀 Ghost Feedback System - Backend API

A secure, anonymous suggestion box system backend built with Node.js, Express.js, and MongoDB. This API provides endpoints for anonymous feedback submission and secure admin management.

## ✨ Features

### 🔒 **Security & Privacy**
- **100% Anonymous** - No personal data collection or IP logging
- **JWT Authentication** - Secure admin access with role-based permissions
- **Input Sanitization** - XSS and injection protection
- **Rate Limiting** - API request throttling
- **CORS Configuration** - Cross-origin resource sharing setup

### 📝 **API Endpoints**
- **Public Routes**: Category listing and anonymous suggestion submission
- **Admin Routes**: Protected endpoints for suggestion management
- **Authentication**: JWT-based admin login and verification

### 🎯 **Categories & Subcategories**
1. **Project & Development** → Issues & Blockers, Bugs & Fixes, Process Improvements, Tool Feedback
2. **Management & Leadership** → Feedback for Managers, Feedback for Top Management, Recognition Requests
3. **Team & Collaboration** → Teamwork Concerns, Communication Gaps, Workload Distribution, Morale & Motivation Ideas
4. **Workplace Environment** → Office Setup & Facilities, Health & Safety, Remote/Hybrid Work, Culture Improvements
5. **Career & Learning** → Training Needs, Mentorship Opportunities, Career Growth & Pathways, Performance Review Feedback
6. **HR & Policy** → Leave & Working Hours, Pay & Benefits, Policy Suggestions, Diversity & Inclusion, Harassment / Misconduct Concerns
7. **Innovation & New Ideas** → New Product/Features, Cost-Saving Ideas, Marketing & Branding, CSR Initiatives, Automation Proposals

## 🏗️ Architecture

### **Tech Stack**
- **Runtime**: Node.js (v16+)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Express-validator
- **Security**: Helmet, CORS, Rate Limiting

### **Database Models**
- **Categories & Subcategories**: Reference-based structure with seeder
- **Suggestions**: Anonymous submissions with metadata
- **Admins**: Role-based user management with permissions

## 🚀 Quick Start

### **Prerequisites**
- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### **Local Development Setup**

1. **Clone and navigate to server directory**
   ```bash
   cd server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Variables**
   Create `.env` file in the server directory:
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   
   # MongoDB Connection
   MONGODB_URI=mongodb://localhost:27017/ghost_feedback
   
   # JWT Configuration
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_EXPIRES_IN=7d
   
   # CORS Configuration (for frontend deployment)
   CORS_ORIGIN=http://localhost:3000
   
   # Rate Limiting
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   ```

4. **Database Setup**
   ```bash
   # Start MongoDB (if local)
   mongod
   
   # Run database seeder (automatic on startup)
   npm run seed
   
   # Force re-seeding (overwrites existing data)
   npm run seed:force
   
   # Run only category seeder
   npm run seed:categories
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

## 🌱 Database Seeding

The system automatically seeds essential data (categories, subcategories) when it starts up. This ensures your application always has the necessary data structure.

### **Automatic Seeding**
- **On Startup**: Categories and subcategories are automatically seeded if the database is empty
- **Smart Detection**: Only seeds when needed (won't overwrite existing data)
- **Environment Control**: Set `AUTO_SEED_CATEGORIES=false` to disable automatic seeding

### **Manual Seeding Options**
```bash
# Check if seeding is needed
npm run seed

# Force re-seeding (overwrites existing data)
npm run seed:force

# Run only category seeder
npm run seed:categories
```

### **Manual Seeding**
The system provides command-line tools for manual seeding when needed:

### **Seeding Data**
The system includes 7 main categories with 8 subcategories each:
- Project & Development
- Management & Leadership  
- Team & Collaboration
- Workplace Environment
- Career & Learning
- HR & Policy
- Innovation & New Ideas

### **Production Deployment (Render)**

1. **Environment Variables in Render**
   ```env
   # Server Configuration
   PORT=10000
   NODE_ENV=production
   
   # MongoDB Connection (MongoDB Atlas recommended)
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ghost_feedback
   
   # JWT Configuration
   JWT_SECRET=your_production_jwt_secret_here
   JWT_EXPIRES_IN=7d
   
   # CORS Configuration (your frontend domain)
   CORS_ORIGIN=https://your-frontend-domain.vercel.app
   
   # Rate Limiting
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   ```

2. **Build Command**
   ```bash
   npm install
   ```

3. **Start Command**
   ```bash
   npm start
   ```

## 📚 API Documentation

### **Base URL**
- **Local**: `http://localhost:5000`
- **Production**: `https://your-backend.onrender.com`

### **Public Endpoints**

#### **Get Categories**
```http
GET /api/suggestions/categories
```

#### **Submit Suggestion**
```http
POST /api/suggestions/submit
Content-Type: application/json

{
  "category": "Project & Development",
  "subcategory": "Bugs & Fixes",
  "suggestionText": "Your suggestion here..."
}
```

#### **Get System Stats**
```http
GET /api/suggestions/stats
```

### **Admin Endpoints** (Require JWT Token)

#### **Admin Login**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@company.com",
  "password": "password"
}
```

#### **Get All Suggestions**
```http
GET /api/admin/suggestions
Authorization: Bearer <jwt_token>
```

#### **Update Suggestion**
```http
PUT /api/admin/suggestions/:id
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "status": "Reviewed",
  "priority": "High",
  "assignedTo": "admin_id",
  "reply": "Admin response..."
}
```

## 🔧 Scripts

```json
{
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "seed": "node seeders/categorySeeder.js",
    "setup": "node setup.js"
  }
}
```

## 🛡️ Security Features

- **Helmet.js**: Security headers
- **CORS**: Cross-origin configuration
- **Rate Limiting**: API abuse prevention
- **Input Validation**: Request sanitization
- **JWT**: Secure authentication
- **Password Hashing**: Bcrypt encryption

## 📊 Database Schema

### **Admin Model**
```javascript
{
  email: String,
  password: String (hashed),
  firstName: String,
  lastName: String,
  role: String,
  permissions: {
    viewSuggestions: Boolean,
    editSuggestions: Boolean,
    deleteSuggestions: Boolean,
    manageAdmins: Boolean,
    exportData: Boolean,
    viewAnalytics: Boolean
  }
}
```

### **Suggestion Model**
```javascript
{
  category: String,
  subcategory: String,
  suggestionText: String,
  status: String,
  priority: String,
  assignedTo: ObjectId,
  reply: String,
  createdAt: Date
}
```

## 🚨 Troubleshooting

### **Common Issues**

1. **MongoDB Connection Error**
   - Check MongoDB service is running
   - Verify connection string in `.env`
   - Ensure network access (for Atlas)

2. **CORS Error**
   - Verify `CORS_ORIGIN` in environment variables
   - Check frontend domain matches exactly

3. **JWT Token Issues**
   - Ensure `JWT_SECRET` is set
   - Check token expiration time

### **Logs**
- Check Render logs in dashboard
- Use `console.log()` for debugging (remove in production)

## 📞 Support

For backend API issues:
1. Check Render deployment logs
2. Verify environment variables
3. Test endpoints with Postman/Insomnia
4. Check MongoDB connection status

## 🔗 Links

- **Frontend Repository**: [Ghost Feedback Frontend](https://github.com/your-username/ghost-feedback-frontend)
- **Live Demo**: [Your Frontend URL]
- **API Base**: [Your Backend URL]

---

**Built with ❤️ for secure, anonymous employee feedback**
