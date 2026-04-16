import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

const API_BASE_URL = 'http://localhost:5000/api';

export const JobApplicationModal = ({ job, isOpen, onClose, onSubmit, studentEmail = '', profileResume = null, onProfileResumeUpdated = null }) => {
  const [formData, setFormData] = useState({
    phoneNumber: '',
    resume: null,
    resumeFileName: '',
    statementOfPurpose: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [currentResume, setCurrentResume] = useState(profileResume || null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setCurrentResume(profileResume || null);
  }, [profileResume, isOpen]);

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

  const handleResumeChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf = file.type === 'application/pdf' || String(file.name || '').toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setError('Only PDF resumes are allowed');
      e.target.value = '';
      return;
    }

    const MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_RESUME_SIZE_BYTES) {
      setError('Resume must be 5 MB or smaller');
      e.target.value = '';
      return;
    }

    setError(null);
    setIsUploadingResume(true);

    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = String(event?.target?.result || '');
          const extracted = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
          if (!extracted) {
            reject(new Error('Invalid resume data'));
            return;
          }
          resolve(extracted);
        };
        reader.onerror = () => reject(new Error('Unable to read selected file'));
        reader.readAsDataURL(file);
      });

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Please login again to update resume');
      }

      const uploadResponse = await fetch(`${API_BASE_URL}/profile/upload-resume`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          resumeBase64: base64,
          fileName: file.name
        })
      });

      const uploadResult = await uploadResponse.json();
      if (!uploadResponse.ok || !uploadResult.success) {
        throw new Error(uploadResult.message || 'Failed to update resume');
      }

      setFormData((prev) => ({
        ...prev,
        resume: base64,
        resumeFileName: file.name
      }));

      const updatedResume = uploadResult?.data?.resume || {
        fileName: file.name,
        uploadedAt: new Date().toISOString()
      };
      setCurrentResume(updatedResume);

      if (typeof onProfileResumeUpdated === 'function') {
        onProfileResumeUpdated(updatedResume);
      }
    } catch (uploadErr) {
      setError(uploadErr.message || 'Failed to update resume');
    } finally {
      setIsUploadingResume(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    if (!formData.phoneNumber.trim()) {
      setError('Phone number is required');
      return;
    }

    if (!currentResume?.fileName && !formData.resume) {
      setError('Please upload your resume in Student Profile before applying');
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

          {/* Resume from profile */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Resume *
            </label>
            <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
              {currentResume?.fileName ? (
                <>
                  <p className="text-sm font-semibold text-green-700">✓ Resume ready for application</p>
                  <p className="text-sm text-gray-800 mt-1">{currentResume.fileName}</p>
                  {currentResume.uploadedAt && (
                    <p className="text-xs text-gray-500 mt-1">Uploaded: {new Date(currentResume.uploadedAt).toLocaleDateString()}</p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-red-600">No resume found in your profile</p>
                  <p className="text-xs text-gray-600 mt-1">Please upload a PDF resume in Student Profile (max 5 MB), then apply.</p>
                </>
              )}

              <div className="mt-3 pt-3 border-t border-gray-200">
                <label className="block text-xs font-semibold text-gray-700 mb-2">Replace with updated resume (PDF, max 5 MB)</label>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={handleResumeChange}
                  disabled={isUploadingResume || isSubmitting}
                  className="w-full text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-100 file:px-3 file:py-2 file:text-blue-700 file:font-semibold hover:file:bg-blue-200"
                />
                <p className="text-xs text-gray-500 mt-2">
                  {isUploadingResume
                    ? 'Updating resume...'
                    : 'The updated resume will be used for this application and visible in alumni job applications.'}
                </p>
              </div>
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
