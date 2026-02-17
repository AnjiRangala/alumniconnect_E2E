export const EventCard = ({ title, speaker, date, time, category, onRegister }: any) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-gray-600 text-sm">By {speaker}</p>
        </div>
        <span className="bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full">
          {category}
        </span>
      </div>
      <div className="space-y-2 mb-4 text-sm text-gray-600">
        <p>📅 {date}</p>
        <p>⏰ {time}</p>
      </div>
      <button 
        onClick={onRegister}
        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
      >
        Register Now
      </button>
    </div>
  );
};
