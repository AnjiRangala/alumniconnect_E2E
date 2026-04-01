import { useEffect, useState } from 'react'
import { Mail, Lock, User, Building, Eye, EyeOff, ArrowLeft } from 'lucide-react'

const API_BASE_URL = 'http://localhost:5000/api';
const AP_COLLEGES_FALLBACK = [
  'Andhra University College of Engineering, Visakhapatnam',
  'JNTUA College of Engineering, Anantapur',
  'JNTUK University College of Engineering, Kakinada',
  'SVU College of Engineering, Tirupati',
  'GMR Institute of Technology, Rajam',
  'VR Siddhartha Engineering College, Vijayawada',
  'Vignan\'s Foundation for Science, Technology & Research, Guntur',
  'RVR & JC College of Engineering, Guntur',
  'K L University, Guntur',
  'Lakireddy Bali Reddy College of Engineering, Mylavaram',
  'Vasireddy Venkatadri Institute of Technology, Guntur',
  'Aditya Engineering College, Surampalem',
  'Pragati Engineering College, Surampalem',
  'Sree Vidyanikethan Engineering College, Tirupati',
  'Madanapalle Institute of Technology & Science, Madanapalle',
  'Anil Neerukonda Institute of Technology & Sciences, Visakhapatnam',
  'Gayatri Vidya Parishad College of Engineering, Visakhapatnam',
  'Bapatla Engineering College, Bapatla',
  'PVP Siddhartha Institute of Technology, Vijayawada',
  'NRI Institute of Technology, Guntur',
  'Sri Venkateswara College of Engineering & Technology, Chittoor',
  'QIS College of Engineering & Technology, Ongole',
  'Pace Institute of Technology & Sciences, Ongole',
  'Rajeev Gandhi Memorial College of Engineering & Technology, Nandyal'
]

export function RegisterPage({ onNavigate }) {
  const [userType, setUserType] = useState('student')
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    company: '',
    availability: '',
    institution: '',
    skills: ''
  })
  const [colleges, setColleges] = useState(AP_COLLEGES_FALLBACK)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchColleges = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/institutions/ap-engineering`)
        const result = await response.json()
        if (result?.success && Array.isArray(result.data) && result.data.length > 0) {
          setColleges(result.data)
        }
      } catch (_err) {
        setColleges(AP_COLLEGES_FALLBACK)
      }
    }

    fetchColleges()
  }, [])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)

    // Validation
    if (!formData.fullName || !formData.email || !formData.password || !formData.confirmPassword || !formData.institution) {
      setError('Please fill in all required fields')
      setLoading(false)
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address')
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (userType === 'alumni' && !formData.company) {
      setError('Please enter your company/organization')
      setLoading(false)
      return
    }

    if (userType === 'alumni' && !formData.availability) {
      setError('Please select your availability')
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
          userType,
          company: formData.company || null,
          availability: userType === 'alumni' ? formData.availability : null,
          institution: formData.institution,
          skills: formData.skills
        })
      })

      const result = await response.json()

      if (result.success) {
        // Store user info and token in localStorage
        localStorage.setItem('token', result.data.token)
        localStorage.setItem('user', JSON.stringify(result.data.user))

        setSuccess(true)
        setTimeout(() => {
          const dashboard = userType === 'student' ? 'student-dashboard' : 'alumni-dashboard'
          onNavigate(dashboard)
        }, 2000)
      } else {
        setError(result.message || 'Registration failed')
      }
    } catch (err) {
      console.error('Registration error:', err)
      setError('Failed to connect to server. Make sure backend is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-600 to-blue-800 py-12 px-4">
      <button
        onClick={() => onNavigate('landing')}
        className="mb-6 text-white flex items-center gap-2 hover:bg-blue-700 px-4 py-2 rounded max-w-4xl mx-auto"
      >
        <ArrowLeft size={20} />
        Back
      </button>

      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-auto p-8">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">A</span>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">Create Your Account</h1>
        <p className="text-gray-600 text-center mb-8">Join AlumniConnect and start your journey</p>

        {/* User Type Selection */}
        <div className="mb-8">
          <label className="block text-gray-700 font-semibold mb-4">I am a...</label>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setUserType('student')}
              className={`p-4 rounded-lg border-2 transition font-semibold flex items-center justify-center gap-2 ${
                userType === 'student'
                  ? 'border-blue-600 bg-blue-50 text-blue-600'
                  : 'border-gray-300 text-gray-600 hover:border-blue-400'
              }`}
            >
              <User size={20} />
              Student
            </button>
            <button
              onClick={() => setUserType('alumni')}
              className={`p-4 rounded-lg border-2 transition font-semibold flex items-center justify-center gap-2 ${
                userType === 'alumni'
                  ? 'border-blue-600 bg-blue-50 text-blue-600'
                  : 'border-gray-300 text-gray-600 hover:border-blue-400'
              }`}
            >
              <Building size={20} />
              Alumni
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
            ✓ Registration successful! Redirecting...
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2">Full Name *</label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                placeholder="John Doe"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2">Email Address *</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">Institution (AP Engineering College) *</label>
            <select
              name="institution"
              value={formData.institution}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="">Select your college</option>
              {colleges.map((college) => (
                <option key={college} value={college}>{college}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Used to match students with alumni from the same institute.</p>
          </div>

          {userType === 'alumni' && (
            <>
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Company/Organization *</label>
                <div className="relative">
                  <Building className="absolute left-3 top-3 text-gray-400" size={20} />
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleInputChange}
                    placeholder="Company Name"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">Availability *</label>
                <select
                  name="availability"
                  value={formData.availability}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">Select availability</option>
                  <option value="Weekdays">Weekdays (Mon-Fri)</option>
                  <option value="Weekends">Weekends (Sat-Sun)</option>
                  <option value="Evenings">Evenings (after 6 PM)</option>
                  <option value="Flexible">Flexible (Anytime)</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              Skills (Optional)
            </label>
            <textarea
              name="skills"
              value={formData.skills}
              onChange={handleInputChange}
              placeholder="e.g., JavaScript, UX Design"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            ></textarea>
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">Password *</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">Confirm Password *</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 rounded" required />
            <span className="text-gray-600 text-sm">
              I agree to the Terms and Privacy Policy
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Already have an account?</span>
          </div>
        </div>

        <button
          onClick={() => onNavigate('login')}
          className="w-full border-2 border-blue-600 text-blue-600 py-2 rounded-lg font-semibold hover:bg-blue-50 transition"
        >
          Sign In
        </button>
      </div>
    </div>
  )
}
