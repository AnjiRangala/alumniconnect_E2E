import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { BrandLogo } from '../components/BrandLogo.jsx'
import { isEventCompletedByIST } from '../utils/eventDateTime.js'

const API_BASE_URL = 'http://localhost:5000/api'

export const StudentEventsDashboard = ({ onNavigate }) => {
  const [events, setEvents] = useState([])
  const [allEvents, setAllEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [registerMessage, setRegisterMessage] = useState('')

  const isCompleted = (event) => event.status === 'completed'
  const isUpcoming = (event) => {
    if (isCompleted(event)) return false
    if (!event.date) return true
    const eventDate = new Date(event.date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return eventDate >= today
  }

  const isUpcomingPublicEvent = (event) => !isEventCompletedByIST(event)

  useEffect(() => {
    loadEventHub()
  }, [])

  const loadEventHub = async () => {
    setLoading(true)
    try {
      await Promise.all([fetchRegisteredEvents(), fetchAllEvents()])
    } finally {
      setLoading(false)
    }
  }

  const fetchRegisteredEvents = async () => {
    try {
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
    }
  }

  const fetchAllEvents = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE_URL}/events`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      const result = await response.json()
      if (result.success) {
        setAllEvents(result.data || [])
      }
    } catch (err) {
      console.error('Error fetching all events:', err)
    }
  }

  const handleRegisterEvent = async (eventId) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setRegisterMessage('Please log in to register for events.')
        setTimeout(() => setRegisterMessage(''), 2500)
        return
      }

      const response = await fetch(`${API_BASE_URL}/events/${eventId}/register`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      const result = await response.json()
      if (result.success) {
        setRegisterMessage('Registered successfully!')
        setTimeout(() => setRegisterMessage(''), 2500)
        await loadEventHub()
      } else {
        setRegisterMessage(result.message || 'Failed to register for event')
        setTimeout(() => setRegisterMessage(''), 3000)
      }
    } catch (err) {
      console.error('Error registering for event:', err)
      setRegisterMessage('Network error. Please try again.')
      setTimeout(() => setRegisterMessage(''), 3000)
    }
  }

  const handleUnregisterEvent = async (eventId) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setRegisterMessage('Please log in to unregister from events.')
        setTimeout(() => setRegisterMessage(''), 2500)
        return
      }

      const response = await fetch(`${API_BASE_URL}/events/${eventId}/unregister`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      const result = await response.json()
      if (result.success) {
        setRegisterMessage('Unregistered successfully!')
        setTimeout(() => setRegisterMessage(''), 2500)
        await loadEventHub()
      } else {
        setRegisterMessage(result.message || 'Failed to unregister from event')
        setTimeout(() => setRegisterMessage(''), 3000)
      }
    } catch (err) {
      console.error('Error unregistering from event:', err)
      setRegisterMessage('Network error. Please try again.')
      setTimeout(() => setRegisterMessage(''), 3000)
    }
  }

  const upcomingEvents = events.filter(isUpcoming)
  const completedEvents = events.filter(isCompleted)
  const registeredIds = new Set(events.map((e) => String(e._id || e.id || '')))
  const discoverUpcomingEvents = allEvents
    .filter(isUpcomingPublicEvent)
    .filter((event) => !registeredIds.has(String(event._id || event.id || '')))
  const formatEventDate = (dateValue) => {
    if (!dateValue) return 'TBD'
    const d = new Date(dateValue)
    if (Number.isNaN(d.getTime())) return 'TBD'
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-purple-50 to-blue-50">
      <div className="bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="px-4 py-3 md:py-4">
          <BrandLogo subtitle="Student" />
        </div>
      </div>

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
              <h1 className="text-3xl md:text-4xl font-bold">📅 Events Hub</h1>
              <p className="text-purple-100 mt-2">Manage your registered events and discover upcoming events in one place.</p>
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
        {registerMessage && (
          <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg p-3">
            {registerMessage}
          </div>
        )}

        {loading ? (
          <div className="text-center text-gray-600 bg-white rounded-xl border border-purple-100 p-8 shadow-sm">Loading event hub...</div>
        ) : events.length === 0 ? (
          <div className="bg-white border border-purple-200 rounded-xl p-8 text-center shadow-sm">
            <p className="text-gray-700 text-lg font-semibold mb-2">No registered events yet</p>
            <p className="text-sm text-gray-500 mb-4">Events will appear after your mentor accepts your request.</p>
              <div className="flex flex-col gap-3">
                <p className="text-xs text-gray-600">💡 Tip: Events are only shown from your accepted mentors.</p>
                <button
                  onClick={() => onNavigate('student-mentors')}
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold text-sm"
                >
                  Find & Request Mentors
                </button>
              </div>
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
                          <p className="text-xs text-purple-600 font-semibold mt-1">🎓 By {event.createdBy?.userName || 'Mentor'}</p>
                          </div>
                        <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-semibold">Registered</span>
                      </div>

                      <div className="space-y-2 text-sm text-gray-700 mb-4">
                        <p>📅 <span className="font-medium">{formatEventDate(event.date)}</span></p>
                        <p>⏰ <span className="font-medium">{event.time || 'TBD'}</span></p>
                        <p className="line-clamp-1">📍 <span className="font-medium">{event.location || 'Online'}</span></p>
                      </div>

                      <button
                        onClick={() => handleUnregisterEvent(event._id || event.id)}
                        className="w-full px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-semibold text-sm border border-red-200"
                      >
                        Unregister
                      </button>
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
                          <p className="text-xs text-purple-600 font-semibold mt-1">🎓 By {event.createdBy?.userName || 'Mentor'}</p>
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

            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-3">Discover Upcoming Events</h2>
              {discoverUpcomingEvents.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-4 text-gray-600 shadow-sm">
                  No new upcoming events to discover right now.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {discoverUpcomingEvents.slice(0, 12).map(event => (
                    <div key={event._id || event.id} className="bg-white rounded-2xl shadow-md p-6 border border-purple-100 hover:shadow-xl transition">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-800 line-clamp-2">{event.title}</h3>
                          <p className="text-sm text-gray-500 mt-1">{event.category || 'Event'}</p>
                          <p className="text-xs text-purple-600 font-semibold mt-1">🎓 By {event.createdBy?.userName || 'Mentor'}</p>
                          </div>
                        <span className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-semibold">Upcoming</span>
                      </div>

                      <div className="space-y-2 text-sm text-gray-700 mb-4">
                        <p>📅 <span className="font-medium">{formatEventDate(event.date)}</span></p>
                        <p>⏰ <span className="font-medium">{event.time || 'TBD'}</span></p>
                        <p className="line-clamp-1">📍 <span className="font-medium">{event.location || 'Online'}</span></p>
                      </div>

                      <button
                        onClick={() => handleRegisterEvent(event._id || event.id)}
                        className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold text-sm"
                      >
                        Register
                      </button>
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
