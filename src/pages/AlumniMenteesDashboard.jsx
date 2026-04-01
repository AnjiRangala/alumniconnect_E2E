import React, { useEffect, useState } from 'react'
import { Navbar } from '../components/Navbar.jsx'
import { Footer } from '../components/Footer.jsx'

const API_BASE_URL = 'http://localhost:5000/api'

export const AlumniMenteesDashboard = ({ onNavigate }) => {
  const [mentees, setMentees] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [selectedStudentProfile, setSelectedStudentProfile] = useState(null)
  const [loadingStudentProfile, setLoadingStudentProfile] = useState(false)

  const getLinkedInHref = (url) => {
    if (!url) return null
    const trimmed = String(url).trim()
    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    try {
      const parsed = new URL(normalized)
      if (!parsed.hostname.toLowerCase().includes('linkedin.com')) return null
      return parsed.toString()
    } catch {
      return null
    }
  }

  useEffect(() => { loadMentees() }, [])

  const loadMentees = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const headers = {}
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

  const viewProfile = async (studentId) => {
    setShowProfileModal(true)
    setLoadingStudentProfile(true)
    try {
      const token = localStorage.getItem('token')
      const headers = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`${API_BASE_URL}/users/${studentId}`, { headers })
      const j = await res.json()
      if (j.success) {
        setSelectedStudentProfile(j.data)

        if (token) {
          try {
            await fetch(`${API_BASE_URL}/auth/profile/view`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ targetUserId: j.data?._id || j.data?.id || studentId })
            })
          } catch (visitErr) {
            console.error('Error recording profile visit', visitErr)
          }
        }
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

  const exportAllCSV = async () => {
    if (!mentees || mentees.length === 0) { alert('No mentees to export'); return }
    const keys = ['id','fullName','focus','sessions','sessionsGoal']
    const rows = [keys.join(',')]
    mentees.forEach((m)=>{
      const vals = keys.map(k => `"${((m[k] || '')).toString().replace(/"/g,'""')}"`)
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

  const openMessagesDashboard = (student) => {
    const payload = {
      id: String(student?._id || student?.id || student?.idStr || ''),
      name: student?.fullName || student?.studentName || student?.name || 'Student'
    }
    localStorage.setItem('alumniMessagesOpenContact', JSON.stringify(payload))
    onNavigate('alumni-messages')
  }

  const filteredMentees = (mentees || []).filter((m) => {
    if (!searchTerm) return true
    const q = searchTerm.toLowerCase()
    return (m.fullName || m.name || '').toLowerCase().includes(q) || (m.focus || '').toLowerCase().includes(q)
  })

  const totalMentees = filteredMentees.length
  const totalSessions = filteredMentees.reduce((acc, m) => acc + Number(m.sessions || 0), 0)
  const avgProgress = totalMentees > 0
    ? Math.round(filteredMentees.reduce((acc, m) => acc + Math.round((m.progress || ((m.sessions || 0) / (m.sessionsGoal || 10))) * 100), 0) / totalMentees)
    : 0

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 via-blue-50 to-indigo-50">
      <Navbar onNavigate={onNavigate} />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        <section className="bg-gradient-to-r from-indigo-700 via-blue-700 to-cyan-600 rounded-2xl p-6 md:p-8 text-white shadow-lg mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">👨‍🎓 Students You're Mentoring</h1>
              <p className="text-blue-100 mt-1">Track progress and chat with your mentees instantly.</p>
            </div>
            <div className="grid grid-cols-3 gap-3 w-full md:w-auto">
              <div className="bg-white/20 backdrop-blur rounded-xl px-4 py-3 text-center min-w-[110px]">
                <p className="text-xl font-bold">{totalMentees}</p>
                <p className="text-xs text-blue-100">Mentees</p>
              </div>
              <div className="bg-white/20 backdrop-blur rounded-xl px-4 py-3 text-center min-w-[110px]">
                <p className="text-xl font-bold">{totalSessions}</p>
                <p className="text-xs text-blue-100">Sessions</p>
              </div>
              <div className="bg-white/20 backdrop-blur rounded-xl px-4 py-3 text-center min-w-[110px]">
                <p className="text-xl font-bold">{avgProgress}%</p>
                <p className="text-xs text-blue-100">Avg Progress</p>
              </div>
            </div>
          </div>
        </section>

        <div className="bg-white/80 backdrop-blur rounded-xl border border-blue-100 shadow-sm p-4 mb-6 flex flex-wrap gap-2 items-center">
          <button onClick={() => onNavigate('alumni-dashboard')} className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">← Back to Dashboard</button>
          <button onClick={loadMentees} className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Refresh</button>
          <input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Search mentees" className="px-3 py-2 border rounded-lg min-w-[220px]" />
          <button onClick={() => exportAllCSV()} className="px-3 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Export All CSV</button>
        </div>

        {loading && <p>Loading…</p>}

        {!loading && mentees && (
          <>
            {filteredMentees.length === 0 ? (
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
                {filteredMentees.map((m) => (
                  <div key={m._id || m.id || m.idStr} className="bg-white/90 backdrop-blur p-5 rounded-2xl border border-indigo-100 shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
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
                        onClick={() => openMessagesDashboard(m)}
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
                  </div>
                ))}
              </div>
            )}
          </>
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
                        {selectedStudentProfile.skills.map((skill, index) => (
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
                              href={getLinkedInHref(selectedStudentProfile.linkedinUrl) || '#'}
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
