import React, { useState } from 'react'
import { Navbar } from '../components/Navbar.jsx'
import { Footer } from '../components/Footer.jsx'
import { CheckCircle } from 'lucide-react'

const API_BASE_URL = 'http://localhost:5000/api'

export const AlumniPostJob = ({ onNavigate }) => {
  const [title, setTitle] = useState('')
  const [company, setCompany] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('Remote')
  const [jobType, setJobType] = useState('Full-time')
  const [salary, setSalary] = useState('')
  const [applicationDeadline, setApplicationDeadline] = useState('')
  const [requiredSkills, setRequiredSkills] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [messageType, setMessageType] = useState('success')
  const [showSuccess, setShowSuccess] = useState(false)

  const locationOptions = [
    'Remote',
    'On-site',
    'Hybrid',
    'Bangalore, India',
    'Hyderabad, India',
    'Pune, India',
    'Mumbai, India',
    'Chennai, India',
    'Delhi, India',
    'Kochi, India'
  ]

  const handlePost = async () => {
    if (!title.trim() || !company.trim() || !description.trim() || !applicationDeadline) {
      setMessageType('error')
      setMessage('❌ Please fill in all required fields, including application deadline')
      setTimeout(() => setMessage(null), 3000)
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setMessageType('error')
        setMessage('❌ Authentication required. Please log in.')
        setTimeout(() => setMessage(null), 3000)
        setLoading(false)
        return
      }

      const skillsArray = requiredSkills
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0)

      console.log('Posting job to:', `${API_BASE_URL}/jobs`)
      console.log('Token exists:', !!token)

      const response = await fetch(`${API_BASE_URL}/jobs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: title.trim(),
          company: company.trim(),
          description: description.trim(),
          location: location.trim(),
          jobType: jobType,
          salary: salary.trim() || null,
          requiredSkills: skillsArray,
          applicationDeadline
        })
      })

      console.log('Response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Error response:', errorData)
        setMessageType('error')
        setMessage(`❌ ${errorData.message || 'Failed to post job'}`)
        setTimeout(() => setMessage(null), 3000)
        setLoading(false)
        return
      }

      const result = await response.json()
      console.log('Success response:', result)

      if (result.success) {
        // Show success animation
        setShowSuccess(true)
        setMessageType('success')
        setMessage('✅ Job posted successfully! 🎉')
        
        setTimeout(() => {
          setTitle('')
          setCompany('')
          setDescription('')
          setLocation('Remote')
          setJobType('Full-time')
          setSalary('')
          setApplicationDeadline('')
          setRequiredSkills('')
          setMessage(null)
          setShowSuccess(false)
          onNavigate('alumni-dashboard')
        }, 2500)
      } else {
        setMessageType('error')
        setMessage(`❌ ${result.message || 'Failed to post job'}`)
        setTimeout(() => setMessage(null), 3000)
      }
    } catch (error) {
      console.error('Error posting job:', error)
      console.error('Error details:', error.message)
      setMessageType('error')
      setMessage('❌ Network error. Make sure the server is running on localhost:5000')
      setTimeout(() => setMessage(null), 4000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar onNavigate={onNavigate} />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        {/* Success Animation */}
        {showSuccess && (
          <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
            <div className="animate-bounce text-center">
              <div className="text-9xl mb-4">🎉</div>
              <div className="text-4xl font-bold text-green-600 animate-pulse">Success!</div>
            </div>
          </div>
        )}

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Post a Job Opening</h1>
              <p className="text-gray-600 text-sm mt-1">Share job opportunities with students from your network</p>
            </div>
            <div>
              <button onClick={() => onNavigate('alumni-dashboard')} className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200">← Back to Dashboard</button>
            </div>
          </div>

          {message && (
            <div className={`mb-4 p-4 rounded font-semibold flex justify-between items-center animate-pulse ${messageType === 'success' ? 'bg-green-100 text-green-700 border-l-4 border-green-600' : 'bg-red-100 text-red-700 border-l-4 border-red-600'}`}>
              <span>{message}</span>
              <button onClick={() => setMessage(null)} className="text-xl">×</button>
            </div>
          )}

          <div className="space-y-4">
            {/* Required Fields */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Job Title *</label>
              <input 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="e.g., Senior React Developer" 
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Company Name *</label>
              <input 
                value={company} 
                onChange={(e) => setCompany(e.target.value)} 
                placeholder="e.g., Tech Company Inc." 
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Job Description *</label>
              <textarea 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder="Describe the job responsibilities, requirements, and benefits..." 
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
              />
            </div>

            {/* Optional Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Location</label>
                <select 
                  value={location} 
                  onChange={(e) => setLocation(e.target.value)} 
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {locationOptions.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Job Type</label>
                <select 
                  value={jobType} 
                  onChange={(e) => setJobType(e.target.value)} 
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>Full-time</option>
                  <option>Part-time</option>
                  <option>Internship</option>
                  <option>Contract</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Salary Range</label>
                <input 
                  value={salary} 
                  onChange={(e) => setSalary(e.target.value)} 
                  placeholder="e.g., 8-12 LPA" 
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Application Deadline *</label>
                <input
                  type="date"
                  value={applicationDeadline}
                  onChange={(e) => setApplicationDeadline(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Required Skills</label>
                <input 
                  value={requiredSkills} 
                  onChange={(e) => setRequiredSkills(e.target.value)} 
                  placeholder="e.g., React, Node.js, MongoDB" 
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Separate skills with commas</p>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <button 
                onClick={handlePost} 
                disabled={loading}
                className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold transition transform hover:scale-105 active:scale-95"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⏳</span> Posting...
                  </span>
                ) : (
                  <span>✅ Post Job</span>
                )}
              </button>
              <button 
                onClick={() => onNavigate('alumni-dashboard')} 
                className="bg-gray-200 px-6 py-2 rounded hover:bg-gray-300 font-semibold"
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
