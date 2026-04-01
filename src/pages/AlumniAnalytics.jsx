import React, { useEffect, useState } from 'react'
import { Navbar } from '../components/Navbar.jsx'
import { Footer } from '../components/Footer.jsx'

export const AlumniAnalytics = ({ onNavigate }) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState({
    mentorshipMatches: 0,
    sessionsConducted: 0,
    avgRating: 0,
    activeMentees: 0
  })

  const loadAnalytics = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setError('Please login to view analytics')
        setLoading(false)
        return
      }

      const res = await fetch('http://localhost:5000/api/alumni/analytics', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.message || 'Failed to fetch analytics')
      } else {
        setStats(json.data || {})
      }
    } catch (err) {
      console.error('Failed to load analytics', err)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAnalytics()
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar onNavigate={onNavigate} />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        <div className="bg-white p-6 rounded shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Analytics & Reports</h1>
              <p className="text-gray-600">Overview of mentorship metrics and engagement.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={loadAnalytics} className="px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">Refresh</button>
              <button onClick={() => onNavigate('alumni-dashboard')} className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200">← Back to Dashboard</button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded">
              <p className="text-sm text-gray-500">Mentorship Matches</p>
              <p className="text-3xl font-bold">{loading ? '...' : (stats.mentorshipMatches ?? 0)}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded">
              <p className="text-sm text-gray-500">Sessions Conducted</p>
              <p className="text-3xl font-bold">{loading ? '...' : (stats.sessionsConducted ?? 0)}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded">
              <p className="text-sm text-gray-500">Avg. Rating</p>
              <p className="text-3xl font-bold">{loading ? '...' : (Number(stats.avgRating || 0).toFixed(1))}</p>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-gray-600">Active mentees: <span className="font-semibold">{loading ? '...' : (stats.activeMentees ?? 0)}</span></p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
