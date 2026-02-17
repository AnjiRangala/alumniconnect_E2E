import React, { useEffect, useState } from 'react'
import { Navbar } from '../components/Navbar.jsx'
import { Footer } from '../components/Footer.jsx'

export const AlumniEndorse = ({ onNavigate }) => {
  const [mentees, setMentees] = useState(null)
  const [loading, setLoading] = useState(false)
  const [apiMessage, setApiMessage] = useState(null)

  useEffect(() => { loadMentees() }, [])

  const loadMentees = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const headers = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch('http://localhost:5000/api/mentees', { headers })
      const j = await res.json()
      if (j.success) setMentees(j.data || [])
      else setMentees([])
    } catch (err) {
      console.error('Error loading mentees', err)
      setMentees([])
    } finally { setLoading(false) }
  }

  const flash = (m) => { setApiMessage(m); setTimeout(() => setApiMessage(null), 3000) }

  const endorse = async (mentee, skill) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) { flash('Please log in to endorse'); return }
      const res = await fetch('http://localhost:5000/api/endorse', { method: 'POST', headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ targetUserId: mentee._id || mentee.id, skill }) })
      const j = await res.json()
      if (j.success) flash(`Endorsed ${skill} for ${mentee.fullName}`)
      else flash(j.message || 'Failed to endorse')
    } catch (err) { console.error(err); flash('Network error') }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar onNavigate={onNavigate} />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Endorse Student Skills</h1>
              <p className="text-gray-600">Quickly endorse skills for students you know.</p>
            </div>
            <div>
              <button onClick={() => onNavigate('alumni-dashboard')} className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200">← Back to Dashboard</button>
            </div>
          </div>

          {apiMessage && <div className="mb-4 p-2 bg-green-100 text-green-800 rounded">{apiMessage}</div>}

          <div className="space-y-4">
            {loading && <div>Loading mentees…</div>}
            {!loading && mentees && mentees.length===0 && <div className="text-sm text-gray-500">No mentees available</div>}
            {!loading && mentees && mentees.map(m => (
              <div key={m._id || m.id} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <p className="font-semibold">{m.fullName}</p>
                  <p className="text-sm text-gray-600">Top skills: {(m.skills || ['Career']).slice(0,3).join(', ')}</p>
                </div>
                <div className="flex gap-2">
                  {(m.skills || ['Career']).slice(0,3).map((sk,i)=>(
                    <button key={i} onClick={()=>endorse(m, sk)} className="px-3 py-1 bg-blue-600 text-white rounded">Endorse {sk}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
