import React, { useState } from 'react'
import { Navbar } from '../components/Navbar.jsx'
import { Footer } from '../components/Footer.jsx'

export const AlumniPostJob = ({ onNavigate }) => {
  const [title, setTitle] = useState('')
  const [company, setCompany] = useState('')
  const [description, setDescription] = useState('')

  const handlePost = async () => {
    // minimal local behavior; backend integration can be added later
    alert(`Job posted:\nTitle: ${title}\nCompany: ${company}`)
    setTitle('')
    setCompany('')
    setDescription('')
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar onNavigate={onNavigate} />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Post a Job</h1>
            </div>
            <div>
              <button onClick={() => onNavigate('alumni-dashboard')} className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200">← Back to Dashboard</button>
            </div>
          </div>
          <div className="space-y-4">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Job Title" className="w-full p-2 border rounded" />
            <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company" className="w-full p-2 border rounded" />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="w-full p-2 border rounded h-32" />
            <div className="flex gap-2">
              <button onClick={handlePost} className="bg-green-600 text-white px-4 py-2 rounded">Post Job</button>
              <button onClick={() => onNavigate('alumni-dashboard')} className="bg-gray-200 px-4 py-2 rounded">Back</button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
