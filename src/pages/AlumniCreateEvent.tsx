import React, { useState } from 'react'
import { Navbar } from '../components/Navbar'
import { Footer } from '../components/Footer'

interface AlumniCreateEventProps {
  onNavigate: (page: string) => void
}

export const AlumniCreateEvent = ({ onNavigate }: AlumniCreateEventProps) => {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [description, setDescription] = useState('')

  const handleCreate = async () => {
    alert(`Event created:\n${title} on ${date}`)
    setTitle('')
    setDate('')
    setDescription('')
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar onNavigate={onNavigate} />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Create Event</h1>
            </div>
            <div>
              <button onClick={() => onNavigate('alumni-dashboard')} className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200">← Back to Dashboard</button>
            </div>
          </div>
          <div className="space-y-4">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event Title" className="w-full p-2 border rounded" />
            <input value={date} onChange={(e) => setDate(e.target.value)} placeholder="Date (YYYY-MM-DD)" className="w-full p-2 border rounded" />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="w-full p-2 border rounded h-32" />
            <div className="flex gap-2">
              <button onClick={handleCreate} className="bg-purple-600 text-white px-4 py-2 rounded">Create Event</button>
              <button onClick={() => onNavigate('alumni-dashboard')} className="bg-gray-200 px-4 py-2 rounded">Back</button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
