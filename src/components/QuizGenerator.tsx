
import { useState } from 'react';

interface QuizGeneratorProps {
  onQuizGenerated: (quiz: any) => void;
}

const QuizGenerator = ({ onQuizGenerated }: QuizGeneratorProps) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Mock function to simulate AI quiz generation
  const generateMockQuiz = (videoTitle: string) => {
    return {
      videoTitle,
      videoUrl: url,
      questions: [
        {
          id: 1,
          questionText: "What is the main topic discussed in this video?",
          options: [
            "Introduction to React Hooks",
            "CSS Grid Layout",
            "JavaScript Fundamentals",
            "Database Design"
          ],
          correctAnswer: "Introduction to React Hooks"
        },
        {
          id: 2,
          questionText: "Which React Hook is used for managing state?",
          options: [
            "useEffect",
            "useState",
            "useContext",
            "useReducer"
          ],
          correctAnswer: "useState"
        },
        {
          id: 3,
          questionText: "What happens when you call useState?",
          options: [
            "It returns a single value",
            "It returns an array with two elements",
            "It returns an object",
            "It returns a function"
          ],
          correctAnswer: "It returns an array with two elements"
        },
        {
          id: 4,
          questionText: "When should you use the useEffect Hook?",
          options: [
            "Only for API calls",
            "For side effects in functional components",
            "Only for event handlers",
            "For styling components"
          ],
          correctAnswer: "For side effects in functional components"
        },
        {
          id: 5,
          questionText: "What is the dependency array in useEffect used for?",
          options: [
            "To pass props to components",
            "To control when the effect runs",
            "To store state values",
            "To handle errors"
          ],
          correctAnswer: "To control when the effect runs"
        }
      ]
    };
  };

  const extractVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const handleGenerateQuiz = async () => {
    if (!url.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      setError('Please enter a valid YouTube URL');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Generate mock quiz data
      const mockQuiz = generateMockQuiz('React Hooks Tutorial - Complete Guide');
      onQuizGenerated(mockQuiz);
    } catch (err) {
      setError('Failed to generate quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-white/50">
        <div className="space-y-6">
          <div>
            <label htmlFor="youtube-url" className="block text-lg font-semibold text-gray-700 mb-3">
              YouTube Video URL
            </label>
            <div className="relative">
              <input
                id="youtube-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none bg-white/80"
                disabled={loading}
              />
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <span className="text-2xl">🎬</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-red-600 font-medium">{error}</p>
            </div>
          )}

          <button
            onClick={handleGenerateQuiz}
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl hover:-translate-y-1 text-lg"
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                <span>Generating Your Quiz...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <span>Generate Interactive Quiz</span>
                <span className="text-xl">✨</span>
              </div>
            )}
          </button>
        </div>

        {loading && (
          <div className="mt-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-700 mb-3">Creating Your Personalized Quiz</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                  <span>Fetching video transcript...</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse animation-delay-200"></div>
                  <span>Analyzing content with AI...</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse animation-delay-400"></div>
                  <span>Generating comprehension questions...</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizGenerator;
