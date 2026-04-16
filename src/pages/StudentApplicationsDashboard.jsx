import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Navbar } from '../components/Navbar.jsx'
import { Footer } from '../components/Footer.jsx'

const API_BASE_URL = 'http://localhost:5000/api'

const statusClass = (status) => {
  const s = String(status || 'applied').toLowerCase()
  if (s === 'accepted') return 'bg-green-100 text-green-700'
  if (s === 'rejected') return 'bg-red-100 text-red-700'
  if (s === 'interview') return 'bg-purple-100 text-purple-700'
  if (s === 'shortlisted') return 'bg-blue-100 text-blue-700'
  return 'bg-yellow-100 text-yellow-700'
}

const progressOf = (status) => {
  const s = String(status || 'applied').toLowerCase()
  if (s === 'accepted' || s === 'rejected') return 100
  if (s === 'interview') return 80
  if (s === 'shortlisted') return 60
  return 25
}

const prettyStatus = (status) => {
  const s = String(status || 'applied').toLowerCase()
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const formatDate = (value) => {
  if (!value) return 'N/A'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return 'N/A'
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
}

export const StudentApplicationsDashboard = ({ onNavigate }) => {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [withdrawTarget, setWithdrawTarget] = useState(null)
  const [withdrawing, setWithdrawing] = useState(false)
  const [message, setMessage] = useState(null)

  const fetchApplications = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      if (!token) {
        setError('Please login to view applications')
        setApplications([])
        return
      }

      const res = await fetch(`${API_BASE_URL}/jobs/my-applications`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const j = await res.json()
      if (j.success) {
        setApplications(j.data || [])
        setError('')
      } else {
        setApplications([])
        setError(j.message || 'Failed to load applications')
      }
    } catch (err) {
      console.error('Error fetching applications', err)
      setApplications([])
      setError('Failed to load applications')
    } finally {
      setLoading(false)
    }
  }

  const withdrawApplication = async () => {
    if (!withdrawTarget) return

    setWithdrawing(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setMessage({ type: 'error', text: 'Please login to withdraw an application' })
        return
      }

      const response = await fetch(`${API_BASE_URL}/jobs/applications/${withdrawTarget.applicationId}/withdraw`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })

      const result = await response.json()
      if (result.success) {
        setMessage({ type: 'success', text: 'Application withdrawn successfully' })
        setWithdrawTarget(null)
        await fetchApplications()
      } else {
        setMessage({ type: 'error', text: result.message || 'Failed to withdraw application' })
      }
    } catch (err) {
      console.error('Error withdrawing application', err)
      setMessage({ type: 'error', text: 'Failed to withdraw application' })
    } finally {
      setWithdrawing(false)
    }
  }

  useEffect(() => {
    fetchApplications()
    const interval = setInterval(fetchApplications, 10000)
    return () => clearInterval(interval)
  }, [])

  const summary = useMemo(() => {
    const total = applications.length
    const accepted = applications.filter(a => String(a.status).toLowerCase() === 'accepted').length
    const interview = applications.filter(a => String(a.status).toLowerCase() === 'interview').length
    const shortlisted = applications.filter(a => String(a.status).toLowerCase() === 'shortlisted').length
    return { total, accepted, interview, shortlisted }
  }, [applications])

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar onNavigate={onNavigate} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        {message && (
          <div className={`mb-6 p-4 rounded-lg font-semibold ${message.type === 'success' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
            {message.text}
          </div>
        )}

        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-lg mb-6">
          <button
            onClick={() => onNavigate('student-dashboard')}
            className="flex items-center gap-2 text-blue-100 hover:text-white font-semibold text-sm mb-4"
          >
            <ArrowLeft size={18} />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="text-3xl font-bold">📋 My Applications</h1>
          <p className="text-blue-100 mt-1">Track your applied jobs and progress status</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow border"><p className="text-sm text-gray-500">Applied</p><p className="text-2xl font-bold text-blue-700">{summary.total}</p></div>
          <div className="bg-white rounded-lg p-4 shadow border"><p className="text-sm text-gray-500">Shortlisted</p><p className="text-2xl font-bold text-indigo-700">{summary.shortlisted}</p></div>
          <div className="bg-white rounded-lg p-4 shadow border"><p className="text-sm text-gray-500">Interview</p><p className="text-2xl font-bold text-purple-700">{summary.interview}</p></div>
          <div className="bg-white rounded-lg p-4 shadow border"><p className="text-sm text-gray-500">Accepted</p><p className="text-2xl font-bold text-green-700">{summary.accepted}</p></div>
        </div>

        {loading && <div className="bg-white rounded-lg p-6 shadow border text-gray-600">Loading applications...</div>}
        {!loading && error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">{error}</div>}

        {!loading && !error && applications.length === 0 && (
          <div className="bg-white rounded-lg p-8 shadow border text-center">
            <p className="text-gray-600 mb-4">No applications yet.</p>
            <button onClick={() => onNavigate('jobs')} className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">
              Browse Job Openings
            </button>
          </div>
        )}

        {!loading && !error && applications.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {applications.map((app) => {
              const status = String(app.status || 'applied').toLowerCase()
              const progress = progressOf(status)
              const jobTitle = app?.jobId?.title || 'Job'
              const company = app?.jobId?.company || 'Company'
              return (
                <div key={app._id} className="bg-white rounded-lg p-4 shadow border border-gray-200">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-gray-800">{jobTitle}</h3>
                      <p className="text-sm text-gray-600">{company}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusClass(status)}`}>
                      {prettyStatus(status)}
                    </span>
                  </div>

                  <div className="mt-3">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-2 rounded-full ${status === 'rejected' ? 'bg-red-500' : status === 'accepted' ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }} />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Progress: {progress}%</p>
                    <p className="text-xs text-gray-500">Updated: {formatDate(app.updatedAt || app.appliedAt)}</p>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                    <p className="text-xs text-gray-600"><span className="font-semibold">Phone:</span> {app.phoneNumber || 'N/A'}</p>
                    <p className="text-xs text-gray-600"><span className="font-semibold">Resume:</span> {app.resumeFileName || 'Uploaded'}</p>
                    {app.statementOfPurpose && (
                      <p className="text-xs text-gray-600 line-clamp-3"><span className="font-semibold">SOP:</span> {app.statementOfPurpose}</p>
                    )}
                  </div>

                  {status !== 'accepted' && status !== 'rejected' && (
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => setWithdrawTarget({ applicationId: app._id, jobTitle })}
                        className="w-full px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 font-semibold text-sm"
                      >
                        Withdraw Application
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>

      {withdrawTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Withdraw Application?</h3>
            <p className="text-sm text-gray-600 mb-5">
              Are you sure you want to withdraw your application for <span className="font-semibold">{withdrawTarget.jobTitle}</span>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setWithdrawTarget(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold"
                disabled={withdrawing}
              >
                Cancel
              </button>
              <button
                onClick={withdrawApplication}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 font-semibold disabled:bg-red-400"
                disabled={withdrawing}
              >
                {withdrawing ? 'Withdrawing...' : 'Withdraw'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}
