import { Link } from 'react-router-dom';

function Navbar() {
  return (
    <nav className="bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="text-xl font-bold text-indigo-600">
            URL Shortener
          </Link>
          <div className="flex space-x-4">
            <Link
              to="/"
              className="text-gray-600 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium"
            >
              Home
            </Link>
            <Link
              to="/dashboard"
              className="text-gray-600 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar; 