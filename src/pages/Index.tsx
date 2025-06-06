
import { useState } from 'react';
import Header from '../components/Header';
import QuizGenerator from '../components/QuizGenerator';
import Dashboard from '../components/Dashboard';
import InteractiveQuiz from '../components/InteractiveQuiz';

const Index = () => {
  const [currentView, setCurrentView] = useState<'home' | 'dashboard' | 'quiz'>('home');
  const [currentQuiz, setCurrentQuiz] = useState(null);

  const handleQuizGenerated = (quiz: any) => {
    setCurrentQuiz(quiz);
    setCurrentView('quiz');
  };

  const handleQuizComplete = () => {
    setCurrentView('dashboard');
    setCurrentQuiz(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <Header currentView={currentView} setCurrentView={setCurrentView} />
      
      <main className="container mx-auto px-4 py-8">
        {currentView === 'home' && (
          <div className="max-w-4xl mx-auto">
            {/* Hero Section */}
            <div className="text-center mb-12">
              <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent mb-6">
                Turn Any Video Into an Interactive Lesson
              </h1>
              <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                Paste a YouTube URL and let AI generate personalized quizzes to test your understanding and boost retention.
              </p>
            </div>

            <QuizGenerator onQuizGenerated={handleQuizGenerated} />

            {/* Features Section */}
            <div className="mt-20 grid md:grid-cols-3 gap-8">
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-white text-xl">🧠</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">AI-Powered Questions</h3>
                <p className="text-gray-600">Advanced AI analyzes video content to generate relevant, challenging questions that test true comprehension.</p>
              </div>

              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-white text-xl">📊</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Track Progress</h3>
                <p className="text-gray-600">Monitor your learning journey with detailed analytics, scores, and improvement insights over time.</p>
              </div>

              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-white text-xl">⚡</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Instant Results</h3>
                <p className="text-gray-600">Get immediate feedback on your answers with detailed explanations and references to video timestamps.</p>
              </div>
            </div>
          </div>
        )}

        {currentView === 'dashboard' && <Dashboard />}
        
        {currentView === 'quiz' && currentQuiz && (
          <InteractiveQuiz quiz={currentQuiz} onComplete={handleQuizComplete} />
        )}
      </main>
    </div>
  );
};

export default Index;
