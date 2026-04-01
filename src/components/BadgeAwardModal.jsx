import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'

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

export const BadgeAwardModal = ({ mentees, onClose, onAward }) => {
  const [selectedMentee, setSelectedMentee] = useState(null)
  const [selectedBadge, setSelectedBadge] = useState(null)
  const [message, setMessage] = useState('')
  const [badges, setBadges] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    loadBadges()
  }, [])

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
      setError('Failed to load available badges')
    }
  }

  const handleAward = async () => {
    if (!selectedMentee) {
      setError('Please select a mentee')
      return
    }
    if (!selectedBadge) {
      setError('Please select a badge')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setError('Authentication required')
        setLoading(false)
        return
      }

      const res = await fetch('http://localhost:5000/api/badges/award', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          targetUserId: selectedMentee._id || selectedMentee.id,
          badgeKey: selectedBadge.key,
          message: message.trim() || null
        })
      })

      const j = await res.json()
      if (j.success) {
        setSuccess(true)
        setTimeout(() => {
          if (onAward) onAward()
          onClose()
        }, 1500)
      } else {
        setError(j.message || 'Failed to award badge')
      }
    } catch (err) {
      console.error('Error awarding badge:', err)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
          <h2 className="text-2xl font-bold">🏅 Award Badge to Student</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {success ? (
            <div className="bg-green-50 border border-green-200 p-6 rounded-lg text-center">
              <p className="text-2xl mb-2">✅ Badge Awarded Successfully!</p>
              <p className="text-gray-600">{selectedMentee?.fullName} received the {selectedBadge?.name} badge</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg text-red-700">
                  {error}
                </div>
              )}

              {/* Select Mentee */}
              <div>
                <label className="block text-sm font-semibold mb-2">Select Mentee</label>
                <select
                  value={selectedMentee ? (selectedMentee._id || selectedMentee.id) : ''}
                  onChange={(e) => {
                    const id = e.target.value
                    const mentee = mentees.find(m => (m._id || m.id) === id)
                    setSelectedMentee(mentee)
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Choose a mentee --</option>
                  {mentees && mentees.length > 0 ? (
                    mentees.map(m => (
                      <option key={m._id || m.id} value={m._id || m.id}>
                        {m.fullName}
                      </option>
                    ))
                  ) : (
                    <option disabled>No mentees available</option>
                  )}
                </select>
              </div>

              {/* Select Badge */}
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
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write a congratulatory message or words of encouragement..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows="4"
                />
                <p className="text-xs text-gray-500 mt-1">{message.length}/500 characters</p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAward}
                  disabled={loading || !selectedMentee || !selectedBadge}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'Awarding...' : 'Award Badge'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
