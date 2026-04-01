import { Footer } from '../components/Footer.jsx';
import { EventCard } from '../components/EventCard.jsx';
import { CalendarView } from '../components/CalendarView.jsx';
import { ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import { isEventCompletedByIST } from '../utils/eventDateTime.js';

const API_BASE_URL = 'http://localhost:5000/api';
const EVENT_CATEGORIES = ['Webinar', 'Workshop', 'Networking', 'Conference', 'Mentoring Session', 'Other'];

export const EventsPage = ({ onNavigate }) => {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [eventType, setEventType] = useState('upcoming'); // 'upcoming' or 'past'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'calendar'
  const [registerMessage, setRegisterMessage] = useState('');
  const [registeredEventIds, setRegisteredEventIds] = useState(new Set());

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    filterEvents();
  }, [events, selectedCategory, eventType]);

  useEffect(() => {
    const normalized = String(selectedCategory || '').trim();
    if (normalized !== 'All Categories' && !EVENT_CATEGORIES.includes(normalized)) {
      setSelectedCategory('All Categories');
    }
  }, [selectedCategory]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/events`);
      const result = await response.json();
      if (result.success) {
        setEvents(result.data);
        hydrateRegisteredEvents(result.data || []);
        setError(null);
      } else {
        setError('Failed to fetch events');
      }
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Error fetching events. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const hydrateRegisteredEvents = (allEvents = []) => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token || !userData) {
      setRegisteredEventIds(new Set());
      return;
    }

    let currentUserId = '';
    try {
      const parsed = JSON.parse(userData || '{}');
      currentUserId = String(parsed?._id || parsed?.id || '');
    } catch {
      currentUserId = '';
    }

    if (!currentUserId) {
      setRegisteredEventIds(new Set());
      return;
    }

    const ids = (allEvents || [])
      .filter((event) => (event?.attendees || []).some((a) => String(a?.userId || '') === currentUserId))
      .map((event) => String(event?._id || event?.id || ''))
      .filter(Boolean);

    setRegisteredEventIds(new Set(ids));
  };

  const isEventUpcoming = (event) => {
    return !isEventCompletedByIST(event);
  };

  const filterEvents = () => {
    let filtered = events;
    const normalizedCategory = String(selectedCategory || '').trim();
    const effectiveCategory = EVENT_CATEGORIES.includes(normalizedCategory) ? normalizedCategory : 'All Categories';

    // Filter by event type (upcoming/past)
    filtered = filtered.filter(event => {
      const isUpcoming = isEventUpcoming(event);
      return eventType === 'upcoming' ? isUpcoming : !isUpcoming;
    });

    // Filter by category
    if (effectiveCategory !== 'All Categories') {
      filtered = filtered.filter(e => String(e.category || '').trim().toLowerCase() === effectiveCategory.toLowerCase());
    }

    setFilteredEvents(filtered);
  };

  const resetFilters = () => {
    setSelectedCategory('All Categories');
    setEventType('upcoming');
    setViewMode('grid');
  };

  const handleRegisterEvent = async (eventId) => {
    try {
      if (registeredEventIds.has(String(eventId))) {
        setRegisterMessage('Already registered for this event.');
        setTimeout(() => setRegisterMessage(''), 2500);
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        setRegisterMessage('Please log in to register for events.');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/events/${eventId}/register`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      if (result.success) {
        setRegisteredEventIds((prev) => {
          const next = new Set(prev);
          next.add(String(eventId));
          return next;
        });
        setRegisterMessage('Successfully registered. The event mentor has been notified and can share the meeting link in dashboard messages.');
        setTimeout(() => setRegisterMessage(''), 4000);
        // Optionally refresh events
        fetchEvents();
      } else {
        setRegisterMessage(result.message || 'Failed to register');
        setTimeout(() => setRegisterMessage(''), 3500);
      }
    } catch (err) {
      console.error('Error registering for event:', err);
      setRegisterMessage('Error registering for event. Please try again.');
      setTimeout(() => setRegisterMessage(''), 3500);
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
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800">📅 Events & Webinars</h1>
            <p className="text-sm md:text-base text-gray-600 mt-2 italic max-w-2xl">"The right people in the same room can change the world." - Bill Gates</p>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">

        {registerMessage && (
          <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg p-3">
            {registerMessage}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <p className="text-lg text-gray-600">Loading events...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <p className="text-red-700">{error}</p>
            <button
              onClick={fetchEvents}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* Success State */}
        {!loading && !error && (
          <>
            {/* Filter Section */}
            <div className="bg-white p-4 md:p-6 rounded-xl shadow-md mb-8 border border-gray-100">
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <button
                    onClick={() => setEventType('upcoming')}
                    className={`px-4 py-3 rounded-lg font-semibold transition text-base ${
                      eventType === 'upcoming'
                        ? 'bg-blue-600 text-white shadow'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Upcoming
                  </button>

                  <button
                    onClick={() => setEventType('past')}
                    className={`px-4 py-3 rounded-lg font-semibold transition text-base ${
                      eventType === 'past'
                        ? 'bg-blue-600 text-white shadow'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Past
                  </button>

                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    <option>All Categories</option>
                    {EVENT_CATEGORIES.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>

                  <button
                    onClick={() => setViewMode(viewMode === 'grid' ? 'calendar' : 'grid')}
                    className={`px-4 py-3 rounded-lg font-semibold transition text-base ${
                      viewMode === 'calendar'
                        ? 'bg-blue-600 text-white shadow'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {viewMode === 'calendar' ? '🗂️ Grid View' : '📅 Calendar View'}
                  </button>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-2 text-sm">
                  <p className="text-gray-500">Tip: Use category + upcoming/past to quickly find events.</p>
                  <button
                    onClick={resetFilters}
                    className="px-3 py-1.5 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 font-semibold"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>
            </div>

            {/* Events Grid or Calendar */}
            {viewMode === 'calendar' ? (
              <div className="mb-8">
                <CalendarView
                  events={filteredEvents}
                  onSelectEvent={() => {}}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {filteredEvents.length > 0 ? (
                  filteredEvents.map((event) => (
                    <div key={event._id || event.id}>
                      <EventCard
                        {...event}
                        status={event.status}
                        isRegistrationClosed={isEventCompletedByIST(event)}
                        isAlreadyRegistered={registeredEventIds.has(String(event._id || event.id))}
                        onRegister={() => handleRegisterEvent(event._id || event.id)}
                      />
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-12">
                    <p className="text-gray-600">No events found in this category.</p>
                  </div>
                )}
              </div>
            )}

            {/* Results Count */}
            <div className="text-center mb-8">
              <p className="text-gray-600">Showing {filteredEvents.length} events</p>
            </div>

            {/* Reminder Toggle */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-bold mb-4">🔔 Event Reminders</h2>
              <label className="flex items-center gap-3">
                <input type="checkbox" defaultChecked className="w-5 h-5" />
                <span>Get notified about upcoming events</span>
              </label>
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};
