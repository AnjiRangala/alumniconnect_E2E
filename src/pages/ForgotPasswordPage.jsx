import { useState, useContext } from 'react';
import { Mail, ArrowLeft } from 'lucide-react';
import { NavigationContext } from '../App.jsx';

const API_BASE_URL = 'http://localhost:5000/api';

export default function ForgotPasswordPage({ onNavigate }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navContext = useContext(NavigationContext);
  const getBackPage = navContext?.getBackPage || (() => 'student-login');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: email.trim() })
      });

      const data = await response.json();

      if (data.success && data?.data?.securityQuestion) {
        sessionStorage.setItem('resetSecurityEmail', String(data.data.email || email.trim()));
        sessionStorage.setItem('resetSecurityQuestion', String(data.data.securityQuestion || ''));
        onNavigate?.('reset-password', { replace: true });
      } else if (data.success) {
        // Backward compatibility: older backend may still return legacy reset-link response.
        // Continue with default security question for legacy users.
        sessionStorage.setItem('resetSecurityEmail', String(email.trim()));
        sessionStorage.setItem('resetSecurityQuestion', 'What is your petname?');
        onNavigate?.('reset-password', { replace: true });
      } else {
        setError(data.message || 'Failed to process request');
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      setError('Server error. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Mail className="w-12 h-12 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Forgot Password?</h1>
          <p className="text-gray-600 mt-2">
            Enter your account email to continue with your security question.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-gray-700 font-semibold mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 rounded-lg transition"
          >
            {loading ? 'Checking...' : 'Continue'}
          </button>

          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={() => onNavigate?.(getBackPage(), { replace: true })}
              className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
