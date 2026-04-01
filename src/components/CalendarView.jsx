import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useMemo } from 'react';

export const CalendarView = ({ events, onSelectEvent }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);

  const monthYear = currentDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const eventsByDate = useMemo(() => {
    const map = {};
    (events || []).forEach(event => {
      if (!event?.date) return;
      const eventDate = new Date(event.date);
      if (Number.isNaN(eventDate.getTime())) return;
      const dateKey = `${eventDate.getFullYear()}-${eventDate.getMonth()}-${eventDate.getDate()}`;
      if (!map[dateKey]) {
        map[dateKey] = [];
      }
      map[dateKey].push(event);
    });
    return map;
  }, [events]);

  const monthEvents = useMemo(() => {
    return Object.values(eventsByDate)
      .flat()
      .filter(event => {
        const eventDate = new Date(event.date);
        if (Number.isNaN(eventDate.getTime())) return false;
        return (
          eventDate.getMonth() === currentDate.getMonth() &&
          eventDate.getFullYear() === currentDate.getFullYear()
        );
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [eventsByDate, currentDate]);

  const getCategoryColor = (category) => {
    const colors = {
      Webinar: 'bg-blue-100 text-blue-700',
      Workshop: 'bg-purple-100 text-purple-700',
      Networking: 'bg-green-100 text-green-700',
      Conference: 'bg-indigo-100 text-indigo-700',
      'Mentoring Session': 'bg-orange-100 text-orange-700',
      Other: 'bg-gray-100 text-gray-700',
      default: 'bg-gray-100 text-gray-700'
    };
    return colors[category] || colors.default;
  };

  const formatDate = (value) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return 'TBD';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells = [];

    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const date = new Date(year, month - 1, day);
      cells.push({
        inMonth: false,
        day,
        key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
        date
      });
    }

    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const date = new Date(year, month, day);
      cells.push({
        inMonth: true,
        day,
        key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
        date
      });
    }

    let nextDay = 1;
    while (cells.length < 42) {
      const date = new Date(year, month + 1, nextDay);
      cells.push({
        inMonth: false,
        day: nextDay,
        key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
        date
      });
      nextDay += 1;
    }

    return cells;
  }, [year, month]);

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
        {calendarCells.map((cell, index) => {
          const dayEvents = eventsByDate[cell.key] || [];
          const isToday =
            cell.date.getDate() === new Date().getDate() &&
            cell.date.getMonth() === new Date().getMonth() &&
            cell.date.getFullYear() === new Date().getFullYear();

          return (
            <div
              key={`${cell.key}-${index}`}
              className={`h-28 p-2 rounded-lg border transition overflow-hidden ${
                isToday
                  ? 'border-blue-500 bg-blue-50'
                  : cell.inMonth
                  ? 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                  : 'border-gray-100 bg-gray-100/70'
              }`}
            >
              <div className="h-full flex flex-col">
                <p className={`font-semibold mb-1 ${isToday ? 'text-blue-700' : cell.inMonth ? 'text-gray-700' : 'text-gray-400'}`}>
                  {cell.day}
                </p>

                <div className="flex-1 overflow-y-auto space-y-1 pr-0.5">
                  {dayEvents.map(event => (
                    <button
                      key={event._id || event.id || `${event.title}-${event.date}`}
                      onClick={() => {
                        setSelectedEvent(event);
                        if (typeof onSelectEvent === 'function') onSelectEvent(event);
                      }}
                      className={`text-xs p-1 rounded truncate w-full text-left font-medium hover:opacity-80 transition ${getCategoryColor(
                        event.category
                      )}`}
                      title={event.title}
                    >
                      {String(event.title || 'Event').length > 16
                        ? `${String(event.title).substring(0, 16)}...`
                        : String(event.title || 'Event')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Event Details */}
      <div className="mt-8 pt-6 border-t">
        <h3 className="text-lg font-bold mb-4 text-gray-800">Events This Month</h3>
        <div className="space-y-3">
          {monthEvents.length === 0 ? (
            <div className="p-3 rounded bg-gray-50 text-gray-600 text-sm">No events in this month.</div>
          ) : monthEvents.map(event => (
              <div
                key={event._id || event.id || `${event.title}-${event.date}`}
                className="p-3 border-l-4 border-blue-500 bg-blue-50 rounded cursor-pointer hover:bg-blue-100 transition"
                onClick={() => {
                  setSelectedEvent(event);
                  if (typeof onSelectEvent === 'function') onSelectEvent(event);
                }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-gray-800">{event.title}</h4>
                    <p className="text-sm text-gray-600">📅 {formatDate(event.date)} | ⏰ {event.time || 'TBD'}</p>
                    <p className="text-sm text-gray-600">📍 {event.location || 'Online'}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${getCategoryColor(event.category)}`}>
                    {event.category}
                  </span>
                </div>
              </div>
            ))}
        </div>

        {selectedEvent && (
          <div className="mt-5 p-4 rounded-lg border border-gray-200 bg-white">
            <h4 className="text-base font-bold text-gray-800">Selected: {selectedEvent.title}</h4>
            <p className="text-sm text-gray-600 mt-1">📅 {formatDate(selectedEvent.date)} · ⏰ {selectedEvent.time || 'TBD'}</p>
            <p className="text-sm text-gray-600 mt-1">📍 {selectedEvent.location || 'Online'}</p>
            {selectedEvent.description && <p className="text-sm text-gray-700 mt-2">{selectedEvent.description}</p>}
          </div>
        )}
      </div>
    </div>
  );
};
