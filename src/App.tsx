import { useState } from 'react'
import React from 'react'
import { LandingPage } from './pages/LandingPage'
import { StudentLoginPage } from './pages/StudentLoginPage'
import { AlumniLoginPage } from './pages/AlumniLoginPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { StudentDashboard } from './pages/StudentDashboard'
import { AlumniDashboard } from './pages/AlumniDashboard'
import { AlumniEndorse } from './pages/AlumniEndorse'
import { AlumniPostJob } from './pages/AlumniPostJob'
import { AlumniCreateEvent } from './pages/AlumniCreateEvent'
import { AlumniMentorRequests } from './pages/AlumniMentorRequests'
import { AlumniAnalytics } from './pages/AlumniAnalytics'
import { AlumniMenteesDashboard } from './pages/AlumniMenteesDashboard'
import { MentorDiscoveryPage } from './pages/MentorDiscoveryPage'
import { EventsPage } from './pages/EventsPage'
import { JobsPage } from './pages/JobsPage'
import { ProfilePage } from './pages/ProfilePage'
import './App.css'

type PageType = 'landing' | 'login' | 'register' | 'student-login' | 'alumni-login' | 'student-register' | 'alumni-register' | 'student-dashboard' | 'alumni-dashboard' | 'alumni-endorse' | 'alumni-post-job' | 'alumni-create-event' | 'alumni-requests' | 'alumni-mentees' | 'alumni-analytics' | 'mentor-discovery' | 'events' | 'jobs' | 'profile'

interface NavigationContextType {
  navigate: (page: PageType) => void
}

export const NavigationContext = React.createContext<NavigationContextType | undefined>(undefined)

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('landing')

  const navigate = (page: PageType) => {
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
