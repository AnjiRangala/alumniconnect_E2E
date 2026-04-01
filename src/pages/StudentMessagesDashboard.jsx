import React, { useEffect, useMemo, useState } from 'react'
import { Navbar } from '../components/Navbar.jsx'
import { Footer } from '../components/Footer.jsx'
import { API_BASE_URL } from '../config/api.js'

export const StudentMessagesDashboard = ({ onNavigate }) => {
  const [user, setUser] = useState(null)
  const [messages, setMessages] = useState([])
  const [mentors, setMentors] = useState([])
  const [selectedContact, setSelectedContact] = useState(null)
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [deletingMessageId, setDeletingMessageId] = useState('')
  const [seenMap, setSeenMap] = useState({})
  const [autoOpenedPreferredChat, setAutoOpenedPreferredChat] = useState(false)

  const getCacheKey = () => `student-chat-cache-${resolveCurrentUserId() || 'unknown'}`
  const getSeenKey = () => `student-chat-seen-${resolveCurrentUserId() || 'unknown'}`
  const readCache = () => {
    try { return JSON.parse(localStorage.getItem(getCacheKey()) || '[]') } catch (_) { return [] }
  }
  const writeCache = (list) => {
    try { localStorage.setItem(getCacheKey(), JSON.stringify(list || [])) } catch (_) {}
  }
  const readSeen = () => {
    try { return JSON.parse(localStorage.getItem(getSeenKey()) || '{}') } catch (_) { return {} }
  }
  const writeSeen = (value) => {
    try { localStorage.setItem(getSeenKey(), JSON.stringify(value || {})) } catch (_) {}
  }

  const mergeMessages = (existing, incoming) => {
    const map = new Map()
    const keyOf = (m) => {
      const id = String(m._id || m.id || '')
      // Use the MongoDB ID alone when available — avoids mismatches from subtle
      // format differences in fromId/toId/createdAt between the optimistic copy
      // (added on send) and the server-fetched copy (returned by polling).
      if (id && !id.startsWith('temp-') && !id.startsWith('legacy-')) return id
      // Fallback for temp/legacy messages: composite key
      const ts = m.createdAt ? new Date(m.createdAt).getTime() : ''
      return `${String(m.fromId || '')}|${String(m.toId || '')}|${String(m.body || '')}|${ts}`
    }

    ;[...(existing || []), ...(incoming || [])].forEach((m) => {
      const key = keyOf(m)
      const prev = map.get(key)
      if (!prev) {
        map.set(key, m)
      } else {
        map.set(key, {
          ...prev,
          ...m,
          localSender: Boolean(prev.localSender || m.localSender)
        })
      }
    })

    const byTime = Array.from(map.values()).sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0))
    const collapsed = []

    byTime.forEach((m) => {
      const from = String(m.fromId || '')
      const to = String(m.toId || '')
      const subject = String(m.subject || '')
      const body = String(m.body || '')
      const ts = new Date(m.createdAt || 0).getTime()

      const existingIndex = collapsed.findIndex((c) => {
        const cFrom = String(c.fromId || '')
        const cTo = String(c.toId || '')
        const cSubject = String(c.subject || '')
        const cBody = String(c.body || '')
        const cTs = new Date(c.createdAt || 0).getTime()

        return cFrom === from && cTo === to && cSubject === subject && cBody === body && Math.abs(cTs - ts) <= 5000
      })

      if (existingIndex === -1) {
        collapsed.push(m)
        return
      }

      const prev = collapsed[existingIndex]
      const prevId = String(prev._id || prev.id || '')
      const curId = String(m._id || m.id || '')
      const prevWeak = !prevId || prevId.startsWith('legacy-') || prevId.startsWith('temp-')
      const curStrong = !!curId && !curId.startsWith('legacy-') && !curId.startsWith('temp-')
      const preferred = prevWeak && curStrong ? m : prev

      collapsed[existingIndex] = {
        ...preferred,
        localSender: Boolean(prev.localSender || m.localSender),
        isRead: Boolean(prev.isRead || m.isRead || prev.read || m.read)
      }
    })

    return collapsed
  }

  const resolveCurrentUserId = () => {
    const stored = localStorage.getItem('user')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        const fromUser = parsed?._id || parsed?.id || parsed?.userId
        if (fromUser) return String(fromUser)
      } catch (_) {}
    }

    const token = localStorage.getItem('token')
    if (token) {
      try {
        const base64Url = token.split('.')[1]
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
        const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
        const payload = JSON.parse(atob(padded))
        const fromToken = payload?.userId || payload?.id || payload?._id
        if (fromToken) return String(fromToken)
      } catch (_) {}
    }

    return ''
  }

  const userId = String(user?._id || user?.id || user?.userId || resolveCurrentUserId() || '')

  const fetchData = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const userData = localStorage.getItem('user')
      if (userData) setUser(JSON.parse(userData))
      if (!token) return

      const [msgRes, reqRes] = await Promise.all([
        fetch(`${API_BASE_URL}/messages`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/mentorship/my-requests`, { headers: { Authorization: `Bearer ${token}` } })
      ])

      const msgJson = await msgRes.json()
      const reqJson = await reqRes.json()

      if (msgJson.success) {
        const latest = (msgJson.data || []).map((m) => ({
          ...m,
          _id: String(m._id || m.id || ''),
          id: String(m._id || m.id || ''),
          fromId: String(m.fromId || ''),
          toId: String(m.toId || ''),
          isRead: !!(m.isRead || m.read)
        }))
        const merged = mergeMessages(readCache(), latest)
        setMessages(merged)
        writeCache(merged)
      }

      if (reqJson.success) {
        const acceptedMentors = (reqJson.data || [])
          .filter(r => r.status === 'accepted' && (r.mentorId || r.mentor?._id || r.mentor?.id))
          .map(r => ({
            id: String(r.mentorId || r.mentor?._id || r.mentor?.id),
            name: r.mentorName || r.mentor?.fullName || r.mentor?.name || 'Mentor'
          }))

        const unique = []
        const seen = new Set()
        acceptedMentors.forEach(m => {
          if (!seen.has(m.id)) {
            seen.add(m.id)
            unique.push(m)
          }
        })
        setMentors(unique)
      }
    } catch (err) {
      console.error('Failed to load messaging data', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setMessages(readCache())
    setSeenMap(readSeen())
    fetchData()
    const interval = setInterval(fetchData, 8000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const syncFromStorage = () => {
      try {
        const userData = localStorage.getItem('user')
        if (userData) setUser(JSON.parse(userData))
      } catch (_err) {}
      fetchData()
    }

    window.addEventListener('user-updated', syncFromStorage)
    window.addEventListener('storage', syncFromStorage)
    return () => {
      window.removeEventListener('user-updated', syncFromStorage)
      window.removeEventListener('storage', syncFromStorage)
    }
  }, [])

  const contacts = useMemo(() => {
    const map = new Map()
    const me = String(userId || '')
    const mentorNameById = new Map((mentors || []).map((m) => [String(m.id), m.name]))

    mentors.forEach(m => {
      map.set(String(m.id), {
        id: String(m.id),
        name: m.name,
        lastMessage: 'No messages yet',
        lastTime: 0,
        unread: 0
      })
    })

    messages.forEach(m => {
      const fromId = String(m.fromId || '')
      const toId = String(m.toId || '')
      const otherId = fromId === me ? toId : fromId
      if (!otherId) return
      const liveMentorName = mentorNameById.get(otherId)
      const fallbackName = fromId === me ? (m.toName || 'Mentor') : (m.fromName || 'Mentor')
      const otherName = liveMentorName || fallbackName

      // If mentor list is empty/outdated, still show conversations from message history
      if (!map.has(otherId)) {
        map.set(otherId, {
          id: otherId,
          name: otherName,
          lastMessage: 'No messages yet',
          lastTime: 0,
          unread: 0
        })
      }

      const prev = map.get(otherId)
      const msgTime = new Date(m.createdAt || 0).getTime()
      if (!prev || msgTime > prev.lastTime) {
        map.set(otherId, {
          id: otherId,
          name: otherName,
          lastMessage: m.body || '',
          lastTime: msgTime,
          unread: 0
        })
      }
    })

    const q = search.trim().toLowerCase()
    const list = Array.from(map.values()).map((c) => {
      const seenAt = Number(seenMap[c.id] || 0)
      const unread = (messages || []).filter((m) => {
        const from = String(m.fromId || '')
        const to = String(m.toId || '')
        const ts = new Date(m.createdAt || 0).getTime()
        const incomingForThisContact =
          from === String(c.id) &&
          ((to && to === me) || !to)
        const notRead = !(m.isRead || m.read)
        return incomingForThisContact && notRead && ts > seenAt
      }).length
      return { ...c, unread }
    })

    return list
      .filter(c => !q || c.name.toLowerCase().includes(q))
      .sort((a, b) => b.lastTime - a.lastTime)
  }, [messages, mentors, search, userId, seenMap])

  useEffect(() => {
    if (!selectedContact?.id) return
    const latest = (contacts || []).find(c => String(c.id) === String(selectedContact.id))
    if (!latest) return
    if (String(latest.name || '') !== String(selectedContact.name || '')) {
      setSelectedContact(prev => prev ? ({ ...prev, name: latest.name }) : prev)
    }
  }, [contacts, selectedContact?.id, selectedContact?.name])

  const selectedMessages = useMemo(() => {
    if (!selectedContact) return []
    const me = String(userId || '')
    const other = String(selectedContact.id)

    return (messages || [])
      .filter(m => {
        const from = String(m.fromId || '')
        const to = String(m.toId || '')
        return (
          (from === me && to === other) ||
          (from === other && to === me) ||
          (from === other && !to) ||
          (m.localSender === true && to === other)
        )
      })
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
  }, [messages, selectedContact, userId])

  const openConversation = async (contact) => {
    setSelectedContact(contact)
    const latestIncomingTs = (messages || [])
      .filter(m => String(m.fromId || '') === String(contact.id))
      .reduce((mx, m) => Math.max(mx, new Date(m.createdAt || 0).getTime()), 0)
    const nextSeen = { ...seenMap, [String(contact.id)]: latestIncomingTs || Date.now() }
    setSeenMap(nextSeen)
    writeSeen(nextSeen)
    try {
      const token = localStorage.getItem('token')
      if (!token || !userId) return

      const unreadIncoming = (messages || []).filter(m =>
        String(m.fromId || '') === String(contact.id) &&
        (String(m.toId || '') === String(userId) || !m.toId) &&
        !(m.isRead || m.read) &&
        (m._id || m.id)
      )

      await Promise.all(unreadIncoming.map(m =>
        fetch(`${API_BASE_URL}/messages/${m._id || m.id}/read`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        })
      ))

      if (unreadIncoming.length > 0) fetchData()
    } catch (err) {
      console.error('Failed to mark messages as read', err)
    }
  }

  useEffect(() => {
    if (autoOpenedPreferredChat) return
    if (!contacts || contacts.length === 0) return

    const preferredId = String(localStorage.getItem('preferredMentorChatId') || '').trim()
    const preferredName = String(localStorage.getItem('preferredMentorChatName') || '').trim().toLowerCase()

    if (!preferredId && !preferredName) {
      setAutoOpenedPreferredChat(true)
      return
    }

    const preferredContact = contacts.find(c => String(c.id) === preferredId)
      || contacts.find(c => String(c.name || '').trim().toLowerCase() === preferredName)

    if (preferredContact) {
      openConversation(preferredContact)
      localStorage.removeItem('preferredMentorChatId')
      localStorage.removeItem('preferredMentorChatName')
      setAutoOpenedPreferredChat(true)
      return
    }

    // avoid looping forever if contact list doesn't contain preferred mentor
    if (contacts.length > 0) {
      localStorage.removeItem('preferredMentorChatId')
      localStorage.removeItem('preferredMentorChatName')
      setAutoOpenedPreferredChat(true)
    }
  }, [contacts, autoOpenedPreferredChat])

  const sendMessage = async () => {
    if (!selectedContact || !draft.trim()) return
    const text = draft.trim()
    setSending(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const res = await fetch(`${API_BASE_URL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          targetUserId: selectedContact.id,
          subject: 'Message',
          body: text
        })
      })

      const json = await res.json()
      if (json.success) {
        setDraft('')
        const senderId = String(json?.data?.fromId || userId || resolveCurrentUserId() || '')
        const immediateMessage = {
          ...(json.data || {}),
          id: (json?.data?._id || json?.data?.id || `temp-${Date.now()}`),
          fromId: senderId,
          fromName: user?.fullName || 'You',
          toId: selectedContact.id,
          toName: selectedContact.name,
          subject: 'Message',
          body: text,
          isRead: false,
          createdAt: (json?.data?.createdAt || new Date().toISOString()),
          localSender: true
        }
        setMessages(prev => [...prev, immediateMessage])
        writeCache(mergeMessages(readCache(), [immediateMessage]))
      }
    } catch (err) {
      console.error('Failed to send message', err)
    } finally {
      setSending(false)
    }
  }

  const deleteMessage = async (message) => {
    const messageId = String(message?._id || message?.id || '')
    if (!messageId || messageId.startsWith('temp-') || messageId.startsWith('legacy-')) return

    // optimistic UI remove
    setMessages((prev) => {
      const next = (prev || []).filter((m) => String(m._id || m.id || '') !== messageId)
      writeCache(next)
      return next
    })

    setDeletingMessageId(messageId)
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const res = await fetch(`${API_BASE_URL}/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          toId: message?.toId || '',
          subject: message?.subject || '',
          body: message?.body || '',
          createdAt: message?.createdAt || ''
        })
      })
      const json = await res.json().catch(() => ({ success: false, message: 'Delete failed' }))
      if (!json.success) console.warn('Delete was not confirmed by server:', json.message)
      await fetchData()
    } catch (err) {
      console.error('Failed to delete message', err)
    } finally {
      setDeletingMessageId('')
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar onNavigate={onNavigate} />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 overflow-y-auto">
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">💬 Messages</h1>
              <p className="text-sm text-gray-500">Chat with your current mentors</p>
            </div>
            <button onClick={() => onNavigate('student-dashboard')} className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200">← Back</button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 min-h-[65vh] max-h-[75vh]">
            <div className="border-r">
              <div className="p-3 border-b">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search mentors..."
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              <div className="overflow-y-auto max-h-[68vh]">
                {loading && <p className="p-3 text-sm text-gray-500">Loading...</p>}
                {!loading && contacts.length === 0 && <p className="p-3 text-sm text-gray-500">No active mentor chats</p>}
                {contacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => openConversation(contact)}
                    className={`w-full text-left p-3 border-b hover:bg-gray-50 ${selectedContact?.id === contact.id ? 'bg-indigo-50' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-gray-800 truncate">{contact.name}</p>
                      {contact.unread > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-600 text-white">{contact.unread}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">{contact.lastMessage}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 flex flex-col">
              {!selectedContact ? (
                <div className="flex-1 flex items-center justify-center text-gray-500">Select a mentor to start chatting</div>
              ) : (
                <>
                  <div className="p-4 border-b bg-gray-50">
                    <h2 className="font-bold text-lg">{selectedContact.name}</h2>
                  </div>

                  <div className="flex-1 p-4 overflow-y-auto bg-gray-100 space-y-2 max-h-[58vh]">
                    {selectedMessages.length === 0 && <p className="text-sm text-gray-500">No messages yet</p>}
                    {selectedMessages.map((m) => {
                      const mine = String(m.fromId || '') === String(userId || '')
                      const messageId = String(m._id || m.id || '')
                      const canDelete = mine && !!messageId && !messageId.startsWith('legacy-') && !messageId.startsWith('temp-')
                      return (
                        <div key={m._id || m.id || `${m.createdAt}-${m.body}`} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[75%] p-3 rounded-2xl ${mine ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-white text-gray-900 rounded-bl-sm border'}`}>
                            {canDelete && (
                              <div className="flex justify-end mb-1">
                                <button
                                  onClick={() => deleteMessage(m)}
                                  disabled={deletingMessageId === messageId}
                                  className="text-[10px] opacity-90 hover:opacity-100 underline disabled:no-underline"
                                >
                                  {deletingMessageId === messageId ? 'Deleting...' : 'Delete'}
                                </button>
                              </div>
                            )}
                            <p className="text-sm whitespace-pre-wrap">{m.body}</p>
                            <p className={`text-[10px] mt-1 ${mine ? 'text-indigo-100' : 'text-gray-400'}`}>
                              {m.createdAt ? new Date(m.createdAt).toLocaleString() : ''}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="p-3 border-t bg-white flex gap-2">
                    <input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                      placeholder={`Message ${selectedContact.name}...`}
                      className="flex-1 px-3 py-2 border rounded-lg"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={sending || !draft.trim()}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400"
                    >
                      {sending ? 'Sending...' : 'Send'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
