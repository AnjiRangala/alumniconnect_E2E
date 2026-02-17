import React, { useState, useEffect } from 'react'
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { BadgeModal } from '../components/BadgeModal'
import { InputModal } from '../components/InputModal'

interface AlumniDashboardProps {
  onNavigate: (page: string) => void
}

export const AlumniDashboard = ({ onNavigate }: AlumniDashboardProps) => {
  const [showNotifications, setShowNotifications] = useState(false)
  const [showBadgeModal, setShowBadgeModal] = useState(false)
  const [selectedBadge, setSelectedBadge] = useState<any | null>(null)
  const [mentees, setMentees] = useState<any[] | null>(null)
  const [loadingMentees, setLoadingMentees] = useState(false)
  const [apiMessage, setApiMessage] = useState<string | null>(null)
  const [showInviteModal, setShowInviteModal] = useState<any | null>(null)
  const [showProfileEdit, setShowProfileEdit] = useState(false)
  const [profileData, setProfileData] = useState({
    role: '',
    company: '',
    experience: '',
    industry: 'Technology',
    availability: '',
    skills: [] as string[],
    linkedinUrl: '',
    githubUrl: ''
  })
  const [skillInput, setSkillInput] = useState('')
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [showMessages, setShowMessages] = useState(false)
  const [messages, setMessages] = useState<any[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)

  useEffect(()=>{ loadMentees(); loadProfile() }, [])

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
          experience: j.data.experience || '',
          industry: j.data.industry || 'Technology',
          availability: j.data.availability || '',
          skills: j.data.skills || [],
          linkedinUrl: j.data.linkedinUrl || '',
          githubUrl: j.data.githubUrl || ''
        })
      }
    } catch (err) {
      console.error('Failed to load profile', err)
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

  const removeSkill = (skill: string) => {
    setProfileData({ ...profileData, skills: profileData.skills.filter(s => s !== skill) })
  }

  const loadMessages = async () => {
    setLoadingMessages(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      const res = await fetch('http://localhost:5000/api/messages', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const j = await res.json()
      if (j.success) {
        setMessages(j.data || [])
      }
    } catch (err) {
      console.error('Failed to load messages', err)
    } finally {
      setLoadingMessages(false)
    }
  }

  const openMessages = () => {
    setShowMessages(true)
    loadMessages()
  }

  const loadMentees = async () => {
    setLoadingMentees(true)
    try {
      const token = localStorage.getItem('token')
      const headers:any = {}
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

  const showTempMessage = (m:string) => { setApiMessage(m); setTimeout(()=>setApiMessage(null), 3500) }

  const endorseSkill = async (targetUserId:string, skill:string) => {
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

  const sendInvite = async (targetUserId:string, body:string) => {
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition" onClick={() => onNavigate('alumni-requests')}>
            <div className="text-3xl mb-2">📬</div>
            <p className="text-gray-600 text-sm">Mentorship Requests</p>
            <p className="text-2xl font-bold text-green-600">New</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition" onClick={() => onNavigate('alumni-mentees')}>
            <div className="text-3xl mb-2">👨‍🎓</div>
            <p className="text-gray-600 text-sm">Active Mentees</p>
            <p className="text-2xl font-bold text-green-600">{mentees?.length || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-3xl mb-2">📅</div>
            <p className="text-gray-600 text-sm">Sessions This Week</p>
            <p className="text-2xl font-bold text-green-600">
              {mentees?.reduce((sum, m) => sum + (m.sessions || 0), 0) || 0}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-3xl mb-2">🏅</div>
            <p className="text-gray-600 text-sm">Badges Earned</p>
            <p className="text-2xl font-bold text-green-600">7</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <button onClick={() => setShowProfileEdit(true)} className="bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 font-semibold">
            👤 Edit Profile
          </button>
          <button onClick={() => onNavigate('alumni-endorse')} className="bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold">
            ✏️ Endorse Skills
          </button>
          <button onClick={() => onNavigate('alumni-post-job')} className="bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-semibold">
            📋 Post Job
          </button>
          <button onClick={() => onNavigate('alumni-create-event')} className="bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 font-semibold">
            🎤 Create Event
          </button>
          <button onClick={() => onNavigate('alumni-requests')} className="bg-yellow-500 text-white py-3 rounded-lg hover:bg-yellow-600 font-semibold">
            📬 Mentor Requests
          </button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column: Schedule & Badges */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-bold mb-4">📅 Upcoming Sessions</h2>
              <div className="space-y-3">
                {mentees && mentees.length > 0 ? (
                  mentees.slice(0, 2).map((mentee: any) => (
                    <div key={mentee._id || mentee.id} className="p-3 bg-blue-50 rounded-lg text-sm">
                      <p className="font-semibold">Session with {mentee.fullName}</p>
                      <p className="text-gray-600">Schedule a session to get started</p>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="p-3 bg-blue-50 rounded-lg text-sm">
                      <p className="font-semibold">No upcoming sessions</p>
                      <p className="text-gray-600">Accept mentorship requests to start mentoring</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-bold mb-4">🏅 Badges Earned</h2>
              <div className="grid grid-cols-3 gap-2">
                {["🌟", "🎖️", "⭐", "👑", "🏆", "💎"].map((badge, index) => (
                  <div key={index} className="text-center text-2xl p-2 bg-gray-100 rounded">
                    {badge}
                  </div>
                ))}
              </div>
            </div>

            {/* Endorse Students */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">👨‍🎓 Your Mentees</h2>
                <button 
                  onClick={() => onNavigate('alumni-mentees')} 
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                >
                  View All
                </button>
              </div>
              {apiMessage && <div className="mb-3 p-2 bg-green-100 text-green-800 rounded">{apiMessage}</div>}
              {loadingMentees && <div className="text-sm text-gray-500">Loading mentees…</div>}
              {!loadingMentees && mentees && mentees.length===0 && (
                <div className="text-sm text-gray-500 bg-blue-50 p-4 rounded">
                  <p className="font-semibold mb-2">No mentees yet</p>
                  <p>Accept mentorship requests to start mentoring students!</p>
                  <button 
                    onClick={() => onNavigate('alumni-requests')} 
                    className="mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    View Requests
                  </button>
                </div>
              )}
              <div className="space-y-3">
                {mentees && mentees.slice(0, 3).map(m=> (
                  <div key={m._id || m.id || m.idStr} className="p-3 border rounded hover:shadow-md transition">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-semibold">{m.fullName}</div>
                        <div className="text-sm text-gray-500">Sessions: {(m.sessions||0)}/{m.sessionsGoal||10}</div>
                        <div className="bg-gray-200 h-2 rounded mt-2">
                          <div 
                            className="bg-green-600 h-2 rounded" 
                            style={{ width: `${Math.round(((m.sessions||0)/(m.sessionsGoal||10))*100)}%` }} 
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button 
                        onClick={() => {
                          setShowInviteModal(m)
                        }} 
                        className="flex-1 px-2 py-1 bg-indigo-500 text-white rounded text-sm hover:bg-indigo-600"
                      >
                        💬 Message
                      </button>
                      <button 
                        onClick={() => onNavigate('alumni-mentees')} 
                        className="flex-1 px-2 py-1 bg-gray-100 rounded text-sm hover:bg-gray-200"
                      >
                        Manage
                      </button>
                    </div>
                    {m.skills && m.skills.length > 0 && (
                      <div className="mt-2 flex gap-2 flex-wrap">
                        {(m.skills || ['Career']).slice(0,3).map((s:string,i:number)=>(
                          <button 
                            key={i} 
                            onClick={()=>endorseSkill(m._id||m.id||m.idStr, s)} 
                            className="px-2 py-1 bg-blue-50 border rounded text-xs hover:bg-blue-100"
                          >
                            👍 {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column: Feature cards (use the white space) */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-semibold">📣 Post Announcement</p>
                    <p className="text-sm text-gray-500">Share an announcement with your students.</p>
                  </div>
                  <div>
                    <button onClick={() => alert('Post Announcement — placeholder')} className="px-3 py-2 bg-blue-600 text-white rounded">Post</button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-semibold">� Messages</p>
                    <p className="text-sm text-gray-500">View messages from your mentees.</p>
                  </div>
                  <div>
                    <button onClick={openMessages} className="px-3 py-2 bg-indigo-600 text-white rounded">Open</button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-semibold">�🕒 Schedule Office Hours</p>
                    <p className="text-sm text-gray-500">Set up recurring office hours for students to book.</p>
                  </div>
                  <div>
                    <button onClick={() => alert('Schedule Office Hours — placeholder')} className="px-3 py-2 bg-green-600 text-white rounded">Schedule</button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-semibold">📊 View Analytics</p>
                    <p className="text-sm text-gray-500">Open analytics to view engagement metrics.</p>
                  </div>
                  <div>
                    <button onClick={() => onNavigate('alumni-analytics')} className="px-3 py-2 bg-indigo-600 text-white rounded">Open</button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-semibold">✉️ Invite Students</p>
                    <p className="text-sm text-gray-500">Send invites to students to join your sessions.</p>
                  </div>
                  <div>
                    <button onClick={() => alert('Invite Students — placeholder')} className="px-3 py-2 bg-yellow-500 text-white rounded">Invite</button>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-semibold">🔔 Notifications</p>
                    <p className="text-sm text-gray-500">View recent mentorship notifications.</p>
                  </div>
                  <div>
                    <button onClick={()=>setShowNotifications(s=>!s)} className="px-3 py-2 bg-gray-100 rounded">Open</button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-semibold">🏅 Manage Badges</p>
                    <p className="text-sm text-gray-500">View and award badges to your mentees.</p>
                  </div>
                  <div>
                    <button onClick={openBadgeManager} className="px-3 py-2 bg-indigo-600 text-white rounded">Manage</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Students moved to separate 'Manage Mentees' dashboard */}
      </main>

      {/* Messages Panel */}
      {showMessages && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[80vh] flex flex-col">
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-6 rounded-t-lg">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-white">💬 Messages</h2>
                  <p className="text-indigo-100 text-sm mt-1">Messages from your mentees and students</p>
                </div>
                <button 
                  onClick={() => setShowMessages(false)} 
                  className="px-4 py-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loadingMessages && (
                <div className="text-center py-8">
                  <div className="text-gray-500">Loading messages...</div>
                </div>
              )}

              {!loadingMessages && messages.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📭</div>
                  <p className="text-gray-600 text-lg font-medium">No messages yet</p>
                  <p className="text-gray-500 text-sm mt-2">Messages from your mentees will appear here</p>
                </div>
              )}

              {!loadingMessages && messages.length > 0 && (
                <div className="space-y-4">
                  {messages.map((msg: any, index: number) => (
                    <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-gray-800">{msg.fromName || 'Unknown'}</p>
                          {msg.subject && (
                            <p className="text-sm font-medium text-gray-600">{msg.subject}</p>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {msg.createdAt ? new Date(msg.createdAt).toLocaleDateString() : 'Recent'}
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm whitespace-pre-wrap">{msg.body}</p>
                      {!msg.read && (
                        <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          New
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-gray-50 rounded-b-lg">
              <button 
                onClick={loadMessages}
                disabled={loadingMessages}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400"
              >
                {loadingMessages ? 'Refreshing...' : '🔄 Refresh Messages'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Edit Modal */}
      {showProfileEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 my-8">
            <h2 className="text-2xl font-bold mb-4">Edit Mentor Profile</h2>
            <p className="text-gray-600 mb-6">Update your professional details to help students find and connect with you.</p>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
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
                  if (parsed.notifications && parsed.notifications.length>0) return parsed.notifications.slice(0,6).map((n:any,i:number)=>(<div key={i} className="py-2 border-b">{n}</div>))
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

      {/* Invite modal for sending quick invites/messages */}
      {showInviteModal && (
        <InputModal title={`Invite ${showInviteModal.fullName || showInviteModal.name || ''}`} placeholder="Write an invite message" initial={`Hi ${showInviteModal.fullName||''}, I'd like to invite you to join my office hours.`} onCancel={()=>setShowInviteModal(null)} onSubmit={(v)=>{ sendInvite(showInviteModal._id||showInviteModal.id||showInviteModal.idStr, v); setShowInviteModal(null) }} />
      )}

      <Footer />
    </div>
  );
};
