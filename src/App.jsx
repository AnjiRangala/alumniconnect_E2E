import { useEffect, useState } from 'react'
import React from 'react'
import { LandingPage } from './pages/LandingPage.jsx'
import { StudentLoginPage } from './pages/StudentLoginPage.jsx'
import { AlumniLoginPage } from './pages/AlumniLoginPage.jsx'
import { LoginPage } from './pages/LoginPage.jsx'
import { RegisterPage } from './pages/RegisterPage.jsx'
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx'
import ResetPasswordPage from './pages/ResetPasswordPage.jsx'
import { StudentDashboard } from './pages/StudentDashboard.jsx'
import { StudentMentorsDashboard } from './pages/StudentMentorsDashboard.jsx'
import { StudentEventsDashboard } from './pages/StudentEventsDashboard.jsx'
import { StudentProfile } from './pages/StudentProfile.jsx'
import { StudentMessagesDashboard } from './pages/StudentMessagesDashboard.jsx'
import { StudentApplicationsDashboard } from './pages/StudentApplicationsDashboard.jsx'
import { AlumniDashboard } from './pages/AlumniDashboard.jsx'
import { AlumniEndorse } from './pages/AlumniEndorse.jsx'
import { AlumniPostJob } from './pages/AlumniPostJob.jsx'
import { AlumniCreateEvent } from './pages/AlumniCreateEvent.jsx'
import { AlumniEventsManage } from './pages/AlumniEventsManage.jsx'
import { SendDemoEmail } from './pages/SendDemoEmail.jsx'
import { AlumniMentorRequests } from './pages/AlumniMentorRequests.jsx'
import { AlumniAnalytics } from './pages/AlumniAnalytics.jsx'
import { AlumniMenteesDashboard } from './pages/AlumniMenteesDashboard.jsx'
import { AlumniJobApplications } from './pages/AlumniJobApplications.jsx'
import { AlumniMessagesDashboard } from './pages/AlumniMessagesDashboard.jsx'
import { MentorDiscoveryPage } from './pages/MentorDiscoveryPage.jsx'
import { EventsPage } from './pages/EventsPage.jsx'
import { JobsPage } from './pages/JobsPage.jsx'
import { ProfilePage } from './pages/ProfilePage.jsx'
import './App.css'

export const NavigationContext = React.createContext(undefined)

const VALID_PAGES = new Set([
  'landing',
  'student-login',
  'alumni-login',
  'login',
  'register',
  'student-register',
  'alumni-register',
  'forgot-password',
  'reset-password',
  'student-dashboard',
  'student-mentors',
  'student-messages',
  'student-applications',
  'student-profile',
  'student-events',
  'alumni-dashboard',
  'alumni-endorse',
  'alumni-post-job',
  'alumni-create-event',
  'alumni-events-manage',
  'alumni-send-demo-email',
  'alumni-requests',
  'alumni-analytics',
  'alumni-mentees',
  'alumni-job-applications',
  'alumni-messages',
  'mentor-discovery',
  'events',
  'jobs',
  'profile'
])

