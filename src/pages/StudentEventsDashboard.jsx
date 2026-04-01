import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'

const API_BASE_URL = 'http://localhost:5000/api'

export const StudentEventsDashboard = ({ onNavigate }) => {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  const isCompleted = (event) => event.status === 'completed'
  const isUpcoming = (event) => {
    if (isCompleted(event)) return false
    if (!event.date) return true
    const eventDate = new Date(event.date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return eventDate >= today
  }

  useEffect(() => {
    fetchRegisteredEvents()
  }, [])

  const fetchRegisteredEvents = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      if (!token) return
      const response = await fetch(`${API_BASE_URL}/events/registered/by-me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const result = await response.json()
      if (result.success) {
        setEvents(result.data || [])
      }
    } catch (err) {
      console.error('Error fetching registered events:', err)
    } finally {
      setLoading(false)
    }
  }

  const upcomingEvents = events.filter(isUpcoming)
  const completedEvents = events.filter(isCompleted)
  const formatEventDate = (dateValue) => {
    if (!dateValue) return 'TBD'
    const d = new Date(dateValue)
    if (Number.isNaN(d.getTime())) return 'TBD'
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-purple-50 to-blue-50">
      <div className="bg-gradient-to-r from-violet-700 via-purple-700 to-blue-700 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
          <button
            onClick={() => onNavigate('student-dashboard')}
            className="flex items-center gap-2 text-purple-100 hover:text-white font-semibold"
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </button>

          <div className="mt-4 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">📅 My Events</h1>
              <p className="text-purple-100 mt-2">Track your registered events, upcoming sessions, and completed milestones.</p>
            </div>

            <div className="flex gap-3 flex-wrap">
              <div className="bg-white/15 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20">
                <p className="text-xs text-purple-100">Total Registered</p>
                <p className="text-xl font-bold">{events.length}</p>
              </div>
              <div className="bg-white/15 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20">
                <p className="text-xs text-purple-100">Upcoming</p>
                <p className="text-xl font-bold">{upcomingEvents.length}</p>
              </div>
              <div className="bg-white/15 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20">
                <p className="text-xs text-purple-100">Completed</p>
                <p className="text-xl font-bold">{completedEvents.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center text-gray-600 bg-white rounded-xl border border-purple-100 p-8 shadow-sm">Loading your events...</div>
        ) : events.length === 0 ? (
          <div className="bg-white border border-purple-200 rounded-xl p-8 text-center shadow-sm">
            <p className="text-gray-700 text-lg font-semibold mb-2">No registered events yet</p>
            <p className="text-sm text-gray-500 mb-4">Browse upcoming events and webinars to register.</p>
            <button
              onClick={() => onNavigate('events')}
              className="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold text-sm"
            >
              Explore Events & Webinars
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-3">Upcoming & Ongoing</h2>
              {upcomingEvents.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-4 text-gray-600 shadow-sm">
                  No upcoming events.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {upcomingEvents.map(event => (
                    <div key={event._id || event.id} className="bg-white rounded-2xl shadow-md p-6 border border-blue-100 hover:shadow-xl transition">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-800 line-clamp-2">{event.title}</h3>
                          <p className="text-sm text-gray-500 mt-1">{event.category || 'Event'}</p>
                        </div>
                        <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-semibold">Registered</span>
                      </div>

                      <div className="space-y-2 text-sm text-gray-700">
                        <p>📅 <span className="font-medium">{formatEventDate(event.date)}</span></p>
                        <p>⏰ <span className="font-medium">{event.time || 'TBD'}</span></p>
                        <p className="line-clamp-1">📍 <span className="font-medium">{event.location || 'Online'}</span></p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-3">Completed Events</h2>
              {completedEvents.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-4 text-gray-600 shadow-sm">
                  No completed events yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {completedEvents.map(event => (
                    <div key={event._id || event.id} className="bg-white rounded-2xl shadow-md p-6 border border-emerald-100 hover:shadow-xl transition">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-800 line-clamp-2">{event.title}</h3>
                          <p className="text-sm text-gray-500 mt-1">{event.category || 'Event'}</p>
                        </div>
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-semibold">Completed</span>
                      </div>

                      <div className="space-y-2 text-sm text-gray-700">
                        <p>📅 <span className="font-medium">{formatEventDate(event.date)}</span></p>
                        <p>⏰ <span className="font-medium">{event.time || 'TBD'}</span></p>
                        <p className="line-clamp-1">📍 <span className="font-medium">{event.location || 'Online'}</span></p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
