import { Footer } from '../components/Footer.jsx';
import { MentorCard } from '../components/MentorCard.jsx';
import { ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:5000/api';

export const MentorDiscoveryPage = ({ onNavigate }) => {
  const [mentors, setMentors] = useState([]);
  const [filteredMentors, setFilteredMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('All Industries');
  const [selectedExperience, setSelectedExperience] = useState('All Experience Levels');
  const [selectedAvailability, setSelectedAvailability] = useState([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedMentor, setSelectedMentor] = useState(null);
  const [requestForm, setRequestForm] = useState({ topic: '', note: '' });
  const [requestMessage, setRequestMessage] = useState(null);

  useEffect(() => {
    fetchMentors();
  }, []);

  useEffect(() => {
    filterMentors();
  }, [mentors, searchTerm, selectedIndustry, selectedExperience, selectedAvailability]);

  const fetchMentors = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/mentors`);
      const result = await response.json();
      if (result.success) {
        setMentors(result.data);
        setError(null);
      } else {
        setError('Failed to fetch mentors');
      }
    } catch (err) {
      console.error('Error fetching mentors:', err);
      setError('Error fetching mentors. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const filterMentors = () => {
    let filtered = mentors;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(mentor =>
        (mentor.name || mentor.fullName || '').toLowerCase().includes(term) ||
        (mentor.role || '').toLowerCase().includes(term) ||
        (mentor.company || '').toLowerCase().includes(term) ||
        (mentor.skills || []).some((skill) => skill.toLowerCase().includes(term))
      );
    }

    // Industry filter
    if (selectedIndustry !== 'All Industries') {
      filtered = filtered.filter(mentor => mentor.industry === selectedIndustry);
    }

    // Experience filter
    if (selectedExperience !== 'All Experience Levels') {
      filtered = filtered.filter(mentor => mentor.experience === selectedExperience);
    }

    // Availability filter
    if (selectedAvailability.length > 0) {
      filtered = filtered.filter(mentor =>
        selectedAvailability.includes(mentor.availability)
      );
    }

    setFilteredMentors(filtered);
  };

  const handleAvailabilityChange = (availability) => {
    setSelectedAvailability(prev => {
      if (prev.includes(availability)) {
        return prev.filter(a => a !== availability);
      } else {
        return [...prev, availability];
      }
    });
  };

  const handleRequestMentor = (mentorId) => {
    const mentor = mentors.find(m => m.id === mentorId || m._id === mentorId);
    if (mentor) {
      setSelectedMentor(mentor);
      setShowRequestModal(true);
    }
  };

  const submitRequest = async () => {
    if (!requestForm.topic.trim() || !requestForm.note.trim()) {
      setRequestMessage('Please fill in all fields');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setRequestMessage('Please log in to send a request');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/mentorship/requests`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mentorId: selectedMentor?.id || selectedMentor?._id,
          mentorName: selectedMentor?.name || selectedMentor?.fullName,
          topic: requestForm.topic,
          note: requestForm.note
        })
      });

      const result = await response.json();
      if (result.success) {
        setRequestMessage('Request sent successfully!');
        setTimeout(() => {
          setShowRequestModal(false);
          setRequestForm({ topic: '', note: '' });
          setRequestMessage(null);
        }, 2000);
      } else {
        setRequestMessage(result.message || 'Failed to send request');
      }
    } catch (err) {
      console.error('Error sending request:', err);
      setRequestMessage('Network error. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Custom Header with Back Button */}
      <div className="bg-white shadow-sm p-4 md:p-6 border-b">
        <div className="max-w-7xl mx-auto flex flex-col gap-4">
          <button
            onClick={() => onNavigate('student-dashboard')}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold text-sm md:text-base w-fit"
          >
            <ArrowLeft size={18} />
            <span>Back to Dashboard</span>
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800">🔍 Discover Mentors</h1>
            <p className="text-sm md:text-base text-gray-600 mt-2 italic max-w-2xl">"A mentor is someone who allows you to see the hope inside yourself." - Oprah Winfrey</p>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <p className="text-lg text-gray-600">Loading mentors...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <p className="text-red-700">{error}</p>
            <button
              onClick={fetchMentors}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* Success State */}
        {!loading && !error && (
          <>
            {/* Search and Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <input
                type="text"
                placeholder="Search by skill, company, or domain..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="md:col-span-2 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
              />
              <select
                value={selectedIndustry}
                onChange={(e) => setSelectedIndustry(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
              >
                <option>All Industries</option>
                <option>Technology</option>
                <option>Software Development</option>
                <option>Data Science & AI</option>
                <option>Cloud Computing</option>
                <option>Cybersecurity</option>
                <option>Mobile Development</option>
                <option>Web Development</option>
                <option>DevOps</option>
                <option>Product Management</option>
                <option>UI/UX Design</option>
              </select>
              <select
                value={selectedExperience}
                onChange={(e) => setSelectedExperience(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
              >
                <option>All Experience Levels</option>
                <option>0-2 years</option>
                <option>2-5 years</option>
                <option>5-10 years</option>
                <option>10+ years</option>
              </select>
            </div>

            {/* Additional Filters */}
            <div className="bg-white p-4 rounded-lg shadow-md mb-8">
              <h3 className="font-semibold mb-4">Availability</h3>
              <div className="flex gap-4 flex-wrap">
                {["Weekdays", "Weekends", "Evenings", "Flexible"].map((option) => (
                  <label key={option} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 cursor-pointer"
                      checked={selectedAvailability.includes(option)}
                      onChange={() => handleAvailabilityChange(option)}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Mentor Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredMentors.length > 0 ? (
                filteredMentors.map((mentor) => (
                  <div key={mentor.id || mentor._id}>
                    <MentorCard
                      name={mentor.name || mentor.fullName}
                      role={mentor.role}
                      company={mentor.company}
                      skills={mentor.skills || []}
                      experience={mentor.experience}
                      industry={mentor.industry}
                      availability={mentor.availability}
                      matchPercentage={mentor.matchPercentage}
                      photo={mentor.photo}
                      onRequest={() => handleRequestMentor(mentor.id || mentor._id)}
                    />
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <p className="text-gray-600">No mentors found matching your filters.</p>
                </div>
              )}
            </div>

            {/* Results Count */}
            <div className="mt-8 text-center">
              <p className="text-gray-600">Showing {filteredMentors.length} of {mentors.length} mentors</p>
            </div>
          </>
        )}
      </main>

      <Footer />

      {/* Mentorship Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4">Request Mentorship</h2>
            <p className="text-gray-600 mb-4">
              Send a mentorship request to <span className="font-semibold">{selectedMentor?.name || selectedMentor?.fullName}</span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Topic</label>
                <input
                  type="text"
                  value={requestForm.topic}
                  onChange={(e) => setRequestForm({ ...requestForm, topic: e.target.value })}
                  placeholder="e.g., React Development, Career Guidance"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Message</label>
                <textarea
                  value={requestForm.note}
                  onChange={(e) => setRequestForm({ ...requestForm, note: e.target.value })}
                  placeholder="Tell the mentor why you'd like their guidance..."
                  rows={4}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {requestMessage && (
                <div className={`p-3 rounded-lg text-sm ${requestMessage.includes('success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {requestMessage}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowRequestModal(false);
                    setRequestForm({ topic: '', note: '' });
                    setRequestMessage(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={submitRequest}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Send Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
