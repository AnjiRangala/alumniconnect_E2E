import React, { useState, useEffect } from 'react'
import { X, Award, MessageSquare } from 'lucide-react'

const STUDENT_BADGE_UI_MAP = {
  mentor_starter: {
    name: 'First Step',
    description: 'Started the mentorship journey',
    tasks: ['Send first mentorship request', 'Attend first mentor interaction']
  },
  active_mentor: {
    name: 'Skill Grower',
    description: 'Demonstrated strong skill improvement',
    tasks: ['Complete skill-building activities', 'Show progress in endorsed skills']
  },
  top_rated: {
    name: 'Project Builder',
    description: 'Built and shared impactful projects',
    tasks: ['Upload project details', 'Demonstrate practical implementation']
  },
  community_builder: {
    name: 'Community Contributor',
    description: 'Contributed positively to the student community',
    tasks: ['Help peers or juniors', 'Maintain positive collaboration']
  },
  event_host: {
    name: 'Event Achiever',
    description: 'Actively participated in events/webinars',
    tasks: ['Attend alumni event/webinar', 'Engage through queries or feedback']
  }
}

const normalizeBadgesForStudentAwarding = (badges = []) => {
  return (badges || []).map((badge) => {
    const ui = STUDENT_BADGE_UI_MAP[String(badge?.key || '').trim()]
    if (!ui) return badge
    return {
      ...badge,
      name: ui.name,
      description: ui.description,
      tasks: ui.tasks
    }
  })
}

