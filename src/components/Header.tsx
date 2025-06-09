
import { Link } from 'react-router-dom';
import { Home, BarChart3 } from 'lucide-react';

interface HeaderProps {
  onBackToGenerator: () => void;
}

const Header = ({ onBackToGenerator }: HeaderProps) => {
  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <button
              onClick={onBackToGenerator}
              className="flex items-center space-x-2 text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent hover:opacity-80 transition-opacity"
            >
              <span>📚</span>
              <span>LearnTube</span>
            </button>
            
            <nav className="hidden md:flex items-center space-x-6">
              <Link 
                to="/"
                className="flex items-center space-x-2 text-gray-600 hover:text-purple-600 transition-colors"
              >
                <Home className="h-4 w-4" />
                <span>Home</span>
              </Link>
              <Link 
                to="/dashboard"
                className="flex items-center space-x-2 text-gray-600 hover:text-purple-600 transition-colors"
              >
                <BarChart3 className="h-4 w-4" />
                <span>Dashboard</span>
              </Link>
            </nav>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">AI-Powered Learning</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
