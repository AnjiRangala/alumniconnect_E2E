export const MentorCard = ({ name, role, company, skills, experience, industry, availability, matchPercentage, photo, onRequest }) => {
  const roleText = String(role || '').trim();
  const companyText = String(company || '').trim();
  const showCompany = companyText && !roleText.toLowerCase().includes(companyText.toLowerCase());

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition h-full flex flex-col border border-gray-100">
      <img src={photo} alt={name} className="w-full h-44 object-cover" />

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-start gap-3 mb-3 min-h-[72px]">
          <div className="min-w-0 flex-1">
            <h3 className="text-xl font-bold text-gray-800 truncate">{name}</h3>
            <p className="text-gray-700 text-sm font-medium truncate">{roleText || 'Professional'}</p>
            {showCompany && <p className="text-gray-500 text-xs truncate mt-0.5">{companyText}</p>}
          </div>

          {matchPercentage ? (
            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-bold whitespace-nowrap">
              {matchPercentage}%
            </span>
          ) : null}
        </div>

        <div className="space-y-2 mb-4 min-h-[88px] text-sm">
          <div className="flex items-center gap-2 text-gray-700">
            <span className="font-semibold w-20">Experience</span>
            <span className="text-gray-600 truncate">{experience || 'Not specified'}</span>
          </div>

          <div className="flex items-center gap-2 text-gray-700">
            <span className="font-semibold w-20">Industry</span>
            <span className="text-gray-600 truncate">{industry || 'Not specified'}</span>
          </div>

          <div className="flex items-center gap-2 text-gray-700">
            <span className="font-semibold w-20">Available</span>
            <span className="text-gray-600 truncate">{availability || 'Flexible'}</span>
          </div>
        </div>

        {skills && skills.length > 0 && (
          <div className="mb-4 min-h-[84px]">
            <p className="text-sm text-gray-500 mb-2 font-semibold">Skills</p>
            <div className="flex flex-wrap gap-2">
              {skills.slice(0, 4).map((skill, index) => (
                <span key={index} className="bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full font-medium">
                  {skill}
                </span>
              ))}
              {skills.length > 4 && (
                <span className="text-xs text-gray-500 px-2 py-1">+{skills.length - 4} more</span>
              )}
            </div>
          </div>
        )}

        <button
          onClick={onRequest}
          className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition mt-auto font-semibold"
        >
          Request Mentor
        </button>
      </div>
    </div>
  );
};
