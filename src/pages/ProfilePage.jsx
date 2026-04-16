import { Footer } from '../components/Footer.jsx';
import { BadgeModal } from '../components/BadgeModal.jsx'
import ImageCropModal from '../components/ImageCropModal.jsx';
import { BrandLogo } from '../components/BrandLogo.jsx'
import { ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:5000/api';

export const ProfilePage = ({ onNavigate }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [skillsInput, setSkillsInput] = useState('');
  const [institution, setInstitution] = useState('');
  const [colleges, setColleges] = useState([]);
  const [statusMessage, setStatusMessage] = useState(null);
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [aboutInput, setAboutInput] = useState('');
  const [availability, setAvailability] = useState('');
  const [visitors, setVisitors] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedBadge, setSelectedBadge] = useState(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoDeleting, setPhotoDeleting] = useState(false)
  const [photoError, setPhotoError] = useState(null)
  const [cropImage, setCropImage] = useState(null)
  const [showCropModal, setShowCropModal] = useState(false)
  const [isReadOnlyView, setIsReadOnlyView] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareUrl, setShareUrl] = useState(null)

  const getLinkedInHref = (url) => {
    if (!url) return null
    const trimmed = String(url).trim()
    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    try {
      const parsed = new URL(normalized)
      if (!parsed.hostname.toLowerCase().includes('linkedin.com')) return null
      return parsed.toString()
    } catch {
      return null
    }
  }

  const buildActivityTimeline = (userData) => {
    if (!userData) return [];

    const items = [];

    if (userData.endorsements?.length) {
      userData.endorsements.forEach((endorsement) => {
        items.push({
          activity: `Endorsed skill: ${endorsement.skill}`,
          date: 'Recently'
        });
      });
    }

    if (userData.projects?.length) {
      userData.projects.slice(0, 3).forEach((project) => {
        const projectDate = project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'Recently';
        items.push({
          activity: `Created project: ${project.title}`,
          date: projectDate
        });
      });
    }

    if (userData.badges?.length) {
      userData.badges.slice(0, 3).forEach((badge) => {
        const badgeDate = badge.awardedAt ? new Date(badge.awardedAt).toLocaleDateString() : 'Recently';
        items.push({
          activity: `Earned badge: ${badge.name}`,
          date: badgeDate
        });
      });
    }

    if (userData.visitors?.length) {
      const latestVisitor = userData.visitors[userData.visitors.length - 1];
      const visitorDate = latestVisitor?.viewedAt ? new Date(latestVisitor.viewedAt).toLocaleDateString() : 'Recently';
      items.push({
        activity: `Profile viewed by ${latestVisitor?.viewerName || 'a visitor'}`,
        date: visitorDate
      });
    }

    if (!items.length) {
      items.push({
        activity: 'Profile created',
        date: userData.registrationDate ? new Date(userData.registrationDate).toLocaleDateString() : 'Recently'
      });
    }

    return items.slice(0, 5);
  };

  const buildExperienceItems = (userData) => {
    if (!userData) return [];
    if (userData.userType === 'student') return [];

    const items = [];

    if (userData.role || userData.company || userData.experience || userData.industry) {
      items.push({
        title: userData.role || (userData.userType === 'student' ? 'Student' : 'Professional'),
        company: userData.company || userData.industry || 'Organization',
        period: userData.experience || 'Present'
      });
    }

    return items;
  };

  const activityItems = buildActivityTimeline(user);
  const experienceItems = buildExperienceItems(user);
  const buildAutoAbout = (userData) => {
    if (!userData) return 'Complete your profile to generate a personalized summary.';

    const parts = [];
    const isStudentUser = userData.userType === 'student';

    if (userData.fullName) {
      parts.push(`${userData.fullName} is a ${isStudentUser ? 'student' : 'professional'}`);
    }

    if (userData.institution) {
      parts.push(`from ${userData.institution}`);
    }

    if (!isStudentUser && userData.role && userData.company) {
      parts.push(`currently working as ${userData.role} at ${userData.company}`);
    } else if (!isStudentUser && userData.company) {
      parts.push(`currently associated with ${userData.company}`);
    } else if (!isStudentUser && userData.role) {
      parts.push(`focused on ${userData.role}`);
    }

    if (!isStudentUser && userData.experience) {
      parts.push(`with ${userData.experience} of experience`);
    }

    const skills = Array.isArray(userData.skills) ? userData.skills.filter(Boolean) : [];
    if (skills.length > 0) {
      parts.push(`Key skills include ${skills.slice(0, 5).join(', ')}`);
    }

    const projectsCount = Array.isArray(userData.projects) ? userData.projects.length : 0;
    if (projectsCount > 0) {
      parts.push(`and has shared ${projectsCount} project${projectsCount > 1 ? 's' : ''}`);
    }

    const sentence = parts.join(', ').replace(/\s+,/g, ',').trim();
    if (!sentence) {
      return 'Complete your profile to generate a personalized summary.';
    }

    return sentence.endsWith('.') ? sentence : `${sentence}.`;
  };

  const aboutText = user?.bio?.trim() || buildAutoAbout(user);
  const isAlumni = user?.userType === 'alumni';
  const missingProfileItems = [
    !user?.fullName ? { key: 'fullName', label: 'Full Name' } : null,
    !user?.company && isAlumni ? { key: 'company', label: 'Company' } : null,
    (!user?.skills || user.skills.length === 0) ? { key: 'skills', label: 'Skills' } : null,
    !user?.linkedinUrl ? { key: 'linkedinUrl', label: 'LinkedIn' } : null,
    !user?.githubUrl ? { key: 'githubUrl', label: 'GitHub' } : null
  ].filter(Boolean);
  const showIncompleteBanner = !isReadOnlyView && user?.userType === 'student' && missingProfileItems.length > 0;
  const alumniHighlights = [
    isAlumni && user?.company ? `Currently at ${user.company}.` : null,
    isAlumni && user?.role ? `Role: ${user.role}.` : null,
    isAlumni && user?.industry ? `Industry focus: ${user.industry}.` : null,
    isAlumni && user?.experience ? `Experience: ${user.experience}.` : null,
    stats?.endorsementsCount ? `Earned ${stats.endorsementsCount} skill endorsements.` : null,
    stats?.visitorsCount ? `Profile viewed by ${stats.visitorsCount} people.` : null,
    user?.sessions ? `Completed ${user.sessions} mentoring sessions.` : null,
    user?.projects?.length ? `Shared ${user.projects.length} project${user.projects.length > 1 ? 's' : ''}.` : null
  ].filter(Boolean);

  useEffect(() => {
    fetchProfileData();
  }, []);

  useEffect(() => {
    if (isReadOnlyView) return;

    fetchVisitors();

    const intervalId = setInterval(() => {
      fetchVisitors();
    }, 8000);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchVisitors();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [isReadOnlyView, user?._id, user?.id, user?.userType]);

  useEffect(() => {
    const fetchColleges = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/institutions/ap-engineering`)
        const result = await response.json()
        if (result?.success && Array.isArray(result.data)) {
          setColleges(result.data)
        }
      } catch (_err) {
        setColleges([])
      }
    }
    fetchColleges()
  }, [])

  const fetchProfileData = async () => {
    try {
      const viewMode = localStorage.getItem('profileViewMode')
      const viewUserId = localStorage.getItem('viewUserId')
      if (viewMode === 'public' && viewUserId) {
        setIsReadOnlyView(true)
        setEditing(false)
        const token = localStorage.getItem('token')
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
        // load public profile by id
        const response = await fetch(`${API_BASE_URL}/users/${viewUserId}`, { headers })
        const result = await response.json()
        if (result.success) {
          setUser(result.data)
          setInstitution(result.data.institution || '')
          setLinkedinUrl(result.data.linkedinUrl || '')
          setGithubUrl(result.data.githubUrl || '')

          // Track profile visit for cross-user profile views
          try {
            const stored = localStorage.getItem('user')
            const currentUser = stored ? JSON.parse(stored) : null
            const viewerId = currentUser?._id || currentUser?.id
            const targetId = result.data?._id || result.data?.id

            if (token && targetId && String(viewerId || '') !== String(targetId)) {
              await fetch(`${API_BASE_URL}/auth/profile/view`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ targetUserId: targetId })
              })
            }
          } catch (visitErr) {
            console.error('Error recording profile view:', visitErr)
          }
        } else {
          setError(result.message || 'Failed to load profile')
        }
        // clear the public view state after loading
        localStorage.removeItem('profileViewMode')
        localStorage.removeItem('viewUserId')
      } else {
        localStorage.removeItem('profileViewMode')
        localStorage.removeItem('viewUserId')
        localStorage.removeItem('profileBackPage')
        setIsReadOnlyView(false)
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
          setInstitution(result.data.institution || '');
          setLinkedinUrl(result.data.linkedinUrl || '');
          setGithubUrl(result.data.githubUrl || '');
          setAvailability(result.data.availability || '');
          setAvailability(result.data.availability || '');
          setAboutInput(result.data.bio || '');
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

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/png']
    if (!allowedTypes.includes(file.type)) {
      setPhotoError('Please upload a JPEG or PNG image')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setPhotoError('Image size must be less than 2MB')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setCropImage(reader.result)
      setShowCropModal(true)
      setPhotoError(null)
    }
    reader.readAsDataURL(file)
  }

  const handleCropComplete = async (croppedImageBase64) => {
    setShowCropModal(false)
    setPhotoUploading(true)
    setPhotoError(null)

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setPhotoError('Please login to upload a photo');
        setPhotoUploading(false)
        return;
      }

      const response = await fetch(`${API_BASE_URL}/profile/upload-photo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ photoBase64: croppedImageBase64 })
      });

      if (!response.ok) {
        const errorData = await response.json();
        setPhotoError(errorData.message || `Server error: ${response.status}`);
        setPhotoUploading(false);
        return;
      }

      const result = await response.json();
      if (result.success) {
        setUser(prev => ({ ...prev, photo: result.data?.photo || croppedImageBase64 }));
        const stored = localStorage.getItem('user');
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.photo = result.data?.photo || croppedImageBase64;
          localStorage.setItem('user', JSON.stringify(parsed));
        }
        setPhotoError(null);
      } else {
        setPhotoError(result.message || 'Failed to upload photo');
      }
    } catch (err) {
      console.error('Error uploading photo:', err);
      setPhotoError(`Upload error: ${err.message}`);
    } finally {
      setPhotoUploading(false);
      setCropImage(null)
    }
  }

  const handlePhotoDelete = async () => {
    if (!user?.photo || isReadOnlyView) return
    const confirmed = window.confirm('Delete your current profile photo?')
    if (!confirmed) return

    setPhotoDeleting(true)
    setPhotoError(null)

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setPhotoError('Please login to delete your photo')
        return
      }

      const response = await fetch(`${API_BASE_URL}/profile/photo`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      let result = await response.json().catch(() => null)

      if (!response.ok || !result?.success) {
        const compatResponse = await fetch(`${API_BASE_URL}/profile/delete-photo`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        result = await compatResponse.json().catch(() => null)

        if (!compatResponse.ok || !result?.success) {
          const fallbackResponse = await fetch(`${API_BASE_URL}/auth/profile`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ photo: null })
          })
          result = await fallbackResponse.json().catch(() => null)
          if (!fallbackResponse.ok || !result?.success) {
            setPhotoError(result?.message || 'Failed to delete photo')
            return
          }
        }
      }

      setUser(prev => ({ ...prev, photo: null }))
      const stored = localStorage.getItem('user')
      if (stored) {
        const parsed = JSON.parse(stored)
        parsed.photo = null
        localStorage.setItem('user', JSON.stringify(parsed))
      }
      setStatusMessage('Photo deleted successfully')
    } catch (err) {
      console.error('Error deleting photo:', err)
      setPhotoError('Network error while deleting photo')
    } finally {
      setPhotoDeleting(false)
    }
  }

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

  // Endorsement feature removed - only alumni can endorse skills through their dashboard
  // const endorseSkill = async (skill) => {
  //   try {
  //     const token = localStorage.getItem('token');
  //     if (!token) { setError('Please login to endorse'); return; }
  //     const targetUserId = user._id || user.id;
  //     const res = await fetch(`${API_BASE_URL}/endorse`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ targetUserId, skill }) });
  //     const j = await res.json();
  //     if (j.success) {
  //       setStatusMessage('Endorsed ' + skill);
  //       fetchProfileData();
  //       fetchStats();
  //     } else setError(j.message || 'Failed to endorse');
  //   } catch (err) { console.error(err); setError('Network error'); }
  // };


  const startEditing = () => {
    if (isReadOnlyView) return;
    setStatusMessage(null);
    setFullName(user?.fullName || '');
    setCompany(user?.company || '');
    setInstitution(user?.institution || '');
    setSkillsInput(user?.skills ? user.skills.join(', ') : '');
    setLinkedinUrl(user?.linkedinUrl || '');
    setGithubUrl(user?.githubUrl || '');
    setAvailability(user?.availability || '');
    setAboutInput(user?.bio || '');
    setEditing(true);
  };

  const generateAboutForEdit = () => {
    const parsedSkills = skillsInput
      .split(',')
      .map((skill) => skill.trim())
      .filter(Boolean);

    const generated = buildAutoAbout({
      ...user,
      fullName,
      company,
      institution,
      skills: parsedSkills
    });

    setAboutInput(generated);
    setStatusMessage('About generated. You can edit before saving.');
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

      const skills = skillsInput
        .split(',')
        .map((skill) => skill.trim())
        .filter(Boolean);

      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ fullName, company, institution, skills, linkedinUrl, githubUrl, availability, bio: aboutInput.trim() })
      });

      let result = null;
      try {
        result = await response.json();
      } catch (parseError) {
        result = { success: false, message: 'Server error while saving.' };
      }

      if (response.ok && result?.success) {
        setUser(result.data);
        try {
          const stored = localStorage.getItem('user')
          const parsed = stored ? JSON.parse(stored) : {}
          localStorage.setItem('user', JSON.stringify({ ...parsed, ...result.data }))
          window.dispatchEvent(new Event('user-updated'))
        } catch (_err) {}
        setStatusMessage(result.message || 'Profile updated');
        setError(null);
        setEditing(false);
      } else {
        setError(result?.message || 'Failed to update profile');
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
        setShareUrl(result.shareUrl);
        setShowShareModal(true);
      } else {
        setError(result.message || 'Failed to generate share URL');
      }
    } catch (err) {
      console.error('Error sharing profile:', err);
      setError('Network error while sharing.');
    }
  };

  const handleSharePlatform = (platform) => {
    if (!shareUrl) return;
    
    const text = encodeURIComponent(`Check out my profile on AlumniConnect: ${shareUrl}`);
    let url = '';

    switch(platform) {
      case 'whatsapp':
        url = `https://api.whatsapp.com/send?text=${text}`;
        break;
      case 'linkedin':
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
        break;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
        break;
      case 'twitter':
        url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${text}`;
        break;
      case 'email':
        url = `mailto:?subject=Check out my AlumniConnect Profile&body=Check out my profile on AlumniConnect: ${shareUrl}`;
        break;
      case 'copy':
        navigator.clipboard.writeText(shareUrl);
        setStatusMessage('Share URL copied to clipboard!');
        return;
      default:
        return;
    }

    if (url) {
      window.open(url, '_blank');
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
    if (isReadOnlyView) {
      const backPage = localStorage.getItem('profileBackPage') || 'mentor-discovery'
      localStorage.removeItem('profileBackPage')
      onNavigate(backPage)
      return
    }

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
      <div className="bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="px-4 py-3 md:py-4">
          <BrandLogo subtitle={user?.userType === 'alumni' ? 'Alumni' : 'Student'} />
        </div>
      </div>

      {/* Custom Header with Back Button */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 md:py-5">
          <button
            onClick={navigateBack}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold text-sm md:text-base w-fit mb-3"
          >
            <ArrowLeft size={18} />
            <span>Back to Dashboard</span>
          </button>

          <div className="text-center">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800">👤 My Profile</h1>
            <p className="text-sm md:text-base text-gray-600 mt-2 italic mx-auto">"Be yourself; everyone else is already taken." - Oscar Wilde</p>
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
            {/* Profile Header - Center Aligned */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8 border border-gray-100">
              <div className="h-24 md:h-28 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600" />
              <div className="p-4 md:p-8 bg-white">
                {/* Profile Name Section - Above Photo, Center Aligned */}
                <div className="text-center mb-6">
                  <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">{user?.fullName || 'User'}</h1>
                  <p className="text-gray-600 text-base md:text-lg mt-2">{user?.userType === 'student' ? 'Student' : 'Alumni'} | {user?.field || 'Professional'}</p>
                  <p className="text-gray-500 mt-1 text-sm md:text-base">{user?.location || 'Location not set'}</p>
                  {isReadOnlyView && (
                    <p className="text-xs md:text-sm text-amber-700 mt-2">Read-only profile view</p>
                  )}
                </div>

                {/* Photo and Controls - Center Aligned */}
                <div className="flex flex-col items-center mb-6">
                  <img
                    src={user?.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullName || 'User')}&size=256&background=random`}
                    alt="Profile"
                    className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover bg-white border-4 border-white shadow-lg"
                  />
                  {!isReadOnlyView && (
                    <div className="flex items-center gap-2 mt-4">
                      <label className="bg-white border border-gray-200 text-gray-700 rounded-lg px-3 py-2 text-xs md:text-sm font-semibold shadow-sm cursor-pointer hover:bg-gray-50 whitespace-nowrap">
                        {photoUploading ? 'Uploading...' : (user?.photo ? 'Edit photo' : 'Upload photo')}
                        <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={handlePhotoUpload} />
                      </label>
                      {user?.photo && (
                        <button
                          onClick={handlePhotoDelete}
                          disabled={photoDeleting || photoUploading}
                          className="bg-white border border-red-200 text-red-600 rounded-lg px-3 py-2 text-xs md:text-sm font-semibold shadow-sm hover:bg-red-50 disabled:opacity-60"
                        >
                          {photoDeleting ? 'Deleting...' : 'Delete'}
                        </button>
                      )}
                    </div>
                  )}
                  <p className="mt-2 text-[11px] text-gray-500">JPG/PNG • Max 2MB</p>
                </div>

                {/* Stats Display - Center Aligned */}
                {stats && (
                  <div className="mt-4 flex flex-wrap gap-2 justify-center">
                    <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs md:text-sm">🏅 Endorsements: {stats.endorsementsCount}</span>
                    <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs md:text-sm">👀 Visitors: {stats.visitorsCount}</span>
                  </div>
                )}

                {/* Edit and Share Buttons - Center Aligned */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
                  {!isReadOnlyView && !editing ? (
                    <>
                      <button onClick={startEditing} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 text-sm md:text-base font-semibold shadow-sm">
                        ✏️ Edit Profile
                      </button>
                      <button onClick={handleShare} className="border border-blue-600 text-blue-600 px-6 py-2 rounded-lg hover:bg-blue-50 text-sm md:text-base font-semibold">
                        🔗 Share Profile
                      </button>
                    </>
                  ) : !isReadOnlyView ? (
                    <div className="flex gap-2 justify-center">
                      <button onClick={handleSave} className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 text-sm md:text-base font-semibold">
                        Save
                      </button>
                      <button onClick={cancelEditing} className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 text-sm md:text-base">
                        Cancel
                      </button>
                    </div>
                  ) : null}
                </div>

                {/* Status Messages */}
                {statusMessage && (
                  <p className="mt-4 text-sm text-green-700 text-center">{statusMessage}</p>
                )}
                {photoError && (
                  <p className="mt-2 text-xs text-red-600 text-center">{photoError}</p>
                )}

                {/* Edit Form - If Editing */}
                {!isReadOnlyView && editing && (
                  <div className="mt-6 bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <label className="block text-sm font-medium text-gray-700">Full name</label>
                    <input className="mt-1 w-full p-2 border rounded" value={fullName} onChange={e => setFullName(e.target.value)} />
                    {isAlumni && (
                      <>
                        <label className="block text-sm font-medium text-gray-700 mt-3">Company</label>
                        <input className="mt-1 w-full p-2 border rounded" value={company} onChange={e => setCompany(e.target.value)} />
                      </>
                    )}
                    <label className="block text-sm font-medium text-gray-700 mt-3">Institution</label>
                    <select className="mt-1 w-full p-2 border rounded" value={institution} onChange={e => setInstitution(e.target.value)}>
                      <option value="">Select institution</option>
                      {colleges.map((college) => (
                        <option key={college} value={college}>{college}</option>
                      ))}
                    </select>
                    <label className="block text-sm font-medium text-gray-700 mt-3">Skills (comma separated)</label>
                    <input className="mt-1 w-full p-2 border rounded" value={skillsInput} onChange={e => setSkillsInput(e.target.value)} />
                    <label className="block text-sm font-medium text-gray-700 mt-3">LinkedIn URL</label>
                    <input className="mt-1 w-full p-2 border rounded" value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} placeholder="https://www.linkedin.com/in/yourname" />
                    <label className="block text-sm font-medium text-gray-700 mt-3">GitHub URL</label>
                    <input className="mt-1 w-full p-2 border rounded" value={githubUrl} onChange={e => setGithubUrl(e.target.value)} placeholder="https://github.com/yourname" />
                    {isAlumni && (
                      <>
                        <label className="block text-sm font-medium text-gray-700 mt-3">Availability</label>
                        <select className="mt-1 w-full p-2 border rounded" value={availability} onChange={e => setAvailability(e.target.value)}>
                          <option value="">Select availability</option>
                          <option value="Weekdays">Weekdays (Mon-Fri)</option>
                          <option value="Weekends">Weekends (Sat-Sun)</option>
                          <option value="Evenings">Evenings (after 6 PM)</option>
                          <option value="Flexible">Flexible (Anytime)</option>
                        </select>
                      </>
                    )}
                    {!isAlumni && (
                      <>
                        <div className="mt-3 flex items-center justify-between">
                          <label className="block text-sm font-medium text-gray-700">About</label>
                          <button
                            type="button"
                            onClick={generateAboutForEdit}
                            className="text-xs px-3 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                          >
                            Auto Generate About
                          </button>
                        </div>
                        <textarea
                          className="mt-1 w-full p-2 border rounded"
                          rows={4}
                          maxLength={1000}
                          value={aboutInput}
                          onChange={e => setAboutInput(e.target.value)}
                          placeholder="Write your About summary"
                        />
                        <p className="mt-1 text-xs text-gray-500">{aboutInput.length}/1000</p>
                      </>
                    )}
                  </div>
                )}

                {/* Linked Profiles */}
                {!editing && (
                  <div className="mt-6 text-center">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Connected Profiles</h3>
                    <div className="flex gap-3 justify-center flex-wrap">
                      {getLinkedInHref(user?.linkedinUrl) && (
                        <a href={getLinkedInHref(user?.linkedinUrl)} target="_blank" rel="noreferrer" className="inline-block px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm font-semibold">
                          🔗 LinkedIn
                        </a>
                      )}
                      {user?.githubUrl && (
                        <a href={user.githubUrl} target="_blank" rel="noreferrer" className="inline-block px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 text-sm font-semibold">
                          💻 GitHub
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Share Modal */}
            {showShareModal && shareUrl && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900">🔗 Share Your Profile</h2>
                    <button
                      onClick={() => setShowShareModal(false)}
                      className="text-gray-500 hover:text-gray-700 text-2xl"
                    >
                      ×
                    </button>
                  </div>

                  <p className="text-sm text-gray-600 mb-6">Choose a platform to share your profile:</p>

                  <div className="space-y-3 mb-6">
                    <button
                      onClick={() => handleSharePlatform('whatsapp')}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition"
                    >
                      <span className="text-2xl">💚</span>
                      <span className="font-semibold text-gray-800">WhatsApp</span>
                    </button>

                    <button
                      onClick={() => handleSharePlatform('linkedin')}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition"
                    >
                      <span className="text-2xl">💼</span>
                      <span className="font-semibold text-gray-800">LinkedIn</span>
                    </button>

                    <button
                      onClick={() => handleSharePlatform('facebook')}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition"
                    >
                      <span className="text-2xl">👥</span>
                      <span className="font-semibold text-gray-800">Facebook</span>
                    </button>

                    <button
                      onClick={() => handleSharePlatform('twitter')}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100 transition"
                    >
                      <span className="text-2xl">𝕏</span>
                      <span className="font-semibold text-gray-800">Twitter/X</span>
                    </button>

                    <button
                      onClick={() => handleSharePlatform('email')}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition"
                    >
                      <span className="text-2xl">📧</span>
                      <span className="font-semibold text-gray-800">Email</span>
                    </button>

                    <button
                      onClick={() => handleSharePlatform('copy')}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition"
                    >
                      <span className="text-2xl">📋</span>
                      <span className="font-semibold text-gray-800">Copy Link</span>
                    </button>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg mb-4">
                    <p className="text-xs text-gray-600 mb-2">Your share link:</p>
                    <p className="text-xs text-gray-800 break-all font-mono">{shareUrl}</p>
                  </div>

                  <button
                    onClick={() => setShowShareModal(false)}
                    className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
            {!isReadOnlyView && (
              <>
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
              </>
            )}

            {/* Badge Modal */}
            {selectedBadge && (
              <>
                {/* lazy-load badge tasks from definitions endpoint if missing */}
                <BadgeModal badge={selectedBadge} onClose={()=>setSelectedBadge(null)} />
              </>
            )}

            {!isAlumni ? (
              <>
                {/* Bio Section */}
                <div className="bg-white rounded-lg shadow-md p-4 md:p-8 mb-8">
                  <h2 className="text-xl md:text-2xl font-bold mb-4">About</h2>
                  <p className="text-gray-700 text-sm md:text-base leading-relaxed">
                    {aboutText}
                  </p>
                </div>

                {/* Skills Section */}
                <div className="bg-white rounded-lg shadow-md p-4 md:p-8 mb-8">
                  <h2 className="text-xl md:text-2xl font-bold mb-4">🎯 Skills</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    {user.skills && user.skills.length > 0 ? (
                      user.skills.map((skill, index) => (
                        <div key={index} className="flex justify-between items-center p-3 border border-gray-200 rounded-lg text-sm md:text-base">
                          <span className="font-semibold">{skill}</span>
                          <div className="flex items-center gap-2">
                            <span className="bg-blue-100 text-blue-600 px-2 md:px-3 py-1 rounded-full text-xs md:text-sm whitespace-nowrap">
                              {(user.endorsements || []).find((e)=>e.skill.toLowerCase()===skill.toLowerCase())?.count || 0} endorsements
                            </span>
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
                  {(user?.badges && user.badges.length > 0) ? (
                    <div className="space-y-3">
                      {user.badges.map((b, index) => (
                        <button 
                          key={b.key + index} 
                          onClick={() => setSelectedBadge(b)} 
                          className="w-full text-left p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg border-2 border-yellow-200 hover:shadow-md transition"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="text-3xl">🏅</span>
                                <div>
                                  <p className="font-bold text-lg">{b.name}</p>
                                  <p className="text-sm text-gray-600">{b.description}</p>
                                </div>
                              </div>
                              {b.giverName && (
                                <p className="text-xs text-gray-500 ml-12">Awarded by <span className="font-semibold">{b.giverName}</span></p>
                              )}
                              {b.message && (
                                <p className="text-sm text-gray-700 mt-2 ml-12 italic p-2 bg-white rounded border-l-2 border-yellow-400">💌 "{b.message}"</p>
                              )}
                              <p className="text-xs text-gray-400 mt-2 ml-12">{b.awardedAt ? new Date(b.awardedAt).toLocaleDateString() : 'Recently'}</p>
                            </div>
                            <span className="text-2xl">→</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 bg-blue-50 p-4 rounded">No badges yet. Participate in activities and connect with alumni mentors to earn badges!</div>
                  )}
                </div>

                {showIncompleteBanner && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 md:p-6 mb-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <h2 className="text-lg md:text-xl font-bold text-yellow-800">⚠️ Profile Incomplete</h2>
                        <p className="text-sm text-yellow-700 mt-1">Complete these fields to finish your profile.</p>
                      </div>
                      <button
                        onClick={startEditing}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm font-semibold"
                      >
                        Complete Profile
                      </button>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs">
                      {missingProfileItems.map((item) => (
                        <span key={item.key} className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full font-semibold">
                          ❌ {item.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Activity Timeline */}
                <div className="bg-white rounded-lg shadow-md p-4 md:p-8 mb-8">
                  <h2 className="text-xl md:text-2xl font-bold mb-4">📅 Activity Timeline</h2>
                  <div className="space-y-4">
                    {activityItems.length > 0 ? (
                      activityItems.map((item, index) => (
                        <div key={index} className="flex gap-3 md:gap-4 pb-4 border-b border-gray-200">
                          <div className="w-2 h-2 md:w-3 md:h-3 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm md:text-base break-words">{item.activity}</p>
                            <p className="text-gray-500 text-xs md:text-sm">{item.date}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm">No activity yet.</p>
                    )}
                  </div>
                </div>

                {/* Experience section removed for students */}
              </>
            ) : (
              <>
                {/* Alumni Impact Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
                    <p className="text-sm text-gray-500">Mentor Sessions</p>
                    <p className="text-2xl font-bold text-gray-900">{user?.sessions || 0}</p>
                    <p className="text-xs text-gray-500 mt-1">Completed mentoring sessions</p>
                  </div>
                  <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
                    <p className="text-sm text-gray-500">Average Rating</p>
                    <p className="text-2xl font-bold text-gray-900">{user?.avgRating || 'N/A'}</p>
                    <p className="text-xs text-gray-500 mt-1">Based on student feedback</p>
                  </div>
                  <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
                    <p className="text-sm text-gray-500">Job Referrals</p>
                    <p className="text-2xl font-bold text-gray-900">{user?.referrals || 0}</p>
                    <p className="text-xs text-gray-500 mt-1">Students referred</p>
                  </div>
                </div>

                {/* Alumni Expertise */}
                <div className="bg-white rounded-lg shadow-md p-4 md:p-8 mb-8">
                  <h2 className="text-xl md:text-2xl font-bold mb-4">🎓 Alumni Expertise</h2>
                  <div className="flex flex-wrap gap-2">
                    {(user?.skills && user.skills.length > 0) ? (
                      user.skills.map((skill, index) => (
                        <span key={index} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs md:text-sm font-semibold">
                          {skill}
                        </span>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm">Add skills to highlight your expertise.</p>
                    )}
                  </div>
                </div>

                {/* Mentorship Availability */}
                <div className="bg-white rounded-lg shadow-md p-4 md:p-8 mb-8">
                  <h2 className="text-xl md:text-2xl font-bold mb-4">🤝 Mentorship Availability</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <p className="text-sm text-gray-500">Availability</p>
                      <p className="text-base font-semibold text-gray-900">{user?.availability || 'Not specified'}</p>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <p className="text-sm text-gray-500">Mentorship Focus</p>
                      <p className="text-base font-semibold text-gray-900">{user?.industry || user?.role || 'Career guidance'}</p>
                    </div>
                  </div>
                </div>

                {/* Alumni Highlights */}
                <div className="bg-white rounded-lg shadow-md p-4 md:p-8 mb-8">
                  <h2 className="text-xl md:text-2xl font-bold mb-4">🏆 Alumni Highlights</h2>
                  {alumniHighlights.length > 0 ? (
                    <div className="space-y-4">
                      {alumniHighlights.map((item, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                          <p className="text-sm md:text-base text-gray-700">{item}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Add your company, role, or experience to highlight your profile.</p>
                  )}
                </div>

                {/* Alumni Activity */}
                <div className="bg-white rounded-lg shadow-md p-4 md:p-8">
                  <h2 className="text-xl md:text-2xl font-bold mb-4">📌 Alumni Activity</h2>
                  <div className="space-y-4">
                    {activityItems.length > 0 ? (
                      activityItems.map((item, index) => (
                        <div key={index} className="flex gap-3 md:gap-4 pb-4 border-b border-gray-200">
                          <div className="w-2 h-2 md:w-3 md:h-3 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm md:text-base break-words">{item.activity}</p>
                            <p className="text-gray-500 text-xs md:text-sm">{item.date}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm">No activity yet.</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        ) : null}
      </main>

      {showCropModal && cropImage && (
        <ImageCropModal
          imageSrc={cropImage}
          onCropComplete={handleCropComplete}
          onCancel={() => {
            setShowCropModal(false)
            setCropImage(null)
          }}
        />
      )}

      <Footer />
    </div>
  );
};
