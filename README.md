# 🌐 City Sphere — Smart City Portal

A full-stack civic engagement and smart city guide platform built for Indian cities. City Sphere connects citizens with their city through interactive maps, place discovery, civic feedback, emergency services, and an AI-powered city assistant.

---

## ✨ Features

### 🗺️ Interactive Map
Explore your city on an interactive Leaflet map with real-time place markers, route visualization, and navigation support.

### 🔍 Explore & Discover
Browse places of interest (temples, parks, forts, hospitals, and more), save your favorites, and get AI-powered recommendations based on your activity.

### 📢 Civic Feedback System
Submit complaints, suggestions, ease-of-living reports, and city experiences. Complaints that receive **20+ citizen upvotes** are automatically escalated to **High Priority** status for admin attention.

### 🤖 CityBot — AI Assistant
An integrated AI chatbot that acts as both a city guide and customer support agent — recommending local places, explaining app features, and helping citizens navigate the platform.

### 🚨 Emergency Services
Quick access to emergency contacts and city-level emergency information.

### 🛡️ Admin Panel
A dedicated admin review dashboard to manage citizen feedback, approve place suggestions, and monitor civic reports.

### 👤 User Profiles
Fully editable profiles with Cloudinary-powered profile picture uploads, bio, phone number, and saved places.

### 🔐 Secure Authentication
Email-based OTP verification, JWT session management, and a complete forgot/reset password flow via email.

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 18 + Vite | UI framework & build tool |
| React Router v6 | Client-side routing |
| Tailwind CSS | Utility-first styling |
| React-Leaflet / Leaflet | Interactive maps |
| Axios | HTTP client |
| Lucide React | Icon library |

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express 5 | REST API server |
| MongoDB + Mongoose | Database & ODM |
| JSON Web Tokens (JWT) | Authentication |
| bcryptjs | Password hashing |
| Nodemailer | Email (OTP & password reset) |
| Cloudinary + Multer | Image storage & upload |
| dotenv | Environment configuration |

---

## 📁 Project Structure

```
City Sphere/
├── client/                         # React frontend (Vite)
│   └── src/
│       ├── features/
│       │   ├── auth/               # Login, Register, OTP, Reset Password
│       │   ├── chatbot/            # CityBot AI assistant
│       │   └── dashboard/          # Service cards & route map
│       ├── pages/
│       │   ├── DashboardPage.jsx
│       │   ├── MapPage.jsx
│       │   ├── ExplorePage.jsx
│       │   ├── FeedbackPage.jsx
│       │   ├── EmergencyPage.jsx
│       │   ├── ProfilePage.jsx
│       │   └── admin/AdminReviewPage.jsx
│       ├── context/                # AuthContext, ExploreContext, ThemeContext
│       ├── components/             # ProtectedRoute, ServiceCard, etc.
│       ├── hooks/                  # useActivityTracker
│       ├── layouts/                # MainLayout (shared header/footer/chatbot)
│       ├── services/               # api.js (Axios base config)
│       └── utils/                  # chatbotPrompt.js
│
└── server/                         # Node.js/Express backend
    ├── controllers/                # authController, feedbackController, etc.
    ├── models/                     # User, Feedback, CityService, PlaceSuggestion
    ├── routes/                     # auth, services, places, suggestions, chatbot, feedback
    ├── middleware/                  # authMiddleware (JWT verification)
    ├── utils/                      # cloudinaryUpload, sendEmail
    └── scripts/                    # seedServices, seedFeedback
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)
- Cloudinary account
- SMTP credentials (Gmail or similar) for email features

---

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/city-sphere.git
cd city-sphere
```

---

### 2. Backend Setup

```bash
cd server
npm install
```

Create a `.env` file in the `server/` directory:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email (Nodemailer)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_app_password

# AI Chatbot API Key (if applicable)
CHATBOT_API_KEY=your_api_key
```

Start the server:

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

The API will be running at `http://localhost:5000`

---

### 3. Frontend Setup

```bash
cd client
npm install
npm run dev
```

The frontend will be running at `http://localhost:5173`

---

### 4. Seed Initial Data (Optional)

```bash
# Seed city services
node server/scripts/seedServices.js

# Seed sample feedback
node server/scripts/seedFeedback.js
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/auth/register` | Register a new user | Public |
| POST | `/api/auth/login` | Login & get JWT token | Public |
| POST | `/api/auth/verify-otp` | Verify email OTP | Public |
| POST | `/api/auth/forgot-password` | Send password reset email | Public |
| POST | `/api/auth/reset-password/:token` | Reset password | Public |
| GET | `/api/services` | Get city service schedules | Protected |
| GET | `/api/places` | Search & get places | Protected |
| POST | `/api/suggestions` | Submit a place suggestion | Protected |
| POST | `/api/chatbot` | Chat with CityBot | Protected |
| GET | `/api/feedback` | Get feedback list | Protected |
| POST | `/api/feedback` | Submit feedback/complaint | Protected |

---

## 👥 User Roles

| Role | Capabilities |
|---|---|
| **Citizen** | Explore places, submit feedback, use chatbot, save places, upvote complaints |
| **Admin** | All citizen capabilities + access to Admin Review Panel for managing feedback and place suggestions |

---

## 🤖 CityBot

CityBot is the built-in AI assistant that serves two roles:

- **City Guide** — Recommends local tourist spots, temples, parks, forts, and hidden gems across Indian cities.
- **Customer Support** — Helps users navigate app features like saving places, submitting feedback, and understanding the complaint escalation system.

> Complaint escalation: When a civic complaint receives **20+ citizen upvotes**, it is automatically flagged as **High Priority**.

---

## 📸 Screenshots

> <img width="1902" height="902" alt="Screenshot 2026-04-27 032154" src="https://github.com/user-attachments/assets/d564fcac-f585-4cef-875f-06bdc6b16f99" />
> <img width="1916" height="911" alt="Screenshot 2026-04-27 032435" src="https://github.com/user-attachments/assets/e2739c36-aff0-4d35-9b74-df21f332a49f" />
> <img width="1907" height="912" alt="Screenshot 2026-04-27 032452" src="https://github.com/user-attachments/assets/773a8a14-7769-43eb-8563-9b63a8b2f712" />
> <img width="1912" height="910" alt="Screenshot 2026-04-27 032506" src="https://github.com/user-attachments/assets/6fc673ed-8c4c-4b39-bfe5-68c336395bd8" />
> <img width="1912" height="911" alt="Screenshot 2026-04-27 032528" src="https://github.com/user-attachments/assets/343b6b98-79e6-4c2b-afdd-035608ae548e" />
> <img width="525" height="788" alt="Screenshot 2026-04-27 032541" src="https://github.com/user-attachments/assets/51ea2f52-952d-4752-b66e-7dd6d2c32b5f" />







---

## 🙌 Acknowledgements

- [OpenStreetMap](https://www.openstreetmap.org/) & [Leaflet](https://leafletjs.com/) for map data and rendering
- [Cloudinary](https://cloudinary.com/) for image hosting
- [Lucide](https://lucide.dev/) for icons
- [Tailwind CSS](https://tailwindcss.com/) for styling

---

## 📄 License

This project was developed as a **Final Year Project**. All rights reserved by the author(s).
