import { useState } from 'react'
import React from 'react'
import { BarChart3, Users, Briefcase, Settings, LogOut, UserPlus, CalendarCheck } from 'lucide-react';
import ImageCropModal from '../components/ImageCropModal.jsx';
import { BrandLogo } from '../components/BrandLogo.jsx';

const API_BASE_URL = 'http://localhost:5000/api';

export const StudentDashboard = ({ onNavigate }) => {
  const [user, setUser] = useState(null)
  const [dashboardStats, setDashboardStats] = useState(null)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshMessage, setRefreshMessage] = useState(null)
  const [myRequests, setMyRequests] = useState([])
  const [loadingRequests, setLoadingRequests] = useState(false)
  const [editingRequest, setEditingRequest] = useState(null)
  const [editForm, setEditForm] = useState({ topic: '', note: '' })
  const [requestMessage, setRequestMessage] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [messages, setMessages] = useState([])
  const [showMessagesModal, setShowMessagesModal] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [replySending, setReplySending] = useState(false)
  const [registeredEvents, setRegisteredEvents] = useState([])
  const [loadingRegisteredEvents, setLoadingRegisteredEvents] = useState(false)
  const [jobApplications, setJobApplications] = useState([])
  const [loadingApplications, setLoadingApplications] = useState(false)
  const [applicationMessage, setApplicationMessage] = useState(null)
  const [withdrawConfirm, setWithdrawConfirm] = useState(null)
  const [withdrawing, setWithdrawing] = useState(false)
  const [profileCompletion, setProfileCompletion] = useState(0)
  const [profileData, setProfileData] = useState(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoError, setPhotoError] = useState(null)
  const [cropImage, setCropImage] = useState(null)
  const [showCropModal, setShowCropModal] = useState(false)
  const [announcements, setAnnouncements] = useState([])
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false)

  React.useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }

    // Fetch dashboard stats from backend
    fetchDashboardData()
    fetchMyRequests()
    fetchRegisteredEvents()
    fetchJobApplications()
    fetchProfileData()
    fetchAnnouncements()
    fetchNotifications()
  }, [])

  React.useEffect(() => {
    const syncUserAndProfile = () => {
      try {
        const userData = localStorage.getItem('user')
        if (userData) {
          setUser(JSON.parse(userData))
        }
      } catch (_err) {}
      fetchProfileData()
    }

    window.addEventListener('user-updated', syncUserAndProfile)
    window.addEventListener('storage', syncUserAndProfile)

    return () => {
      window.removeEventListener('user-updated', syncUserAndProfile)
      window.removeEventListener('storage', syncUserAndProfile)
    }
  }, [])


  // Auto-refresh registered events every 10 seconds
  React.useEffect(() => {
    const interval = setInterval(fetchRegisteredEvents, 10000)
    return () => clearInterval(interval)
  }, [])

  // Auto-refresh job applications every 5 seconds
  React.useEffect(() => {
    const interval = setInterval(fetchJobApplications, 5000)
    return () => clearInterval(interval)
  }, [])

  // Auto-refresh notifications count every 10 seconds
  React.useEffect(() => {
    const interval = setInterval(fetchNotifications, 10000)
    return () => clearInterval(interval)
  }, [])

  const fetchRegisteredEvents = async () => {
    setLoadingRegisteredEvents(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      const response = await fetch(`${API_BASE_URL}/events/registered/by-me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const result = await response.json()
      if (result.success) {
        setRegisteredEvents(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching registered events:', error)
    } finally {
      setLoadingRegisteredEvents(false)
    }
  }

  const fetchJobApplications = async () => {
    setLoadingApplications(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        console.warn('No token found')
        return
      }
      const response = await fetch(`${API_BASE_URL}/jobs/my-applications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const result = await response.json()
      console.log('Job applications response:', result)
      if (result.success) {
        setJobApplications(result.data || [])
      } else {
        console.error('Failed to fetch applications:', result.message)
      }
    } catch (error) {
      console.error('Error fetching job applications:', error)
    } finally {
      setLoadingApplications(false)
    }
  }

  const fetchProfileData = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const result = await response.json()

      if (result.success && result.data) {
        const profile = result.data
        setProfileData(profile)

        // Calculate profile completion percentage
        let completed = 0
        let total = 6

        if (profile.fullName) completed++
        if (profile.email) completed++
        if (profile.bio && profile.bio.trim().length > 0) completed++
        if (profile.skills && profile.skills.length > 0) completed++
        if (profile.resume) completed++
        if (profile.projects && profile.projects.length > 0) completed++

        const percentage = Math.round((completed / total) * 100)
        setProfileCompletion(Math.min(100, percentage))
        
        console.log('🎯 PROFILE COMPLETION CALCULATION:', {
          fullName: !!profile.fullName,
          email: !!profile.email,
          bio: !!profile.bio,
          bioValue: profile.bio,
          skills: profile.skills?.length || 0,
          resume: !!profile.resume,
          projects: profile.projects?.length || 0,
          completed,
          total,
          percentage
        })
      }
    } catch (error) {
      console.error('Error fetching profile data:', error)
    }
  }

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/png']
    if (!allowedTypes.includes(file.type)) {
      setPhotoError('Please upload a JPEG or PNG image')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setPhotoError('Image size must be less than 2MB')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setCropImage(reader.result)
      setShowCropModal(true)
      setPhotoError(null)
    }
    reader.readAsDataURL(file)
  }

  const handleCropComplete = async (croppedImageBase64) => {
    setShowCropModal(false)
    setPhotoUploading(true)
    setPhotoError(null)

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setPhotoError('Please login to upload a photo')
        setPhotoUploading(false)
        return
      }

      const response = await fetch(`${API_BASE_URL}/profile/upload-photo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ photoBase64: croppedImageBase64 })
      })

      if (!response.ok) {
        const errorData = await response.json()
        setPhotoError(errorData.message || `Server error: ${response.status}`)
        setPhotoUploading(false)
        return
      }

      const result = await response.json()
      if (result.success) {
        setProfileData(prev => ({ ...prev, photo: result.data?.photo || croppedImageBase64 }))
        setUser(prev => ({ ...prev, photo: result.data?.photo || croppedImageBase64 }))
        const stored = localStorage.getItem('user')
        if (stored) {
          const parsed = JSON.parse(stored)
          parsed.photo = result.data?.photo || croppedImageBase64
          localStorage.setItem('user', JSON.stringify(parsed))
        }
        setPhotoError(null)
      } else {
        setPhotoError(result.message || 'Failed to upload photo')
      }
    } catch (err) {
      console.error('Error uploading photo:', err)
      setPhotoError(`Upload error: ${err.message}`)
    } finally {
      setPhotoUploading(false)
      setCropImage(null)
    }
  }

  const withdrawJobApplication = async () => {
    if (!withdrawConfirm) return
    
    setWithdrawing(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      
      const response = await fetch(`${API_BASE_URL}/jobs/applications/${withdrawConfirm.applicationId}/withdraw`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      const result = await response.json()
      if (result.success) {
        setApplicationMessage({ message: 'Application withdrawn successfully', type: 'success' })
        setTimeout(() => setApplicationMessage(null), 3000)
        fetchJobApplications()
        setWithdrawConfirm(null)
      } else {
        setApplicationMessage({ message: result.message || 'Failed to withdraw application', type: 'error' })
        setTimeout(() => setApplicationMessage(null), 3000)
      }
    } catch (error) {
      console.error('Error withdrawing application:', error)
      setApplicationMessage({ message: 'Failed to withdraw application', type: 'error' })
      setTimeout(() => setApplicationMessage(null), 3000)
    } finally {
      setWithdrawing(false)
    }
  }

  const missingItems = [
    !profileData?.fullName ? { key: 'fullName', label: 'Full Name' } : null,
    !profileData?.email ? { key: 'email', label: 'Email' } : null,
    !profileData?.bio?.trim() ? { key: 'bio', label: 'Bio' } : null,
    (!profileData?.skills || profileData.skills.length === 0) ? { key: 'skills', label: 'Skills' } : null,
    !profileData?.resume ? { key: 'resume', label: 'Resume' } : null,
    (!profileData?.projects || profileData.projects.length === 0) ? { key: 'projects', label: 'Projects' } : null
  ].filter(Boolean)

  const unregisterFromEvent = async (eventId) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      const response = await fetch(`${API_BASE_URL}/events/${eventId}/unregister`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const result = await response.json()
      if (result.success) {
        setRequestMessage('Successfully unregistered from event')
        fetchRegisteredEvents()
      } else {
        setRequestMessage(result.message || 'Failed to unregister')
      }
      setTimeout(() => setRequestMessage(null), 3000)
    } catch (error) {
      console.error('Error unregistering:', error)
      setRequestMessage('Network error')
      setTimeout(() => setRequestMessage(null), 3000)
    }
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token')
      const headers = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      const response = await fetch(`${API_BASE_URL}/student/dashboard`, { headers })
      const result = await response.json()
      if (result.success) {
        setDashboardStats(result.data)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    }
  }

  const fetchMyRequests = async () => {
    setLoadingRequests(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      const headers = { 'Authorization': `Bearer ${token}` }
      const response = await fetch(`${API_BASE_URL}/mentorship/my-requests`, { headers })
      const result = await response.json()
      if (result.success) {
        setMyRequests(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching requests:', error)
    } finally {
      setLoadingRequests(false)
    }
  }

  const deleteRequest = async (requestId) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setRequestMessage('Authentication required')
        setTimeout(() => setRequestMessage(null), 3000)
        return
      }

      const response = await fetch(`${API_BASE_URL}/mentorship/my-requests/${requestId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        const result = await response.json().catch(() => ({ message: 'Server error' }))
        setRequestMessage(result.message || 'Failed to delete request')
        setTimeout(() => setRequestMessage(null), 3000)
        setDeleteConfirm(null)
        return
      }

      const result = await response.json()
      if (result.success) {
        setMyRequests(prev => prev.filter(r => (r._id || r.id) !== requestId))
        setRequestMessage('Request deleted successfully')
        setTimeout(() => setRequestMessage(null), 3000)
        setDeleteConfirm(null)
      } else {
        setRequestMessage(result.message || 'Failed to delete request')
        setTimeout(() => setRequestMessage(null), 3000)
        setDeleteConfirm(null)
      }
    } catch (error) {
      console.error('Error deleting request:', error)
      setRequestMessage('Network error. Please check if the server is running.')
      setTimeout(() => setRequestMessage(null), 3000)
      setDeleteConfirm(null)
    }
  }

  const startEditing = (request) => {
    setEditingRequest(request)
    setEditForm({ topic: request.topic, note: request.note })
  }

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      const response = await fetch(`${API_BASE_URL}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const result = await response.json()
      if (result.success) {
        setMessages(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const fetchAnnouncements = async () => {
    setLoadingAnnouncements(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      const response = await fetch(`${API_BASE_URL}/announcements`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const result = await response.json()
      if (result.success) {
        setAnnouncements(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching announcements:', error)
    } finally {
      setLoadingAnnouncements(false)
    }
  }

  const markAnnouncementAsRead = async (announcementId) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      await fetch(`${API_BASE_URL}/announcements/${announcementId}/read`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
    } catch (error) {
      console.error('Error marking announcement as read:', error)
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 border-red-400 text-red-800'
      case 'high': return 'bg-orange-100 border-orange-400 text-orange-800'
      default: return 'bg-blue-100 border-blue-400 text-blue-800'
    }
  }

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'urgent': return '🚨'
      case 'high': return '⚠️'
      default: return '📣'
    }
  }


  const sendReply = async () => {
    if (!replyText.trim() || !selectedMessage || !selectedMessage.fromId) {
      setRequestMessage('Please enter a message')
      setTimeout(() => setRequestMessage(null), 3000)
      return
    }

    setReplySending(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setRequestMessage('Authentication required')
        setReplySending(false)
        setTimeout(() => setRequestMessage(null), 3000)
        return
      }

      const response = await fetch(`${API_BASE_URL}/messages/reply`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mentorId: selectedMessage.fromId,
          body: replyText
        })
      })

      const result = await response.json()
      if (result.success) {
        setRequestMessage('Reply sent successfully')
        setTimeout(() => setRequestMessage(null), 3000)
        setReplyText('')
        setSelectedMessage(null)
      } else {
        setRequestMessage(result.message || 'Failed to send reply')
        setTimeout(() => setRequestMessage(null), 3000)
      }
    } catch (error) {
      console.error('Error sending reply:', error)
      setRequestMessage('Network error. Please check if the server is running.')
      setTimeout(() => setRequestMessage(null), 3000)
    } finally {
      setReplySending(false)
    }
  }

  const cancelEditing = () => {
    setEditingRequest(null)
    setEditForm({ topic: '', note: '' })
  }

  const saveEdit = async () => {
    if (!editForm.topic.trim() || !editForm.note.trim()) {
      setRequestMessage('Please fill in all fields')
      setTimeout(() => setRequestMessage(null), 3000)
      return
    }

    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const requestId = editingRequest._id || editingRequest.id
      const response = await fetch(`${API_BASE_URL}/mentorship/my-requests/${requestId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm)
      })

      const result = await response.json()
      if (result.success) {
        setMyRequests(prev => prev.map(r =>
          (r._id || r.id) === requestId ? { ...r, ...editForm } : r
        ))
        setRequestMessage('Request updated successfully')
        setTimeout(() => setRequestMessage(null), 3000)
        cancelEditing()
      } else {
        setRequestMessage(result.message || 'Failed to update request')
        setTimeout(() => setRequestMessage(null), 3000)
      }
    } catch (error) {
      console.error('Error updating request:', error)
      setRequestMessage('Network error')
      setTimeout(() => setRequestMessage(null), 3000)
    }
  }

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return []
      const res = await fetch(`${API_BASE_URL}/notifications`, { headers: { 'Authorization': `Bearer ${token}` } })
      const j = await res.json()
      if (j.success) {
        const data = j.data || []
        setNotifications(data)
        setUnreadCount(data.filter((n)=>!n.read).length)
        return data
      }
      return []
    } catch (err) {
      console.error('Error fetching notifications', err)
      return []
    }
  }

  const markVisibleNotificationsAsRead = async (items = notifications) => {
    const unreadItems = (items || []).filter((n) => !n.read)
    if (unreadItems.length === 0) return

    // optimistic update so count drops immediately when user views notifications
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)

    try {
      const token = localStorage.getItem('token')
      if (!token) return

      await Promise.all(
        unreadItems.map((n) =>
          fetch(`${API_BASE_URL}/notifications/${n._id || n.id}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ read: true })
          })
        )
      )
    } catch (err) {
      console.error('Error marking notifications as read', err)
      // recover from server mismatch
      fetchNotifications()
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('profileViewMode')
    localStorage.removeItem('viewUserId')
    localStorage.removeItem('profileBackPage')
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    onNavigate('landing')
  }

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settings, setSettings] = useState(null)
  const [settingsMessage, setSettingsMessage] = useState(null)

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      const res = await fetch(`${API_BASE_URL}/auth/settings`, { headers: { 'Authorization': `Bearer ${token}` } })
      const j = await res.json()
      if (j.success) {
        setSettings({
          emailNotifications: true,
          jobAlerts: true,
          eventReminders: true,
          mentorMatchAlerts: true,
          profileTips: true,
          profileVisibility: 'public',
          ...(j.data || {})
        })
      }
    } catch (err) { console.error('Error fetching settings', err) }
  }

  const saveSettings = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      const res = await fetch(`${API_BASE_URL}/auth/settings`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type':'application/json' }, body: JSON.stringify(settings) })
      const j = await res.json()
      if (j.success) { setSettings(j.data); }
    } catch (err) { console.error('Error saving settings', err) }
  }

  React.useEffect(() => {
    if (!settingsMessage) return
    const t = setTimeout(() => setSettingsMessage(null), 3000)
    return () => clearTimeout(t)
  }, [settingsMessage])

  const dashboardItems = [
    {
      id: 'find-mentor',
      icon: <UserPlus size={24} />,
      title: 'Find New Mentors',
      description: 'Connect with experienced mentors',
      color: 'bg-blue-100 text-blue-600'
    },
    {
      id: 'my-mentors',
      icon: <Users size={24} />,
      title: 'My Mentors',
      description: 'View your active mentors',
      color: 'bg-indigo-100 text-indigo-600'
    },
    {
      id: 'my-events',
      icon: <CalendarCheck size={24} />,
      title: 'Events Hub',
      description: 'Manage registered and upcoming events',
      color: 'bg-purple-100 text-purple-600'
    },
    {
      id: 'jobs',
      icon: <Briefcase size={24} />,
      title: 'Job Openings',
      description: 'Browse job opportunities',
      color: 'bg-orange-100 text-orange-600'
    },
    {
      id: 'profile',
      icon: <BarChart3 size={24} />,
      title: 'My Profile',
      description: 'View and manage your profile',
      color: 'bg-green-100 text-green-600'
    }
  ]

  const stats = [
    { label: 'Mentors Matched', value: dashboardStats?.mentorsMatched || '0', color: 'bg-blue-50' },
    { label: 'Events Attended', value: dashboardStats?.eventsAttended || '0', color: 'bg-purple-50' },
    { label: 'Skills Endorsed', value: dashboardStats?.skillsEndorsed || '0', color: 'bg-green-50' },
    { label: 'Applications', value: dashboardStats?.applications || '0', color: 'bg-orange-50' }
  ]

  const featuredItems = dashboardItems.filter(item =>
    item.id === 'find-mentor' || item.id === 'my-events'
  )

  const effectiveSkills = profileData?.skills || user?.skills || []
  const hasResume = Boolean(
    profileData?.resume?.fileName ||
    profileData?.resume?.filePath ||
    (typeof profileData?.resume === 'string' && profileData.resume.trim().length > 0) ||
    user?.resume?.fileName ||
    user?.resume?.filePath ||
    (typeof user?.resume === 'string' && user.resume.trim().length > 0)
  )
  const totalApplications = Math.max(Number(jobApplications.length || 0), Number(dashboardStats?.applications || 0))
  const hasAppliedToJobs = totalApplications > 0
  const hasAcceptedMentor = myRequests.some(r => r.status === 'accepted')
  const hasRegisteredForEvents = registeredEvents.length > 0
  const showRecommendedSection =
    effectiveSkills.length === 0 ||
    !hasResume ||
    !hasAppliedToJobs ||
    !hasAcceptedMentor ||
    !hasRegisteredForEvents

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg relative">
        {/* Logo */}
        <div className="p-6 border-b">
          <BrandLogo subtitle="Student" />
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2 pb-32">
          {dashboardItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'find-mentor') {
                  onNavigate('mentor-discovery')
                } else if (item.id === 'my-mentors') {
                  onNavigate('student-mentors')
                } else if (item.id === 'my-events') {
                  onNavigate('student-events')
                } else if (item.id === 'jobs') {
                  onNavigate('jobs')
                } else if (item.id === 'profile') {
                  onNavigate('profile')
                }
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition"
            >
              <div className={`p-2 rounded-lg ${item.color}`}>
                {item.icon}
              </div>
              <div className="text-left">
                <p className="font-semibold text-sm">{item.title}</p>
                <p className="text-xs text-gray-500">{item.description}</p>
              </div>
            </button>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="absolute bottom-6 left-4 w-56 space-y-2">
          <button onClick={async ()=>{ setSettingsOpen(true); await fetchSettings(); }} className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100">
            <Settings size={20} />
            <span>Settings</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-red-600 hover:bg-red-50"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {/* Top Bar */}
        <div className="bg-white shadow-sm p-6 border-b">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Welcome, {user?.fullName || 'Student'}! 👋</h1>
              <p className="text-gray-600 mt-1">Here's your dashboard to get started</p>
            </div>
            <div className="flex items-center gap-4 relative">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img
                    src={profileData?.photo || user?.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullName || 'Student')}&size=128&background=random`}
                    alt="Profile"
                    className="w-12 h-12 rounded-full object-cover border-2 border-white shadow"
                  />
                  <label className="absolute -bottom-1 -right-1 bg-blue-600 text-white text-xs w-6 h-6 rounded-full cursor-pointer hover:bg-blue-700 flex items-center justify-center">
                    {photoUploading ? '…' : '+'}
                    <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={handlePhotoUpload} />
                  </label>
                </div>
                {photoError && <span className="text-xs text-red-600">{photoError}</span>}
              </div>
              <button onClick={async ()=>{
                if (isRefreshing) return
                setIsRefreshing(true)
                // batch fetch dashboard data, notifications, settings
                try {
                  await Promise.all([fetchDashboardData(), fetchNotifications(), fetchSettings(), fetchMyRequests()])
                  setRefreshMessage('Dashboard refreshed')
                  setTimeout(()=>setRefreshMessage(null), 3000)
                } catch (err) {
                  console.error('Error refreshing:', err)
                } finally {
                  // cooldown to avoid spamming
                  setTimeout(()=>setIsRefreshing(false), 1500)
                }
              }} className={`px-3 py-2 rounded-lg border ${isRefreshing? 'bg-gray-200 text-gray-600':'bg-white text-gray-800 hover:bg-gray-50'}`}>
                {isRefreshing ? 'Refreshing…' : 'Refresh'}
              </button>

              <div>
                <button onClick={async ()=>{
                  const next = !notifOpen
                  setNotifOpen(next)
                  if (next) {
                    const latest = await fetchNotifications()
                    await markVisibleNotificationsAsRead(latest)
                  }
                }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                  🔔 Notifications {unreadCount>0 && <span className="ml-2 bg-red-600 text-white text-xs rounded-full px-2">{unreadCount}</span>}
                </button>
                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg z-10 p-2">
                    <h3 className="px-3 py-2 font-semibold">Notifications</h3>
                    <div className="max-h-64 overflow-auto">
                      {notifications.length===0 && <p className="px-3 py-2 text-sm text-gray-500">No notifications</p>}
                      {notifications.map((n, idx) => (
                        <div key={n._id || n.id || idx} className={`px-3 py-2 border-t ${n.read? 'bg-gray-50':'bg-white'}`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm font-medium">{n.message}</p>
                              <p className="text-xs text-gray-500">{n.actorName || ''} • {new Date(n.createdAt).toLocaleString()}</p>
                            </div>
                            <div className="flex flex-col gap-1 ml-2">
                              {!n.read && <button onClick={async ()=>{
                                const token = localStorage.getItem('token')
                                if (!token) return
                                await fetch(`${API_BASE_URL}/notifications/${n._id || n.id}`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type':'application/json' }, body: JSON.stringify({ read: true }) })
                                setNotifications(prev => prev.map(x => x===n?{...x, read:true}:x))
                                setUnreadCount(c=>Math.max(0,c-1))
                              }} className="text-xs text-blue-600">Mark read</button>}
                              <button onClick={async ()=>{
                                const token = localStorage.getItem('token')
                                if (!token) return
                                await fetch(`${API_BASE_URL}/notifications/${n._id || n.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } })
                                setNotifications(prev => prev.filter(x => (x._id || x.id || '') !== (n._id || n.id || '')))
                                if (!n.read) setUnreadCount(c=>Math.max(0,c-1))
                              }} className="text-xs text-red-600">Delete</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <button onClick={() => onNavigate('student-messages')} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
                  💬 Messages {messages.length>0 && <span className="ml-2 bg-orange-600 text-white text-xs rounded-full px-2">{messages.length}</span>}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Modal */}
        {settingsOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Settings & Profile Tools</h3>
                  <p className="text-sm text-gray-500 mt-1">Make your student profile more useful and dynamic.</p>
                </div>
                <button onClick={()=>setSettingsOpen(false)} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">×</button>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <h4 className="font-semibold text-gray-900 mb-3">🔔 Notifications</h4>
                <div className="space-y-3">
                  {[
                    { key: 'emailNotifications', title: 'Email notifications', desc: 'Receive important emails and alerts' },
                    { key: 'jobAlerts', title: 'Job alerts', desc: 'Get notified about new job openings' },
                    { key: 'eventReminders', title: 'Event reminders', desc: 'Stay updated about upcoming events' },
                    { key: 'mentorMatchAlerts', title: 'Mentor match alerts', desc: 'Know when a mentor accepts your request' },
                    { key: 'profileTips', title: 'Profile tips', desc: 'Receive suggestions to improve your profile' }
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between gap-3 bg-white rounded-lg p-3 border border-blue-100">
                      <div>
                        <p className="font-medium text-gray-800">{item.title}</p>
                        <p className="text-xs text-gray-500">{item.desc}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!settings?.[item.key]}
                        onChange={(e)=>setSettings({...settings, [item.key]: e.target.checked})}
                        className="h-4 w-4 accent-blue-600"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button onClick={()=>setSettingsOpen(false)} className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
                <button onClick={()=>{ setSettingsOpen(false); setSettingsMessage('Settings updated'); saveSettings(); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Changes</button>
              </div>
            </div>
          </div>
        )}

        {/* Settings saved toast */}
        {settingsMessage && (
          <div className="fixed right-6 bottom-6 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50">
            {settingsMessage}
          </div>
        )}

        {/* Request action message toast */}
        {requestMessage && (
          <div className={`fixed right-6 bottom-6 px-4 py-2 rounded shadow-lg z-50 ${
            requestMessage.includes('success') ? 'bg-green-600' : 'bg-red-600'
          } text-white`}>
            {requestMessage}
          </div>
        )}

        {/* Edit Request Modal */}
        {editingRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h2 className="text-2xl font-bold mb-4">Edit Mentorship Request</h2>
              <p className="text-gray-600 mb-4">
                Update your request to <span className="font-semibold">{editingRequest.mentorName || 'Mentor'}</span>
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Topic</label>
                  <input
                    type="text"
                    value={editForm.topic}
                    onChange={(e) => setEditForm({ ...editForm, topic: e.target.value })}
                    placeholder="e.g., React Development, Career Guidance"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Message</label>
                  <textarea
                    value={editForm.note}
                    onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                    placeholder="Tell the mentor why you'd like their guidance..."
                    rows={4}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={cancelEditing}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveEdit}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h2 className="text-2xl font-bold mb-4 text-red-600">Confirm Delete</h2>
              <p className="text-gray-700 mb-2">
                Are you sure you want to delete this mentorship request?
              </p>
              <div className="bg-gray-50 p-3 rounded-lg mb-4">
                <p className="font-semibold text-gray-800">{deleteConfirm.topic}</p>
                <p className="text-sm text-gray-600 mt-1">{deleteConfirm.note}</p>
                {deleteConfirm.mentorName && (
                  <p className="text-xs text-blue-600 mt-2">To: {deleteConfirm.mentorName}</p>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-4">
                This action cannot be undone.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteRequest(deleteConfirm._id || deleteConfirm.id)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete Request
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Messages Modal */}
        {showMessagesModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[80vh] flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Messages from Mentors</h2>
                <button
                  onClick={() => {
                    setShowMessagesModal(false)
                    setSelectedMessage(null)
                    setReplyText('')
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              {!selectedMessage ? (
                <div className="flex-1 overflow-auto">
                  {messages.length === 0 ? (
                    <div className="text-center py-8 text-gray-600">
                      <p>No messages from mentors yet.</p>
                      <p className="text-sm text-gray-500 mt-2">Messages will appear here when mentors reply.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((msg, idx) => (
                        <div
                          key={idx}
                          onClick={() => setSelectedMessage(msg)}
                          className="p-4 border rounded-lg cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold text-gray-800">{msg.fromName}</h3>
                            <span className="text-xs text-gray-500">
                              {msg.createdAt ? new Date(msg.createdAt).toLocaleDateString() : 'Unknown date'}
                            </span>
                          </div>
                          {msg.subject && (
                            <p className="text-sm font-medium text-gray-700 mb-2">{msg.subject}</p>
                          )}
                          <p className="text-sm text-gray-600 line-clamp-2">{msg.body}</p>
                          <p className="text-xs text-blue-600 mt-2">Click to read full message and reply →</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col">
                  <div className="mb-4 pb-4 border-b">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-lg text-gray-800">{selectedMessage.fromName}</h3>
                        {selectedMessage.subject && (
                          <p className="text-sm text-gray-600">{selectedMessage.subject}</p>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {selectedMessage.createdAt ? new Date(selectedMessage.createdAt).toLocaleDateString() : 'Unknown date'}
                      </span>
                    </div>
                    <p className="text-gray-700 mt-3">{selectedMessage.body}</p>
                  </div>

                  <div className="flex-1 flex flex-col">
                    <label className="text-sm font-semibold text-gray-700 mb-2">Your Reply</label>
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your reply here..."
                      rows={4}
                      className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => {
                        setSelectedMessage(null)
                        setReplyText('')
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Back
                    </button>
                    <button
                      onClick={sendReply}
                      disabled={replySending || !replyText.trim()}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {replySending ? 'Sending...' : 'Send Reply'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}



        {/* Stats Section */}
        <div className="p-6 overflow-auto">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Your Progress</h2>
          <div className="grid grid-cols-4 gap-4 mb-8">
            {stats.map((stat, idx) => (
              <div key={idx} className={`${stat.color} p-6 rounded-lg`}>
                <p className="text-gray-600 text-sm font-semibold mb-2">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-800">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Featured Section */}
          <h2 className="text-xl font-bold text-gray-800 mb-4">What's Next?</h2>
          <div className="grid grid-cols-2 gap-6">
            {featuredItems.map(item => (
              <div
                key={item.id}
                onClick={() => {
                  if (item.id === 'find-mentor') {
                    onNavigate('mentor-discovery')
                  } else if (item.id === 'my-mentors') {
                    onNavigate('student-mentors')
                  } else if (item.id === 'my-events') {
                    onNavigate('student-events')
                  }
                }}
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition cursor-pointer border-l-4 border-blue-600"
              >
                <div className={`w-12 h-12 rounded-lg ${item.color} flex items-center justify-center mb-4`}>
                  {item.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
                <button className="mt-4 text-blue-600 font-semibold hover:text-blue-700">
                  Explore →
                </button>
              </div>
            ))}
          </div>

          {/* Quick Summary Stats */}
          <h2 className="text-xl font-bold text-gray-800 mb-6">📊 Quick Overview</h2>

          {/* Announcements Section */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">📣 Announcements</h2>
              <button
                onClick={fetchAnnouncements}
                className="text-sm px-3 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
              >
                Refresh
              </button>
            </div>

            {loadingAnnouncements ? (
              <div className="text-center py-8 text-gray-500">Loading announcements...</div>
            ) : announcements.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <p className="text-gray-600">No announcements at this time</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {announcements.map((announcement) => (
                  <div
                    key={announcement._id || announcement.id}
                    className={`border-l-4 rounded-lg p-4 ${getPriorityColor(announcement.priority)}`}
                    onClick={() => markAnnouncementAsRead(announcement._id || announcement.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xl">{getPriorityIcon(announcement.priority)}</span>
                          <h3 className="font-bold text-lg">{announcement.title}</h3>
                        </div>
                        <p className="text-sm mb-2 whitespace-pre-wrap">{announcement.body}</p>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="font-medium">📝 {announcement.createdByName}</span>
                          <span>•</span>
                          <span>{new Date(announcement.createdAt).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}</span>
                          {announcement.expiresAt && (
                            <>
                              <span>•</span>
                              <span>Expires: {new Date(announcement.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Profile Completion Card */}
          {missingItems.length > 0 && (
          <div className="mb-8 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold mb-2">👤 Complete Your Profile</h3>
                <p className="text-sm opacity-90">Fill out your profile to unlock better opportunities</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">{profileCompletion}%</p>
                <p className="text-xs opacity-75">Complete</p>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-white bg-opacity-20 rounded-full h-3 mb-4 overflow-hidden">
              <div 
                className="bg-white h-full rounded-full transition-all duration-300"
                style={{ width: `${profileCompletion}%` }}
              ></div>
            </div>
            
            {/* Missing Items */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4 text-xs">
              {missingItems.map((item) => (
                <div key={item.key} className="bg-white bg-opacity-10 px-3 py-2 rounded">❌ {item.label}</div>
              ))}
            </div>

            {refreshMessage && (
              <p className="mt-3 text-sm text-green-100">{refreshMessage}</p>
            )}
            
            <button 
              onClick={() => onNavigate('student-profile')}
              className="w-full px-4 py-2 bg-white text-blue-600 rounded hover:bg-gray-100 font-semibold transition"
            >
              Complete Profile →
            </button>
            <button
              onClick={async () => {
                try {
                  console.log('🔄 Update Status button clicked - fetching profile data...')
                  await fetchProfileData()
                  setRefreshMessage('Profile status updated')
                  setTimeout(() => setRefreshMessage(null), 3000)
                } catch (err) {
                  console.error('Error refreshing profile status:', err)
                }
              }}
              className="mt-3 w-full px-4 py-2 border border-white text-white rounded hover:bg-white hover:text-blue-600 font-semibold transition"
            >
              Update Status
            </button>
          </div>
          )}

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Applications Summary */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg shadow p-6 border border-green-200">
              <h3 className="text-lg font-bold text-gray-800 mb-3">💼 Applications</h3>
              <p className="text-3xl font-bold text-green-600">{totalApplications}</p>
              <p className="text-sm text-gray-600 mt-1">Active applications</p>
              <button 
                onClick={() => onNavigate('student-applications')}
                className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-semibold"
              >
                View Applications
              </button>
            </div>

            {/* Events Summary */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg shadow p-6 border border-purple-200">
              <h3 className="text-lg font-bold text-gray-800 mb-3">📅 Events</h3>
              <p className="text-3xl font-bold text-purple-600">{registeredEvents.length}</p>
              <p className="text-sm text-gray-600 mt-1">Events registered</p>
              <button 
                onClick={() => onNavigate('student-events')}
                className="mt-4 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm font-semibold"
              >
                View My Events
              </button>
            </div>

            {/* Mentors Summary */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow p-6 border border-blue-200">
              <h3 className="text-lg font-bold text-gray-800 mb-3">👥 Mentors</h3>
              <p className="text-3xl font-bold text-blue-600">{myRequests.filter(r => r.status === 'accepted').length}</p>
              <p className="text-sm text-gray-600 mt-1">Active mentorships</p>
              <button 
                onClick={() => onNavigate('student-mentors')}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-semibold"
              >
                View My Mentors
              </button>
            </div>
          </div>


          {/* Badges Summary */}
          <div className="mt-8 mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">🏅 Your Badges & Achievements</h2>
            {profileData?.badges && profileData.badges.length > 0 ? (
              <div className="space-y-3">
                {/* Group badges by source */}
                {(() => {
                  const eventBadges = profileData.badges.filter(b => b.source?.startsWith('event:'));
                  const mentorBadges = profileData.badges.filter(b => !b.source?.startsWith('event:'));
                  
                  return (
                    <>
                      {eventBadges.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-purple-700 mb-2">📌 Event Achievements</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {eventBadges.slice(0, 4).map((badge, index) => {
                              const eventName = badge.source?.replace('event: ', '');
                              return (
                                <div
                                  key={badge.key + index}
                                  className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow p-4 border-2 border-purple-200"
                                >
                                  <div className="flex items-start gap-3">
                                    <span className="text-3xl">🏅</span>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-bold text-gray-800">{badge.name}</p>
                                      <p className="text-xs text-gray-600 truncate">From: <span className="font-semibold">{eventName}</span></p>
                                      {badge.giverName && (
                                        <p className="text-xs text-gray-500 mt-1">By <span className="font-semibold">{badge.giverName}</span></p>
                                      )}
                                      {badge.message && (
                                        <p className="text-xs italic text-gray-700 mt-2 p-2 bg-white rounded border-l-2 border-purple-400">💌 "{badge.message}"</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      {mentorBadges.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-yellow-700 mb-2">⭐ Mentor Recognition</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {mentorBadges.slice(0, 4).map((badge, index) => (
                              <button
                                key={badge.key + index}
                                onClick={() => onNavigate('profile')}
                                className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg shadow p-4 border-2 border-yellow-200 hover:shadow-lg transition text-left"
                              >
                                <div className="flex items-start gap-3">
                                  <span className="text-3xl">🏅</span>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-bold text-gray-800">{badge.name}</p>
                                    <p className="text-sm text-gray-600">{badge.description}</p>
                                    {badge.giverName && (
                                      <p className="text-xs text-gray-500 mt-1">By <span className="font-semibold">{badge.giverName}</span></p>
                                    )}
                                    {badge.message && (
                                      <p className="text-xs italic text-gray-700 mt-2 p-2 bg-white rounded border-l-2 border-yellow-400">💌 "{badge.message}"</p>
                                    )}
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                <p className="text-gray-600 mb-2">No badges yet</p>
                <p className="text-sm text-gray-500 mb-4">Attend events and connect with alumni mentors to earn badges!</p>
                <div className="flex gap-3 justify-center">
                  <button 
                    onClick={() => onNavigate('events')}
                    className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 font-semibold text-sm"
                  >
                    Attend Events
                  </button>
                  <button 
                    onClick={() => onNavigate('mentor-discovery')}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold text-sm"
                  >
                    Find a Mentor
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Recommended Next Steps */}
          {showRecommendedSection && (
            <>
          <h2 className="text-xl font-bold text-gray-800 mb-4">💡 Recommended Next Steps</h2>
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg p-6 mb-8">
            <h3 className="font-bold text-lg mb-4">🎯 Boost Your Profile</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {effectiveSkills.length === 0 ? (
                <button 
                  onClick={() => onNavigate('student-profile')}
                  className="p-4 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition text-left"
                >
                  <p className="font-semibold text-lg mb-2">💡 Add Skills</p>
                  <p className="text-sm opacity-90">Showcase your technical abilities to stand out</p>
                </button>
              ) : null}
              
              {!hasResume ? (
                <button 
                  onClick={() => onNavigate('student-profile')}
                  className="p-4 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition text-left"
                >
                  <p className="font-semibold text-lg mb-2">📄 Add Resume</p>
                  <p className="text-sm opacity-90">Upload your resume to get better opportunities</p>
                </button>
              ) : null}
              
              {!hasAppliedToJobs ? (
                <button 
                  onClick={() => onNavigate('jobs')}
                  className="p-4 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition text-left"
                >
                  <p className="font-semibold text-lg mb-2">💼 Apply to Jobs</p>
                  <p className="text-sm opacity-90">Start applying to jobs that match your interests</p>
                </button>
              ) : null}
              
              {!hasAcceptedMentor ? (
                <button 
                  onClick={() => onNavigate('mentor-discovery')}
                  className="p-4 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition text-left"
                >
                  <p className="font-semibold text-lg mb-2">👥 Find a Mentor</p>
                  <p className="text-sm opacity-90">Connect with an experienced professional</p>
                </button>
              ) : null}
              
              {!hasRegisteredForEvents ? (
                <button 
                  onClick={() => onNavigate('events')}
                  className="p-4 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition text-left"
                >
                  <p className="font-semibold text-lg mb-2">📅 Attend Events</p>
                  <p className="text-sm opacity-90">Join webinars and networking sessions</p>
                </button>
              ) : null}

              {effectiveSkills.length === 0 &&
               !hasResume &&
               !hasAppliedToJobs &&
               !hasAcceptedMentor &&
               !hasRegisteredForEvents ? (
                <button 
                  onClick={() => onNavigate('student-profile')}
                  className="p-4 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition text-left md:col-span-3"
                >
                  <p className="font-semibold text-lg mb-2">🚀 Get Started Now!</p>
                  <p className="text-sm opacity-90">Complete your profile and explore all available opportunities</p>
                </button>
              ) : null}
            </div>
          </div>
          </>
          )}

          {/* Quick Tips */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-bold text-gray-800 mb-3">💡 Quick Tips to Get Started</h3>
            <ul className="space-y-2 text-gray-700">
              <li>✓ Complete your profile to get better mentor matches</li>
              <li>✓ Attend at least one event to expand your network</li>
              <li>✓ Connect with a mentor in your field of interest</li>
              <li>✓ Explore job opportunities from our partners</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Withdrawal Confirmation Modal */}
      {withdrawConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Withdraw Application?</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to withdraw your application for <span className="font-semibold">{withdrawConfirm.jobTitle}</span>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setWithdrawConfirm(null)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={withdrawJobApplication}
                disabled={withdrawing}
                className={`flex-1 px-4 py-2 rounded-lg text-white font-semibold transition ${
                  withdrawing
                    ? 'bg-red-400 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {withdrawing ? 'Withdrawing...' : 'Withdraw'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCropModal && cropImage && (
        <ImageCropModal
          imageSrc={cropImage}
          onCropComplete={handleCropComplete}
          onCancel={() => {
            setShowCropModal(false)
            setCropImage(null)
          }}
        />
      )}
    </div>
  );
};
