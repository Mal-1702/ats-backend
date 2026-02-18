# ATS Frontend

Modern React frontend for the Multi-Agent ATS System.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` if your backend is running on a different URL.

### 3. Start Development Server

```bash
npm run dev
```

The app will be available at http://localhost:3000

## 📁 Project Structure

```
frontend/
├── src/
│   ├── pages/
│   │   ├── Login.jsx              # Login/Register page
│   │   ├── Dashboard.jsx          # Main dashboard with stats
│   │   ├── JobCreate.jsx          # Job creation form
│   │   ├── ResumeUpload.jsx       # Resume upload with drag-drop
│   │   └── RankedCandidates.jsx   # Candidate rankings view
│   ├── components/
│   │   ├── Navbar.jsx             # Navigation bar
│   │   └── CandidateCard.jsx      # Candidate card with AI reasoning
│   ├── services/
│   │   └── api.js                 # Axios API client
│   ├── context/
│   │   └── AuthContext.jsx        # Authentication context
│   ├── App.jsx                    # Main app with routing
│   ├── main.jsx                   # React entry point
│   └── index.css                  # Global styles
├── package.json
├── vite.config.js
└── index.html
```

## ✨ Features

### Authentication
- JWT-based login/register
- Protected routes
- Automatic token refresh
- Persistent sessions

### Dashboard
- Job statistics cards
- Recent jobs grid
- Quick actions

### Job Creation
- Dynamic skill/keyword tags
- Form validation
- Async job processing

### Resume Upload
- Drag-and-drop file upload
- File type/size validation
- Upload progress tracking
- Task status polling

### Candidate Rankings
- AI-powered shortlist
- Tier classification (A/B/C/D)
- Score breakdown visualization
- Natural language reasoning
- Key strengths & gaps analysis
- Hiring recommendations

## 🎨 Design System

The app uses a modern design system with:
- **Primary Color**: Indigo (#6366f1)
- **Secondary Color**: Green (#10b981)
- **Typography**: System fonts
- **Components**: Custom-built, no UI library
- **Responsive**: Mobile-first design

## 🔧 Development

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## 🌐 API Integration

The frontend communicates with the backend via Axios. All API calls are centralized in `src/services/api.js`.

### API Endpoints Used

- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user
- `POST /upload` - Upload resume
- `GET /task-status/:id` - Check task status
- `POST /jobs` - Create job
- `GET /jobs` - List jobs
- `GET /jobs/:id` - Get job details
- `POST /rank/job/:id` - Trigger ranking
- `GET /rank/job/:id/shortlist` - Get shortlist

## 🔐 Security

- JWT tokens stored in localStorage
- Automatic token injection in requests
- 401 handling with redirect to login
- Protected routes with authentication check

## 📱 Responsive Design

The app is fully responsive and works on:
- Desktop (1200px+)
- Tablet (768px - 1199px)
- Mobile (< 768px)

## 🎯 User Flow

1. **Login/Register** → Authenticate user
2. **Dashboard** → View jobs and stats
3. **Create Job** → Define position requirements
4. **Upload Resumes** → Add candidate resumes
5. **Trigger Matching** → Run AI matching pipeline
6. **View Rankings** → Review shortlisted candidates with AI reasoning

## 🚀 Deployment

### Docker (with backend)

The frontend is included in the main docker-compose.yml. Just run:

```bash
docker-compose up --build
```

### Standalone Deployment

Build and serve the static files:

```bash
npm run build
# Serve the dist/ folder with any static server
```

## 🤝 Contributing

The frontend follows React best practices:
- Functional components with hooks
- Context API for state management
- CSS modules for styling
- Axios for API calls
- React Router for navigation

---

**Tech Stack**: React 18, Vite, React Router, Axios, Lucide Icons
