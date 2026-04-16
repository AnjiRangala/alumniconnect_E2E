import React, { useState, useEffect } from 'react'
import { Navbar } from '../components/Navbar.jsx';
import { Footer } from '../components/Footer.jsx';
import { BadgeModal } from '../components/BadgeModal.jsx'
import { BadgeAwardModal } from '../components/BadgeAwardModal.jsx'
import { InputModal } from '../components/InputModal.jsx'
import ImageCropModal from '../components/ImageCropModal.jsx'
import AnnouncementModal from '../components/AnnouncementModal.jsx'

export const AlumniDashboard = ({ onNavigate }) => {
  useEffect(() => {
    localStorage.removeItem('profileViewMode')
    localStorage.removeItem('viewUserId')
    localStorage.removeItem('profileBackPage')
  }, [])

  const [showNotifications, setShowNotifications] = useState(false)
  const [showBadgeModal, setShowBadgeModal] = useState(false)
  const [showBadgeAwardModal, setShowBadgeAwardModal] = useState(false)
  const [selectedBadge, setSelectedBadge] = useState(null)
  const [mentees, setMentees] = useState(null)
  const [loadingMentees, setLoadingMentees] = useState(false)
  const [apiMessage, setApiMessage] = useState(null)
  const [showInviteModal, setShowInviteModal] = useState(null)
  const [showProfileEdit, setShowProfileEdit] = useState(false)
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false)
  const [profileData, setProfileData] = useState({
    role: '',
    company: '',
    institution: '',
    experience: '',
    industry: 'Technology',
    availability: '',
    skills: [],
    linkedinUrl: '',
    githubUrl: '',
    photo: ''
  })
  const [skillInput, setSkillInput] = useState('')
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoError, setPhotoError] = useState(null)
  const [cropImage, setCropImage] = useState(null)
  const [showCropModal, setShowCropModal] = useState(false)
  const [myEvents, setMyEvents] = useState([])
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0)
  const [colleges, setColleges] = useState([])

  useEffect(()=>{ loadMentees(); loadProfile(); loadMyEvents(); loadPendingRequestsCount(); loadColleges() }, [])

  useEffect(() => {
    const syncAlumniProfile = () => {
      loadProfile()
    }

    window.addEventListener('user-updated', syncAlumniProfile)
    window.addEventListener('storage', syncAlumniProfile)

    return () => {
      window.removeEventListener('user-updated', syncAlumniProfile)
      window.removeEventListener('storage', syncAlumniProfile)
    }
  }, [])
  
  // Auto-refresh events every 10 seconds to see new registrations
  useEffect(() => {
    const interval = setInterval(() => {
      loadMyEvents()
      loadPendingRequestsCount()
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  const loadPendingRequestsCount = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      const res = await fetch('http://localhost:5000/api/mentorship/requests', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const j = await res.json()
      if (j.success) {
        const pending = (j.data || []).filter((r) => String(r.status || '').toLowerCase() === 'pending').length
        setPendingRequestsCount(pending)
      }
    } catch (err) {
      console.error('Failed to load pending requests', err)
    }
  }

  const loadProfile = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      const res = await fetch('http://localhost:5000/api/auth/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const j = await res.json()
      if (j.success && j.data) {
        setProfileData({
          role: j.data.role || '',
          company: j.data.company || '',
          institution: j.data.institution || '',
          experience: j.data.experience || '',
          industry: j.data.industry || 'Technology',
          availability: j.data.availability || '',
          skills: j.data.skills || [],
          linkedinUrl: j.data.linkedinUrl || '',
          githubUrl: j.data.githubUrl || '',
          photo: j.data.photo || ''
        })
      }
    } catch (err) {
      console.error('Failed to load profile', err)
    }
  }

  const loadColleges = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/institutions/ap-engineering')
      const j = await res.json()
      if (j.success && Array.isArray(j.data)) {
        setColleges(j.data)
      }
    } catch (err) {
      console.error('Failed to load colleges', err)
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

      const response = await fetch('http://localhost:5000/api/profile/upload-photo', {
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

  const saveProfile = async () => {
    setLoadingProfile(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        showTempMessage('Please login')
        return
      }
      const res = await fetch('http://localhost:5000/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      })
      const j = await res.json()
      if (j.success) {
        try {
          const stored = localStorage.getItem('user')
          const parsed = stored ? JSON.parse(stored) : {}
          localStorage.setItem('user', JSON.stringify({ ...parsed, ...j.data }))
          window.dispatchEvent(new Event('user-updated'))
        } catch (_err) {}

        showTempMessage('Profile updated successfully!')
        setShowProfileEdit(false)
      } else {
        showTempMessage(j.message || 'Failed to update profile')
      }
    } catch (err) {
      console.error(err)
      showTempMessage('Network error')
    } finally {
      setLoadingProfile(false)
    }
  }

  const addSkill = () => {
    if (skillInput.trim() && !profileData.skills.includes(skillInput.trim())) {
      setProfileData({ ...profileData, skills: [...profileData.skills, skillInput.trim()] })
      setSkillInput('')
    }
  }

  const removeSkill = (skill) => {
    setProfileData({ ...profileData, skills: profileData.skills.filter(s => s !== skill) })
  }

  const loadMentees = async () => {
    setLoadingMentees(true)
    try {
      const token = localStorage.getItem('token')
      const headers = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch('http://localhost:5000/api/mentees', { headers })
      const j = await res.json()
      if (j.success) setMentees(j.data || [])
      else setMentees([])
    } catch (err) {
      console.error('Failed to load mentees', err)
      setMentees([])
    } finally { setLoadingMentees(false) }
  }

  const showTempMessage = (m) => { setApiMessage(m); setTimeout(()=>setApiMessage(null), 3500) }

  const endorseSkill = async (targetUserId, skill) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) { showTempMessage('Log in to endorse'); return }
      const res = await fetch('http://localhost:5000/api/endorse', { method: 'POST', headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ targetUserId, skill }) })
      const j = await res.json()
      if (j.success) {
        showTempMessage(`Endorsed ${skill}`)
      } else showTempMessage(j.message || 'Failed to endorse')
    } catch (err) { console.error(err); showTempMessage('Network error') }
  }

  const sendInvite = async (targetUserId, body) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) { showTempMessage('Log in to send invite'); return }
      const res = await fetch('http://localhost:5000/api/messages', { method: 'POST', headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ targetUserId, subject: 'Invitation', body }) })
      const j = await res.json()
      if (j.success) showTempMessage('Invite sent')
      else showTempMessage(j.message || 'Failed to send')
    } catch (err) { console.error(err); showTempMessage('Network error') }
  }

  const openBadgeManager = async () => {
    // try to load first badge for quick view; in future load list via API
    try {
      const res = await fetch('http://localhost:5000/api/badges')
      if (res.ok) {
        const j = await res.json()
        if (j.success && j.data && j.data.length>0) setSelectedBadge(j.data[0])
      }
    } catch (err) { /* ignore */ }
    setShowBadgeModal(true)
  }

  const loadMyEvents = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      const res = await fetch('http://localhost:5000/api/events/created/by-me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const j = await res.json()
      if (j.success) {
        let currentUser = {}
        try {
          currentUser = JSON.parse(localStorage.getItem('user') || '{}')
        } catch {
          currentUser = {}
        }

        const currentUserId = String(currentUser?._id || currentUser?.id || '')
        const currentUserEmail = String(currentUser?.email || '').toLowerCase().trim()
        const mine = (j.data || []).filter((event) => {
          const creatorId = String(event?.createdBy?.userId || event?.createdBy || '')
          const creatorEmail = String(event?.createdBy?.userEmail || '').toLowerCase().trim()
          return (creatorId && currentUserId && creatorId === currentUserId) || (creatorEmail && currentUserEmail && creatorEmail === currentUserEmail)
        })

        setMyEvents(mine)
      }
    } catch (err) {
      console.error('Failed to load events', err)
    }
  }

  const eventsThisWeek = (myEvents || []).filter((event) => {
    if (!event?.date) return false
    const eventDate = new Date(event.date)
    if (Number.isNaN(eventDate.getTime())) return false

    const now = new Date()
    const day = now.getDay()
    const mondayOffset = day === 0 ? -6 : 1 - day

    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() + mondayOffset)
    startOfWeek.setHours(0, 0, 0, 0)

    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)

    return eventDate >= startOfWeek && eventDate <= endOfWeek
  }).length

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar onNavigate={onNavigate} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-green-600 to-green-800 text-white rounded-lg p-8 mb-8">
          <h1 className="text-4xl font-bold mb-2">Welcome, Mentor! 🌟</h1>
          <p className="opacity-90">You're making a difference in students' lives</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition" onClick={() => onNavigate('alumni-requests')}>
            <div className="text-3xl mb-2">📬</div>
            <p className="text-gray-600 text-sm">Mentorship Requests</p>
            <p className="text-2xl font-bold text-green-600">{pendingRequestsCount}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition" onClick={() => onNavigate('alumni-mentees')}>
            <div className="text-3xl mb-2">👨‍🎓</div>
            <p className="text-gray-600 text-sm">Active Mentees</p>
            <p className="text-2xl font-bold text-green-600">{mentees?.length || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-3xl mb-2">📅</div>
            <p className="text-gray-600 text-sm">Events This Week</p>
            <p className="text-2xl font-bold text-green-600">{eventsThisWeek}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-3xl mb-2">🎤</div>
            <p className="text-gray-600 text-sm">Events Created</p>
            <p className="text-2xl font-bold text-green-600">{myEvents?.length || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-3xl mb-2">👥</div>
            <p className="text-gray-600 text-sm">Total Registrations</p>
            <p className="text-2xl font-bold text-green-600">
              {myEvents?.reduce((sum, e) => sum + (e.attendees?.length || 0), 0) || 0}
            </p>
          </div>
        </div>

        {/* Navigation Cards (Student dashboard style) */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Dashboard Navigation</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              onClick={() => setShowProfileEdit(true)}
              className="w-full flex items-center gap-3 px-4 py-4 rounded-lg text-gray-700 bg-white border hover:bg-gray-50 transition text-left"
            >
              <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">👤</div>
              <div>
                <p className="font-semibold text-sm">Edit Profile</p>
                <p className="text-xs text-gray-500">Update your mentor details</p>
              </div>
            </button>

            <button
              onClick={() => onNavigate('alumni-endorse')}
              className="w-full flex items-center gap-3 px-4 py-4 rounded-lg text-gray-700 bg-white border hover:bg-gray-50 transition text-left"
            >
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600">✏️</div>
              <div>
                <p className="font-semibold text-sm">Endorse Skills</p>
                <p className="text-xs text-gray-500">Support mentee growth</p>
              </div>
            </button>

            <button
              onClick={() => setShowBadgeAwardModal(true)}
              className="w-full flex items-center gap-3 px-4 py-4 rounded-lg text-gray-700 bg-white border hover:bg-gray-50 transition text-left"
            >
              <div className="p-2 rounded-lg bg-yellow-100 text-yellow-700">🏅</div>
              <div>
                <p className="font-semibold text-sm">Award Badge</p>
                <p className="text-xs text-gray-500">Recognize achievements</p>
              </div>
            </button>

            <button
              onClick={() => onNavigate('alumni-post-job')}
              className="w-full flex items-center gap-3 px-4 py-4 rounded-lg text-gray-700 bg-white border hover:bg-gray-50 transition text-left"
            >
              <div className="p-2 rounded-lg bg-green-100 text-green-700">📋</div>
              <div>
                <p className="font-semibold text-sm">Post Job</p>
                <p className="text-xs text-gray-500">Create opportunities</p>
              </div>
            </button>

            <button
              onClick={() => onNavigate('alumni-job-applications')}
              className="w-full flex items-center gap-3 px-4 py-4 rounded-lg text-gray-700 bg-white border hover:bg-gray-50 transition text-left"
            >
              <div className="p-2 rounded-lg bg-cyan-100 text-cyan-700">📬</div>
              <div>
                <p className="font-semibold text-sm">Job Applications</p>
                <p className="text-xs text-gray-500">Review applicants</p>
              </div>
            </button>

            <button
              onClick={() => onNavigate('alumni-events-manage')}
              className="w-full flex items-center gap-3 px-4 py-4 rounded-lg text-gray-700 bg-white border hover:bg-gray-50 transition text-left"
            >
              <div className="p-2 rounded-lg bg-purple-100 text-purple-700">🎤</div>
              <div>
                <p className="font-semibold text-sm">Manage Events</p>
                <p className="text-xs text-gray-500">Status, attendees, and tracking</p>
              </div>
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Quick Actions</h2>
            <p className="text-sm text-gray-500">Focused actions</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setShowAnnouncementModal(true)}
              className="p-4 rounded-lg border text-left hover:border-blue-300 hover:bg-blue-50 transition"
            >
              <p className="font-semibold text-gray-900">📣 Post Announcement</p>
              <p className="text-sm text-gray-600">Share an update with your students.</p>
            </button>

            <button
              onClick={() => onNavigate('alumni-messages')}
              className="p-4 rounded-lg border text-left hover:border-indigo-300 hover:bg-indigo-50 transition"
            >
              <p className="font-semibold text-gray-900">💬 Messages</p>
              <p className="text-sm text-gray-600">Read and respond to mentees.</p>
            </button>

          </div>
        </div>
        {/* Students moved to separate 'Manage Mentees' dashboard */}
      </main>

      {/* Profile Edit Modal */}
      {showProfileEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 my-8">
            <h2 className="text-2xl font-bold mb-4">Edit Mentor Profile</h2>
            <p className="text-gray-600 mb-6">Update your professional details to help students find and connect with you.</p>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border">
                <img
                  src={profileData.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(profileData.role || 'Alumni')}&size=128&background=random`}
                  alt="Profile"
                  className="w-16 h-16 rounded-full object-cover border"
                />
                <div>
                  <label className="block text-sm font-medium mb-2">Profile Photo</label>
                  <label className="inline-flex items-center px-3 py-2 bg-indigo-600 text-white rounded-lg cursor-pointer hover:bg-indigo-700 text-sm">
                    {photoUploading ? 'Uploading...' : 'Upload Photo'}
                    <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={handlePhotoUpload} />
                  </label>
                  {photoError && <p className="text-xs text-red-600 mt-2">{photoError}</p>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Current Role/Position *</label>
                <input
                  type="text"
                  value={profileData.role}
                  onChange={(e) => setProfileData({ ...profileData, role: e.target.value })}
                  placeholder="e.g., Senior Software Engineer, Tech Lead"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Company *</label>
                <input
                  type="text"
                  value={profileData.company}
                  onChange={(e) => setProfileData({ ...profileData, company: e.target.value })}
                  placeholder="e.g., Google, Microsoft, Startup Inc"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Institution (AP Engineering College)</label>
                <select
                  value={profileData.institution || ''}
                  onChange={(e) => setProfileData({ ...profileData, institution: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select institution</option>
                  {colleges.map((college) => (
                    <option key={college} value={college}>{college}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Years of Experience *</label>
                <select
                  value={profileData.experience}
                  onChange={(e) => setProfileData({ ...profileData, experience: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select experience level</option>
                  <option value="0-2 years">0-2 years</option>
                  <option value="2-5 years">2-5 years</option>
                  <option value="5-10 years">5-10 years</option>
                  <option value="10+ years">10+ years</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Industry (Technology Focus) *</label>
                <select
                  value={profileData.industry}
                  onChange={(e) => setProfileData({ ...profileData, industry: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Technology">Technology</option>
                  <option value="Software Development">Software Development</option>
                  <option value="Data Science & AI">Data Science & AI</option>
                  <option value="Cloud Computing">Cloud Computing</option>
                  <option value="Cybersecurity">Cybersecurity</option>
                  <option value="Mobile Development">Mobile Development</option>
                  <option value="Web Development">Web Development</option>
                  <option value="DevOps">DevOps</option>
                  <option value="Product Management">Product Management</option>
                  <option value="UI/UX Design">UI/UX Design</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Availability *</label>
                <select
                  value={profileData.availability}
                  onChange={(e) => setProfileData({ ...profileData, availability: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select availability</option>
                  <option value="Weekdays">Weekdays (Mon-Fri)</option>
                  <option value="Weekends">Weekends (Sat-Sun)</option>
                  <option value="Evenings">Evenings (after 6 PM)</option>
                  <option value="Flexible">Flexible (Anytime)</option>
                  <option value="By Appointment">By Appointment Only</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Skills & Expertise</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                    placeholder="Add a skill (e.g., React, Python, AWS)"
                    className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={addSkill}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profileData.skills.map((skill, index) => (
                    <span key={index} className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm flex items-center gap-2">
                      {skill}
                      <button
                        onClick={() => removeSkill(skill)}
                        className="text-indigo-600 hover:text-indigo-800 font-bold"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">LinkedIn URL</label>
                <input
                  type="url"
                  value={profileData.linkedinUrl}
                  onChange={(e) => setProfileData({ ...profileData, linkedinUrl: e.target.value })}
                  placeholder="https://linkedin.com/in/yourprofile"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">GitHub URL</label>
                <input
                  type="url"
                  value={profileData.githubUrl}
                  onChange={(e) => setProfileData({ ...profileData, githubUrl: e.target.value })}
                  placeholder="https://github.com/yourusername"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {apiMessage && (
              <div className={`mt-4 p-3 rounded-lg text-sm ${apiMessage.includes('success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {apiMessage}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowProfileEdit(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveProfile}
                disabled={loadingProfile}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400"
              >
                {loadingProfile ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showNotifications && (
        <div className="fixed right-6 top-20 w-80 bg-white p-4 rounded shadow z-50">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold">Notifications</h4>
            <button onClick={()=>setShowNotifications(false)} className="px-2 py-1 bg-gray-100 rounded">Close</button>
          </div>
          <div className="text-sm text-gray-700">
            {/* Try reading notifications from localStorage user object or show placeholder */}
            {(() => {
              try {
                const u = localStorage.getItem('user')
                if (u) {
                  const parsed = JSON.parse(u)
                  if (parsed.notifications && parsed.notifications.length>0) return parsed.notifications.slice(0,6).map((n,i)=>(<div key={i} className="py-2 border-b">{n}</div>))
                }
              } catch(e){}
              return <div className="py-2">No notifications yet</div>
            })()}
          </div>
        </div>
      )}

      {showBadgeModal && selectedBadge && (
        <BadgeModal badge={selectedBadge} onClose={()=>setShowBadgeModal(false)} />
      )}

      {showBadgeAwardModal && (
        <BadgeAwardModal 
          mentees={mentees || []} 
          onClose={() => setShowBadgeAwardModal(false)}
          onAward={() => {
            loadMentees()
            showTempMessage('Badge awarded successfully! 🎉')
          }}
        />
      )}

      {/* Announcement Modal */}
      <AnnouncementModal
        isOpen={showAnnouncementModal}
        onClose={() => setShowAnnouncementModal(false)}
        onSuccess={() => {
          showTempMessage('Announcement posted successfully! 📣')
        }}
      />

      {/* Invite modal for sending quick invites/messages */}
      {showInviteModal && (
        <InputModal title={`Invite ${showInviteModal.fullName || showInviteModal.name || ''}`} placeholder="Write an invite message" initial={`Hi ${showInviteModal.fullName||''}, I'd like to connect with you.`} onCancel={()=>setShowInviteModal(null)} onSubmit={(v)=>{ sendInvite(showInviteModal._id||showInviteModal.id||showInviteModal.idStr, v); setShowInviteModal(null) }} />
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

      <Footer />
    </div>
  );
};
