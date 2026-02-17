import { Navbar } from '../components/Navbar.jsx';
import { Footer } from '../components/Footer.jsx';
import { JobCard } from '../components/JobCard.jsx';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';

export const JobsPage = ({ onNavigate }) => {
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('All Locations');
  const [selectedType, setSelectedType] = useState('All Types');
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [applications, setApplications] = useState([]);
  const [applyMessage, setApplyMessage] = useState(null);

  const allLocations = ['Bangalore, Karnataka', 'Hyderabad, Telangana', 'Pune, Maharashtra', 'Mumbai, Maharashtra', 'Chennai, Tamil Nadu', 'Kochi, Kerala', 'Delhi, Delhi NCR'];
  const allTypes = ['Full-time', 'Part-time', 'Internship'];
  const allSkills = ['React', 'Python', 'AWS', 'Data Science', 'UI/UX', 'Node.js', 'MongoDB', 'Machine Learning', 'SQL'];

  // Fetch all jobs
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:5000/api/jobs');
        if (!response.ok) {
          throw new Error('Failed to fetch jobs');
        }
        const data = await response.json();
        setJobs(data.data);
        setFilteredJobs(data.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching jobs:', err);
        setError('Failed to load job openings');
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  // Apply filters whenever search, location, type, or skill changes
  useEffect(() => {
    let filtered = jobs;

    // Filter by skill
    if (selectedSkill) {
      filtered = filtered.filter(j =>
        j.skills.some(s => s.toLowerCase().includes(selectedSkill.toLowerCase()))
      );
    }

    // Filter by location
    if (selectedLocation !== 'All Locations') {
      filtered = filtered.filter(j =>
        j.location.toLowerCase().includes(selectedLocation.toLowerCase())
      );
    }

    // Filter by type
    if (selectedType !== 'All Types') {
      filtered = filtered.filter(j => j.type === selectedType);
    }

    // Search by keyword
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      filtered = filtered.filter(j =>
        j.title.toLowerCase().includes(keyword) ||
        j.company.toLowerCase().includes(keyword) ||
        j.location.toLowerCase().includes(keyword) ||
        j.skills.some(s => s.toLowerCase().includes(keyword))
      );
    }

    setFilteredJobs(filtered);
  }, [searchKeyword, selectedLocation, selectedType, selectedSkill, jobs]);

  // Handle job application
  const handleApplyJob = async (jobId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setApplyMessage({ message: 'Please login to apply for jobs', type: 'error' });
        return;
      }

      const response = await fetch('http://localhost:5000/api/jobs/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ jobId })
      });

      const data = await response.json();

      if (data.success) {
        setApplications([...applications, data.data]);
        setApplyMessage({ message: data.message, type: 'success' });
        setTimeout(() => setApplyMessage(null), 3000);
      } else {
        setApplyMessage({ message: data.message, type: 'error' });
      }
    } catch (err) {
      console.error('Apply error:', err);
      setApplyMessage({ message: 'Failed to submit application', type: 'error' });
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
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800">💼 Jobs & Internships</h1>
            <p className="text-sm md:text-base text-gray-600 mt-2 italic max-w-2xl">"The only way to do great work is to love what you do." - Steve Jobs</p>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">

        {/* Application Success Message */}
        {applyMessage && (
          <div className={`mb-6 p-4 rounded-lg ${applyMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {applyMessage.message}
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <input
              type="text"
              placeholder="Search jobs by role..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
            />
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
            >
              <option>All Locations</option>
              {allLocations.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
            >
              <option>All Types</option>
              {allTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <button
              onClick={() => {
                setSearchKeyword('');
                setSelectedLocation('All Locations');
                setSelectedType('All Types');
                setSelectedSkill(null);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Clear Filters
            </button>
          </div>

          {/* Skill Filter */}
          <div>
            <p className="text-sm font-semibold mb-2">Match by Skills</p>
            <div className="flex flex-wrap gap-2">
              {allSkills.map((skill) => (
                <button
                  key={skill}
                  onClick={() => setSelectedSkill(selectedSkill === skill ? null : skill)}
                  className={`px-3 py-1 rounded-full text-sm transition ${
                    selectedSkill === skill
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                  }`}
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4 text-gray-600">
          Found <span className="font-semibold text-blue-600">{filteredJobs.length}</span> job{filteredJobs.length !== 1 ? 's' : ''}
        </div>

        {/* Jobs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {loading ? (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-600">Loading job openings...</p>
            </div>
          ) : error ? (
            <div className="col-span-full text-center py-12">
              <p className="text-red-600">{error}</p>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-600">No jobs match your criteria. Try adjusting your filters.</p>
            </div>
          ) : (
            filteredJobs.map((job) => (
              <div key={job.id} className="bg-white rounded-lg shadow-md p-5 hover:shadow-lg transition">
                <h3 className="text-lg font-semibold text-gray-800 mb-1">{job.title}</h3>
                <p className="text-sm text-gray-600 mb-3">{job.company}</p>
                <p className="text-sm text-gray-500 mb-2">📍 {job.location}</p>
                <p className="text-sm text-blue-600 font-semibold mb-2">{job.salary}</p>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">{job.type}</span>
                  <span className="text-xs text-gray-500">{job.skills.length} skills</span>
                </div>
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-600 mb-1">Skills:</p>
                  <div className="flex flex-wrap gap-1">
                    {job.skills.slice(0, 2).map(skill => (
                      <span key={skill} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">
                        {skill}
                      </span>
                    ))}
                    {job.skills.length > 2 && (
                      <span className="text-xs text-gray-500">+{job.skills.length - 2}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleApplyJob(job.id)}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 text-sm font-semibold transition"
                >
                  Apply Now
                </button>
              </div>
            ))
          )}
        </div>

        {/* Application Status */}
        {applications.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">📋 Your Applications</h2>
            <div className="space-y-3">
              {applications.map((app, index) => (
                <div key={index} className="flex justify-between items-center p-4 border border-gray-200 rounded-lg">
                  <div>
                    <p className="font-semibold">{app.jobTitle}</p>
                    <p className="text-gray-600 text-sm">{app.company}</p>
                    <p className="text-gray-500 text-xs mt-1">Applied: {new Date(app.appliedAt).toLocaleDateString()}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-700">{app.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};
