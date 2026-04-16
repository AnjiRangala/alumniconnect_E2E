import React, { useState, useEffect } from 'react'
import { Navbar } from '../components/Navbar.jsx'
import { Footer } from '../components/Footer.jsx'
import { ArrowLeft, ChevronDown, X, Download } from 'lucide-react'

const API_BASE_URL = 'http://localhost:5000/api'

export const AlumniJobApplications = ({ onNavigate }) => {
  const [postedJobs, setPostedJobs] = useState([])
  const [selectedJobId, setSelectedJobId] = useState(null)
  const [applications, setApplications] = useState({})
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)
  const [messageType, setMessageType] = useState('success')
  const [expandedApp, setExpandedApp] = useState(null)
  const [updatingAppId, setUpdatingAppId] = useState(null)
  const [newStatus, setNewStatus] = useState({})
  const [newNotes, setNewNotes] = useState({})
  const [selectedStudentProfile, setSelectedStudentProfile] = useState(null)
  const [selectedApplicationForProfile, setSelectedApplicationForProfile] = useState(null)

  const getLinkedInHref = (url) => {
    if (!url) return null
    const trimmed = String(url).trim()
    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    try {
      const parsed = new URL(normalized)
      if (!parsed.hostname.toLowerCase().includes('linkedin.com')) return null
      return parsed.toString()
    } catch {
      return null
    }
  }
  const [studentProfiles, setStudentProfiles] = useState({})
  const [loadingProfile, setLoadingProfile] = useState(false)

  useEffect(() => {
    fetchPostedJobs()
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      fetchPostedJobs(true)
      if (selectedJobId) {
        fetchApplicationsForJob(selectedJobId, true)
      }
    }, 12000)

    return () => clearInterval(interval)
  }, [selectedJobId])

  const fetchPostedJobs = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setMessageType('error')
        setMessage('Authentication required')
        setLoading(false)
        return
      }

      const response = await fetch(`${API_BASE_URL}/jobs/posted/by-me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const result = await response.json()
      if (result.success) {
        const jobs = result.data || []
        setPostedJobs(jobs)
        if (jobs.length > 0) {
          setSelectedJobId(prevSelected => {
            if (prevSelected && jobs.some(j => j._id === prevSelected)) return prevSelected
            return jobs[0]._id
          })
        } else {
          setSelectedJobId(null)
        }
      } else {
        setMessageType('error')
        setMessage(result.message || 'Failed to fetch jobs')
      }
    } catch (error) {
      console.error('Error fetching posted jobs:', error)
      setMessageType('error')
      setMessage('Network error. Please check if server is running.')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const fetchApplicationsForJob = async (jobId, forceRefresh = false) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      if (applications[jobId] && !forceRefresh) return

      const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/applications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const result = await response.json()
      if (result.success) {
        setApplications(prev => ({
          ...prev,
          [jobId]: result.data.applications || []
        }))
      } else {
        setMessageType('error')
        setMessage(result.message || 'Failed to fetch applications')
      }
    } catch (error) {
      console.error('Error fetching applications:', error)
      setMessageType('error')
      setMessage('Network error')
    }
  }

  const fetchStudentProfile = async (studentId, applicationContext = null) => {
    setSelectedApplicationForProfile(applicationContext)

    if (studentProfiles[studentId]) {
      setSelectedStudentProfile(studentProfiles[studentId])
      return
    }

    setLoadingProfile(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch(`${API_BASE_URL}/students/${studentId}/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const result = await response.json()
      if (result.success) {
        setStudentProfiles(prev => ({
          ...prev,
          [studentId]: result.data
        }))
        setSelectedStudentProfile(result.data)
      } else {
        setMessageType('error')
        setMessage('Failed to fetch student profile')
        setTimeout(() => setMessage(null), 3000)
      }
    } catch (error) {
      console.error('Error fetching student profile:', error)
      setMessageType('error')
      setMessage('Network error')
      setTimeout(() => setMessage(null), 3000)
    } finally {
      setLoadingProfile(false)
    }
  }

  const fetchResumePayload = async (studentId) => {
    const token = localStorage.getItem('token')
    if (!token) return null

    const response = await fetch(`${API_BASE_URL}/profile/resume/${studentId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      const rawText = await response.text()
      const hint = rawText?.startsWith('<!DOCTYPE') ? 'Server returned HTML instead of API JSON' : 'Invalid server response'
      throw new Error(hint)
    }

    const result = await response.json()
    if (!response.ok || !result.success || !result.data?.base64) {
      throw new Error(result?.message || 'Resume not found')
    }

    return result.data
  }

  const base64ToPdfBlobUrl = (base64) => {
    const cleanBase64 = String(base64 || '').replace(/\s/g, '')
    const byteCharacters = atob(cleanBase64)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: 'application/pdf' })
    return URL.createObjectURL(blob)
  }

  const resolveResumeData = async (studentId, fileName, fallbackBase64 = null) => {
    const normalizedFallback = String(fallbackBase64 || '').trim()
    if (normalizedFallback) {
      const cleanBase64 = normalizedFallback.includes(',') ? normalizedFallback.split(',')[1] : normalizedFallback
      return {
        base64: cleanBase64,
        fileName: fileName || 'resume.pdf'
      }
    }

    return fetchResumePayload(studentId)
  }

  const downloadResume = async (studentId, fileName, fallbackBase64 = null) => {
    try {
      const resumeData = await resolveResumeData(studentId, fileName, fallbackBase64)
      if (!resumeData) return

      const pdfUrl = base64ToPdfBlobUrl(resumeData.base64)
      const link = document.createElement('a')
      link.href = pdfUrl
      link.download = resumeData.fileName || fileName || 'resume.pdf'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 60000)
    } catch (error) {
      console.error('Error downloading resume:', error)
      setMessageType('error')
      setMessage('Failed to download resume')
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const viewResume = async (studentId, fileName, fallbackBase64 = null) => {
    let previewWindow = null
    try {
      // Open first (direct user gesture), then load resume to avoid popup blocking.
      previewWindow = window.open('', '_blank')
      if (!previewWindow) {
        setMessageType('error')
        setMessage('Popup blocked. Please allow popups to view resume.')
        setTimeout(() => setMessage(null), 3000)
        return
      }

      previewWindow.document.write('<p style="font-family:sans-serif;padding:16px;">Loading resume...</p>')

      const resumeData = await resolveResumeData(studentId, fileName, fallbackBase64)
      if (!resumeData) return

      const pdfUrl = base64ToPdfBlobUrl(resumeData.base64)
      previewWindow.location.href = pdfUrl
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 60000)
    } catch (error) {
      if (previewWindow && !previewWindow.closed) {
        previewWindow.close()
      }
      console.error('Error viewing resume:', error)
      setMessageType('error')
      setMessage('Failed to open resume')
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const handleJobSelect = (jobId) => {
    setSelectedJobId(jobId)
    if (!applications[jobId]) {
      fetchApplicationsForJob(jobId)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'shortlisted':
        return 'bg-blue-100 text-blue-800'
      case 'interview':
        return 'bg-purple-100 text-purple-800'
      case 'applied':
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  const handleUpdateStatus = async (jobId, applicationId, newAppStatus, notes) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      setUpdatingAppId(applicationId)

      const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/applications/${applicationId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: newAppStatus,
          notes: notes
        })
      })

      const result = await response.json()
      if (result.success) {
        setApplications(prev => ({
          ...prev,
          [jobId]: (prev[jobId] || []).map(app =>
            app._id === applicationId ? result.data : app
          )
        }))

        setMessageType('success')
        setMessage('Application status updated successfully!')
        setExpandedApp(null)
        setNewStatus({})
        setNewNotes({})

        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessageType('error')
        setMessage(result.message || 'Failed to update status')
        setTimeout(() => setMessage(null), 3000)
      }
    } catch (error) {
      console.error('Error updating application:', error)
      setMessageType('error')
      setMessage('Network error')
      setTimeout(() => setMessage(null), 3000)
    } finally {
      setUpdatingAppId(null)
    }
  }

  const handleDeleteJob = async (jobId) => {
    if (!confirm('Are you sure you want to delete this job posting? This will also delete all applications for this job.')) return

    try {
      const token = localStorage.getItem('token')
      if (!token) return

      console.log(`🗑️ Deleting job: ${jobId}`);

      const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const result = await response.json()
      console.log('Delete response:', result);

      if (result.success) {
        console.log('✅ Job deleted successfully, updating UI...');
        
        setPostedJobs(prev => {
          const updated = prev.filter(j => j._id !== jobId);
          console.log('Updated posted jobs:', updated);
          return updated;
        });
        
        if (selectedJobId === jobId) {
          setSelectedJobId(null);
        }

        setMessageType('success')
        setMessage('Job posting and all its applications deleted successfully')
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessageType('error')
        setMessage(result.message || 'Failed to delete job')
        setTimeout(() => setMessage(null), 3000)
      }
    } catch (error) {
      console.error('Error deleting job:', error)
      setMessageType('error')
      setMessage('Network error')
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const handleDeleteAllApplications = async (jobId) => {
    if (!confirm('Are you sure you want to delete ALL applications for this job? This action cannot be undone.')) return

    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/applications`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const result = await response.json()
      if (result.success) {
        setApplications(prev => ({
          ...prev,
          [jobId]: []
        }))

        setMessageType('success')
        setMessage(`${result.data.deletedCount} application(s) deleted successfully`)
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessageType('error')
        setMessage(result.message || 'Failed to delete applications')
        setTimeout(() => setMessage(null), 3000)
      }
    } catch (error) {
      console.error('Error deleting applications:', error)
      setMessageType('error')
      setMessage('Network error')
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const STATUS_FLOW = ['applied', 'shortlisted', 'interview', 'accepted', 'rejected']

  const getStatusOptions = (currentStatus) => {
    const normalizedCurrent = String(currentStatus || 'applied').toLowerCase()
    const currentIndex = STATUS_FLOW.indexOf(normalizedCurrent)

    if (currentIndex === -1) return STATUS_FLOW

    // Keep status progression intuitive: current stage first, then forward stages.
    // If a candidate is already accepted/rejected, keep it fixed to avoid accidental rollback.
    if (normalizedCurrent === 'accepted' || normalizedCurrent === 'rejected') {
      return [normalizedCurrent]
    }

    return STATUS_FLOW.slice(currentIndex)
  }

  const currentJobApplications = applications[selectedJobId] || []
  const selectedJob = postedJobs.find(j => j._id === selectedJobId)

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar onNavigate={onNavigate} />

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => onNavigate('alumni-dashboard')}
            className="flex items-center gap-2 text-blue-100 hover:text-white font-semibold text-sm mb-4"
          >
            <ArrowLeft size={18} />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="text-3xl md:text-4xl font-bold">📋 Job Applications</h1>
          <p className="text-blue-100 mt-2">Manage and review applications for your job postings</p>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        {message && (
          <div className={`mb-4 p-4 rounded-lg font-semibold flex justify-between items-center ${messageType === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            <span>{message}</span>
            <button onClick={() => setMessage(null)} className="text-xl">×</button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading your job postings...</p>
          </div>
        ) : postedJobs.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600 mb-4">You haven't posted any jobs yet.</p>
            <button
              onClick={() => onNavigate('alumni-post-job')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              Post a Job
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Jobs List */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <h2 className="text-lg font-bold mb-4 text-gray-800">Your Posted Jobs</h2>
              <div className="space-y-2">
                {postedJobs.map(job => (
                  <button
                    key={job._id}
                    onClick={() => handleJobSelect(job._id)}
                    className={`w-full text-left p-3 rounded-lg border transition ${
                      selectedJobId === job._id
                        ? 'bg-blue-100 border-blue-500'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <h3 className="font-semibold text-gray-800 truncate">{job.title}</h3>
                    <p className="text-xs text-gray-600 truncate">{job.company}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-gray-500">{job.jobType}</span>
                      <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full font-semibold">
                        {job.applicationCount || 0} apps
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Applications List */}
            <div className="lg:col-span-2">
              {selectedJob && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800">{selectedJob.title}</h2>
                      <p className="text-gray-600">{selectedJob.company}</p>
                      <div className="flex gap-2 mt-2">
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">{selectedJob.jobType}</span>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">📍 {selectedJob.location}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {currentJobApplications.length > 0 && (
                        <button
                          onClick={() => handleDeleteAllApplications(selectedJob._id)}
                          className="px-3 py-1 bg-orange-100 text-orange-600 rounded hover:bg-orange-200 text-sm font-semibold"
                        >
                          Clear All Apps
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteJob(selectedJob._id)}
                        className="px-3 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 text-sm font-semibold"
                      >
                        Delete Job
                      </button>
                    </div>
                  </div>

                  <p className="text-gray-600 mb-4 text-sm">{selectedJob.description}</p>

                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-gray-800 mb-2">Total Applications: {currentJobApplications.length}</h3>
                    <div className="flex gap-2 flex-wrap">
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                        Applied: {currentJobApplications.filter(a => a.status === 'applied').length}
                      </span>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        Shortlisted: {currentJobApplications.filter(a => a.status === 'shortlisted').length}
                      </span>
                      <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                        Interview: {currentJobApplications.filter(a => a.status === 'interview').length}
                      </span>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        Accepted: {currentJobApplications.filter(a => a.status === 'accepted').length}
                      </span>
                      <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                        Rejected: {currentJobApplications.filter(a => a.status === 'rejected').length}
                      </span>
                    </div>
                  </div>

                  {currentJobApplications.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No applications yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {currentJobApplications.map(app => (
                        <div key={app._id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-start cursor-pointer" onClick={() => setExpandedApp(expandedApp === app._id ? null : app._id)}>
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-800">{app.studentName}</h4>
                              <p className="text-sm text-gray-600">{app.studentEmail}</p>
                              <p className="text-xs text-gray-500 mt-1">Applied: {new Date(app.appliedAt).toLocaleDateString()}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-3 py-1 rounded-full font-semibold ${getStatusColor(app.status)}`}>
                                {app.status?.charAt(0).toUpperCase() + app.status?.slice(1)}
                              </span>
                              <ChevronDown size={18} className={`text-gray-400 transition ${expandedApp === app._id ? 'rotate-180' : ''}`} />
                            </div>
                          </div>

                          {expandedApp === app._id && (
                            <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                              {/* View Student Profile Button */}
                              <button
                                onClick={() => fetchStudentProfile(app.studentId, app)}
                                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-semibold transition"
                              >
                                👤 View Student Profile & Skills
                              </button>

                              {app.notes && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-700 mb-1">Candidate's Notes:</p>
                                  <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{app.notes}</p>
                                </div>
                              )}

                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                                <p className="text-xs text-gray-700"><span className="font-semibold">Phone:</span> {app.phoneNumber || 'N/A'}</p>
                                {app.resumeFileName && (
                                  <p className="text-xs text-gray-700"><span className="font-semibold">Resume:</span> {app.resumeFileName}</p>
                                )}
                                {app.statementOfPurpose && (
                                  <p className="text-xs text-gray-700"><span className="font-semibold">Statement of Purpose:</span> {app.statementOfPurpose}</p>
                                )}
                              </div>

                              <div>
                                <label className="text-xs font-semibold text-gray-700 mb-2 block">Update Status</label>
                                <select
                                  value={newStatus[app._id] || app.status}
                                  onChange={(e) => setNewStatus(prev => ({ ...prev, [app._id]: e.target.value }))}
                                  className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  {getStatusOptions(app.status).map((status) => (
                                    <option key={status} value={status}>
                                      {status.charAt(0).toUpperCase() + status.slice(1)}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="text-xs font-semibold text-gray-700 mb-2 block">Add Notes</label>
                                <textarea
                                  value={newNotes[app._id] || app.alumniNotes || ''}
                                  onChange={(e) => setNewNotes(prev => ({ ...prev, [app._id]: e.target.value }))}
                                  placeholder="Add feedback or notes for this candidate..."
                                  rows={3}
                                  className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                />
                              </div>

                              {app.alumniNotes && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-700 mb-1">Previous Notes:</p>
                                  <p className="text-sm text-gray-600 bg-blue-50 p-2 rounded border-l-2 border-blue-400">{app.alumniNotes}</p>
                                </div>
                              )}

                              <div className="flex gap-2">
                                <button
                                  onClick={() => setExpandedApp(null)}
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm font-semibold hover:bg-gray-50"
                                >
                                  Close
                                </button>
                                <button
                                  onClick={() => handleUpdateStatus(selectedJob._id, app._id, newStatus[app._id] || app.status, newNotes[app._id])}
                                  disabled={updatingAppId === app._id}
                                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                  {updatingAppId === app._id ? 'Updating...' : 'Update Status'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Student Profile Modal */}
      {selectedStudentProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-indigo-800 text-white p-6 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold">{selectedStudentProfile.fullName}</h2>
                <p className="text-indigo-100">{selectedStudentProfile.email}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedStudentProfile(null)
                  setSelectedApplicationForProfile(null)
                }}
                className="p-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Social Links */}
              {(selectedStudentProfile.linkedinUrl || selectedStudentProfile.githubUrl) && (
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-3">📱 Connect</h3>
                  <div className="flex gap-3">
                    {selectedStudentProfile.linkedinUrl && (
                      <a href={getLinkedInHref(selectedStudentProfile.linkedinUrl) || '#'} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm">
                        LinkedIn
                      </a>
                    )}
                    {selectedStudentProfile.githubUrl && (
                      <a href={selectedStudentProfile.githubUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-semibold text-sm">
                        GitHub
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Skills */}
              {selectedStudentProfile.skills && selectedStudentProfile.skills.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-3">💡 Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedStudentProfile.skills.map((skill, idx) => (
                      <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Projects */}
              {selectedStudentProfile.projects && selectedStudentProfile.projects.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-3">🚀 Projects</h3>
                  <div className="space-y-3">
                    {selectedStudentProfile.projects.map((project, idx) => (
                      <div key={idx} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-gray-800">{project.title}</h4>
                          {project.link && (
                            <a href={project.link} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 text-sm font-semibold">
                              View
                            </a>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{project.description}</p>
                        {project.technologies && project.technologies.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {project.technologies.map((tech, tidx) => (
                              <span key={tidx} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                {tech}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resume */}
              {(selectedApplicationForProfile?.resumeFileName || selectedStudentProfile?.resume?.fileName) && (
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-3">📄 Resume</h3>
                  <div className="border border-gray-200 rounded-lg p-4 flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-gray-800">{selectedApplicationForProfile?.resumeFileName || selectedStudentProfile?.resume?.fileName}</p>
                      {selectedStudentProfile?.resume?.uploadedAt && (
                        <p className="text-xs text-gray-500">Uploaded: {new Date(selectedStudentProfile.resume.uploadedAt).toLocaleDateString()}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => viewResume(selectedStudentProfile._id, selectedApplicationForProfile?.resumeFileName || selectedStudentProfile?.resume?.fileName, selectedApplicationForProfile?.resume)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm"
                      >
                        View
                      </button>
                      <button
                        onClick={() => downloadResume(selectedStudentProfile._id, selectedApplicationForProfile?.resumeFileName || selectedStudentProfile?.resume?.fileName, selectedApplicationForProfile?.resume)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-sm flex items-center gap-2"
                      >
                        <Download size={16} />
                        Download
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* No Data Message */}
              {(!selectedStudentProfile.skills || selectedStudentProfile.skills.length === 0) &&
               (!selectedStudentProfile.projects || selectedStudentProfile.projects.length === 0) &&
               (!selectedApplicationForProfile?.resumeFileName && (!selectedStudentProfile.resume || !selectedStudentProfile.resume.fileName)) && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No additional information available yet</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSelectedStudentProfile(null)
                    setSelectedApplicationForProfile(null)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-800 font-semibold hover:bg-gray-50"
                >
                  Close Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}
