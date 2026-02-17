import { Users, Award, Calendar, Briefcase, ArrowRight, CheckCircle } from 'lucide-react';

export const LandingPage = ({ onNavigate }) => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 bg-white shadow-sm">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">A</span>
          </div>
          <span className="text-xl font-bold text-gray-800">AlumniConnect</span>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-4">
            Connect. Mentor. Grow.
          </h1>
          <p className="text-xl text-blue-100 mb-8">
            The platform connecting students with alumni mentors for career growth and professional development
          </p>
        </div>
      </section>

      {/* Key Features Summary */}
      <section className="py-12 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">Why Join AlumniConnect?</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
              <div className="bg-blue-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Users className="text-white" size={24} />
              </div>
              <h3 className="text-lg font-bold mb-2 text-gray-800">Find Your Mentor</h3>
              <p className="text-gray-600">Connect with experienced professionals who can guide your career journey</p>
            </div>

            <div className="bg-green-50 p-6 rounded-lg border border-green-200">
              <div className="bg-green-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Award className="text-white" size={24} />
              </div>
              <h3 className="text-lg font-bold mb-2 text-gray-800">Skill Endorsements</h3>
              <p className="text-gray-600">Get your skills verified and endorsed by industry professionals</p>
            </div>

            <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
              <div className="bg-purple-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Calendar className="text-white" size={24} />
              </div>
              <h3 className="text-lg font-bold mb-2 text-gray-800">Events & Webinars</h3>
              <p className="text-gray-600">Attend networking events and learn from industry leaders</p>
            </div>

            <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
              <div className="bg-orange-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Briefcase className="text-white" size={24} />
              </div>
              <h3 className="text-lg font-bold mb-2 text-gray-800">Job Opportunities</h3>
              <p className="text-gray-600">Get job referrals from your network and land your dream role</p>
            </div>
          </div>
        </div>
      </section>

      {/* Login Section */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">Get Started Now</h2>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Student Login */}
            <div className="bg-white rounded-lg shadow-lg p-8 border-t-4 border-blue-600">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mb-6 mx-auto">
                <Users className="text-blue-600" size={32} />
              </div>

              <h3 className="text-2xl font-bold text-center mb-4 text-gray-800">Student</h3>

              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3">
                  <CheckCircle className="text-green-600 mt-1 flex-shrink-0" size={20} />
                  <span className="text-gray-700">Find mentors in your field</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="text-green-600 mt-1 flex-shrink-0" size={20} />
                  <span className="text-gray-700">Get career guidance</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="text-green-600 mt-1 flex-shrink-0" size={20} />
                  <span className="text-gray-700">Access job opportunities</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="text-green-600 mt-1 flex-shrink-0" size={20} />
                  <span className="text-gray-700">Attend webinars & events</span>
                </li>
              </ul>

              <div className="space-y-3">
                <button
                  onClick={() => onNavigate('student-login')}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2"
                >
                  Student Login <ArrowRight size={20} />
                </button>
                <button
                  onClick={() => onNavigate('student-register')}
                  className="w-full border-2 border-blue-600 text-blue-600 py-3 rounded-lg font-semibold hover:bg-blue-50 transition"
                >
                  Create Student Account
                </button>
              </div>
            </div>

            {/* Alumni Login */}
            <div className="bg-white rounded-lg shadow-lg p-8 border-t-4 border-purple-600">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mb-6 mx-auto">
                <Briefcase className="text-purple-600" size={32} />
              </div>

              <h3 className="text-2xl font-bold text-center mb-4 text-gray-800">Alumni</h3>

              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3">
                  <CheckCircle className="text-green-600 mt-1 flex-shrink-0" size={20} />
                  <span className="text-gray-700">Mentor students</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="text-green-600 mt-1 flex-shrink-0" size={20} />
                  <span className="text-gray-700">Post job openings</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="text-green-600 mt-1 flex-shrink-0" size={20} />
                  <span className="text-gray-700">Endorse skills</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="text-green-600 mt-1 flex-shrink-0" size={20} />
                  <span className="text-gray-700">Give back to community</span>
                </li>
              </ul>

              <div className="space-y-3">
                <button
                  onClick={() => onNavigate('alumni-login')}
                  className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition flex items-center justify-center gap-2"
                >
                  Alumni Login <ArrowRight size={20} />
                </button>
                <button
                  onClick={() => onNavigate('alumni-register')}
                  className="w-full border-2 border-purple-600 text-purple-600 py-3 rounded-lg font-semibold hover:bg-purple-50 transition"
                >
                  Create Alumni Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">Success Stories</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-yellow-400">★</span>
                ))}
              </div>
              <p className="text-gray-700 mb-4 italic">"Found an amazing mentor who helped me land my dream job at a top tech company!"</p>
              <p className="font-bold text-gray-800">Student Success</p>
              <p className="text-gray-600 text-sm">Mentorship Works</p>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-yellow-400">★</span>
                ))}
              </div>
              <p className="text-gray-700 mb-4 italic">"Mentoring through AlumniConnect has been incredibly rewarding. Great community!"</p>
              <p className="font-bold text-gray-800">Alumni Impact</p>
              <p className="text-gray-600 text-sm">Making a Difference</p>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-yellow-400">★</span>
                ))}
              </div>
              <p className="text-gray-700 mb-4 italic">"The events and networking opportunities have been life-changing for my career."</p>
              <p className="font-bold text-gray-800">Growth Opportunity</p>
              <p className="text-gray-600 text-sm">Career Development</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-8 px-6 mt-auto">
        <div className="max-w-6xl mx-auto text-center">
          <p>&copy; 2026 AlumniConnect. Connecting Students with Alumni for Career Growth.</p>
        </div>
      </footer>
    </div>
  );
};
