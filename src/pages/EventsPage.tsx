import { Footer } from '../components/Footer';
import { EventCard } from '../components/EventCard';
import { CalendarView } from '../components/CalendarView';
import { ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';

interface EventsPageProps {
  onNavigate: (page: string) => void
}

const API_BASE_URL = 'http://localhost:5000/api';

export const EventsPage = ({ onNavigate }: EventsPageProps) => {
  const [events, setEvents] = useState<any[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [eventType, setEventType] = useState('upcoming'); // 'upcoming' or 'past'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'calendar'

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    filterEvents();
  }, [events, selectedCategory, eventType]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/events`);
      const result = await response.json();
      if (result.success) {
        setEvents(result.data);
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

  const isEventUpcoming = (dateStr: string) => {
    const eventDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return eventDate >= today;
  };

  const filterEvents = () => {
    let filtered = events;

    // Filter by event type (upcoming/past)
    filtered = filtered.filter(event => {
      const isUpcoming = isEventUpcoming(event.date);
      return eventType === 'upcoming' ? isUpcoming : !isUpcoming;
    });

    // Filter by category
    if (selectedCategory !== 'All Categories') {
      filtered = filtered.filter(e => e.category === selectedCategory);
    }

    setFilteredEvents(filtered);
  };

  const handleRegisterEvent = (eventId: number) => {
    alert(`Successfully registered for event #${eventId}! Check your email for confirmation.`);
    console.log('Event registration for ID:', eventId);
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
            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <button 
                  onClick={() => setEventType('upcoming')}
                  className={`px-4 py-2 rounded-lg font-semibold transition ${
                    eventType === 'upcoming' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Upcoming
                </button>
                <button 
                  onClick={() => setEventType('past')}
                  className={`px-4 py-2 rounded-lg font-semibold transition ${
                    eventType === 'past' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Past
                </button>
                <select 
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
                >
                  <option>All Categories</option>
                  <option>Career</option>
                  <option>Technical</option>
                  <option>Networking</option>
                  <option>Skills</option>
                </select>
                <button 
                  onClick={() => setViewMode(viewMode === 'grid' ? 'calendar' : 'grid')}
                  className={`px-4 py-2 rounded-lg font-semibold transition ${
                    viewMode === 'calendar'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  📅 Calendar View
                </button>
              </div>
            </div>

            {/* Events Grid or Calendar */}
            {viewMode === 'calendar' ? (
              <div className="mb-8">
                <CalendarView 
                  events={events.filter(event => 
                    eventType === 'upcoming' 
                      ? isEventUpcoming(event.date)
                      : !isEventUpcoming(event.date)
                  )}
                  onSelectEvent={() => {}}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {filteredEvents.length > 0 ? (
                  filteredEvents.map((event) => (
                    <div key={event.id}>
                      <EventCard 
                        {...event}
                        onRegister={() => handleRegisterEvent(event.id)}
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
