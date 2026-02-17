import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useMemo } from 'react';

interface Event {
  id: number;
  title: string;
  date: string;
  time: string;
  category: string;
  speaker: string;
}

interface CalendarViewProps {
  events: Event[];
  onSelectEvent: (event: Event) => void;
}

export const CalendarView = ({ events, onSelectEvent }: CalendarViewProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthYear = currentDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  const daysInMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  ).getDate();

  const firstDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  ).getDay();

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const eventsByDate = useMemo(() => {
    const map: { [key: string]: Event[] } = {};
    events.forEach(event => {
      const eventDate = new Date(event.date);
      const dateKey = `${eventDate.getFullYear()}-${eventDate.getMonth()}-${eventDate.getDate()}`;
      if (!map[dateKey]) {
        map[dateKey] = [];
      }
      map[dateKey].push(event);
    });
    return map;
  }, [events]);

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      Career: 'bg-blue-100 text-blue-700',
      Technical: 'bg-purple-100 text-purple-700',
      Networking: 'bg-green-100 text-green-700',
      Skills: 'bg-orange-100 text-orange-700',
      default: 'bg-gray-100 text-gray-700'
    };
    return colors[category] || colors.default;
  };

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">{monthYear}</h2>
        <div className="flex gap-2">
          <button
            onClick={previousMonth}
            className="p-2 hover:bg-gray-200 rounded-lg transition"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-gray-200 rounded-lg transition"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center font-semibold text-gray-600 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, index) => {
          const dateKey = day
            ? `${currentDate.getFullYear()}-${currentDate.getMonth()}-${day}`
            : null;
          const dayEvents = dateKey ? eventsByDate[dateKey] : [];
          const isToday =
            day === new Date().getDate() &&
            currentDate.getMonth() === new Date().getMonth() &&
            currentDate.getFullYear() === new Date().getFullYear();

          return (
            <div
              key={index}
              className={`min-h-24 p-2 rounded-lg border-2 transition ${
                day
                  ? isToday
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 bg-gray-50 hover:bg-gray-100'
                  : 'border-transparent bg-gray-50'
              }`}
            >
              {day && (
                <div className="h-full flex flex-col">
                  <p className={`font-semibold mb-1 ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                    {day}
                  </p>
                  <div className="flex-1 overflow-y-auto space-y-1">
                    {dayEvents.map(event => (
                      <button
                        key={event.id}
                        onClick={() => onSelectEvent(event)}
                        className={`text-xs p-1 rounded truncate w-full text-left font-medium hover:opacity-80 transition ${getCategoryColor(
                          event.category
                        )}`}
                        title={event.title}
                      >
                        {event.title.substring(0, 12)}...
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Event Details */}
      <div className="mt-8 pt-6 border-t">
        <h3 className="text-lg font-bold mb-4 text-gray-800">Upcoming Events This Month</h3>
        <div className="space-y-3">
          {Object.values(eventsByDate)
            .flat()
            .filter(event => {
              const eventDate = new Date(event.date);
              return (
                eventDate.getMonth() === currentDate.getMonth() &&
                eventDate.getFullYear() === currentDate.getFullYear()
              );
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map(event => (
              <div
                key={event.id}
                className="p-3 border-l-4 border-blue-500 bg-blue-50 rounded cursor-pointer hover:bg-blue-100 transition"
                onClick={() => onSelectEvent(event)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-gray-800">{event.title}</h4>
                    <p className="text-sm text-gray-600">📅 {event.date} | ⏰ {event.time}</p>
                    <p className="text-sm text-gray-600">👤 {event.speaker}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${getCategoryColor(event.category)}`}>
                    {event.category}
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};
