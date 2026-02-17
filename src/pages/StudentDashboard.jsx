import { useState } from 'react'
import React from 'react'
import { BarChart3, Users, Calendar, Briefcase, Settings, LogOut } from 'lucide-react';

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

  React.useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }

    // Fetch dashboard stats from backend
    fetchDashboardData()
    fetchMyRequests()
  }, [])

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
      if (!token) return
      const res = await fetch(`${API_BASE_URL}/notifications`, { headers: { 'Authorization': `Bearer ${token}` } })
      const j = await res.json()
      if (j.success) {
        setNotifications(j.data || [])
        setUnreadCount((j.data || []).filter((n)=>!n.read).length)
      }
    } catch (err) { console.error('Error fetching notifications', err) }
  }

  const handleLogout = () => {
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
      if (j.success) setSettings(j.data)
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
      icon: <Users size={24} />,
      title: 'Find a Mentor',
      description: 'Connect with experienced mentors',
      color: 'bg-blue-100 text-blue-600'
    },
    {
      id: 'upcoming-events',
      icon: <Calendar size={24} />,
      title: 'Upcoming Events',
      description: 'Attend webinars and networking events',
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

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg relative">
        {/* Logo */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">A</span>
            </div>
            <div>
              <h1 className="font-bold text-gray-800">AlumniConnect</h1>
              <p className="text-xs text-gray-600">Student</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2 pb-32">
          {dashboardItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'find-mentor') {
                  onNavigate('mentor-discovery')
                } else if (item.id === 'upcoming-events') {
                  onNavigate('events')
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
                <button onClick={async ()=>{ const next = !notifOpen; setNotifOpen(next); if (next) await fetchNotifications(); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                  🔔 Notifications {unreadCount>0 && <span className="ml-2 bg-red-600 text-white text-xs rounded-full px-2">{unreadCount}</span>}
                </button>
                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg z-10 p-2">
                    <h3 className="px-3 py-2 font-semibold">Notifications</h3>
                    <div className="max-h-64 overflow-auto">
                      {notifications.length===0 && <p className="px-3 py-2 text-sm text-gray-500">No notifications</p>}
                      {notifications.map((n, idx) => (
                        <div key={idx} className={`px-3 py-2 border-t ${n.read? 'bg-gray-50':'bg-white'}`}>
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
                                setNotifications(prev => prev.filter(x=>x!==n))
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
                <button onClick={async ()=>{ setShowMessagesModal(true); await fetchMessages(); }} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
                  💬 Messages {messages.length>0 && <span className="ml-2 bg-orange-600 text-white text-xs rounded-full px-2">{messages.length}</span>}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Modal */}
        {settingsOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Settings</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-xs text-gray-500">Receive emails for important updates</p>
                  </div>
                  <input type="checkbox" checked={settings?.emailNotifications} onChange={e=>setSettings({...settings, emailNotifications: e.target.checked})} />
                </div>
                <div>
                  <p className="font-medium">Profile Visibility</p>
                  <select value={settings?.profileVisibility} onChange={e=>setSettings({...settings, profileVisibility: e.target.value})} className="w-full mt-2 p-2 border rounded">
                    <option value="public">Public (anyone can view)</option>
                    <option value="connections">Connections only</option>
                    <option value="private">Private (only you)</option>
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button onClick={()=>setSettingsOpen(false)} className="px-4 py-2 border rounded">Cancel</button>
                <button onClick={()=>{ setSettingsOpen(false); setSettingsMessage('Settings updated'); saveSettings(); }} className="px-4 py-2 bg-blue-600 text-white rounded">Save</button>
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

        {/* My Mentorship Requests Section */}
        <div className="p-6">
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">My Mentorship Requests</h2>
              <button
                onClick={() => onNavigate('mentor-discovery')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                Find Mentor
              </button>
            </div>

            {loadingRequests ? (
              <p className="text-gray-600">Loading requests...</p>
            ) : myRequests.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">You haven't sent any mentorship requests yet.</p>
                <button
                  onClick={() => onNavigate('mentor-discovery')}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Browse Mentors
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {myRequests.map((request) => (
                  <div key={request._id || request.id} className="border rounded-lg p-4 hover:shadow-md transition">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-800">{request.topic}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            request.status === 'accepted' ? 'bg-green-100 text-green-700' :
                            request.status === 'declined' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {request.status?.toUpperCase() || 'PENDING'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{request.note}</p>
                        <p className="text-xs text-gray-400 mb-1">
                          Sent: {new Date(request.createdAt).toLocaleDateString()}
                        </p>
                        {request.mentorName && (
                          <p className="text-xs text-blue-600">To: {request.mentorName}</p>
                        )}
                        {request.mentorResponse && (
                          <div className="mt-3 p-3 bg-blue-50 rounded border-l-4 border-blue-500">
                            <p className="text-sm font-semibold text-blue-900 mb-1">Mentor Response:</p>
                            <p className="text-sm text-blue-800">{request.mentorResponse}</p>
                          </div>
                        )}
                      </div>
                      {(request.status === 'pending' || request.status === 'declined') && (
                        <div className="flex flex-col gap-2">
                          {request.status === 'pending' && (
                            <button
                              onClick={() => startEditing(request)}
                              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                            >
                              Edit
                            </button>
                          )}
                          <button
                            onClick={() => setDeleteConfirm(request)}
                            className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

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
            {dashboardItems.slice(0, 2).map(item => (
              <div
                key={item.id}
                onClick={() => {
                  if (item.id === 'find-mentor') {
                    onNavigate('mentor-discovery')
                  } else if (item.id === 'upcoming-events') {
                    onNavigate('events')
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
    </div>
  );
};
