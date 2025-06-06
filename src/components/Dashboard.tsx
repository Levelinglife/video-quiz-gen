
import { useState } from 'react';

interface QuizHistory {
  id: number;
  videoTitle: string;
  videoThumbnail: string;
  score: number;
  totalQuestions: number;
  completedAt: string;
  duration: string;
}

const Dashboard = () => {
  // Mock data for demonstration
  const [quizHistory] = useState<QuizHistory[]>([
    {
      id: 1,
      videoTitle: "React Hooks Tutorial - Complete Guide",
      videoThumbnail: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=225&fit=crop",
      score: 8,
      totalQuestions: 10,
      completedAt: "2024-01-15",
      duration: "12:45"
    },
    {
      id: 2,
      videoTitle: "JavaScript ES6 Features Explained",
      videoThumbnail: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=400&h=225&fit=crop",
      score: 7,
      totalQuestions: 8,
      completedAt: "2024-01-14",
      duration: "8:30"
    },
    {
      id: 3,
      videoTitle: "CSS Grid Layout Masterclass",
      videoThumbnail: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=400&h=225&fit=crop",
      score: 9,
      totalQuestions: 12,
      completedAt: "2024-01-12",
      duration: "15:20"
    },
    {
      id: 4,
      videoTitle: "Node.js Backend Development",
      videoThumbnail: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=225&fit=crop",
      score: 6,
      totalQuestions: 10,
      completedAt: "2024-01-10",
      duration: "18:15"
    }
  ]);

  const totalQuizzes = quizHistory.length;
  const averageScore = Math.round(
    quizHistory.reduce((sum, quiz) => sum + (quiz.score / quiz.totalQuestions) * 100, 0) / totalQuizzes
  );
  const totalQuestionsAnswered = quizHistory.reduce((sum, quiz) => sum + quiz.totalQuestions, 0);

  const getScoreColor = (score: number, total: number) => {
    const percentage = (score / total) * 100;
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeColor = (score: number, total: number) => {
    const percentage = (score / total) * 100;
    if (percentage >= 80) return 'bg-green-100 border-green-200';
    if (percentage >= 60) return 'bg-yellow-100 border-yellow-200';
    return 'bg-red-100 border-red-200';
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
          Learning Dashboard
        </h1>
        <p className="text-xl text-gray-600">Track your progress and review your learning journey</p>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-700">Total Quizzes</h3>
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
              <span className="text-white text-xl">📚</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-800">{totalQuizzes}</div>
          <p className="text-sm text-gray-600 mt-1">Videos completed</p>
        </div>

        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-700">Average Score</h3>
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-teal-500 rounded-xl flex items-center justify-center">
              <span className="text-white text-xl">📊</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-800">{averageScore}%</div>
          <p className="text-sm text-gray-600 mt-1">Overall performance</p>
        </div>

        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-700">Questions Answered</h3>
            <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
              <span className="text-white text-xl">❓</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-800">{totalQuestionsAnswered}</div>
          <p className="text-sm text-gray-600 mt-1">Total questions</p>
        </div>
      </div>

      {/* Quiz History */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/50">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Recent Learning Activity</h2>
        
        {quizHistory.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📝</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No quizzes completed yet</h3>
            <p className="text-gray-500">Create your first quiz to start tracking your progress!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {quizHistory.map((quiz) => (
              <div key={quiz.id} className="bg-white/50 rounded-2xl p-6 border border-gray-100 hover:shadow-md transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center space-x-6">
                  {/* Thumbnail */}
                  <div className="flex-shrink-0">
                    <img
                      src={quiz.videoThumbnail}
                      alt={quiz.videoTitle}
                      className="w-32 h-20 object-cover rounded-xl"
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2 truncate">
                      {quiz.videoTitle}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>Completed on {quiz.completedAt}</span>
                      <span>•</span>
                      <span>Duration: {quiz.duration}</span>
                      <span>•</span>
                      <span>{quiz.totalQuestions} questions</span>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="flex-shrink-0">
                    <div className={`px-4 py-2 rounded-xl border-2 ${getScoreBadgeColor(quiz.score, quiz.totalQuestions)}`}>
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${getScoreColor(quiz.score, quiz.totalQuestions)}`}>
                          {Math.round((quiz.score / quiz.totalQuestions) * 100)}%
                        </div>
                        <div className="text-xs text-gray-600">
                          {quiz.score}/{quiz.totalQuestions}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
