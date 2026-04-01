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
      if (j.success) {
        setMentees(prev => (prev || []).map(m => {
          const menteeId = m._id || m.id
          const targetId = mentee._id || mentee.id
          if (String(menteeId) !== String(targetId)) return m

          const existing = (m.endorsements || []).find(e => String(e.skill || '').toLowerCase() === String(skill).toLowerCase())
          let nextEndorsements = m.endorsements || []
          if (existing) {
            nextEndorsements = (m.endorsements || []).map(e => (
              String(e.skill || '').toLowerCase() === String(skill).toLowerCase()
                ? { ...e, count: (e.count || 0) + 1 }
                : e
            ))
          } else {
            nextEndorsements = [...(m.endorsements || []), { skill, count: 1 }]
          }

          return { ...m, endorsements: nextEndorsements }
        }))

        flash(`Endorsed ${skill} for ${mentee.fullName}`)
      }
      else flash(j.message || 'Failed to endorse')
    } catch (err) { console.error(err); flash('Network error') }
  }

  const getEndorsementCount = (mentee, skill) => {
    const item = (mentee.endorsements || []).find(e => String(e.skill || '').toLowerCase() === String(skill).toLowerCase())
    return item?.count || 0
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
              <div key={m._id || m.id} className="p-3 border rounded">
                <div className="mb-3">
                  <p className="font-semibold">{m.fullName}</p>
                  <p className="text-sm text-gray-600">
                    Skills uploaded: {(m.skills || []).length > 0 ? (m.skills || []).join(', ') : 'No skills uploaded yet'}
                  </p>
                </div>
                {(m.skills || []).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {(m.skills || []).map((sk, i) => (
                      <button
                        key={`${m._id || m.id}-${sk}-${i}`}
                        onClick={() => endorse(m, sk)}
                        className="px-3 py-1 bg-blue-600 text-white rounded"
                      >
                        Endorse {sk} ({getEndorsementCount(m, sk)})
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
