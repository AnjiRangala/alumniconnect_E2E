import React from 'react'
import { BrandLogo } from './BrandLogo.jsx'

export const Navbar = ({ onNavigate }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const [userMenuOpen, setUserMenuOpen] = React.useState(false)
  const [notifOpen, setNotifOpen] = React.useState(false)
  const [notifications, setNotifications] = React.useState([])
  const [unreadCount, setUnreadCount] = React.useState(0)
  const [user, setUser] = React.useState(null)

  const syncUserFromStorage = React.useCallback(() => {
    try {
      const userData = localStorage.getItem('user')
      setUser(userData ? JSON.parse(userData) : null)
    } catch (_err) {
      setUser(null)
    }
  }, [])

  const fetchNotifications = React.useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) return []
    try {
      const res = await fetch('http://localhost:5000/api/notifications', { headers: { 'Authorization': `Bearer ${token}` } })
      const j = await res.json()
      if (j.success) {
        const data = j.data || []
        setNotifications(data)
        setUnreadCount(data.filter((n) => !n.read).length)
        return data
      }
      return []
    } catch (err) {
      console.error('Failed to fetch notifications', err)
      return []
    }
  }, [])

  const markVisibleNotificationsAsRead = React.useCallback(async (items = notifications) => {
    const unreadItems = (items || []).filter((n) => !n.read)
    if (unreadItems.length === 0) return

    // optimistic update so badge count drops as soon as user opens notifications
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)

    try {
      const token = localStorage.getItem('token')
      if (!token) return

      await Promise.all(
        unreadItems.map((n) =>
          fetch(`http://localhost:5000/api/notifications/${n._id || n.id}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ read: true })
          })
        )
      )
    } catch (err) {
      console.error('Failed to mark notifications as read', err)
      fetchNotifications()
    }
  }, [notifications, fetchNotifications])

  React.useEffect(() => {
    syncUserFromStorage()
    fetchNotifications()
  }, [fetchNotifications, syncUserFromStorage])

  React.useEffect(() => {
    const onUserUpdated = () => syncUserFromStorage()
    const onStorage = () => syncUserFromStorage()
    window.addEventListener('user-updated', onUserUpdated)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('user-updated', onUserUpdated)
      window.removeEventListener('storage', onStorage)
    }
  }, [syncUserFromStorage])

  // Auto-refresh notifications count every 10 seconds
  React.useEffect(() => {
    const interval = setInterval(fetchNotifications, 10000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  React.useEffect(() => {
    if (!notifOpen) return;
    const hydrateAndMarkRead = async () => {
      const items = await fetchNotifications()
      await markVisibleNotificationsAsRead(items)
    }
    hydrateAndMarkRead()
  }, [notifOpen, fetchNotifications, markVisibleNotificationsAsRead])

  const handleLogout = () => {
    localStorage.removeItem('user')
    setUser(null)
    if (onNavigate) onNavigate('landing')
  }

  const isAlumni = String(user?.userType || '').toLowerCase() === 'alumni'

  return (
    <nav className="bg-white shadow-md">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <BrandLogo onClick={() => onNavigate?.('landing')} subtitle={isAlumni ? 'Alumni' : 'Student'} />

          <div className="hidden md:flex items-center gap-4">
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <button onClick={() => setNotifOpen(!notifOpen)} className="relative p-2 rounded-full hover:bg-gray-100">
                🔔
                {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full px-1">{unreadCount}</span>}
              </button>
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg z-20 p-2">
                  <h3 className="px-3 py-2 font-semibold">Notifications</h3>
                  <div className="max-h-64 overflow-auto">
                    {notifications.length === 0 && <p className="px-3 py-2 text-sm text-gray-500">No notifications</p>}
                    {notifications.map((n, idx) => (
                      <div key={idx} className={`px-3 py-2 border-t ${n.read ? 'bg-gray-50' : 'bg-white'}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-medium">{n.message}</p>
                            <p className="text-xs text-gray-500">{n.actorName || ''} • {new Date(n.createdAt).toLocaleString()}</p>
                          </div>
                          <div className="flex flex-col gap-1 ml-2">
                            {!n.read && <button onClick={async () => {
                              const token = localStorage.getItem('token')
                              if (!token) return
                              await fetch(`http://localhost:5000/api/notifications/${n._id || n.id}`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type':'application/json' }, body: JSON.stringify({ read: true }) })
                              setNotifications(prev => prev.map(x => x === n ? { ...x, read: true } : x))
                              setUnreadCount(c => Math.max(0, c - 1))
                            }} className="text-xs text-blue-600">Mark read</button>}
                            <button onClick={async () => {
                              const token = localStorage.getItem('token')
                              if (!token) return
                              await fetch(`http://localhost:5000/api/notifications/${n._id || n.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } })
                              setNotifications(prev => prev.filter(x => x !== n))
                              if (!n.read) setUnreadCount(c => Math.max(0, c - 1))
                            }} className="text-xs text-red-600">Delete</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 bg-blue-100 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-200"
                >
                  👤 {user.fullName?.split(' ')[0] || user.email?.split('@')[0]}
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-10">
                    <button
                      onClick={() => {
                        onNavigate?.('profile')
                        setUserMenuOpen(false)
                      }}
                      className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                    >
                      Profile
                    </button>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600 border-t"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <button
                  onClick={() => onNavigate?.('login')}
                  className="text-gray-700 hover:text-blue-600"
                >
                  Login
                </button>
                <button
                  onClick={() => onNavigate?.('register')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Register
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
