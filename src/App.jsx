import { useState } from 'react'
import React from 'react'
import { LandingPage } from './pages/LandingPage.jsx'
import { StudentLoginPage } from './pages/StudentLoginPage.jsx'
import { AlumniLoginPage } from './pages/AlumniLoginPage.jsx'
import { LoginPage } from './pages/LoginPage.jsx'
import { RegisterPage } from './pages/RegisterPage.jsx'
import { StudentDashboard } from './pages/StudentDashboard.jsx'
import { AlumniDashboard } from './pages/AlumniDashboard.jsx'
import { AlumniEndorse } from './pages/AlumniEndorse.jsx'
import { AlumniPostJob } from './pages/AlumniPostJob.jsx'
import { AlumniCreateEvent } from './pages/AlumniCreateEvent.jsx'
import { AlumniMentorRequests } from './pages/AlumniMentorRequests.jsx'
import { AlumniAnalytics } from './pages/AlumniAnalytics.jsx'
import { AlumniMenteesDashboard } from './pages/AlumniMenteesDashboard.jsx'
import { MentorDiscoveryPage } from './pages/MentorDiscoveryPage.jsx'
import { EventsPage } from './pages/EventsPage.jsx'
import { JobsPage } from './pages/JobsPage.jsx'
import { ProfilePage } from './pages/ProfilePage.jsx'
import './App.css'

export const NavigationContext = React.createContext(undefined)

function App() {
  const [currentPage, setCurrentPage] = useState('landing')

  const navigate = (page) => {
    setCurrentPage(page)
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'landing':
        return <LandingPage onNavigate={navigate} />
      case 'student-login':
        return <StudentLoginPage onNavigate={navigate} />
      case 'alumni-login':
        return <AlumniLoginPage onNavigate={navigate} />
      case 'login':
        return <LoginPage onNavigate={navigate} />
      case 'register':
        return <RegisterPage onNavigate={navigate} />
      case 'student-register':
        return <RegisterPage onNavigate={navigate} />
      case 'alumni-register':
        return <RegisterPage onNavigate={navigate} />
      case 'student-dashboard':
        return <StudentDashboard onNavigate={navigate} />
      case 'alumni-dashboard':
        return <AlumniDashboard onNavigate={navigate} />
      case 'alumni-endorse':
        return <AlumniEndorse onNavigate={navigate} />
      case 'alumni-post-job':
        return <AlumniPostJob onNavigate={navigate} />
      case 'alumni-create-event':
        return <AlumniCreateEvent onNavigate={navigate} />
      case 'alumni-requests':
        return <AlumniMentorRequests onNavigate={navigate} />
      case 'alumni-analytics':
        return <AlumniAnalytics onNavigate={navigate} />
      case 'alumni-mentees':
        return <AlumniMenteesDashboard onNavigate={navigate} />
      case 'mentor-discovery':
        return <MentorDiscoveryPage onNavigate={navigate} />
      case 'events':
        return <EventsPage onNavigate={navigate} />
      case 'jobs':
        return <JobsPage onNavigate={navigate} />
      case 'profile':
        return <ProfilePage onNavigate={navigate} />
      default:
        return <LandingPage onNavigate={navigate} />
    }
  }

  return renderPage()
}

export default App
