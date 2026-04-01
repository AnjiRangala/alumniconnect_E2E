export const EventCard = ({ title, description, date, time, location, category, createdBy, onRegister, _id, id, status, isRegistrationClosed = false, isAlreadyRegistered = false }) => {
  // Format date for display
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const eventId = _id || id;
  const speaker = createdBy?.userName || 'Alumni';
  const isCompleted = status === 'completed';
  const registrationClosed = Boolean(isRegistrationClosed || isCompleted);
  const registrationBlocked = registrationClosed || isAlreadyRegistered;

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition overflow-hidden ${
      registrationBlocked ? 'opacity-75' : ''
    }`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-800 line-clamp-2">{title}</h3>
          <p className="text-gray-600 text-sm">By {speaker}</p>
        </div>
        <div className="flex gap-2 ml-2">
          <span className="bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full whitespace-nowrap">
            {category || 'Other'}
          </span>
          {registrationClosed && (
            <span className="bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full whitespace-nowrap font-semibold">
              ✅ Completed
            </span>
          )}
          {!registrationClosed && isAlreadyRegistered && (
            <span className="bg-emerald-100 text-emerald-700 text-xs px-3 py-1 rounded-full whitespace-nowrap font-semibold">
              ✅ Registered
            </span>
          )}
        </div>
      </div>
      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{description}</p>
      <div className="space-y-2 mb-4 text-sm text-gray-600">
        <p>📅 {formatDate(date)}</p>
        {time && <p>⏰ {time}</p>}
        {location && <p>📍 {location}</p>}
      </div>
      {registrationClosed ? (
        <div className="w-full bg-gray-400 text-white py-2 rounded-lg text-center font-semibold cursor-not-allowed">
          Registration Closed - Event Completed
        </div>
      ) : isAlreadyRegistered ? (
        <div className="w-full bg-emerald-600 text-white py-2 rounded-lg text-center font-semibold cursor-not-allowed">
          Already Registered for this Event
        </div>
      ) : (
        <button
          onClick={() => onRegister(eventId)}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-semibold"
        >
          Register Now
        </button>
      )}
    </div>
  );
};
