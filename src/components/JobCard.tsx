export const JobCard = ({ title, company, location, type, salary, skills, applyUrl }: any) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-gray-600">{company}</p>
      </div>
      <div className="space-y-2 text-sm text-gray-600 mb-4">
        <p>📍 {location}</p>
        <p>💼 {type}</p>
        {salary && <p>💰 {salary}</p>}
      </div>
      <div className="mb-4">
        <p className="text-sm text-gray-500 mb-2">Required Skills:</p>
        <div className="flex flex-wrap gap-2">
          {skills.map((skill: string) => (
            <span key={skill} className="bg-blue-50 text-blue-600 text-xs px-3 py-1 rounded-full">
              {skill}
            </span>
          ))}
        </div>
      </div>
      <button className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition">
        Apply Now
      </button>
    </div>
  );
};
