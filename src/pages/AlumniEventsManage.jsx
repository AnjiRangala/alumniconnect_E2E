import React, { useEffect, useMemo, useState } from 'react'
import { Navbar } from '../components/Navbar.jsx'
import { Footer } from '../components/Footer.jsx'

const API_BASE_URL = 'http://localhost:5000/api'

const formatDateTime = (event) => {
  try {
    const datePart = event?.date ? new Date(event.date).toLocaleDateString() : 'N/A'
    const timePart = event?.time || ''
    return `${datePart}${timePart ? ` • ${timePart}` : ''}`
  } catch {
    return 'N/A'
  }
}

const statusClass = (status) => {
  const s = String(status || 'upcoming').toLowerCase()
  if (s === 'completed') return 'bg-green-100 text-green-700'
  if (s === 'ongoing') return 'bg-blue-100 text-blue-700'
  if (s === 'cancelled') return 'bg-red-100 text-red-700'
  return 'bg-yellow-100 text-yellow-800'
}

export const AlumniEventsManage = ({ onNavigate }) => {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [expandedEventId, setExpandedEventId] = useState(null)
  const [attendeesByEvent, setAttendeesByEvent] = useState({})
  const [loadingAttendeesFor, setLoadingAttendeesFor] = useState(null)
  const [completingEventId, setCompletingEventId] = useState(null)

  const getCurrentUser = () => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}')
    } catch {
      return {}
    }
  }

  const isOwnedByCurrentMentor = (event, user) => {
    const creatorId = String(event?.createdBy?.userId || event?.createdBy || '')
    const creatorEmail = String(event?.createdBy?.userEmail || '').toLowerCase().trim()
    const userId = String(user?._id || user?.id || '')
    const userEmail = String(user?.email || '').toLowerCase().trim()
    return (creatorId && userId && creatorId === userId) || (creatorEmail && userEmail && creatorEmail === userEmail)
  }

  const loadMyEvents = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setMessage('Please login first')
        setEvents([])
        return
      }

      const res = await fetch(`${API_BASE_URL}/events/created/by-me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const j = await res.json()
      if (j.success) {
        const currentUser = getCurrentUser()
        const mine = (j.data || []).filter((event) => isOwnedByCurrentMentor(event, currentUser))
        setEvents(mine)
        setMessage(null)
      } else {
        setEvents([])
        setMessage(j.message || 'Failed to load events')
      }
    } catch (err) {
      console.error('Error loading my events:', err)
      setEvents([])
      setMessage('Failed to load events. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMyEvents()
    const interval = setInterval(loadMyEvents, 10000)
    return () => clearInterval(interval)
  }, [])

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (events || [])
      .filter((e) => {
        if (statusFilter === 'all') return true
        return String(e.status || 'upcoming').toLowerCase() === statusFilter
      })
      .filter((e) => {
        if (!q) return true
        return [e.title, e.category, e.location, e.description]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q)
      })
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
  }, [events, search, statusFilter])

  const summary = useMemo(() => {
    const totalEvents = events.length
    const totalAttendees = events.reduce((sum, e) => sum + (e.attendees?.length || 0), 0)
    const upcoming = events.filter((e) => String(e.status || 'upcoming').toLowerCase() === 'upcoming').length
    const completed = events.filter((e) => String(e.status || '').toLowerCase() === 'completed').length
    return { totalEvents, totalAttendees, upcoming, completed }
  }, [events])

  const toggleAttendees = async (eventId) => {
    const next = expandedEventId === eventId ? null : eventId
    setExpandedEventId(next)
    if (!next || attendeesByEvent[eventId]) return

    try {
      setLoadingAttendeesFor(eventId)
      const token = localStorage.getItem('token')
      if (!token) return

      const res = await fetch(`${API_BASE_URL}/events/${eventId}/attendees`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const j = await res.json()
      if (j.success) {
        setAttendeesByEvent((prev) => ({ ...prev, [eventId]: j.data }))
      }
    } catch (err) {
      console.error('Error loading attendees:', err)
    } finally {
      setLoadingAttendeesFor(null)
    }
  }

  const markEventCompleted = async (eventId) => {
    try {
      setCompletingEventId(eventId)
      const token = localStorage.getItem('token')
      if (!token) return

      const res = await fetch(`${API_BASE_URL}/events/${eventId}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      const j = await res.json()
      if (j.success) {
        setEvents((prev) =>
          prev.map((e) =>
            (e._id || e.id) === eventId
              ? { ...e, status: 'completed', completedAt: j.data?.completedAt || new Date().toISOString() }
              : e
          )
        )
        setMessage(`Event marked as completed: ${j.data?.eventTitle || ''}`)
      } else {
        setMessage(j.message || 'Failed to mark event as completed')
      }
    } catch (err) {
      console.error('Error completing event:', err)
      setMessage('Failed to mark event as completed')
    } finally {
      setCompletingEventId(null)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar onNavigate={onNavigate} />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">Event Management</h1>
              <p className="text-gray-600">Track event status, total attendees, and manage your events.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => onNavigate('alumni-create-event')} className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">+ Create Event</button>
              <button onClick={loadMyEvents} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400">{loading ? 'Refreshing...' : 'Refresh'}</button>
              <button onClick={() => onNavigate('alumni-dashboard')} className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200">← Dashboard</button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow"><p className="text-sm text-gray-500">Total Events</p><p className="text-2xl font-bold text-purple-700">{summary.totalEvents}</p></div>
          <div className="bg-white p-4 rounded-lg shadow"><p className="text-sm text-gray-500">Total Attendees</p><p className="text-2xl font-bold text-blue-700">{summary.totalAttendees}</p></div>
          <div className="bg-white p-4 rounded-lg shadow"><p className="text-sm text-gray-500">Upcoming</p><p className="text-2xl font-bold text-yellow-700">{summary.upcoming}</p></div>
          <div className="bg-white p-4 rounded-lg shadow"><p className="text-sm text-gray-500">Completed</p><p className="text-2xl font-bold text-green-700">{summary.completed}</p></div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-col md:flex-row gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, category, location..."
            className="flex-1 border rounded px-3 py-2"
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border rounded px-3 py-2">
            <option value="all">All Status</option>
            <option value="upcoming">Upcoming</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {message && <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-700 p-3 rounded">{message}</div>}

        <div className="space-y-4">
          {!loading && filteredEvents.length === 0 && (
            <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">No events found for this filter.</div>
          )}

          {filteredEvents.map((event) => {
            const eventId = event._id || event.id
            const isExpanded = expandedEventId === eventId
            const eventAttendees = attendeesByEvent[eventId]
            const currentStatus = String(event.status || 'upcoming').toLowerCase()
            const totalAttendees = event.attendees?.length || 0
            const maxAttendeesText = event.maxAttendees ? String(event.maxAttendees) : 'Unlimited'

            return (
              <div key={eventId} className="bg-white rounded-lg shadow p-5">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-gray-900">{event.title}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${statusClass(currentStatus)}`}>{currentStatus.toUpperCase()}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-700">
                      <p><span className="font-semibold">Date:</span> {formatDateTime(event)}</p>
                      <p><span className="font-semibold">Category:</span> {event.category || 'Other'}</p>
                      <p><span className="font-semibold">Location:</span> {event.location || 'Online'}</p>
                      <p><span className="font-semibold">Attendees:</span> {totalAttendees} / {maxAttendeesText}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 min-w-52">
                    <button onClick={() => toggleAttendees(eventId)} className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
                      {isExpanded ? 'Hide Attendees' : 'View Attendees'}
                    </button>

                    {currentStatus !== 'completed' && currentStatus !== 'cancelled' && (
                      <button
                        onClick={() => markEventCompleted(eventId)}
                        disabled={completingEventId === eventId}
                        className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
                      >
                        {completingEventId === eventId ? 'Updating...' : 'Mark Completed'}
                      </button>
                    )}

                    {event.eventLink && (
                      <button
                        onClick={() => navigator.clipboard?.writeText(event.eventLink)}
                        className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200"
                      >
                        Copy Event Link
                      </button>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 border-t pt-4">
                    {loadingAttendeesFor === eventId && <p className="text-sm text-gray-500">Loading attendees...</p>}
                    {loadingAttendeesFor !== eventId && (
                      <>
                        <p className="text-sm text-gray-700 mb-2">
                          <span className="font-semibold">Total Attendees:</span> {eventAttendees?.totalAttendees ?? totalAttendees}
                        </p>
                        <div className="max-h-52 overflow-auto border rounded">
                          {(eventAttendees?.attendees || []).length === 0 ? (
                            <p className="p-3 text-sm text-gray-500">No attendees yet.</p>
                          ) : (
                            <ul>
                              {(eventAttendees?.attendees || []).map((a, idx) => (
                                <li key={`${a.userId || idx}`} className="px-3 py-2 border-b text-sm flex items-center justify-between">
                                  <span>{a.userName || 'Student'}</span>
                                  <span className="text-xs text-gray-500">{a.registeredAt ? new Date(a.registeredAt).toLocaleString() : ''}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </main>
      <Footer />
    </div>
  )
}