const getPageFromHash = () => {
  const fromHash = (window.location.hash || '').replace(/^#\/?/, '')
  if (VALID_PAGES.has(fromHash)) return fromHash
  return 'landing'
}

function App() {
  const [currentPage, setCurrentPage] = useState(getPageFromHash)
  const replaceNextNavigation = React.useRef(false)
  const pageHistoryRef = React.useRef([])
  const currentPageRef = React.useRef(currentPage)

  useEffect(() => {
    currentPageRef.current = currentPage
  }, [currentPage])

  const navigate = (page, options = {}) => {
    if (!VALID_PAGES.has(page)) return
    replaceNextNavigation.current = !!options?.replace
    
    // Track history for back navigation
    if (options?.replace) {
      // Don't add to history if replacing
    } else {
      // Add current page to history before navigating away
      if (pageHistoryRef.current[pageHistoryRef.current.length - 1] !== currentPage) {
        pageHistoryRef.current.push(currentPage)
      }
    }
    
    setCurrentPage(page)
  }

  // Expose getBackPage for components to use
  const getBackPage = () => {
    if (pageHistoryRef.current.length > 0) {
      return pageHistoryRef.current[pageHistoryRef.current.length - 1]
    }
    return 'landing'
  }

  useEffect(() => {
    const hashPage = (window.location.hash || '').replace(/^#\/?/, '')
    const targetHash = `#/${currentPage}`
    if (hashPage !== currentPage || window.location.hash !== targetHash) {
      if (replaceNextNavigation.current) {
        window.history.replaceState(null, '', targetHash)
      } else {
        window.location.hash = currentPage
      }
    }
    replaceNextNavigation.current = false
  }, [currentPage])

  useEffect(() => {
    localStorage.removeItem('currentPage')
  }, [])

  useEffect(() => {
    const onHashChange = () => {
      const page = getPageFromHash()
      const activePage = currentPageRef.current
      const isDashboardPage = activePage === 'student-dashboard' || activePage === 'alumni-dashboard'
      const isBackToAuthOrLanding = new Set([
        'landing',
        'student-login',
        'alumni-login',
        'login',
        'register',
        'student-register',
        'alumni-register',
        'forgot-password',
        'reset-password'
      ]).has(page)

      let hasSession = false
      try {
        const token = localStorage.getItem('token')
        const rawUser = localStorage.getItem('user')
        hasSession = !!token && !!rawUser
      } catch (_err) {
        hasSession = false
      }

      if (hasSession && isDashboardPage && isBackToAuthOrLanding) {
        replaceNextNavigation.current = true
        setCurrentPage(activePage)
        window.history.replaceState(null, '', `#/${activePage}`)
        return
      }

      setCurrentPage(page)
    }

    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

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
      case 'forgot-password':
        return <ForgotPasswordPage onNavigate={navigate} />
      case 'reset-password':
        return <ResetPasswordPage onNavigate={navigate} />
      case 'student-dashboard':
        return <StudentDashboard onNavigate={navigate} />
      case 'student-mentors':
        return <StudentMentorsDashboard onNavigate={navigate} />
      case 'student-messages':
        return <StudentMessagesDashboard onNavigate={navigate} />
      case 'student-applications':
        return <StudentApplicationsDashboard onNavigate={navigate} />
      case 'student-profile':
        return <StudentProfile onNavigate={navigate} />
      case 'alumni-dashboard':
        return <AlumniDashboard onNavigate={navigate} />
      case 'alumni-endorse':
        return <AlumniEndorse onNavigate={navigate} />
      case 'alumni-post-job':
        return <AlumniPostJob onNavigate={navigate} />
      case 'alumni-create-event':
        return <AlumniCreateEvent onNavigate={navigate} />
      case 'alumni-events-manage':
        return <AlumniEventsManage onNavigate={navigate} />
      case 'alumni-send-demo-email':
        return <SendDemoEmail onNavigate={navigate} />
      case 'alumni-requests':
        return <AlumniMentorRequests onNavigate={navigate} />
      case 'alumni-analytics':
        return <AlumniAnalytics onNavigate={navigate} />
      case 'alumni-mentees':
        return <AlumniMenteesDashboard onNavigate={navigate} />
      case 'alumni-job-applications':
        return <AlumniJobApplications onNavigate={navigate} />
      case 'alumni-messages':
        return <AlumniMessagesDashboard onNavigate={navigate} />
      case 'mentor-discovery':
        return <MentorDiscoveryPage onNavigate={navigate} />
      case 'events':
        return <EventsPage onNavigate={navigate} />
      case 'jobs':
        return <JobsPage onNavigate={navigate} />
      case 'profile':
        return <ProfilePage onNavigate={navigate} />
      case 'student-events':
        return <StudentEventsDashboard onNavigate={navigate} />
      default:
        return <LandingPage onNavigate={navigate} />
    }
  }

  return (
    <NavigationContext.Provider value={{ navigate, getBackPage }}>
      {renderPage()}
    </NavigationContext.Provider>
  )
}

export default App
