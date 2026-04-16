import { BrandLogo } from '../components/BrandLogo.jsx';
import { Footer } from '../components/Footer.jsx';
import { JobApplicationModal } from '../components/JobApplicationModal.jsx';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const API_BASE_URL = 'http://localhost:5000/api';

export const JobsPage = ({ onNavigate }) => {
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('All Locations');
  const [selectedType, setSelectedType] = useState('All Types');
  const [myApplicationIds, setMyApplicationIds] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [cachedAppliedIds, setCachedAppliedIds] = useState([]);
  const [cachedAppliedSignatures, setCachedAppliedSignatures] = useState([]);
  const [applicationsLoaded, setApplicationsLoaded] = useState(false);
  const [applyMessage, setApplyMessage] = useState(null);
  const [selectedJobForApplication, setSelectedJobForApplication] = useState(null);
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);
  const [studentEmail, setStudentEmail] = useState('');
  const [studentProfileResume, setStudentProfileResume] = useState(null);

  const allLocations = useMemo(() => {
    const defaults = ['Remote', 'Bengaluru', 'Hyderabad', 'Pune', 'Mumbai', 'Chennai', 'Delhi', 'Kochi'];
    const fromJobs = jobs.map(j => (j?.location || '').trim()).filter(Boolean);
    return [...new Set([...defaults, ...fromJobs])];
  }, [jobs]);

  const allTypes = useMemo(() => {
    const defaults = ['Full-time', 'Part-time', 'Internship', 'Contract'];
    const fromJobs = jobs.map(j => (j?.jobType || '').trim()).filter(Boolean);
    return [...new Set([...defaults, ...fromJobs])];
  }, [jobs]);

  const normalize = (value) => String(value || '').trim().toLowerCase();
  const normalizeForKey = (value) => normalize(value).replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();

  const getJobId = (job) => String(job?._id || job?.id || job?.jobId || '');

  const formatSalaryDisplay = (salary) => {
    const raw = String(salary || '').trim();
    if (!raw) return '';
    // Some records were created from terminal with '?' replacing the rupee symbol.
    return raw.replace(/\?/g, '₹').replace(/\s{2,}/g, ' ');
  };

  const getSingleLineDescription = (description) => {
    const cleaned = String(description || '')
      .replace(/\s+/g, ' ')
      .replace(/\s*(\.\.\.|…)\s*$/g, '')
      .trim();

    if (!cleaned) return 'No description provided.';

    const sentenceParts = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean);
    const firstSentence = sentenceParts[0] || cleaned;
    if (firstSentence.length <= 95) return firstSentence;

    const words = cleaned.split(' ');
    let concise = '';
    for (const word of words) {
      const next = concise ? `${concise} ${word}` : word;
      if (next.length > 95) break;
      concise = next;
    }

    return concise || cleaned.slice(0, 95);
  };

  const getApplicationJobId = (application) => {
    const raw = application?.jobId;
    if (!raw) return '';
    if (typeof raw === 'string') return String(raw);
    return String(raw?._id || raw?.id || '');
  };

  const getJobSignature = (jobLike) => {
    const title = normalizeForKey(jobLike?.title);
    const company = normalizeForKey(jobLike?.company);
    const location = normalizeForKey(jobLike?.location);
    const type = normalizeForKey(jobLike?.jobType);
    return `${title}::${company}::${location}::${type}`;
  };

  const dedupeJobs = (list = []) => {
    const map = new Map();
    (list || []).forEach((job) => {
      const key = getJobSignature(job);
      if (!key) return;
      const prev = map.get(key);
      if (!prev) {
        map.set(key, job);
        return;
      }

      const prevTs = new Date(prev?.createdAt || 0).getTime();
      const curTs = new Date(job?.createdAt || 0).getTime();
      const prevScore = Number.isNaN(prevTs) ? 0 : prevTs;
      const curScore = Number.isNaN(curTs) ? 0 : curTs;
      if (curScore >= prevScore) map.set(key, job);
    });
    return Array.from(map.values());
  };

  const getCurrentUserCacheKey = () => {
    try {
      const raw = localStorage.getItem('user');
      const parsed = raw ? JSON.parse(raw) : {};
      const idPart = String(parsed?._id || parsed?.id || parsed?.email || 'guest');
      return `student-applied-jobs-${idPart}`;
    } catch {
      return 'student-applied-jobs-guest';
    }
  };

  const loadAppliedCache = () => {
    try {
      const key = getCurrentUserCacheKey();
      const parsed = JSON.parse(localStorage.getItem(key) || '{}');
      const ids = Array.isArray(parsed?.ids) ? parsed.ids.map((x) => String(x)).filter(Boolean) : [];
      const signatures = Array.isArray(parsed?.signatures) ? parsed.signatures.map((x) => String(x)).filter(Boolean) : [];
      setCachedAppliedIds(ids);
      setCachedAppliedSignatures(signatures);
    } catch {
      setCachedAppliedIds([]);
      setCachedAppliedSignatures([]);
    }
  };

  const saveAppliedCache = (ids = [], signatures = []) => {
    try {
      const key = getCurrentUserCacheKey();
      localStorage.setItem(key, JSON.stringify({ ids, signatures }));
      setCachedAppliedIds(ids);
      setCachedAppliedSignatures(signatures);
    } catch {
      // ignore localStorage write errors
    }
  };

  const appliedSignatures = useMemo(() => {
    const signatures = (myApplications || [])
      .map((app) => getJobSignature(app?.jobId || {}))
      .filter(Boolean);
    return new Set([...signatures, ...cachedAppliedSignatures]);
  }, [myApplications, cachedAppliedSignatures]);

  useEffect(() => {
    loadAppliedCache();
  }, []);

  const isDeadlinePassed = (job) => {
    if (!job?.applicationDeadline) return false;
    const ts = new Date(job.applicationDeadline).getTime();
    if (Number.isNaN(ts)) return false;
    return Date.now() > ts;
  };

  const formatDeadline = (deadline) => {
    if (!deadline) return 'N/A';
    const d = new Date(deadline);
    if (Number.isNaN(d.getTime())) return 'N/A';
    return d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getApplicationProgress = (status) => {
    const s = String(status || 'applied').toLowerCase();
    if (s === 'accepted') return 100;
    if (s === 'rejected') return 100;
    if (s === 'interview') return 80;
    if (s === 'shortlisted') return 60;
    return 25;
  };

  const getStatusPillClass = (status) => {
    const s = String(status || 'applied').toLowerCase();
    if (s === 'accepted') return 'bg-green-100 text-green-700';
    if (s === 'rejected') return 'bg-red-100 text-red-700';
    if (s === 'interview') return 'bg-purple-100 text-purple-700';
    if (s === 'shortlisted') return 'bg-blue-100 text-blue-700';
    return 'bg-yellow-100 text-yellow-700';
  };

  const formatStatusLabel = (status) => {
    const s = String(status || 'applied').toLowerCase();
    if (!s) return 'Applied';
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  // Fetch all jobs
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/jobs`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (!response.ok) {
          throw new Error('Failed to fetch jobs');
        }
        const data = await response.json();
        if (data.success) {
          const normalizedJobs = (data.data || []).map((job) => ({
            ...job,
            salary: formatSalaryDisplay(job?.salary)
          }));
          const deduped = dedupeJobs(normalizedJobs);
          setJobs(deduped);
          setFilteredJobs(deduped);
        } else {
          setError('Failed to load jobs');
        }
      } catch (err) {
        console.error('Error fetching jobs:', err);
        setError('Failed to load job openings');
      } finally {
        setLoading(false);
      }
    };

    // Also fetch user's applications and profile
    const fetchMyApplications = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        // Fetch applications
        const response = await fetch(`${API_BASE_URL}/jobs/my-applications`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success) {
          setMyApplications(data.data || []);
          const appliedIds = (data.data || []).map(getApplicationJobId).filter(Boolean);
          const appliedSigs = (data.data || []).map((app) => getJobSignature(app?.jobId || {})).filter(Boolean);
          console.log('✅ Fetched applications:', appliedIds);
          setMyApplicationIds(appliedIds);
          saveAppliedCache(Array.from(new Set(appliedIds)), Array.from(new Set(appliedSigs)));
        }

        // Fetch user profile to get email
        try {
          const profileResponse = await fetch(`${API_BASE_URL}/auth/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const profileData = await profileResponse.json();
          if (profileData.success && profileData.data?.email) {
            setStudentEmail(profileData.data.email);
            setStudentProfileResume(profileData.data.resume || null);
          } else {
            // Fallback to localStorage
            const user = localStorage.getItem('user');
            if (user) {
              const userData = JSON.parse(user);
              setStudentEmail(userData.email || '');
              setStudentProfileResume(userData.resume || null);
            }
          }
        } catch (profileErr) {
          // Fallback to localStorage if endpoint fails
          const user = localStorage.getItem('user');
          if (user) {
            const userData = JSON.parse(user);
            setStudentEmail(userData.email || '');
            setStudentProfileResume(userData.resume || null);
          }
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setApplicationsLoaded(true);
      }
    };

    fetchJobs();
    fetchMyApplications();
  }, []);

  // Apply filters whenever search, location, or type changes
  useEffect(() => {
    let filtered = jobs;

    // Filter by location
    if (selectedLocation !== 'All Locations') {
      filtered = filtered.filter(j =>
        normalize(j.location).includes(normalize(selectedLocation))
      );
    }

    // Filter by type
    if (selectedType !== 'All Types') {
      filtered = filtered.filter(j => normalize(j.jobType) === normalize(selectedType));
    }

    // Search by keyword
    if (searchKeyword) {
      const keyword = normalize(searchKeyword);
      filtered = filtered.filter(j =>
        normalize(j.title).includes(keyword) ||
        normalize(j.company).includes(keyword) ||
        normalize(j.location).includes(keyword) ||
        normalize(j.jobType).includes(keyword) ||
        (Array.isArray(j.requiredSkills) && j.requiredSkills.some(s => normalize(s).includes(keyword))) ||
        normalize(j.description).includes(keyword)
      );
    }

    setFilteredJobs(dedupeJobs(filtered));
  }, [searchKeyword, selectedLocation, selectedType, jobs]);

  // Handle job application - now opens modal instead of direct API call
  const handleApplyJobClick = async (job) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setApplyMessage({ message: 'Please login to apply for jobs', type: 'error' });
        setTimeout(() => setApplyMessage(null), 3000);
        return;
      }

      const jobId = getJobId(job);
      const alreadyApplied = [...myApplicationIds, ...cachedAppliedIds].some((id) => String(id) === jobId);
      const alreadyAppliedBySignature = appliedSignatures.has(getJobSignature(job));
      if (alreadyApplied || alreadyAppliedBySignature) {
        setApplyMessage({ message: 'Already applied for this job', type: 'error' });
        setTimeout(() => setApplyMessage(null), 3000);
        return;
      }

      if (isDeadlinePassed(job)) {
        setApplyMessage({ message: 'Application deadline has passed for this job', type: 'error' });
        setTimeout(() => setApplyMessage(null), 3000);
        return;
      }

      // Set the selected job and open modal
      setSelectedJobForApplication(job);
      setIsApplicationModalOpen(true);
    } catch (err) {
      console.error('Error:', err);
      setApplyMessage({ message: 'An error occurred', type: 'error' });
      setTimeout(() => setApplyMessage(null), 3000);
    }
  };

  // Handle form submission from modal
  const handleApplicationSubmit = async (formData) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setApplyMessage({ message: 'Please login to apply for jobs', type: 'error' });
        setTimeout(() => setApplyMessage(null), 3000);
        return;
      }

      if (isDeadlinePassed(selectedJobForApplication)) {
        throw new Error('Application deadline has passed for this job');
      }

      console.log('📝 Submitting application for job:', selectedJobForApplication._id);
      console.log('📝 Form data:', { phoneNumber: formData.phoneNumber, resumeFileName: formData.resumeFileName });

      const response = await fetch(`${API_BASE_URL}/jobs/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          jobId: selectedJobForApplication._id,
          phoneNumber: formData.phoneNumber,
          resume: formData.resume || null,
          resumeFileName: formData.resumeFileName || studentProfileResume?.fileName || '',
          statementOfPurpose: formData.statementOfPurpose
        })
      });

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const rawText = await response.text();
        if (rawText?.startsWith('<!DOCTYPE')) {
          throw new Error('Server returned HTML instead of JSON. Please ensure backend is running on port 5000.');
        }
        throw new Error('Invalid server response');
      }

      const data = await response.json();
      console.log('✅ API Response:', data);

      if (response.ok && data.success) {
        // Immediately add to myApplicationIds with proper ID format
        const newId = getJobId(selectedJobForApplication);
        const updatedIds = [...myApplicationIds, newId];
        const newSignature = getJobSignature(selectedJobForApplication);
        const updatedSignatures = Array.from(new Set([...(cachedAppliedSignatures || []), newSignature]));
        console.log('✅ Updated myApplicationIds with job:', newId);
        console.log('✅ All IDs now:', updatedIds);
        setMyApplicationIds(updatedIds);
        saveAppliedCache(Array.from(new Set([...(cachedAppliedIds || []), ...updatedIds])), updatedSignatures);
        
        setApplyMessage({ message: 'Application submitted successfully! 🎉', type: 'success' });
        setTimeout(() => setApplyMessage(null), 3000);
        setIsApplicationModalOpen(false);
        setSelectedJobForApplication(null);
        
        // Force re-fetch to ensure backend sync
        setTimeout(async () => {
          try {
            const refreshResponse = await fetch(`${API_BASE_URL}/jobs/my-applications`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const refreshData = await refreshResponse.json();
            if (refreshData.success) {
              setMyApplications(refreshData.data || []);
              const refreshedIds = (refreshData.data || []).map(getApplicationJobId).filter(Boolean);
              const refreshedSigs = (refreshData.data || []).map((app) => getJobSignature(app?.jobId || {})).filter(Boolean);
              setMyApplicationIds(refreshedIds);
              saveAppliedCache(Array.from(new Set(refreshedIds)), Array.from(new Set(refreshedSigs)));
            }
          } catch (refreshErr) {
            console.error('Error refreshing applications:', refreshErr);
          }
        }, 300);
      } else {
        const backendMessage = String(data.message || 'Failed to submit application');
        if (backendMessage.toLowerCase().includes('already applied')) {
          const jobId = String(selectedJobForApplication?._id || selectedJobForApplication?.id || '');
          setMyApplicationIds((prev) => Array.from(new Set([...prev, jobId])));
          setIsApplicationModalOpen(false);
          setSelectedJobForApplication(null);
        }
        throw new Error(backendMessage);
      }
    } catch (err) {
      console.error('Apply error:', err);
      throw new Error(err.message || 'Network error. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="px-4 py-3 md:py-4">
          <BrandLogo subtitle="Student" />
        </div>
      </div>

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => onNavigate('student-dashboard')}
            className="flex items-center gap-2 text-blue-100 hover:text-white font-semibold text-sm mb-4"
          >
            <ArrowLeft size={18} />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="text-3xl md:text-4xl font-bold">💼 Job Openings</h1>
          <p className="text-blue-100 mt-2">Browse and apply to exciting opportunities from our partner companies</p>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">

        {/* Application Message */}
        {applyMessage && (
          <div className={`mb-6 p-4 rounded-lg font-semibold flex justify-between items-center ${applyMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            <span>{applyMessage.message}</span>
            <button onClick={() => setApplyMessage(null)} className="text-xl">×</button>
          </div>
        )}

        {/* My Application Progress */}
        {myApplications.length > 0 && (
          <div className="bg-white p-4 rounded-lg shadow-md mb-6 border border-blue-100">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-800">📋 My Application Progress</h2>
              <span className="text-sm text-gray-500">{myApplications.length} applied</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-auto pr-1">
              {myApplications.map((app) => {
                const jobTitle = app?.jobId?.title || 'Job Application';
                const company = app?.jobId?.company || '';
                const status = String(app?.status || 'applied');
                const progress = getApplicationProgress(status);
                return (
                  <div key={app?._id || `${jobTitle}-${status}`} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm text-gray-800 line-clamp-1">{jobTitle}</p>
                        {company && <p className="text-xs text-gray-500 line-clamp-1">{company}</p>}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${getStatusPillClass(status)}`}>
                        {formatStatusLabel(status)}
                      </span>
                    </div>
                    <div className="mt-2">
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className={`h-2 rounded-full ${status === 'rejected' ? 'bg-red-500' : status === 'accepted' ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }} />
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1">Updated: {formatDeadline(app?.updatedAt || app?.appliedAt)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <input
              type="text"
              placeholder="Search jobs by title or company..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option>All Locations</option>
              {allLocations.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
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
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-semibold"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4 text-gray-600">
          Found <span className="font-semibold text-blue-600">{filteredJobs.length}</span> job{filteredJobs.length !== 1 ? 's' : ''}
        </div>

        {/* Jobs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {loading ? (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-600">Loading job openings...</p>
            </div>
          ) : error ? (
            <div className="col-span-full text-center py-12">
              <p className="text-red-600 font-semibold">{error}</p>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-600">No jobs match your criteria. Try adjusting your filters.</p>
            </div>
          ) : (
            filteredJobs.map((job) => {
              const jobIdStr = getJobId(job);
              const deadlinePassed = isDeadlinePassed(job);
              const hasAppliedById = myApplicationIds.some(id => {
                const match = String(id) === jobIdStr;
                if (job.title === 'Java Developer') {
                  console.log(`🔍 Checking ${job.title}: ID=${jobIdStr}, ApplicationID=${String(id)}, Match=${match}`);
                }
                return match;
              });
              const hasAppliedByCacheId = (cachedAppliedIds || []).some((id) => String(id) === jobIdStr);
              const hasAppliedBySignature = appliedSignatures.has(getJobSignature(job));
              const hasApplied = hasAppliedById || hasAppliedByCacheId || hasAppliedBySignature;
              
              if (job.title === 'Java Developer') {
                console.log(`✅ Java Developer - Applied: ${hasApplied}, IDs: ${JSON.stringify(myApplicationIds)}`);
              }
              
              return (
                <div key={jobIdStr} className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition border border-blue-100">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800 leading-tight">{job.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{job.company}</p>
                    </div>
                    {hasApplied && (
                      <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full font-semibold">Already Applied ✓</span>
                    )}
                  </div>
                  
                  <div className="space-y-1 mb-1">
                    <p className="text-sm text-gray-700">📍 {job.location}</p>
                    {job.salary && <p className="text-base text-green-600 font-bold">💰 {formatSalaryDisplay(job.salary)}</p>}
                  </div>

                  {job.applicationDeadline && (
                    <p className={`text-sm font-semibold mb-2 ${deadlinePassed ? 'text-red-600' : 'text-blue-700'}`}>
                      ⏳ Apply by: {formatDeadline(job.applicationDeadline)} IST
                    </p>
                  )}
                  
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded-md font-semibold">{job.jobType}</span>
                    {job.requiredSkills && <span className="text-xs text-gray-500">{job.requiredSkills.length} skills</span>}
                  </div>
                  
                  {job.requiredSkills && job.requiredSkills.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-semibold text-gray-700 mb-1">Required Skills:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {job.requiredSkills.slice(0, 3).map(skill => (
                          <span key={skill} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded whitespace-nowrap">
                            {skill}
                          </span>
                        ))}
                        {job.requiredSkills.length > 3 && (
                          <span className="text-xs text-gray-500">+{job.requiredSkills.length - 3}</span>
                        )}
                      </div>
                    </div>
                  )}

                  <p className="text-sm text-gray-700 mb-3 whitespace-normal break-words leading-6">{getSingleLineDescription(job.description)}</p>
                  
                  {hasApplied ? (
                    <div className="w-full py-2 rounded-lg text-sm font-semibold bg-green-100 text-green-700 text-center">
                      Already Applied
                    </div>
                  ) : (
                    <button
                      onClick={() => handleApplyJobClick(job)}
                      disabled={deadlinePassed || !applicationsLoaded}
                      className={`w-full py-2 rounded-lg text-sm font-semibold transition ${
                        deadlinePassed || !applicationsLoaded
                          ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {!applicationsLoaded ? 'Checking...' : deadlinePassed ? 'Deadline Passed' : 'Apply Now'}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Job Application Modal */}
      {selectedJobForApplication && (
        <JobApplicationModal
          job={selectedJobForApplication}
          isOpen={isApplicationModalOpen}
          onClose={() => {
            setIsApplicationModalOpen(false);
            setSelectedJobForApplication(null);
          }}
          onSubmit={handleApplicationSubmit}
          studentEmail={studentEmail}
          profileResume={studentProfileResume}
          onProfileResumeUpdated={(updatedResume) => {
            setStudentProfileResume(updatedResume || null)
            try {
              const raw = localStorage.getItem('user')
              const parsed = raw ? JSON.parse(raw) : {}
              localStorage.setItem('user', JSON.stringify({ ...parsed, resume: updatedResume || null }))
            } catch {
              // ignore localStorage parse/write errors
            }
          }}
        />
      )}

      <Footer />
    </div>
  );
};
