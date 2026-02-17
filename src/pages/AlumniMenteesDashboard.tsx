import React, { useEffect, useState } from 'react'
import { Navbar } from '../components/Navbar'
import { Footer } from '../components/Footer'
import { InputModal } from '../components/InputModal'

interface AlumniMenteesDashboardProps {
  onNavigate: (page: string) => void
}

const API_BASE_URL = 'http://localhost:5000/api'

export const AlumniMenteesDashboard = ({ onNavigate }: AlumniMenteesDashboardProps) => {
  const [mentees, setMentees] = useState<any[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<any | null>(null)
  const [analytics, setAnalytics] = useState<any | null>(null)
  const [msgOpen, setMsgOpen] = useState(false)
  const [msgBody, setMsgBody] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showNoteModalFor, setShowNoteModalFor] = useState<any | null>(null)
  const [showTaskModalFor, setShowTaskModalFor] = useState<any | null>(null)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [selectedStudentProfile, setSelectedStudentProfile] = useState<any>(null)
  const [loadingStudentProfile, setLoadingStudentProfile] = useState(false)

  useEffect(() => { loadMentees() }, [])

  const loadMentees = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const headers: any = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`${API_BASE_URL}/mentees`, { headers })
      const j = await res.json()
      if (j.success) setMentees(j.data || [])
      else setMentees([])
    } catch (err) {
      console.error('Error loading mentees', err)
      setMentees([])
    } finally { setLoading(false) }
  }

  const viewProfile = async (studentId: string) => {
    setShowProfileModal(true)
    setLoadingStudentProfile(true)
    try {
      const token = localStorage.getItem('token')
      const headers: any = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`${API_BASE_URL}/users/${studentId}`, { headers })
      const j = await res.json()
      if (j.success) {
        setSelectedStudentProfile(j.data)
      } else {
        alert('Failed to load student profile')
        setShowProfileModal(false)
      }
    } catch (err) {
      console.error('Error loading profile', err)
      alert('Network error')
      setShowProfileModal(false)
    } finally {
      setLoadingStudentProfile(false)
    }
  }

  const openMessage = (student:any) => {
    setSelected(student)
    setMsgOpen(true)
    setMsgBody('')
  }

  const sendMessage = async () => {
    if (!selected) return
    if (!msgBody.trim()) {
      alert('Please enter a message')
      return
    }
    try {
      const token = localStorage.getItem('token')
      if (!token) { alert('Please login'); return }
      const res = await fetch(`${API_BASE_URL}/messages`, { 
        method: 'POST', 
        headers: { 
          'Authorization': `Bearer ${token}`, 
          'Content-Type':'application/json' 
        }, 
        body: JSON.stringify({ 
          targetUserId: selected._id || selected.id,
          subject: 'Message from your mentor',
          body: msgBody 
        }) 
      })
      const j = await res.json()
      if (j.success) { 
        alert('Message sent successfully!') 
        setMsgOpen(false)
        setMsgBody('')
      }
      else alert(j.message || 'Failed to send message')
    } catch (err) { 
      console.error(err); 
      alert('Network error') 
    }
  }

  const scheduleSession = async (student:any) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) { alert('Please login'); return }
      const res = await fetch(`${API_BASE_URL}/mentees/${student._id || student.id}/schedule`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type':'application/json' }, body: JSON.stringify({ date: new Date().toISOString() }) })
      const j = await res.json()
      if (j.success) { alert(j.message || 'Scheduled'); loadMentees() }
      else alert(j.message || 'Failed')
    } catch (err) { console.error(err); alert('Network error') }
  }

  const addNote = async (student:any, note:string) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) { alert('Please login'); return }
      const res = await fetch(`${API_BASE_URL}/mentees/${student._id || student.id}/note`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type':'application/json' }, body: JSON.stringify({ body: note }) })
      const j = await res.json()
      if (j.success) { alert('Note added'); } else alert(j.message || 'Failed')
    } catch (err) { console.error(err); alert('Network error') }
  }

  const assignTask = async (student:any, title:string) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) { alert('Please login'); return }
      const res = await fetch(`${API_BASE_URL}/mentees/${student._id || student.id}/task`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type':'application/json' }, body: JSON.stringify({ title }) })
      const j = await res.json()
      if (j.success) { alert('Task assigned'); } else alert(j.message || 'Failed')
    } catch (err) { console.error(err); alert('Network error') }
  }

  const markComplete = async (student:any) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) { alert('Please login'); return }
      const res = await fetch(`${API_BASE_URL}/mentees/${student._id || student.id}/complete`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type':'application/json' } })
      const j = await res.json()
      if (j.success) { alert(j.message || 'Marked complete'); loadMentees() } else alert(j.message || 'Failed')
    } catch (err) { console.error(err); alert('Network error') }
  }

  const exportCSV = async (student:any) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) { alert('Please login'); return }
      const res = await fetch(`${API_BASE_URL}/mentees/${student._id || student.id}/export`, { headers: { 'Authorization': `Bearer ${token}` } })
      if (!res.ok) { alert('Failed to export'); return }
      const text = await res.text()
      const blob = new Blob([text], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mentee-${student._id || student.id}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) { console.error(err); alert('Network error') }
  }

  const exportAllCSV = async () => {
    if (!mentees || mentees.length === 0) { alert('No mentees to export'); return }
    const keys = ['id','fullName','focus','sessions','sessionsGoal']
    const rows = [keys.join(',')]
    mentees.forEach((m:any)=>{
      const vals = keys.map(k => `"${((m as any)[k]||'').toString().replace(/"/g,'""')}"`)
      rows.push(vals.join(','))
    })
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mentees-all.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const loadAnalytics = async (student:any) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) { alert('Please login'); return }
      const res = await fetch(`${API_BASE_URL}/mentees/${student._id || student.id}/analytics`, { headers: { 'Authorization': `Bearer ${token}` } })
      const j = await res.json()
      if (j.success) setAnalytics(j.data)
      else alert(j.message || 'Failed to load analytics')
    } catch (err) { console.error(err); alert('Network error') }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar onNavigate={onNavigate} />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">👨‍🎓 Students You're Mentoring</h1>
            <p className="text-gray-600">Manage your mentees, review progress and interact with them.</p>
          </div>
          <div className="flex gap-2 items-center">
            <button onClick={() => onNavigate('alumni-dashboard')} className="px-3 py-2 bg-gray-100 rounded">← Back to Dashboard</button>
            <button onClick={loadMentees} className="px-3 py-2 bg-blue-600 text-white rounded">Refresh</button>
            <input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Search mentees" className="px-3 py-2 border rounded ml-2" />
            <button onClick={() => exportAllCSV()} className="px-3 py-2 bg-gray-200 rounded ml-2">Export All CSV</button>
          </div>
        </div>

        {loading && <p>Loading…</p>}

        {!loading && mentees && (
          <>
            {mentees.filter(m=>{
              if (!searchTerm) return true
              const q = searchTerm.toLowerCase()
              return (m.fullName||m.name||'').toLowerCase().includes(q) || (m.focus||'').toLowerCase().includes(q)
            }).length === 0 ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
                <div className="text-5xl mb-4">👨‍🎓</div>
                <h3 className="text-xl font-semibold mb-2">No mentees found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm ? 'Try adjusting your search' : 'Accept mentorship requests to start mentoring students!'}
                </p>
                <button 
                  onClick={() => onNavigate('alumni-requests')} 
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  View Mentorship Requests
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mentees.filter(m=>{
                  if (!searchTerm) return true
                  const q = searchTerm.toLowerCase()
                  return (m.fullName||m.name||'').toLowerCase().includes(q) || (m.focus||'').toLowerCase().includes(q)
                }).map((m:any) => (
                  <div key={m._id || m.id || m.idStr} className="bg-white p-5 rounded-lg shadow-md hover:shadow-lg transition">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-gray-800">{m.fullName || m.studentName || m.name}</h3>
                        <p className="text-sm text-gray-500">📚 {m.focus || 'Career Development'}</p>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-semibold text-gray-800">{(m.sessions || 0)}/{m.sessionsGoal || 10} sessions</span>
                      </div>
                      <div className="bg-gray-200 h-3 rounded-full overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500" 
                          style={{ width: `${Math.round((m.progress||((m.sessions||0)/(m.sessionsGoal||10)))*100)}%` }} 
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {Math.round((m.progress||((m.sessions||0)/(m.sessionsGoal||10)))*100)}% complete
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <button 
                        onClick={() => openMessage(m)} 
                        className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 flex items-center justify-center gap-1"
                      >
                        💬 Message
                      </button>
                      <button 
                        onClick={() => viewProfile(m._id || m.id || m.idStr)} 
                        className="px-3 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
                      >
                        👤 Profile
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => scheduleSession(m)} 
                        className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                      >
                        📅 Schedule
                      </button>
                      <button 
                        onClick={() => setShowNoteModalFor(m)} 
                        className="px-3 py-2 bg-yellow-500 text-white rounded-lg text-sm hover:bg-yellow-600"
                      >
                        📝 Note
                      </button>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <button 
                        onClick={() => setShowTaskModalFor(m)} 
                        className="w-full px-3 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
                      >
                        ✅ Assign Task
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Message Modal */}
        {msgOpen && selected && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-lg shadow-xl">
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-6 rounded-t-lg">
                <h3 className="font-bold text-xl text-white">
                  💬 Message {selected.fullName || selected.studentName}
                </h3>
                <p className="text-indigo-100 text-sm mt-1">
                  Send a direct message to your mentee
                </p>
              </div>
              
              <div className="p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Message
                </label>
                <textarea 
                  value={msgBody} 
                  onChange={e=>setMsgBody(e.target.value)} 
                  placeholder="Type your message here..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none" 
                  rows={6}
                />
                <p className="text-xs text-gray-500 mt-2">
                  Your mentee will receive a notification about this message
                </p>
              </div>

              <div className="flex justify-end gap-3 px-6 pb-6">
                <button 
                  onClick={()=>{setMsgOpen(false); setMsgBody('')}} 
                  className="px-5 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button 
                  onClick={sendMessage} 
                  disabled={!msgBody.trim()}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Send Message
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Note Modal */}
        {showNoteModalFor && (
          <InputModal title={`Add note — ${(showNoteModalFor.fullName||showNoteModalFor.name||'mentee')}`} placeholder="Enter note" initial="" onCancel={()=>setShowNoteModalFor(null)} onSubmit={(v)=>{ addNote(showNoteModalFor, v); setShowNoteModalFor(null) }} />
        )}

        {/* Task Modal */}
        {showTaskModalFor && (
          <InputModal title={`Assign task — ${(showTaskModalFor.fullName||showTaskModalFor.name||'mentee')}`} placeholder="Task title" initial="" onCancel={()=>setShowTaskModalFor(null)} onSubmit={(v)=>{ assignTask(showTaskModalFor, v); setShowTaskModalFor(null) }} />
        )}

        {/* Analytics drawer */}
        {analytics && (
          <div className="fixed right-6 top-20 w-96 bg-white p-4 rounded shadow z-50">
            <div className="flex justify-between items-start">
              <h4 className="font-semibold">Analytics — {analytics.name}</h4>
              <button onClick={()=>setAnalytics(null)} className="px-2 py-1 bg-gray-100 rounded">Close</button>
            </div>
            <div className="mt-3 text-sm text-gray-700">
              <p>Sessions completed: {analytics.sessionsCompleted}</p>
              <p>Average rating: {analytics.avgRating}</p>
              <p>Last active: {analytics.lastActive}</p>
            </div>
          </div>
        )}

        {/* Student Profile Modal (Read-Only) */}
        {showProfileModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 p-6 rounded-t-lg z-10">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-white">👤 Student Profile</h2>
                    <p className="text-blue-100 text-sm mt-1">Read-only view</p>
                  </div>
                  <button 
                    onClick={() => {setShowProfileModal(false); setSelectedStudentProfile(null)}} 
                    className="px-4 py-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30"
                  >
                    Close
                  </button>
                </div>
              </div>

              {loadingStudentProfile ? (
                <div className="p-12 text-center">
                  <div className="text-gray-500">Loading profile...</div>
                </div>
              ) : selectedStudentProfile ? (
                <div className="p-6 space-y-6">
                  {/* Basic Info */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Basic Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Full Name</label>
                        <p className="text-gray-800 font-semibold">{selectedStudentProfile.fullName || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Email</label>
                        <p className="text-gray-800">{selectedStudentProfile.email || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">User Type</label>
                        <p className="text-gray-800 capitalize">{selectedStudentProfile.userType || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Company</label>
                        <p className="text-gray-800">{selectedStudentProfile.company || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Professional Details */}
                  {(selectedStudentProfile.role || selectedStudentProfile.experience || selectedStudentProfile.industry) && (
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-xl font-bold text-gray-800 mb-4">Professional Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedStudentProfile.role && (
                          <div>
                            <label className="text-sm font-medium text-gray-600">Role</label>
                            <p className="text-gray-800">{selectedStudentProfile.role}</p>
                          </div>
                        )}
                        {selectedStudentProfile.experience && (
                          <div>
                            <label className="text-sm font-medium text-gray-600">Experience</label>
                            <p className="text-gray-800">{selectedStudentProfile.experience}</p>
                          </div>
                        )}
                        {selectedStudentProfile.industry && (
                          <div>
                            <label className="text-sm font-medium text-gray-600">Industry</label>
                            <p className="text-gray-800">{selectedStudentProfile.industry}</p>
                          </div>
                        )}
                        {selectedStudentProfile.availability && (
                          <div>
                            <label className="text-sm font-medium text-gray-600">Availability</label>
                            <p className="text-gray-800">{selectedStudentProfile.availability}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Skills */}
                  {selectedStudentProfile.skills && selectedStudentProfile.skills.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-xl font-bold text-gray-800 mb-4">Skills</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedStudentProfile.skills.map((skill: string, index: number) => (
                          <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Social Links */}
                  {(selectedStudentProfile.linkedinUrl || selectedStudentProfile.githubUrl) && (
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-xl font-bold text-gray-800 mb-4">Social Links</h3>
                      <div className="space-y-2">
                        {selectedStudentProfile.linkedinUrl && (
                          <div>
                            <label className="text-sm font-medium text-gray-600">LinkedIn</label>
                            <a 
                              href={selectedStudentProfile.linkedinUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="block text-blue-600 hover:underline"
                            >
                              {selectedStudentProfile.linkedinUrl}
                            </a>
                          </div>
                        )}
                        {selectedStudentProfile.githubUrl && (
                          <div>
                            <label className="text-sm font-medium text-gray-600">GitHub</label>
                            <a 
                              href={selectedStudentProfile.githubUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="block text-blue-600 hover:underline"
                            >
                              {selectedStudentProfile.githubUrl}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Statistics</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">{selectedStudentProfile.sessions || 0}</p>
                        <p className="text-sm text-gray-600">Sessions</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{selectedStudentProfile.avgRating || 0}</p>
                        <p className="text-sm text-gray-600">Avg Rating</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-purple-600">{selectedStudentProfile.badges?.length || 0}</p>
                        <p className="text-sm text-gray-600">Badges</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-orange-600">{selectedStudentProfile.endorsements?.length || 0}</p>
                        <p className="text-sm text-gray-600">Endorsements</p>
                      </div>
                    </div>
                  </div>

                  {/* Note: Read-Only */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> This is a read-only view. You cannot edit this student's profile.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <p className="text-gray-500">No profile data available</p>
                </div>
              )}
            </div>
          </div>
        )}

      </main>
      <Footer />
    </div>
  )
}
