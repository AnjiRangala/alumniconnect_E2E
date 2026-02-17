export const MentorCard = ({ name, role, company, skills, experience, industry, availability, matchPercentage, photo, onRequest }) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
      <img src={photo} alt={name} className="w-full h-48 object-cover" />
      <div className="p-6">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-lg font-semibold">{name}</h3>
            <p className="text-gray-600 text-sm font-medium">{role}</p>
            {company && <p className="text-gray-500 text-xs">{company}</p>}
          </div>
          {matchPercentage && (
            <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-sm font-semibold">
              {matchPercentage}%
            </span>
          )}
        </div>

        <div className="space-y-3 mb-4">
          {experience && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span className="font-semibold">📊 Experience:</span>
              <span>{experience}</span>
            </div>
          )}

          {industry && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span className="font-semibold">💼 Industry:</span>
              <span>{industry}</span>
            </div>
          )}

          {availability && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span className="font-semibold">🕐 Available:</span>
              <span>{availability}</span>
            </div>
          )}
        </div>

        {skills && skills.length > 0 && (
          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-2 font-semibold">Skills:</p>
            <div className="flex flex-wrap gap-2">
              {skills.slice(0, 5).map((skill, index) => (
                <span key={index} className="bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full">
                  {skill}
                </span>
              ))}
              {skills.length > 5 && (
                <span className="text-xs text-gray-500 px-2 py-1">+{skills.length - 5} more</span>
              )}
            </div>
          </div>
        )}

        <button
          onClick={onRequest}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Request Mentor
        </button>
      </div>
    </div>
  );
};
