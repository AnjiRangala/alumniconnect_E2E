# Anjii - Alumni-Student Platform

A comprehensive platform connecting alumni and students for mentorship, job opportunities, and events.

## 📁 Project Structure

```
anjii/
├── config/               # Configuration files
│   ├── eslint.config.js      # ESLint configuration
│   ├── postcss.config.js     # PostCSS configuration
│   ├── tailwind.config.js    # Tailwind CSS configuration
│   ├── tsconfig.json         # Base TypeScript config
│   ├── tsconfig.app.json     # App TypeScript config
│   └── tsconfig.node.json    # Node TypeScript config
│
├── docs/                 # Documentation
│   ├── PROJECT_STRUCTURE.md  # This file
│   ├── README.md             # Original Vite+React documentation
│   └── MONGODB_SETUP.md      # MongoDB setup instructions
│
├── public/               # Static public assets
│
├── server/               # Backend server code
│   ├── server.js             # Express server and API endpoints
│   ├── .env                  # Environment variables (not in git)
│   └── models/               # MongoDB schemas
│       ├── User.js
│       └── MentorshipRequest.js
│
├── src/                  # Frontend React application
│   ├── App.tsx               # Main app component
│   ├── App.css               # App-specific styles
│   ├── main.tsx              # React entry point
│   ├── index.css             # Global styles
│   │
│   ├── assets/               # Images, icons, etc.
│   │
│   ├── components/           # Reusable React components
│   │   ├── BadgeModal.tsx
│   │   ├── CalendarView.tsx
│   │   ├── EventCard.tsx
│   │   ├── FeatureCard.tsx
│   │   ├── Footer.tsx
│   │   ├── InputModal.tsx
│   │   ├── JobCard.tsx
│   │   ├── MentorCard.tsx
│   │   └── Navbar.tsx
│   │
│   └── pages/                # Page-level components
│       ├── LandingPage.tsx
│       ├── LoginPage.tsx
│       ├── RegisterPage.tsx
│       ├── StudentLoginPage.tsx
│       ├── StudentDashboard.tsx
│       ├── AlumniLoginPage.tsx
│       ├── AlumniDashboard.tsx
│       ├── AlumniEndorse.tsx
│       ├── AlumniPostJob.tsx
│       ├── AlumniCreateEvent.tsx
│       ├── AlumniMentorRequests.tsx
│       ├── AlumniAnalytics.tsx
│       ├── AlumniMenteesDashboard.tsx
│       ├── MentorDiscoveryPage.tsx
│       ├── EventsPage.tsx
│       ├── JobsPage.tsx
│       └── ProfilePage.tsx
│
├── index.html            # HTML entry point
├── package.json          # Dependencies and scripts
└── vite.config.ts        # Vite build configuration
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local or Atlas)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up MongoDB:**
   See [docs/MONGODB_SETUP.md](./MONGODB_SETUP.md) for detailed instructions.

3. **Configure environment:**
   Create a `.env` file in the `server/` directory:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_secret_key
   PORT=5000
   ```

### Running the Application

**Development mode:**
```bash
# Frontend (Vite dev server)
npm run dev

# Backend (in a separate terminal)
cd server
node server.js
```

**Production build:**
```bash
npm run build
npm run preview
```

## 📝 Available Scripts

- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## 🏗️ Technology Stack

### Frontend
- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Lucide React** - Icons

### Backend
- **Express** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **bcryptjs** - Password hashing

## 📚 Key Features

- **Student Features:**
  - Browse mentors
  - Request mentorship
  - View events and jobs
  - Personalized dashboard

- **Alumni Features:**
  - Mentor students
  - Post job opportunities
  - Create events
  - Analytics dashboard
  - Endorse students

## 🗂️ Folder Descriptions

### `/config`
Contains all build and development tool configurations. These files are kept separate from the root to maintain a clean project structure.

### `/docs`
Project documentation including setup guides, API documentation, and this structure guide.

### `/server`
Backend API server built with Express.js. Handles authentication, database operations, and business logic.

### `/src`
Frontend React application with TypeScript. Organized into:
- **components**: Reusable UI components
- **pages**: Route-level components
- **assets**: Static files (images, icons)

### `/public`
Static assets served directly without processing.

## 🔧 Development Notes

- Config files are duplicated in root for tool compatibility
- The main configs are in `/config` folder
- Backend moved from `/backend` to `/server` for clarity
- Empty `/types` folder was removed
- Unused assets cleaned up

## 📄 License

Private project - All rights reserved