export const EventManagementModal = ({ event, onClose, onUpdate }) => {
  const [attendees, setAttendees] = useState([])
  const [loadingAttendees, setLoadingAttendees] = useState(false)
  const [awardingBadge, setAwardingBadge] = useState(null)
  const [selectedAttendee, setSelectedAttendee] = useState(null)
  const [selectedBadge, setSelectedBadge] = useState(null)
  const [badgeMessage, setBadgeMessage] = useState('')
  const [badges, setBadges] = useState([])
  const [activeTab, setActiveTab] = useState('attendees')
  const [studentQueries, setStudentQueries] = useState([])
  const [answeringQuery, setAnsweringQuery] = useState(null)
  const [queryAnswer, setQueryAnswer] = useState('')
  const [completing, setCompleting] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    loadAttendees()
    loadBadges()
  }, [event])

  const loadAttendees = async () => {
    setLoadingAttendees(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      const res = await fetch(`http://localhost:5000/api/events/${event._id || event.id}/attendees`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const j = await res.json()
      if (j.success) {
        setAttendees(j.data.attendees || [])
        setStudentQueries(event.studentQueries || [])
      }
    } catch (err) {
      console.error('Failed to load attendees', err)
    } finally {
      setLoadingAttendees(false)
    }
  }

  const loadBadges = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/badges')
      const j = await res.json()
      if (j.success) {
        const normalizedBadges = normalizeBadgesForStudentAwarding(j.data || [])
        setBadges(normalizedBadges)
        if (normalizedBadges.length > 0) {
          setSelectedBadge(normalizedBadges[0])
        }
      }
    } catch (err) {
      console.error('Failed to load badges', err)
    }
  }

  const handleCompleteEvent = async () => {
    setCompleting(true)
    setMessage(null)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setMessage({ type: 'error', text: 'Authentication required' })
        setCompleting(false)
        return
      }

      const eventId = event._id || event.id
      if (!eventId) {
        setMessage({ type: 'error', text: 'Event ID not found' })
        setCompleting(false)
        return
      }

      console.log('Attempting to complete event:', { eventId, eventObject: event })

      const res = await fetch(`http://localhost:5000/api/events/${eventId}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('Response status:', res.status)

      if (!res.ok) {
        let errorText = 'Unknown error'
        try {
          errorText = await res.text()
        } catch (e) {
          errorText = 'Unable to parse error response'
        }
        console.error('Error response:', errorText)
        setMessage({ type: 'error', text: `Server error (${res.status}): ${errorText}` })
        setCompleting(false)
        return
      }

      let j
      try {
        j = await res.json()
      } catch (parseErr) {
        console.error('Failed to parse JSON response:', parseErr)
        setMessage({ type: 'error', text: `Failed to parse response: ${parseErr.message}` })
        setCompleting(false)
        return
      }

      console.log('Response data:', j)

      if (j.success) {
        setMessage({ type: 'success', text: 'Event completed successfully!' })
        setTimeout(() => {
          if (onUpdate) onUpdate()
          onClose()
        }, 1500)
      } else {
        setMessage({ type: 'error', text: j.message || 'Failed to complete event' })
      }
    } catch (err) {
      console.error('Error completing event:', err)
      setMessage({ type: 'error', text: `Network error: ${err.message}` })
    } finally {
      setCompleting(false)
    }
  }

  const handleAwardBadge = async () => {
    if (!selectedAttendee || !selectedBadge) {
      setMessage({ type: 'error', text: 'Please select an attendee and badge' })
      return
    }

    setAwardingBadge('pending')
    setMessage(null)

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setMessage({ type: 'error', text: 'Authentication required' })
        setAwardingBadge(null)
        return
      }

      const res = await fetch(`http://localhost:5000/api/events/${event._id || event.id}/award-badge`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          attendeeId: selectedAttendee._id || selectedAttendee.userId,
          badgeKey: selectedBadge.key,
          message: badgeMessage.trim() || null
        })
      })

      const j = await res.json()
      if (j.success) {
        setMessage({ type: 'success', text: `Badge "${selectedBadge.name}" awarded to ${selectedAttendee.userName}!` })
        setSelectedAttendee(null)
        setBadgeMessage('')
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: j.message || 'Failed to award badge' })
      }
    } catch (err) {
      console.error('Error awarding badge:', err)
      setMessage({ type: 'error', text: 'Network error' })
    } finally {
      setAwardingBadge(null)
    }
  }

  const handleAnswerQuery = async (queryIndex) => {
    if (!queryAnswer.trim()) {
      setMessage({ type: 'error', text: 'Answer cannot be empty' })
      return
    }

    setAnsweringQuery('pending')
    setMessage(null)

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setMessage({ type: 'error', text: 'Authentication required' })
        setAnsweringQuery(null)
        return
      }

      const res = await fetch(`http://localhost:5000/api/events/${event._id || event.id}/answer-query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          queryIndex,
          answer: queryAnswer
        })
      })

      const j = await res.json()
      if (j.success) {
        setMessage({ type: 'success', text: 'Answer posted successfully!' })
        setQueryAnswer('')
        setAnsweringQuery(null)
        loadAttendees()
        setTimeout(() => setMessage(null), 2000)
      } else {
        setMessage({ type: 'error', text: j.message || 'Failed to post answer' })
      }
    } catch (err) {
      console.error('Error posting answer:', err)
      setMessage({ type: 'error', text: 'Network error' })
    } finally {
      setAnsweringQuery(null)
    }
  }

  const isEventCompleted = event.status === 'completed'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
          <div>
            <h2 className="text-2xl font-bold">{event.title}</h2>
            <p className="text-sm text-gray-500 mt-1">
              Status: <span className={`font-semibold ${isEventCompleted ? 'text-green-600' : 'text-blue-600'}`}>
                {event.status?.toUpperCase()}
              </span>
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={24} />
          </button>
        </div>

        {/* Message Alert */}
        {message && (
          <div className={`mx-6 mt-4 p-3 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 p-6 border-b">
          <button
            onClick={() => setActiveTab('attendees')}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              activeTab === 'attendees'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            👥 Attendees ({attendees.length})
          </button>
          <button
            onClick={() => setActiveTab('badges')}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              activeTab === 'badges'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🏅 Award Badges
          </button>
          <button
            onClick={() => setActiveTab('queries')}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              activeTab === 'queries'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            💬 Questions ({studentQueries.length})
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Attendees Tab */}
          {activeTab === 'attendees' && (
            <div>
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-lg font-semibold text-gray-800 mb-2">Total Attendees: {attendees.length}</p>
                <p className="text-sm text-gray-600">Manage and award badges to your event participants</p>
              </div>

              {loadingAttendees ? (
                <p className="text-gray-500">Loading attendees...</p>
              ) : attendees.length === 0 ? (
                <p className="text-gray-500">No attendees registered for this event</p>
              ) : (
                <div className="space-y-3">
                  {attendees.map((attendee, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div>
                        <p className="font-semibold">{attendee.userName}</p>
                        <p className="text-sm text-gray-500">Registered: {new Date(attendee.registeredAt).toLocaleDateString()}</p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedAttendee(attendee)
                          setActiveTab('badges')
                        }}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm font-semibold"
                      >
                        Award Badge
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Award Badges Tab */}
          {activeTab === 'badges' && (
            <div>
              {selectedAttendee && (
                <div className="mb-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="font-semibold text-gray-800">Selected Attendee: {selectedAttendee.userName}</p>
                </div>
              )}

              {!selectedAttendee ? (
                <div className="text-center py-8">
                  <Award size={48} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">Select an attendee from the Attendees tab to award a badge</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Badge Selection */}
                  <div>
                    <label className="block text-sm font-semibold mb-3">Select Badge</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {badges.length > 0 ? (
                        badges.map(badge => (
                          <button
                            key={badge.key}
                            onClick={() => setSelectedBadge(badge)}
                            className={`p-4 rounded-lg border-2 transition cursor-pointer text-center ${
                              selectedBadge?.key === badge.key
                                ? 'border-blue-600 bg-blue-50'
                                : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                          >
                            <div className="text-3xl mb-2">🏅</div>
                            <p className="font-semibold text-sm">{badge.name}</p>
                            <p className="text-xs text-gray-600 mt-1">{badge.description}</p>
                          </button>
                        ))
                      ) : (
                        <p className="text-gray-500">No badges available</p>
                      )}
                    </div>
                  </div>

                  {/* Badge Details */}
                  {selectedBadge && (
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <h3 className="font-semibold mb-2">{selectedBadge.name}</h3>
                      <p className="text-sm text-gray-700 mb-2">{selectedBadge.description}</p>
                      {selectedBadge.tasks && selectedBadge.tasks.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-600 mb-1">Requirements:</p>
                          <ul className="text-xs text-gray-600 space-y-1">
                            {selectedBadge.tasks.map((task, i) => (
                              <li key={i}>• {task}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Message */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">Add a Message (Optional)</label>
                    <textarea
                      value={badgeMessage}
                      onChange={(e) => setBadgeMessage(e.target.value)}
                      placeholder="Write a congratulatory message or words of encouragement..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 resize-none"
                      rows="3"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setSelectedAttendee(null)}
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold"
                    >
                      Change Attendee
                    </button>
                    <button
                      onClick={handleAwardBadge}
                      disabled={awardingBadge || !selectedBadge}
                      className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {awardingBadge ? 'Awarding...' : 'Award Badge'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Queries Tab */}
          {activeTab === 'queries' && (
            <div>
              {studentQueries.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare size={48} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">No student queries yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {studentQueries.map((query, idx) => (
                    <div key={idx} className={`p-4 rounded-lg border ${
                      query.answer 
                        ? 'bg-green-50 border-green-200'
                        : 'bg-yellow-50 border-yellow-200'
                    }`}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800">{query.studentName}</p>
                          <p className="text-sm text-gray-600 mt-1">{query.question}</p>
                          <p className="text-xs text-gray-500 mt-2">Asked: {new Date(query.askedAt).toLocaleString()}</p>
                        </div>
                      </div>

                      {query.answer ? (
                        <div className="mt-3 p-3 bg-white rounded border-l-4 border-green-500">
                          <p className="text-xs font-semibold text-green-700 mb-1">Your Answer:</p>
                          <p className="text-sm text-gray-700">{query.answer}</p>
                          <p className="text-xs text-gray-500 mt-2">Answered: {new Date(query.answeredAt).toLocaleString()}</p>
                        </div>
                      ) : (
                        <div className="mt-3 space-y-3">
                          <textarea
                            placeholder="Write your answer here..."
                            value={answeringQuery === idx ? queryAnswer : ''}
                            onChange={(e) => {
                              setAnsweringQuery(idx)
                              setQueryAnswer(e.target.value)
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                            rows="3"
                          />
                          <button
                            onClick={() => handleAnswerQuery(idx)}
                            disabled={answeringQuery !== idx || !queryAnswer.trim()}
                            className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                          >
                            Post Answer
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {!isEventCompleted && (
          <div className="border-t p-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold"
            >
              Close
            </button>
            <button
              onClick={handleCompleteEvent}
              disabled={completing}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {completing ? 'Completing...' : '✅ Complete Event'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
