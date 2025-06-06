
import { useState } from 'react';
import Header from '../components/Header';
import QuizGenerator from '../components/QuizGenerator';
import Dashboard from '../components/Dashboard';
import InteractiveQuiz from '../components/InteractiveQuiz';
import { GeneratedQuiz } from '../services/aiService';

const Index = () => {
  const [currentView, setCurrentView] = useState<'home' | 'dashboard' | 'quiz'>('home');
  const [currentQuiz, setCurrentQuiz] = useState<GeneratedQuiz | null>(null);

  const handleQuizGenerated = (quiz: GeneratedQuiz) => {
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
                Turn Any Video Into a Personalized Learning Journey
              </h1>
              <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                Paste a YouTube URL and let AI generate personalized quizzes with comprehension questions, reflective prompts, and goal-setting exercises to maximize your learning.
              </p>
            </div>

            <QuizGenerator onQuizGenerated={handleQuizGenerated} />

            {/* Features Section */}
            <div className="mt-20 grid md:grid-cols-3 gap-8">
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-white text-xl">🧠</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Smart Question Types</h3>
                <p className="text-gray-600">Mix of comprehension checks, personal reflections, real-world applications, and goal-setting prompts tailored to your learning style.</p>
              </div>

              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-white text-xl">💭</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Reflective Learning</h3>
                <p className="text-gray-600">Explore why you watched the video, identify key takeaways, and discover how to apply insights to your personal and professional life.</p>
              </div>

              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-white text-xl">🎯</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Actionable Goals</h3>
                <p className="text-gray-600">Set specific next steps and goals based on your learning, creating a clear path for continued growth and application.</p>
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
