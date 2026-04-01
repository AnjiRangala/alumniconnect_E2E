import React, { useState } from 'react'
import { Navbar } from '../components/Navbar.jsx'
import { Footer } from '../components/Footer.jsx'

const API_BASE_URL = 'http://localhost:5000/api'

export const AlumniCreateEvent = ({ onNavigate }) => {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('00:00')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('Online')
  const [category, setCategory] = useState('Other')
  const [eventLink, setEventLink] = useState('')
  const [maxAttendees, setMaxAttendees] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [messageType, setMessageType] = useState('success')

  const handleCreate = async () => {
    // Validation
    if (!title.trim() || !date || !description.trim()) {
      setMessage('Please fill in all required fields')
      setMessageType('error')
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setMessage('Please log in first')
        setMessageType('error')
        setLoading(false)
        return
      }

      const eventData = {
        title: title.trim(),
        description: description.trim(),
        date,
        time: time || '00:00',
        location: location.trim() || 'Online',
        category: category || 'Other',
        eventLink: eventLink.trim() || null,
        maxAttendees: maxAttendees ? parseInt(maxAttendees) : null,
        tags: []
      }

      const response = await fetch(`${API_BASE_URL}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(eventData)
      })

      const result = await response.json()

      if (result.success) {
        setMessage(`Event "${title}" created successfully! It will now appear on the Events page for all students.`)
        setMessageType('success')
        // Reset form
        setTitle('')
        setDate('')
        setTime('00:00')
        setDescription('')
        setLocation('Online')
        setCategory('Other')
        setEventLink('')
        setMaxAttendees('')
        // Redirect after 2 seconds
        setTimeout(() => onNavigate('alumni-events-manage'), 2000)
      } else {
        setMessage(result.message || 'Failed to create event')
        setMessageType('error')
      }
    } catch (err) {
      console.error('Error creating event:', err)
      setMessage('Network error. Please try again.')
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar onNavigate={onNavigate} />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Create Event</h1>
              <p className="text-gray-600 text-sm mt-1">Your event will be visible to all students</p>
            </div>
            <div>
              <div className="flex gap-2">
                <button onClick={() => onNavigate('alumni-events-manage')} className="px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">📊 Manage Events</button>
                <button onClick={() => onNavigate('alumni-dashboard')} className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200">← Back to Dashboard</button>
              </div>
            </div>
          </div>

          {message && (
            <div className={`mb-4 p-3 rounded ${messageType === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {message}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Title *</label>
              <input 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="e.g., Web Development Workshop" 
                className="w-full p-2 border rounded focus:ring-2 focus:ring-purple-500 outline-none" 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input 
                  type="date"
                  value={date} 
                  onChange={(e) => setDate(e.target.value)} 
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-purple-500 outline-none" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <input 
                  type="time"
                  value={time} 
                  onChange={(e) => setTime(e.target.value)} 
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-purple-500 outline-none" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-purple-500 outline-none"
                >
                  <option>Webinar</option>
                  <option>Networking</option>
                  <option>Workshop</option>
                  <option>Conference</option>
                  <option>Mentoring Session</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Attendees</label>
                <input 
                  type="number"
                  value={maxAttendees} 
                  onChange={(e) => setMaxAttendees(e.target.value)} 
                  placeholder="Leave empty for unlimited"
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-purple-500 outline-none" 
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input 
                value={location} 
                onChange={(e) => setLocation(e.target.value)} 
                placeholder="e.g., Online, New York, Hall A" 
                className="w-full p-2 border rounded focus:ring-2 focus:ring-purple-500 outline-none" 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Link (optional)</label>
              <input 
                type="url"
                value={eventLink} 
                onChange={(e) => setEventLink(e.target.value)} 
                placeholder="https://zoom.us/..." 
                className="w-full p-2 border rounded focus:ring-2 focus:ring-purple-500 outline-none" 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
              <textarea 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder="Describe what your event is about, what students will learn, etc." 
                className="w-full p-2 border rounded focus:ring-2 focus:ring-purple-500 outline-none h-32" 
              />
            </div>

            <div className="flex gap-2 pt-4">
              <button 
                onClick={handleCreate} 
                disabled={loading}
                className="bg-purple-600 text-white px-6 py-2 rounded hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Event'}
              </button>
              <button 
                onClick={() => onNavigate('alumni-dashboard')} 
                className="bg-gray-200 px-6 py-2 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
