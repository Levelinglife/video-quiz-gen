
import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import QuizGenerator from './components/QuizGenerator';
import InteractiveQuiz from './components/InteractiveQuiz';
import Dashboard from './components/Dashboard';
import { GeneratedQuiz } from './services/realAiService';

function App() {
  const [currentQuiz, setCurrentQuiz] = useState<GeneratedQuiz | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);

  const handleQuizGenerated = (quiz: GeneratedQuiz, sessionId: string) => {
    setCurrentQuiz(quiz);
    setCurrentSessionId(sessionId);
    setShowDashboard(false);
  };

  const handleQuizComplete = () => {
    setShowDashboard(true);
  };

  const handleBackToGenerator = () => {
    setCurrentQuiz(null);
    setCurrentSessionId(null);
    setShowDashboard(false);
  };

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <Header onBackToGenerator={handleBackToGenerator} />
        
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={
              <>
                {showDashboard ? (
                  <Dashboard onBackToGenerator={handleBackToGenerator} />
                ) : currentQuiz && currentSessionId ? (
                  <InteractiveQuiz 
                    quiz={currentQuiz} 
                    sessionId={currentSessionId}
                    onComplete={handleQuizComplete} 
                  />
                ) : (
                  <div className="text-center space-y-8">
                    <div className="space-y-4">
                      <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                        Transform YouTube into Interactive Learning
                      </h1>
                      <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                        Turn any YouTube video into a personalized learning experience with AI-powered questions, 
                        knowledge checks, and reflective exercises designed to maximize your learning potential.
                      </p>
                    </div>
                    <QuizGenerator onQuizGenerated={handleQuizGenerated} />
                  </div>
                )}
              </>
            } />
            <Route path="/dashboard" element={<Dashboard onBackToGenerator={handleBackToGenerator} />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
