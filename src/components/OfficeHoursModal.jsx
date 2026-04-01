import React, { useEffect, useState } from 'react'

const API_BASE_URL = 'http://localhost:5000/api'

export const OfficeHoursModal = ({ isOpen, onClose, onUpdated }) => {
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [form, setForm] = useState({
    dayOfWeek: 'Monday',
    startTime: '17:00',
    endTime: '18:00',
    timezone: 'Asia/Kolkata',
    meetingMode: 'online',
    meetingLink: '',
    location: '',
    notes: '',
    maxBookingsPerSlot: 1
  })

  const loadMySlots = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      const res = await fetch(`${API_BASE_URL}/office-hours/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const j = await res.json()
      if (j.success) setSlots(j.data || [])
    } catch (err) {
      console.error('Failed to load office hours', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadMySlots()
      setMessage(null)
    }
  }, [isOpen])

  const saveSlot = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setMessage({ type: 'error', text: 'Please login first' })
        return
      }

      const payload = {
        ...form,
        maxBookingsPerSlot: Number(form.maxBookingsPerSlot) || 1
      }

      const res = await fetch(`${API_BASE_URL}/office-hours`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      const j = await res.json()
      if (!j.success) {
        setMessage({ type: 'error', text: j.message || 'Failed to schedule slot' })
        return
      }

      setMessage({ type: 'success', text: 'Office hour scheduled successfully' })
      setForm(prev => ({ ...prev, notes: '', meetingLink: '', location: '' }))
      await loadMySlots()
      onUpdated && onUpdated()
    } catch (err) {
      console.error('Failed to save office hour', err)
      setMessage({ type: 'error', text: 'Network error. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  const deleteSlot = async (slotId) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      const res = await fetch(`${API_BASE_URL}/office-hours/${slotId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      const j = await res.json()
      if (!j.success) {
        setMessage({ type: 'error', text: j.message || 'Failed to remove slot' })
        return
      }
      setMessage({ type: 'success', text: 'Office hour removed' })
      await loadMySlots()
      onUpdated && onUpdated()
    } catch (err) {
      console.error('Failed to delete office hour', err)
      setMessage({ type: 'error', text: 'Network error. Please try again.' })
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b flex items-center justify-between bg-green-600 text-white">
          <div>
            <h2 className="text-xl font-bold">🕒 Schedule Office Hours</h2>
            <p className="text-sm opacity-90">Create recurring weekly slots students can book</p>
          </div>
          <button onClick={onClose} className="px-3 py-1 rounded bg-white/20 hover:bg-white/30">Close</button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {message && (
            <div className={`p-3 rounded ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={saveSlot} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Day</label>
              <select value={form.dayOfWeek} onChange={e => setForm({ ...form, dayOfWeek: e.target.value })} className="w-full p-2 border rounded">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Timezone</label>
              <input value={form.timezone} onChange={e => setForm({ ...form, timezone: e.target.value })} className="w-full p-2 border rounded" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Start time</label>
              <input type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} className="w-full p-2 border rounded" required />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">End time</label>
              <input type="time" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} className="w-full p-2 border rounded" required />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Mode</label>
              <select value={form.meetingMode} onChange={e => setForm({ ...form, meetingMode: e.target.value })} className="w-full p-2 border rounded">
                <option value="online">Online</option>
                <option value="in-person">In-person</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Max bookings</label>
              <input type="number" min="1" max="20" value={form.maxBookingsPerSlot} onChange={e => setForm({ ...form, maxBookingsPerSlot: e.target.value })} className="w-full p-2 border rounded" />
            </div>

            {form.meetingMode === 'online' ? (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Meeting link</label>
                <input value={form.meetingLink} onChange={e => setForm({ ...form, meetingLink: e.target.value })} className="w-full p-2 border rounded" placeholder="https://meet.google.com/..." />
              </div>
            ) : (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Location</label>
                <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="w-full p-2 border rounded" placeholder="Campus room / office address" />
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Notes (optional)</label>
              <textarea rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full p-2 border rounded" placeholder="What students should prepare" />
            </div>

            <div className="md:col-span-2">
              <button disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-60">
                {saving ? 'Saving...' : 'Save Office Hour'}
              </button>
            </div>
          </form>

          <div>
            <h3 className="text-lg font-semibold mb-3">Your active office hours</h3>
            {loading ? (
              <p className="text-gray-500 text-sm">Loading...</p>
            ) : slots.length === 0 ? (
              <p className="text-gray-500 text-sm">No slots yet.</p>
            ) : (
              <div className="space-y-2">
                {slots.map(slot => (
                  <div key={slot._id || slot.id} className="p-3 border rounded flex items-center justify-between">
                    <div>
                      <p className="font-medium">{slot.dayOfWeek} • {slot.startTime} - {slot.endTime}</p>
                      <p className="text-xs text-gray-500">{slot.timezone} • {(slot.bookings || []).length}/{slot.maxBookingsPerSlot} booked</p>
                    </div>
                    <button onClick={() => deleteSlot(slot._id || slot.id)} className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200">
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
