import { ArrowLeft, MessageCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { BrandLogo } from '../components/BrandLogo.jsx'

const API_BASE_URL = 'http://localhost:5000/api'

export const StudentMentorsDashboard = ({ onNavigate }) => {
  const [mentors, setMentors] = useState([])
  const [loading, setLoading] = useState(true)
  const [messageModal, setMessageModal] = useState(null)
  const [messageForm, setMessageForm] = useState({ subject: '', body: '' })
  const [messageStatus, setMessageStatus] = useState(null)
  const [sending, setSending] = useState(false)
  const [ratingModal, setRatingModal] = useState(null)
  const [ratingForm, setRatingForm] = useState({ rating: 5, review: '' })
  const [ratingStatus, setRatingStatus] = useState(null)
  const [ratingSubmitting, setRatingSubmitting] = useState(false)

  useEffect(() => {
    fetchMentors()
  }, [])

  const getMentorshipProgressPercent = (mentor) => {
    const direct = Number(mentor?.mentorshipProgressPercent)
    if (Number.isFinite(direct)) return Math.max(0, Math.min(100, direct))

    const sessions = Number(mentor?.mentorshipSessionsCompleted || 0)
    const goal = Number(mentor?.mentorshipSessionsGoal || 10)
    if (!Number.isFinite(goal) || goal <= 0) return 0
    return Math.max(0, Math.min(100, Math.round((sessions / goal) * 100)))
  }

  const canRateMentorNow = (mentor) => {
    if (Number(mentor?.myMentorRating || 0) > 0) return false
    if (mentor?.canRateMentor) return true
    return getMentorshipProgressPercent(mentor) >= 100
  }

  const isMentorshipCompletedForRating = (mentor) => {
    const status = String(mentor?.status || '').toLowerCase()
    return status === 'completed' || getMentorshipProgressPercent(mentor) >= 100 || !!mentor?.canRateMentor
  }

  const hasSubmittedRating = (mentor) => {
    return Number(mentor?.myMentorRating || 0) > 0 && isMentorshipCompletedForRating(mentor)
  }

  useEffect(() => {
    const intervalId = setInterval(fetchMentors, 8000)

    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchMentors()
    }

    const onUserUpdated = () => fetchMentors()

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('user-updated', onUserUpdated)

    return () => {
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('user-updated', onUserUpdated)
    }
  }, [])

  const fetchMentors = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      if (!token) return
      const response = await fetch(`${API_BASE_URL}/mentorship/my-requests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const result = await response.json()
      if (result.success) {
        const activeMentors = (result.data || []).filter(r => {
          const status = String(r.status || '').toLowerCase()
          return status === 'accepted' || status === 'completed'
        })
        setMentors(activeMentors)
      }
    } catch (err) {
      console.error('Error fetching mentors:', err)
    } finally {
      setLoading(false)
    }
  }

  const openMessageModal = (mentor) => {
    try {
      localStorage.setItem('preferredMentorChatId', String(mentor?.mentorId || mentor?._id || mentor?.id || ''))
      localStorage.setItem('preferredMentorChatName', String(mentor?.mentorName || mentor?.name || 'Mentor'))
    } catch (_err) {}
    onNavigate('student-messages')
  }

  const openRatingModal = (mentor) => {
    if (!canRateMentorNow(mentor)) {
      return
    }

    setRatingModal(mentor)
    setRatingForm({
      rating: 5,
      review: ''
    })
    setRatingStatus(null)
  }

  const submitRating = async () => {
    if (!ratingModal) return

    try {
      setRatingSubmitting(true)
      const token = localStorage.getItem('token')
      if (!token) {
        setRatingStatus({ type: 'error', text: 'Please log in to submit rating' })
        return
      }

      const payload = {
        mentorId: ratingModal.mentorId,
        rating: Number(ratingForm.rating),
        review: ratingForm.review
      }

      const parseResponse = async (response) => {
        const raw = await response.text().catch(() => '')
        try {
          return JSON.parse(raw)
        } catch (_err) {
          return {
            success: false,
            message: raw || `Request failed with status ${response.status}`
          }
        }
      }

      let response = await fetch(`${API_BASE_URL}/mentorship/rate-mentor`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      let result = await parseResponse(response)

      if (response.status === 404) {
        // compatibility fallback endpoint
        response = await fetch(`${API_BASE_URL}/mentorship/rate`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })
        result = await parseResponse(response)
      }

      if (response.ok && result.success) {
        setRatingStatus({ type: 'success', text: 'Rating saved successfully' })
        setMentors((prev) => prev.map((m) => {
          if (String(m.mentorId || '') !== String(ratingModal.mentorId || '')) return m
          return {
            ...m,
            myMentorRating: Number(result.data?.myRating || ratingForm.rating),
            myMentorReview: ratingForm.review,
            mentorAvgRating: Number(result.data?.mentorAvgRating || m.mentorAvgRating || 0),
            mentorRatingCount: Number(result.data?.mentorRatingCount || m.mentorRatingCount || 0)
          }
        }))
      } else {
        setRatingStatus({ type: 'error', text: result.message || 'Failed to save rating' })
      }
    } catch (err) {
      console.error('Error submitting rating:', err)
      setRatingStatus({ type: 'error', text: `Network error: ${err.message || 'Please try again.'}` })
    } finally {
      setRatingSubmitting(false)
    }
  }

  const sendMessage = async () => {
    if (!messageModal) return
    if (!messageForm.body.trim()) {
      setMessageStatus({ type: 'error', text: 'Message is required' })
      return
    }

    try {
      setSending(true)
      const token = localStorage.getItem('token')
      if (!token) {
        setMessageStatus({ type: 'error', text: 'Please log in to send a message' })
        return
      }

      const response = await fetch(`${API_BASE_URL}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          targetUserId: messageModal.mentorId,
          subject: messageForm.subject,
          body: messageForm.body
        })
      })

      const result = await response.json()
      if (result.success) {
        setMessageStatus({ type: 'success', text: 'Message sent successfully' })
        setMessageForm({ subject: '', body: '' })
      } else {
        setMessageStatus({ type: 'error', text: result.message || 'Failed to send message' })
      }
    } catch (err) {
      console.error('Error sending message:', err)
      setMessageStatus({ type: 'error', text: 'Network error. Please try again.' })
    } finally {
      setSending(false)
    }
  }

  const totalMentors = mentors.length
  const avgMentorRating = totalMentors > 0
    ? (mentors.reduce((sum, mentor) => sum + Number(mentor.mentorAvgRating || 0), 0) / totalMentors).toFixed(1)
    : '0.0'
  const ratedMentorsCount = mentors.filter(mentor => Number(mentor.myMentorRating || 0) > 0).length

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-blue-50 to-indigo-50">
      <div className="bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="px-4 py-3 md:py-4">
          <BrandLogo subtitle="Student" />
        </div>
      </div>

      <div className="bg-gradient-to-r from-indigo-700 via-blue-700 to-violet-700 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
          <button
            onClick={() => onNavigate('student-dashboard')}
            className="flex items-center gap-2 text-blue-100 hover:text-white font-semibold"
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </button>

          <div className="mt-4 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">👥 My Mentors</h1>
              <p className="text-blue-100 mt-2">Track mentorships, message active mentors, and rate once after completion.</p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <div className="bg-white/15 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20">
                <p className="text-xs text-blue-100">Active Mentors</p>
                <p className="text-xl font-bold">{totalMentors}</p>
              </div>
              <div className="bg-white/15 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20">
                <p className="text-xs text-blue-100">Avg Mentor Rating</p>
                <p className="text-xl font-bold">{avgMentorRating}</p>
              </div>
              <div className="bg-white/15 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20">
                <p className="text-xs text-blue-100">You Rated</p>
                <p className="text-xl font-bold">{ratedMentorsCount}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center text-gray-600 bg-white rounded-xl border border-blue-100 p-8 shadow-sm">Loading mentors...</div>
        ) : mentors.length === 0 ? (
          <div className="bg-white border border-blue-200 rounded-xl p-8 text-center shadow-sm">
            <p className="text-gray-700 text-lg font-semibold mb-2">No active mentors yet</p>
            <p className="text-sm text-gray-500 mb-4">Find a mentor to start your mentorship journey.</p>
            <button
              onClick={() => onNavigate('mentor-discovery')}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm"
            >
              Find New Mentors
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mentors.map(mentor => (
              <div key={mentor._id || mentor.id} className="bg-white rounded-2xl shadow-md p-6 border border-indigo-100 hover:shadow-xl transition">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">{mentor.mentorName || 'Mentor'}</h3>
                    <p className="text-sm text-gray-500">
                      {String(mentor.status || '').toLowerCase() === 'completed' ? 'Completed Mentorship' : 'Active Mentorship'}
                    </p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                    String(mentor.status || '').toLowerCase() === 'completed'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {String(mentor.status || '').toLowerCase() === 'completed' ? 'Completed' : 'Accepted'}
                  </span>
                </div>

                {mentor.topic && (
                  <p className="text-sm text-gray-700 mb-2"><span className="font-semibold text-indigo-700">Topic:</span> {mentor.topic}</p>
                )}
                {mentor.note && (
                  <p className="text-sm text-gray-600 line-clamp-2 bg-indigo-50 rounded-lg p-2.5">{mentor.note}</p>
                )}

                <div className="mt-4 text-xs text-gray-700 space-y-1.5 border-t border-gray-100 pt-3">
                  <p>⭐ Mentor Avg Rating: <span className="font-semibold">{Number(mentor.mentorAvgRating || 0).toFixed(1)}</span> ({mentor.mentorRatingCount || 0})</p>
                  <p>
                    📈 Mentorship Progress: <span className="font-semibold text-blue-700">{getMentorshipProgressPercent(mentor)}%</span>
                  </p>
                  {hasSubmittedRating(mentor) ? (
                    <p>Your Rating: <span className="font-semibold text-indigo-700">{mentor.myMentorRating}/5</span></p>
                  ) : (
                    <p>You have not rated this mentor yet.</p>
                  )}
                </div>

                <button
                  onClick={() => openMessageModal(mentor)}
                  disabled={String(mentor.status || '').toLowerCase() !== 'accepted'}
                  className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-semibold disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed"
                >
                  <MessageCircle size={16} />
                  {String(mentor.status || '').toLowerCase() === 'accepted' ? 'Message Mentor' : 'Mentorship Completed'}
                </button>
                <button
                  onClick={() => openRatingModal(mentor)}
                  disabled={hasSubmittedRating(mentor) || !canRateMentorNow(mentor)}
                  className="mt-2 w-full px-4 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 text-sm font-semibold disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed"
                >
                  {hasSubmittedRating(mentor)
                    ? 'Rating Submitted'
                    : canRateMentorNow(mentor)
                      ? 'Rate Mentor'
                      : 'Reach 100% to rate'}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {messageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-2">Message {messageModal.mentorName || 'Mentor'}</h2>
            <p className="text-sm text-gray-600 mb-4">Send a direct message to your mentor.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Subject (optional)</label>
                <input
                  type="text"
                  value={messageForm.subject}
                  onChange={(e) => setMessageForm({ ...messageForm, subject: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Message</label>
                <textarea
                  value={messageForm.body}
                  onChange={(e) => setMessageForm({ ...messageForm, body: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {messageStatus && (
                <div className={`p-3 rounded-lg text-sm ${messageStatus.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {messageStatus.text}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setMessageModal(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={sendMessage}
                  disabled={sending}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ratingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-2">Rate {ratingModal.mentorName || 'Mentor'}</h2>
            <p className="text-sm text-gray-600 mb-4">Share your mentorship feedback. You can submit rating only once.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Rating</label>
                <select
                  value={ratingForm.rating}
                  onChange={(e) => setRatingForm({ ...ratingForm, rating: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={5}>5 - Excellent</option>
                  <option value={4}>4 - Very Good</option>
                  <option value={3}>3 - Good</option>
                  <option value={2}>2 - Fair</option>
                  <option value={1}>1 - Poor</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Review (optional)</label>
                <textarea
                  value={ratingForm.review}
                  onChange={(e) => setRatingForm({ ...ratingForm, review: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {ratingStatus && (
                <div className={`p-3 rounded-lg text-sm ${ratingStatus.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {ratingStatus.text}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setRatingModal(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={submitRating}
                  disabled={ratingSubmitting}
                  className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {ratingSubmitting ? 'Saving...' : 'Save Rating'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
