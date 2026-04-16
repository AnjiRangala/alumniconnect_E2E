export const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-bold mb-4">AlumniConnect</h3>
            <p className="text-gray-400">Connecting Students with Alumni for Career Growth</p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="text-gray-400 space-y-2">
              <li>About Us</li>
              <li>Contact</li>
              <li>Blog</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <ul className="text-gray-400 space-y-2">
              <li>Help Center</li>
              <li>Privacy Policy</li>
              <li>Terms</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Connect</h4>
            <ul className="text-gray-400 space-y-2">
              <li>LinkedIn</li>
              <li>Twitter</li>
              <li>Facebook</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; 2026 AlumniConnect. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};
