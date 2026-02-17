import React, { useEffect, useState } from 'react'
import { Navbar } from '../components/Navbar.jsx'
import { Footer } from '../components/Footer.jsx'

const API_BASE_URL = 'http://localhost:5000/api'

export const AlumniMentorRequests = ({ onNavigate }) => {
  const [requests, setRequests] = useState(null)
  const [loading, setLoading] = useState(false)

  const loadRequests = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const headers = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`${API_BASE_URL}/mentorship/requests`, { headers })
      if (!res.ok) throw new Error('no-endpoint')
      const j = await res.json()
      if (j.success) setRequests(j.data || [])
      else setRequests([])
    } catch (err) {
      // No fallback - show error message
      console.error('Error loading requests', err)
      setRequests([])
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()
    // Auto-refresh every 10 seconds
    const interval = setInterval(loadRequests, 10000)
    return () => clearInterval(interval)
  }, [])

  const respondTo = async (id, action) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        alert('Please login to respond')
        return
      }
      const res = await fetch(`${API_BASE_URL}/mentorship/requests/${id}/respond`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type':'application/json' }, body: JSON.stringify({ action }) })
      const j = await res.json()
      if (j.success) {
        setRequests(prev => (prev || []).map(r => (r._id === id || r.id === id) ? j.data : r))
      } else {
        alert(j.message || 'Failed to respond')
      }
    } catch (err) {
      console.error('Error responding', err)
      alert('Network error')
    }
  }

  const viewProfile = (studentId) => {
    localStorage.setItem('viewUserId', studentId)
    onNavigate('profile')
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar onNavigate={onNavigate} />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        <div className="bg-white p-6 rounded shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Mentorship Requests</h1>
              <p className="text-gray-600">Students have requested mentorship — review and respond.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={loadRequests}
                disabled={loading}
                className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
              >
                {loading ? 'Refreshing...' : '🔄 Refresh'}
              </button>
              <button onClick={() => onNavigate('alumni-dashboard')} className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200">← Back to Dashboard</button>
            </div>
          </div>

          {loading && <p>Loading requests…</p>}

          {!loading && requests && (
            <div className="space-y-4">
              {requests.length === 0 && <p className="text-sm text-gray-500">No mentorship requests found.</p>}
              {requests.map((r) => (
                <div key={r._id || r.id} className="p-4 border rounded flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{r.studentName || r.student || 'Student'}</p>
                    <p className="text-sm text-gray-600">Topic: {r.topic}</p>
                    <p className="text-sm text-gray-500 mt-1">{r.note}</p>
                    <p className="text-xs text-gray-400 mt-2">Requested: {new Date(r.createdAt).toLocaleString()}</p>
                    {r.mentorName && <p className="text-xs text-blue-600 mt-1">To: {r.mentorName}</p>}
                    <p className="text-xs mt-2"><span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">{(r.status || 'pending').toUpperCase()}</span></p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => viewProfile(r.studentId)}
                      disabled={!r.studentId}
                      className={`px-3 py-2 rounded ${r.studentId ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                    >
                      View Profile
                    </button>
                    <button onClick={() => respondTo(r._id || r.id, 'accept')} className="px-3 py-2 bg-green-600 text-white rounded">Accept</button>
                    <button onClick={() => respondTo(r._id || r.id, 'decline')} className="px-3 py-2 bg-red-100 text-red-600 rounded">Decline</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
