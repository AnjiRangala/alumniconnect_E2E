import { Footer } from '../components/Footer';
import { BadgeModal } from '../components/BadgeModal'
import { ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';

interface ProfilePageProps {
  onNavigate: (page: string) => void
}

const API_BASE_URL = 'http://localhost:5000/api';

export const ProfilePage = ({ onNavigate }: ProfilePageProps) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [skillsInput, setSkillsInput] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [visitors, setVisitors] = useState<Array<any>>([]);
  const [stats, setStats] = useState<any>(null);
  const [messageOpen, setMessageOpen] = useState(false);
  const [msgSubject, setMsgSubject] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [selectedBadge, setSelectedBadge] = useState<any | null>(null)

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      const viewUserId = localStorage.getItem('viewUserId')
      if (viewUserId) {
        // load public profile by id
        const response = await fetch(`${API_BASE_URL}/users/${viewUserId}`)
        const result = await response.json()
        if (result.success) {
          setUser(result.data)
          setLinkedinUrl(result.data.linkedinUrl || '')
          setGithubUrl(result.data.githubUrl || '')
        } else {
          setError(result.message || 'Failed to load profile')
        }
        // clear the viewUserId after loading
        localStorage.removeItem('viewUserId')
      } else {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Please login to view your profile');
          setLoading(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/auth/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const result = await response.json();

        if (result.success) {
          setUser(result.data);
          setLinkedinUrl(result.data.linkedinUrl || '');
          setGithubUrl(result.data.githubUrl || '');
          fetchVisitors();
          fetchStats();
        } else {
          setError(result.message || 'Failed to load profile');
        }
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/auth/stats`, { headers: { 'Authorization': `Bearer ${token}` } });
      const j = await res.json();
      if (j.success) setStats(j.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const endorseSkill = async (skill: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { setError('Please login to endorse'); return; }
      const targetUserId = user._id || user.id;
      const res = await fetch(`${API_BASE_URL}/endorse`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ targetUserId, skill }) });
      const j = await res.json();
      if (j.success) {
        setStatusMessage('Endorsed ' + skill);
        fetchProfileData();
        fetchStats();
      } else setError(j.message || 'Failed to endorse');
    } catch (err) { console.error(err); setError('Network error'); }
  };

  const openMessage = () => { setMsgSubject(''); setMsgBody(''); setMessageOpen(true); };
  const sendMessage = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { setError('Please login to send messages'); return; }
      const targetUserId = user._id || user.id;
      const res = await fetch(`${API_BASE_URL}/messages`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type':'application/json' }, body: JSON.stringify({ targetUserId, subject: msgSubject, body: msgBody }) });
      const j = await res.json();
      if (j.success) { setStatusMessage('Message sent'); setMessageOpen(false); fetchStats(); }
      else setError(j.message || 'Failed to send');
    } catch (err) { console.error(err); setError('Network error'); }
  };

  const startEditing = () => {
    setStatusMessage(null);
    setFullName(user?.fullName || '');
    setCompany(user?.company || '');
    setSkillsInput(user?.skills ? user.skills.join(', ') : '');
    setLinkedinUrl(user?.linkedinUrl || '');
    setGithubUrl(user?.githubUrl || '');
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setStatusMessage(null);
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login to update your profile');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ fullName, company, skills: skillsInput, linkedinUrl, githubUrl })
      });

      const result = await response.json();
      if (result.success) {
        setUser(result.data);
        setStatusMessage(result.message || 'Profile updated');
        setEditing(false);
      } else {
        setError(result.message || 'Failed to update profile');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Network error while saving.');
    }
  };

  const handleShare = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login to share your profile');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/auth/share`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      if (result.success) {
        const url = result.shareUrl;
        setStatusMessage(result.message + (url ? ` — ${url}` : ''));
        // open options: WhatsApp and LinkedIn in new tabs
        const text = encodeURIComponent(`Check out my profile on AlumniConnect: ${url}`);
        const wa = `https://api.whatsapp.com/send?text=${text}`;
        const li = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
        // open both in new windows for convenience (user can close unwanted)
        window.open(wa, '_blank');
        window.open(li, '_blank');
      } else {
        setError(result.message || 'Failed to share profile');
      }
    } catch (err) {
      console.error('Error sharing profile:', err);
      setError('Network error while sharing.');
    }
  };

  const copyShareUrl = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { setError('Please login to share your profile'); return; }
      const response = await fetch(`${API_BASE_URL}/auth/share`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
      const result = await response.json();
      if (result.success && result.shareUrl) {
        await navigator.clipboard.writeText(result.shareUrl);
        setStatusMessage('Share URL copied to clipboard');
      } else {
        setError(result.message || 'Failed to get share URL');
      }
    } catch (err) {
      console.error('Error copying share url:', err);
      setError('Could not copy to clipboard');
    }
  };

  const fetchVisitors = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/auth/profile/visitors`, { headers: { 'Authorization': `Bearer ${token}` } });
      const j = await res.json();
      if (j.success) setVisitors(j.data || []);
    } catch (err) {
      console.error('Error fetching visitors:', err);
    }
  };

  const navigateBack = () => {
    try {
      const stored = localStorage.getItem('user')
      if (stored) {
        const cur = JSON.parse(stored)
        if (cur?.userType === 'alumni') {
          onNavigate('alumni-dashboard')
          return
        }
      }
    } catch (e) {
      // ignore parse errors
    }
    onNavigate('student-dashboard')
  }
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Custom Header with Back Button */}
      <div className="bg-white shadow-sm p-4 md:p-6 border-b">
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          <button
            onClick={navigateBack}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold text-sm md:text-base w-fit"
          >
            <ArrowLeft size={18} />
            <span>Back to Dashboard</span>
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800">👤 My Profile</h1>
            <p className="text-sm md:text-base text-gray-600 mt-2 italic max-w-2xl">"Be yourself; everyone else is already taken." - Oscar Wilde</p>
          </div>
        </div>
      </div>
      
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading profile...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600 font-semibold">Error loading profile</p>
            <p className="text-red-500 mt-2">{error}</p>
            <button 
              onClick={fetchProfileData}
              className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        ) : user ? (
          <>
            {/* Profile Header */}
            <div className="bg-white rounded-lg shadow-md p-4 md:p-8 mb-8">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8">
                <img
                  src="https://via.placeholder.com/150"
                  alt="Profile"
                  className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover flex-shrink-0"
                />
                <div className="flex-1 text-center md:text-left">
                  <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">{user?.fullName || 'User'}</h1>
                  <p className="text-gray-600 text-base md:text-lg">{user?.userType === 'student' ? 'Student' : 'Alumni'} | {user?.field || 'Professional'}</p>
                  <p className="text-gray-600 mt-2 text-sm md:text-base">{user?.location || 'Location not set'} | Connected 234 people</p>
                  <div className="flex flex-col sm:flex-row gap-3 mt-4">
                    {!editing ? (
                      <>
                        <button onClick={startEditing} className="bg-blue-600 text-white px-4 md:px-6 py-2 rounded-lg hover:bg-blue-700 text-sm md:text-base font-medium">Edit Profile</button>
                        <button onClick={handleShare} className="border border-blue-600 text-blue-600 px-4 md:px-6 py-2 rounded-lg hover:bg-blue-50 text-sm md:text-base font-medium">Share</button>
                      </>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={handleSave} className="bg-green-600 text-white px-4 md:px-6 py-2 rounded-lg hover:bg-green-700 text-sm md:text-base font-medium">Save</button>
                        <button onClick={cancelEditing} className="border border-gray-300 text-gray-700 px-4 md:px-6 py-2 rounded-lg hover:bg-gray-50 text-sm md:text-base">Cancel</button>
                      </div>
                    )}
                  </div>

                  {statusMessage && (
                    <p className="mt-3 text-sm text-green-700">{statusMessage}</p>
                  )}
                  {stats && (
                    <div className="mt-2 text-sm text-gray-600">
                      <span className="mr-3">🏅 Endorsements: {stats.endorsementsCount}</span>
                      <span className="mr-3">👀 Visitors: {stats.visitorsCount}</span>
                      <span className="mr-3">✉️ Unread messages: {stats.unreadMessages}</span>
                    </div>
                  )}
                  {editing && (
                    <div className="mt-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                      <label className="block text-sm font-medium text-gray-700">Full name</label>
                      <input className="mt-1 w-full p-2 border rounded" value={fullName} onChange={e => setFullName(e.target.value)} />
                      <label className="block text-sm font-medium text-gray-700 mt-3">Company</label>
                      <input className="mt-1 w-full p-2 border rounded" value={company} onChange={e => setCompany(e.target.value)} />
                      <label className="block text-sm font-medium text-gray-700 mt-3">Skills (comma separated)</label>
                      <input className="mt-1 w-full p-2 border rounded" value={skillsInput} onChange={e => setSkillsInput(e.target.value)} />
                      <label className="block text-sm font-medium text-gray-700 mt-3">LinkedIn URL</label>
                      <input className="mt-1 w-full p-2 border rounded" value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} placeholder="https://www.linkedin.com/in/yourname" />
                      <label className="block text-sm font-medium text-gray-700 mt-3">GitHub URL</label>
                      <input className="mt-1 w-full p-2 border rounded" value={githubUrl} onChange={e => setGithubUrl(e.target.value)} placeholder="https://github.com/yourname" />
                    </div>
                  )}
                  {!editing && (
                    <div className="mt-4">
                      <h3 className="text-sm font-medium text-gray-700">Profiles</h3>
                      <div className="flex gap-2 mt-2">
                        {user?.linkedinUrl && (<a href={user.linkedinUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">LinkedIn</a>)}
                        {user?.githubUrl && (<a href={user.githubUrl} target="_blank" rel="noreferrer" className="text-gray-800 hover:underline">GitHub</a>)}
                      </div>
                    </div>
                  )}
                  <div className="mt-3">
                    <button onClick={openMessage} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 mr-2">Message</button>
                    <button onClick={copyShareUrl} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50">Copy Share URL</button>
                  </div>
                </div>
              </div>
            </div>
            {/* Visitors Section */}
            <div className="bg-white rounded-lg shadow-md p-4 md:p-8 mt-6">
              <h2 className="text-xl md:text-2xl font-bold mb-4">👀 Who visited my profile</h2>
              {visitors && visitors.length > 0 ? (
                <ul className="space-y-2">
                  {visitors.map((v, i) => (
                    <li key={i} className="flex justify-between items-center p-2 border rounded">
                      <div>
                        <p className="font-semibold text-sm">{v.viewerName || 'Someone'}</p>
                        <p className="text-xs text-gray-500">{new Date(v.viewedAt).toLocaleString()}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">No visitors yet.</p>
              )}
            </div>

            {/* Message Modal */}
            {messageOpen && (
              <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-lg">
                  <h3 className="text-lg font-semibold mb-2">Send Message to {user.fullName}</h3>
                  <label className="text-sm">Subject</label>
                  <input value={msgSubject} onChange={e=>setMsgSubject(e.target.value)} className="w-full p-2 border rounded mt-1 mb-3" />
                  <label className="text-sm">Message</label>
                  <textarea value={msgBody} onChange={e=>setMsgBody(e.target.value)} className="w-full p-2 border rounded mt-1 mb-3" rows={6} />
                  <div className="flex justify-end gap-2">
                    <button onClick={()=>setMessageOpen(false)} className="px-4 py-2 border rounded">Cancel</button>
                    <button onClick={sendMessage} className="px-4 py-2 bg-blue-600 text-white rounded">Send</button>
                  </div>
                </div>
              </div>
            )}

            {/* Badge Modal */}
            {selectedBadge && (
              <>
                {/* lazy-load badge tasks from definitions endpoint if missing */}
                <BadgeModal badge={selectedBadge} onClose={()=>setSelectedBadge(null)} />
              </>
            )}

            {/* Bio Section */}
            <div className="bg-white rounded-lg shadow-md p-4 md:p-8 mb-8">
              <h2 className="text-xl md:text-2xl font-bold mb-4">About</h2>
              <p className="text-gray-700 text-sm md:text-base leading-relaxed">
                Passionate full-stack developer with expertise in React, Node.js, and cloud technologies. 
                Seeking mentorship to transition into product management. Always eager to learn and collaborate with experienced professionals.
              </p>
            </div>

            {/* Skills Section */}
            <div className="bg-white rounded-lg shadow-md p-4 md:p-8 mb-8">
              <h2 className="text-xl md:text-2xl font-bold mb-4">🎯 Skills</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                {user.skills && user.skills.length > 0 ? (
                  user.skills.map((skill: string, index: number) => (
                    <div key={index} className="flex justify-between items-center p-3 border border-gray-200 rounded-lg text-sm md:text-base">
                      <span className="font-semibold">{skill}</span>
                      <div className="flex items-center gap-2">
                        <span className="bg-blue-100 text-blue-600 px-2 md:px-3 py-1 rounded-full text-xs md:text-sm whitespace-nowrap">
                          {(user.endorsements || []).find((e:any)=>e.skill.toLowerCase()===skill.toLowerCase())?.count || 0} endorsements
                        </span>
                        <button onClick={()=>endorseSkill(skill)} className="text-xs text-blue-600 hover:underline">Endorse</button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 col-span-full">No skills added yet.</p>
                )}
              </div>
            </div>

            {/* Badges Section */}
                      <div className="bg-white rounded-lg shadow-md p-4 md:p-8 mb-8">
                        <h2 className="text-xl md:text-2xl font-bold mb-4">🏅 Badges & Achievements</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 md:gap-4">
                          {(user?.badges && user.badges.length > 0) ? (
                            user.badges.map((b: any, index: number) => (
                              <button key={b.key + index} onClick={() => setSelectedBadge(b)} className="text-center p-3 md:p-4 bg-gradient-to-br from-yellow-100 to-yellow-50 rounded-lg">
                                <div className="text-2xl md:text-3xl mb-2">🏅</div>
                                <p className="text-xs font-semibold leading-tight">{b.name}</p>
                              </button>
                            ))
                          ) : (
                            <div className="col-span-full text-sm text-gray-500">No badges yet. Participate in activities to earn badges.</div>
                          )}
                        </div>
                      </div>

            {/* Activity Timeline */}
            <div className="bg-white rounded-lg shadow-md p-4 md:p-8 mb-8">
              <h2 className="text-xl md:text-2xl font-bold mb-4">📅 Activity Timeline</h2>
              <div className="space-y-4">
                {[
                  { activity: "Started mentorship with Alex Chen", date: "2 weeks ago" },
                  { activity: "Endorsed skill: React", date: "1 month ago" },
                  { activity: "Attended AI & ML Workshop", date: "1 month ago" },
                  { activity: "Applied to Frontend Developer role", date: "2 months ago" },
                  { activity: "Joined AlumniConnect", date: "3 months ago" }
                ].map((item, index) => (
                  <div key={index} className="flex gap-3 md:gap-4 pb-4 border-b border-gray-200">
                    <div className="w-2 h-2 md:w-3 md:h-3 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm md:text-base break-words">{item.activity}</p>
                      <p className="text-gray-500 text-xs md:text-sm">{item.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Experience Section */}
            <div className="bg-white rounded-lg shadow-md p-4 md:p-8">
              <h2 className="text-xl md:text-2xl font-bold mb-4">💼 Experience</h2>
              <div className="space-y-6">
                {[
                  { title: "Junior Developer", company: "Tech Startup", period: "2024 - Present" },
                  { title: "Internship", company: "Web Solutions Inc", period: "2023 - 2024" }
                ].map((exp, index) => (
                  <div key={index} className="pb-6 border-b border-gray-200">
                    <p className="font-semibold text-base md:text-lg">{exp.title}</p>
                    <p className="text-gray-600 text-sm md:text-base">{exp.company}</p>
                    <p className="text-gray-500 text-xs md:text-sm">{exp.period}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </main>

      <Footer />
    </div>
  );
};
