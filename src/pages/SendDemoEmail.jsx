import React, { useState } from 'react'
import { Navbar } from '../components/Navbar.jsx'
import { Footer } from '../components/Footer.jsx'
import { ArrowLeft } from 'lucide-react'

const API_BASE_URL = 'http://localhost:5000/api'

export const SendDemoEmail = ({ onNavigate }) => {
  const [recipientEmail, setRecipientEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [messageType, setMessageType] = useState('success')

  const handleSendDemo = async () => {
    if (!recipientEmail.trim()) {
      setMessage('Please enter an email address')
      setMessageType('error')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      setMessage('Please enter a valid email address')
      setMessageType('error')
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setMessage('Please log in first')
        setMessageType('error')
        setLoading(false)
        return
      }

      const response = await fetch(`${API_BASE_URL}/events/send-demo-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ recipientEmail })
      })

      const result = await response.json()

      if (result.success) {
        setMessage(`✅ Demo email sent successfully to ${recipientEmail}`)
        setMessageType('success')
        setRecipientEmail('')
      } else {
        setMessage(result.message || 'Failed to send email')
        setMessageType('error')
      }
    } catch (err) {
      console.error('Error sending email:', err)
      setMessage('Network error. Please check if backend is running.')
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar onNavigate={onNavigate} />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        <button
          onClick={() => onNavigate('alumni-dashboard')}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold text-sm mb-6"
        >
          <ArrowLeft size={18} />
          <span>Back to Dashboard</span>
        </button>

        <div className="bg-white p-8 rounded-lg shadow-md">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">📧 Send Demo Event Email</h1>
            <p className="text-gray-600">Send a sample event registration confirmation email to test the notification system</p>
          </div>

          {message && (
            <div className={`mb-6 p-4 rounded-lg ${messageType === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {message}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipient Email Address
              </label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="student@example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-2">
                Enter the email address where you want to receive the demo email
              </p>
            </div>

            <button
              onClick={handleSendDemo}
              disabled={loading}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold transition"
            >
              {loading ? 'Sending Email...' : 'Send Demo Email'}
            </button>
          </div>

          <div className="mt-10 bg-blue-50 p-6 rounded-lg border border-blue-200">
            <h3 className="font-bold text-gray-800 mb-4">📋 Email Features Included:</h3>
            <ul className="space-y-2 text-gray-700">
              <li>✅ Event title and description</li>
              <li>✅ Date and time formatted clearly</li>
              <li>✅ Location information</li>
              <li>✅ Event category</li>
              <li>✅ Direct join link (if provided)</li>
              <li>✅ Professional HTML formatting</li>
              <li>✅ Call-to-action button</li>
              <li>✅ Unregistration instructions</li>
            </ul>
          </div>

          <div className="mt-8 bg-yellow-50 p-6 rounded-lg border border-yellow-200">
            <h3 className="font-bold text-gray-800 mb-2">⚙️ Setup Instructions:</h3>
            <ol className="space-y-2 text-gray-700 list-decimal list-inside">
              <li>Open your .env file</li>
              <li>Set EMAIL_USER to your Gmail address</li>
              <li>Set EMAIL_PASSWORD to your Gmail app-specific password</li>
              <li>Restart the server</li>
              <li>Emails will now be sent automatically on registration</li>
            </ol>
            <p className="text-xs text-yellow-700 mt-3">
              💡 To get a Gmail app password: Go to Google Account → Security → App passwords (requires 2FA enabled)
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
