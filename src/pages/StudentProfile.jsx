import React, { useState, useEffect } from 'react'
import { Navbar } from '../components/Navbar.jsx'
import { Footer } from '../components/Footer.jsx'
import { ArrowLeft, Plus, X, Download } from 'lucide-react'

const API_BASE_URL = 'http://localhost:5000/api'

export const StudentProfile = ({ onNavigate }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [bio, setBio] = useState('')
  const [skills, setSkills] = useState([])
  const [newSkill, setNewSkill] = useState('')
  const [projects, setProjects] = useState([])
  const [newProject, setNewProject] = useState({ title: '', description: '', technologies: '', link: '' })
  const [resume, setResume] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [messageType, setMessageType] = useState('success')
  const [editingProjectIdx, setEditingProjectIdx] = useState(null)

  const generateBioFromProfile = () => {
    const profileSource = profile || user || {}
    const fullName = profileSource.fullName || user?.fullName || 'I'
    const institution = profileSource.institution || user?.institution
    const skillsList = (skills || profileSource.skills || []).filter(Boolean)
    const projectsList = Array.isArray(projects) && projects.length > 0
      ? projects
      : (Array.isArray(profileSource.projects) ? profileSource.projects : [])

    const technologies = [...new Set(
      projectsList.flatMap(p => Array.isArray(p?.technologies) ? p.technologies : [])
    )].filter(Boolean)

    const parts = []
    parts.push(`${fullName} is a student${institution ? ` from ${institution}` : ''} with a strong interest in continuous learning.`)

    if (skillsList.length > 0) {
      parts.push(`Core skills include ${skillsList.slice(0, 6).join(', ')}.`)
    }

    if (projectsList.length > 0) {
      parts.push(`Built ${projectsList.length} project${projectsList.length > 1 ? 's' : ''}${technologies.length > 0 ? ` using ${technologies.slice(0, 6).join(', ')}` : ''}.`)
    }

    if (profileSource.company || profileSource.role || profileSource.experience) {
      const background = []
      if (profileSource.role) background.push(profileSource.role)
      if (profileSource.company) background.push(`at ${profileSource.company}`)
      if (profileSource.experience) background.push(`with ${profileSource.experience} of learning/work exposure`)
      parts.push(`Additional background: ${background.join(' ')}.`)
    }

    parts.push('Actively looking to connect with mentors and grow through real-world guidance and collaboration.')
    setBio(parts.join(' ').replace(/\s+/g, ' ').trim())

    setMessageType('success')
    setMessage('✅ Bio generated from your profile data. Click Save Bio to keep it.')
    setTimeout(() => setMessage(null), 3000)
  }

  useEffect(() => {
    fetchUserProfile()
  }, [])

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token')
      const userData = localStorage.getItem('user')
      if (!userData) return

      const user = JSON.parse(userData)
      setUser(user)

      if (token) {
        const response = await fetch(`${API_BASE_URL}/auth/profile`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const result = await response.json()
        if (result.success) {
          setProfile(result.data)
          setBio(result.data.bio || '')
          setSkills(result.data.skills || [])
          setProjects(result.data.projects || [])
          setResume(result.data.resume || null)
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }

  const updateBio = async () => {
    if (!bio.trim()) {
      setMessageType('error')
      setMessage('❌ Please enter a short bio')
      setTimeout(() => setMessage(null), 3000)
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ bio: bio.trim() })
      })

      const result = await response.json()
      if (result.success) {
        let updatedProfile = result.data

        try {
          const refreshResponse = await fetch(`${API_BASE_URL}/auth/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          const refreshResult = await refreshResponse.json()
          if (refreshResult.success) {
            updatedProfile = refreshResult.data
          }
        } catch (refreshError) {
          console.error('Error refreshing profile after bio update:', refreshError)
        }

        setProfile(updatedProfile)
        setBio(updatedProfile?.bio || bio.trim())
        setSkills(updatedProfile?.skills || [])
        setProjects(updatedProfile?.projects || [])
        setResume(updatedProfile?.resume || null)

        // Update localStorage user data
        const stored = localStorage.getItem('user')
        if (stored) {
          const parsed = JSON.parse(stored)
          parsed.bio = updatedProfile?.bio || bio.trim()
          localStorage.setItem('user', JSON.stringify(parsed))
          window.dispatchEvent(new Event('user-updated'))
        }

        setMessageType('success')
        setMessage('✅ Bio updated successfully! Go back to dashboard and click "Update Status" to see progress.')
        setTimeout(() => setMessage(null), 5000)
      } else {
        setMessageType('error')
        setMessage(`❌ ${result.message}`)
        setTimeout(() => setMessage(null), 3000)
      }
    } catch (error) {
      console.error('Error updating bio:', error)
      setMessageType('error')
      setMessage('❌ Network error')
      setTimeout(() => setMessage(null), 3000)
    } finally {
      setLoading(false)
    }
  }

  const addSkill = async () => {
    if (!newSkill.trim()) {
      setMessageType('error')
      setMessage('❌ Please enter a skill')
      setTimeout(() => setMessage(null), 3000)
      return
    }

    if (skills.includes(newSkill.trim())) {
      setMessageType('error')
      setMessage('❌ Skill already added')
      setTimeout(() => setMessage(null), 3000)
      return
    }

    const updatedSkills = [...skills, newSkill.trim()]
    await updateSkills(updatedSkills)
    setNewSkill('')
  }

  const removeSkill = async (idx) => {
    const updatedSkills = skills.filter((_, i) => i !== idx)
    await updateSkills(updatedSkills)
  }

  const updateSkills = async (skillsList) => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch(`${API_BASE_URL}/profile/skills`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ skills: skillsList })
      })

      const result = await response.json()
      if (result.success) {
        setSkills(result.data.skills || skillsList)
        setMessageType('success')
        setMessage('✅ Skills updated successfully!')
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessageType('error')
        setMessage(`❌ ${result.message}`)
        setTimeout(() => setMessage(null), 3000)
      }
    } catch (error) {
      console.error('Error updating skills:', error)
      setMessageType('error')
      setMessage('❌ Network error')
      setTimeout(() => setMessage(null), 3000)
    } finally {
      setLoading(false)
    }
  }

  const addProject = async () => {
    if (!newProject.title.trim() || !newProject.description.trim()) {
      setMessageType('error')
      setMessage('❌ Please fill in title and description')
      setTimeout(() => setMessage(null), 3000)
      return
    }

    const technologies = newProject.technologies
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0)

    const project = {
      title: newProject.title,
      description: newProject.description,
      technologies,
      link: newProject.link || null
    }

    const updatedProjects = editingProjectIdx !== null 
      ? projects.map((p, i) => i === editingProjectIdx ? project : p)
      : [...projects, project]

    await updateProjects(updatedProjects)
    setNewProject({ title: '', description: '', technologies: '', link: '' })
    setEditingProjectIdx(null)
  }

  const removeProject = async (idx) => {
    const updatedProjects = projects.filter((_, i) => i !== idx)
    await updateProjects(updatedProjects)
  }

  const editProject = (idx) => {
    const project = projects[idx]
    setNewProject({
      title: project.title,
      description: project.description,
      technologies: project.technologies.join(', '),
      link: project.link || ''
    })
    setEditingProjectIdx(idx)
  }

  const updateProjects = async (projectsList) => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch(`${API_BASE_URL}/profile/projects`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ projects: projectsList })
      })

      const result = await response.json()
      if (result.success) {
        setProjects(result.data.projects || projectsList)
        setMessageType('success')
        setMessage('✅ Projects updated successfully!')
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessageType('error')
        setMessage(`❌ ${result.message}`)
        setTimeout(() => setMessage(null), 3000)
      }
    } catch (error) {
      console.error('Error updating projects:', error)
      setMessageType('error')
      setMessage('❌ Network error')
      setTimeout(() => setMessage(null), 3000)
    } finally {
      setLoading(false)
    }
  }

  const uploadResume = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setLoading(true)
    try {
      const reader = new FileReader()
      reader.onload = async (event) => {
        const base64 = event.target.result.split(',')[1]
        const token = localStorage.getItem('token')
        if (!token) return

        const response = await fetch(`${API_BASE_URL}/profile/upload-resume`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            resumeBase64: base64,
            fileName: file.name
          })
        })

        const result = await response.json()
        if (result.success) {
          setResume(result.data.resume)
          setMessageType('success')
          setMessage('✅ Resume uploaded successfully!')
          setTimeout(() => setMessage(null), 3000)
        } else {
          setMessageType('error')
          setMessage(`❌ ${result.message}`)
          setTimeout(() => setMessage(null), 3000)
        }
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Error uploading resume:', error)
      setMessageType('error')
      setMessage('❌ Network error')
      setTimeout(() => setMessage(null), 3000)
    } finally {
      setLoading(false)
    }
  }

  const missingFields = [
    !profile?.bio ? { key: 'bio', label: 'Bio', anchor: 'bio-section' } : null,
    (!skills || skills.length === 0) ? { key: 'skills', label: 'Skills', anchor: 'skills-section' } : null,
    !resume ? { key: 'resume', label: 'Resume', anchor: 'resume-section' } : null,
    (!projects || projects.length === 0) ? { key: 'projects', label: 'Projects', anchor: 'projects-section' } : null
  ].filter(Boolean)

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar onNavigate={onNavigate} />

      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => onNavigate('student-dashboard')}
            className="flex items-center gap-2 text-indigo-100 hover:text-white font-semibold text-sm mb-4"
          >
            <ArrowLeft size={18} />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="text-3xl md:text-4xl font-bold">👤 My Professional Profile</h1>
          <p className="text-indigo-100 mt-2">Build your professional presence for alumni to discover you</p>
        </div>
      </div>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        {message && (
          <div className={`mb-6 p-4 rounded-lg font-semibold flex justify-between items-center ${messageType === 'success' ? 'bg-green-100 text-green-700 border-l-4 border-green-600' : 'bg-red-100 text-red-700 border-l-4 border-red-600'}`}>
            <span>{message}</span>
            <button onClick={() => setMessage(null)} className="text-xl">×</button>
          </div>
        )}

        {missingFields.length > 0 && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-bold text-yellow-800 mb-2">⚠️ Incomplete Profile</h3>
            <p className="text-sm text-yellow-700 mb-3">Complete these fields to reach 100%:</p>
            <div className="flex flex-wrap gap-2">
              {missingFields.map((item) => (
                <a
                  key={item.key}
                  href={`#${item.anchor}`}
                  className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold hover:bg-yellow-200"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Bio Section */}
        <div id="bio-section" className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">📝 Bio</h2>
              <p className="text-gray-600 text-sm">Write a short professional summary about yourself</p>
            </div>
            <button
              onClick={generateBioFromProfile}
              disabled={loading}
              className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 font-semibold text-sm disabled:bg-gray-100 disabled:text-gray-400"
            >
              Auto Generate Bio
            </button>
          </div>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            placeholder="e.g., Final-year CS student passionate about full-stack development and AI..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
          <button
            onClick={updateBio}
            disabled={loading}
            className="mt-3 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold disabled:bg-gray-400 transition"
          >
            Save Bio
          </button>
        </div>

        {/* Resume Section */}
        <div id="resume-section" className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">📄 Resume</h2>
          <p className="text-gray-600 text-sm mb-4">Upload your resume so alumni can review your qualifications</p>

          {resume && resume.fileName ? (
            <div className="border border-gray-200 rounded-lg p-4 flex justify-between items-center mb-4">
              <div>
                <p className="font-semibold text-gray-800">{resume.fileName}</p>
                <p className="text-xs text-gray-500">Uploaded: {new Date(resume.uploadedAt).toLocaleDateString()}</p>
              </div>
              <label className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold text-sm cursor-pointer flex items-center gap-2 transition">
                <Plus size={16} />
                Replace
                <input
                  type="file"
                  accept="application/pdf,.doc,.docx"
                  onChange={uploadResume}
                  disabled={loading}
                  className="hidden"
                />
              </label>
            </div>
          ) : (
            <label className="border-2 border-dashed border-indigo-300 rounded-lg p-8 text-center cursor-pointer hover:bg-indigo-50 transition block">
              <p className="text-3xl mb-2">📎</p>
              <p className="font-semibold text-gray-800">Click to upload resume</p>
              <p className="text-xs text-gray-600 mt-1">PDF, DOC, or DOCX format</p>
              <input
                type="file"
                accept="application/pdf,.doc,.docx"
                onChange={uploadResume}
                disabled={loading}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* Skills Section */}
        <div id="skills-section" className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">💡 Skills</h2>
          <p className="text-gray-600 text-sm mb-4">Add your technical and professional skills</p>

          {/* Existing Skills */}
          {skills.length > 0 && (
            <div className="mb-6">
              <p className="text-sm font-semibold text-gray-700 mb-3">Your Skills ({skills.length})</p>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill, idx) => (
                  <div key={idx} className="px-4 py-2 bg-indigo-100 text-indigo-800 rounded-full font-semibold text-sm flex items-center gap-2">
                    {skill}
                    <button
                      onClick={() => removeSkill(idx)}
                      className="hover:text-red-600 transition"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Skill Form */}
          <div className="flex gap-2">
            <input
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addSkill()}
              placeholder="e.g., React, Python, JavaScript"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={addSkill}
              disabled={loading}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold disabled:bg-gray-400 transition flex items-center gap-2"
            >
              <Plus size={16} />
              Add
            </button>
          </div>
        </div>

        {/* Projects Section */}
        <div id="projects-section" className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">🚀 Projects</h2>
          <p className="text-gray-600 text-sm mb-4">Showcase your best work to alumni</p>

          {/* Existing Projects */}
          {projects.length > 0 && (
            <div className="mb-6 space-y-3">
              {projects.map((project, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800">{project.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                      {project.technologies.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {project.technologies.map((tech, tidx) => (
                            <span key={tidx} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                              {tech}
                            </span>
                          ))}
                        </div>
                      )}
                      {project.link && (
                        <a href={project.link} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:text-indigo-800 mt-2 block">
                          🔗 View Project
                        </a>
                      )}
                    </div>
                    <div className="flex gap-2 ml-2">
                      <button
                        onClick={() => editProject(idx)}
                        className="px-3 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 text-sm font-semibold"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => removeProject(idx)}
                        className="px-3 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 text-sm font-semibold"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Project Form */}
          <div className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">Project Title</label>
              <input
                value={newProject.title}
                onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                placeholder="e.g., E-commerce Platform"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">Description</label>
              <textarea
                value={newProject.description}
                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                placeholder="Describe your project and what you achieved..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">Technologies (comma-separated)</label>
              <input
                value={newProject.technologies}
                onChange={(e) => setNewProject({ ...newProject, technologies: e.target.value })}
                placeholder="e.g., React, Node.js, MongoDB"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">Project Link (optional)</label>
              <input
                value={newProject.link}
                onChange={(e) => setNewProject({ ...newProject, link: e.target.value })}
                placeholder="e.g., https://github.com/username/project"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={addProject}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold disabled:bg-gray-400 transition flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                {editingProjectIdx !== null ? 'Update Project' : 'Add Project'}
              </button>
              {editingProjectIdx !== null && (
                <button
                  onClick={() => {
                    setEditingProjectIdx(null)
                    setNewProject({ title: '', description: '', technologies: '', link: '' })
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 font-semibold transition"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-gray-700">
            <span className="font-bold text-blue-700">💡 Tip:</span> A complete profile with resume, skills, and projects increases your chances of getting shortlisted by alumni for job opportunities!
          </p>
        </div>
      </main>

      <Footer />
    </div>
  )
}
