
import { useState } from 'react';

interface HeaderProps {
  onBackToGenerator: () => void;
}

const Header = ({ onBackToGenerator }: HeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-purple-100 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div 
            className="flex items-center space-x-2 cursor-pointer group"
            onClick={onBackToGenerator}
          >
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
              <span className="text-white font-bold text-lg">V</span>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Viducate
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <button
              onClick={onBackToGenerator}
              className="px-4 py-2 rounded-lg transition-all font-medium text-gray-600 hover:text-purple-600 hover:bg-purple-50"
            >
              New Lesson
            </button>
            <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full cursor-pointer hover:scale-105 transition-transform"></div>
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <div className="w-6 h-6 flex flex-col justify-around">
              <span className={`block h-0.5 bg-gray-600 transition-transform ${isMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
              <span className={`block h-0.5 bg-gray-600 transition-opacity ${isMenuOpen ? 'opacity-0' : ''}`}></span>
              <span className={`block h-0.5 bg-gray-600 transition-transform ${isMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
            </div>
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden mt-4 pb-4 border-t border-gray-100">
            <div className="flex flex-col space-y-2 pt-4">
              <button
                onClick={() => {
                  onBackToGenerator();
                  setIsMenuOpen(false);
                }}
                className="px-4 py-2 rounded-lg transition-all font-medium text-left text-gray-600 hover:text-purple-600 hover:bg-purple-50"
              >
                New Lesson
              </button>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
