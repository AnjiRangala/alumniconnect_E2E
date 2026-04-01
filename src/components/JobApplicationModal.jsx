import { X, Upload } from 'lucide-react';
import { useState, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:5000/api';

export const JobApplicationModal = ({ job, isOpen, onClose, onSubmit, studentEmail = '' }) => {
  const [formData, setFormData] = useState({
    phoneNumber: '',
    resume: null,
    resumeFileName: '',
    statementOfPurpose: ''
  });
  const [resumePreview, setResumePreview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [userActivity, setUserActivity] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  useEffect(() => {
    if (isOpen) {
      console.log('Modal opened, fetching activity...');
      fetchUserActivity();
    }
  }, [isOpen]);

  const fetchUserActivity = async () => {
    setLoadingActivity(true);
    setUserActivity([]); // Clear previous activities
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token found in localStorage');
        setUserActivity([{
          activity: '🔓 Please log in to see your activity',
          date: 'Not logged in'
        }]);
        setLoadingActivity(false);
        return;
      }

      console.log('🔍 Fetching user profile for activity with token...');
      const response = await fetch(`${API_BASE_URL}/auth/profile?timestamp=${Date.now()}`, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      console.log('📊 Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ Full activity fetch result:', result);
      
      if (result.success && result.data) {
        const activities = [];
        const userData = result.data;
        
        console.log('👤 User data available:', {
          skills: userData.skills?.length,
          projects: userData.projects?.length,
          badges: userData.badges?.length,
          endorsements: userData.endorsements?.length,
          email: userData.email
        });
        
        // Add endorsements
        if (userData.endorsements && userData.endorsements.length > 0) {
          userData.endorsements.forEach(endorsement => {
            activities.push({
              activity: `🏆 Endorsed skill: ${endorsement.skill}`,
              date: 'Recently'
            });
          });
        }
        
        // Add projects
        if (userData.projects && userData.projects.length > 0) {
          userData.projects.slice(0, 3).forEach(project => {
            const projectDate = project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'Recently';
            activities.push({
              activity: `💼 Created project: ${project.title}`,
              date: projectDate
            });
          });
        }
        
        // Add badges
        if (userData.badges && userData.badges.length > 0) {
          userData.badges.slice(0, 2).forEach(badge => {
            const badgeDate = badge.awardedAt ? new Date(badge.awardedAt).toLocaleDateString() : 'Recently';
            activities.push({
              activity: `🎖️ Earned badge: ${badge.name}`,
              date: badgeDate
            });
          });
        }
        
        // Add skills summary
        if (userData.skills && userData.skills.length > 0) {
          const skillsText = userData.skills.slice(0, 3).join(', ');
          activities.push({
            activity: `⚙️ Has ${userData.skills.length} skills: ${skillsText}${userData.skills.length > 3 ? '...' : ''}`,
            date: 'Updated'
          });
        }
        
        // If no activities, show registration
        if (activities.length === 0) {
          activities.push({
            activity: '🌟 Profile created',
            date: userData.registrationDate ? new Date(userData.registrationDate).toLocaleDateString() : 'Recently'
          });
        }
        
        console.log('📋 Final activities to display:', activities);
        setUserActivity(activities.slice(0, 5));
      } else {
        console.log('❌ Result not successful or no data:', result);
        setUserActivity([{
          activity: '⚠️ Could not fetch activity data',
          date: 'Error'
        }]);
      }
    } catch (error) {
      console.error('🔴 Error fetching user activity:', error);
      setUserActivity([{
        activity: '⚠️ Error loading activity - ' + error.message,
        date: 'Error'
      }]);
    } finally {
      setLoadingActivity(false);
    }
  };

  if (!isOpen) return null;

  const handlePhoneChange = (e) => {
    setFormData({
      ...formData,
      phoneNumber: e.target.value
    });
    setError(null);
  };

  const handleStatementChange = (e) => {
    setFormData({
      ...formData,
      statementOfPurpose: e.target.value
    });
    setError(null);
  };

  const handleResumeChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a PDF or Word document');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    // Convert file to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData({
        ...formData,
        resume: reader.result,
        resumeFileName: file.name
      });
      setResumePreview(file.name);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    if (!formData.phoneNumber.trim()) {
      setError('Phone number is required');
      return;
    }

    if (!formData.resume) {
      setError('Resume is required');
      return;
    }

    if (!formData.statementOfPurpose.trim()) {
      setError('Statement of purpose is required');
      return;
    }

    if (formData.statementOfPurpose.trim().length < 20) {
      setError('Statement of purpose must be at least 20 characters');
      return;
    }

    // Validate phone number format
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(formData.phoneNumber.replace(/\D/g, ''))) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      // Reset form on successful submission
      setFormData({
        phoneNumber: '',
        resume: null,
        resumeFileName: '',
        statementOfPurpose: ''
      });
      setResumePreview('');
    } catch (err) {
      setError(err.message || 'Failed to submit application');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 flex justify-between items-start sticky top-0">
          <div>
            <h2 className="text-2xl font-bold">{job.title}</h2>
            <p className="text-blue-100 mt-1">{job.company}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-blue-700 p-2 rounded-full transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Job Details Summary */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-3">Job Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Location</p>
                <p className="font-semibold text-gray-800">📍 {job.location}</p>
              </div>
              <div>
                <p className="text-gray-600">Job Type</p>
                <p className="font-semibold text-gray-800">💼 {job.jobType}</p>
              </div>
              {job.salary && (
                <div>
                  <p className="text-gray-600">Salary</p>
                  <p className="font-semibold text-gray-800">💰 {job.salary}</p>
                </div>
              )}
              <div>
                <p className="text-gray-600">Required Skills</p>
                <p className="font-semibold text-gray-800">{job.requiredSkills?.length || 0} skills</p>
              </div>
            </div>
          </div>

          {/* User Activity Timeline - DYNAMIC SECTION */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-lg border-2 border-blue-300 shadow-md">
            <h3 className="font-bold text-lg text-gray-800 mb-4">📅 Your Recent Activity (Live from Profile)</h3>
            <div className="space-y-3">
              {loadingActivity ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  <p className="text-gray-700 font-semibold">Loading your activity...</p>
                </div>
              ) : userActivity.length > 0 ? (
                userActivity.map((item, index) => (
                  <div key={index} className="flex gap-3 pb-3 border-b border-blue-100 last:border-b-0">
                    <div className="w-3 h-3 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full mt-1 flex-shrink-0 shadow-sm"></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900">{item.activity}</p>
                      <p className="text-gray-500 text-xs mt-1">📆 {item.date}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-blue-100 border border-blue-300 rounded p-3">
                  <p className="text-blue-900 font-medium text-sm">✨ No activity yet. Start by adding skills, projects, or endorsements to your profile!</p>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-600 mt-3 italic">💡 Activity data is fetched live from your profile</p>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Phone Number *
            </label>
            <input
              type="tel"
              placeholder="Enter 10-digit phone number (e.g., 9876543210)"
              value={formData.phoneNumber}
              onChange={handlePhoneChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              maxLength="20"
            />
            <p className="text-xs text-gray-500 mt-1">We'll use this to contact you about your application</p>
          </div>

          {/* Resume Upload */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Upload Resume *
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition">
              <input
                type="file"
                id="resume-upload"
                accept=".pdf,.doc,.docx"
                onChange={handleResumeChange}
                className="hidden"
              />
              <label htmlFor="resume-upload" className="cursor-pointer">
                <Upload className="mx-auto mb-2 text-gray-400" size={32} />
                <p className="text-gray-700 font-semibold">
                  {resumePreview ? (
                    <span className="text-green-600">✓ {resumePreview}</span>
                  ) : (
                    <>
                      Click to upload or drag and drop<br />
                      <span className="text-xs text-gray-500">(PDF, DOC, DOCX - Max 5MB)</span>
                    </>
                  )}
                </p>
              </label>
            </div>
          </div>

          {/* Statement of Purpose */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Statement of Purpose *
            </label>
            <textarea
              placeholder="Why do you want to apply for this position? Share your motivations, relevant experience, and what you can contribute to the role. (Minimum 20 characters)"
              value={formData.statementOfPurpose}
              onChange={handleStatementChange}
              rows="5"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Character count: {formData.statementOfPurpose.length} (Minimum 20)
            </p>
          </div>

          {/* Current Email Display */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email Address
            </label>
            <div className="px-4 py-2 bg-gray-100 rounded-lg border border-gray-300">
              <p className="text-gray-700">{studentEmail || 'Loading...'}</p>
            </div>
            <p className="text-xs text-gray-500 mt-1">Your application will be sent to this email</p>
          </div>

          {/* Buttons */}
          <div className="flex gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold transition text-white ${
                isSubmitting
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
