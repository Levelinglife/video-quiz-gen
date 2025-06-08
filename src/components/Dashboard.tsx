
import { useState, useEffect } from 'react';
import { Play, Clock, User, TrendingUp, Award, BookOpen } from 'lucide-react';
import { getQuizSessions, QuizSession } from '../services/quizDatabase';

interface DashboardProps {
  onBackToGenerator: () => void;
}

const Dashboard = ({ onBackToGenerator }: DashboardProps) => {
  const [quizSessions, setQuizSessions] = useState<QuizSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadQuizSessions = async () => {
      try {
        const sessions = await getQuizSessions();
        setQuizSessions(sessions);
      } catch (error) {
        console.error('Failed to load quiz sessions:', error);
      } finally {
        setLoading(false);
      }
    };

    loadQuizSessions();
  }, []);

  const totalQuizzes = quizSessions.length;
  const averageScore = quizSessions.length > 0 
    ? Math.round(quizSessions.reduce((acc, session) => acc + (session.completionPercentage || 0), 0) / quizSessions.length)
    : 0;
  const totalCorrectAnswers = quizSessions.reduce((acc, session) => acc + (session.correctAnswers || 0), 0);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your learning dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Learning Dashboard</h1>
          <p className="text-gray-600">Track your progress and learning achievements</p>
        </div>
        <button
          onClick={onBackToGenerator}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3 px-6 rounded-2xl transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
        >
          Create New Quiz
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-purple-100 rounded-2xl">
              <BookOpen className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-gray-600 text-sm">Total Quizzes</p>
              <p className="text-2xl font-bold text-gray-900">{totalQuizzes}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-green-100 rounded-2xl">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-gray-600 text-sm">Average Score</p>
              <p className="text-2xl font-bold text-gray-900">{averageScore}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-100 rounded-2xl">
              <Award className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-gray-600 text-sm">Correct Answers</p>
              <p className="text-2xl font-bold text-gray-900">{totalCorrectAnswers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-orange-100 rounded-2xl">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-gray-600 text-sm">Hours Learned</p>
              <p className="text-2xl font-bold text-gray-900">{Math.round(totalQuizzes * 0.5)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Quizzes */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/50">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Learning Sessions</h2>
        
        {quizSessions.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No quizzes yet</h3>
            <p className="text-gray-500 mb-6">Start your learning journey by creating your first quiz!</p>
            <button
              onClick={onBackToGenerator}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3 px-6 rounded-2xl transition-all duration-300"
            >
              Create Your First Quiz
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {quizSessions.map((session) => (
              <div key={session.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-start space-x-4">
                  {session.videoThumbnail && (
                    <div className="flex-shrink-0">
                      <img 
                        src={session.videoThumbnail} 
                        alt={session.videoTitle}
                        className="w-20 h-12 object-cover rounded-lg"
                      />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-lg mb-1 truncate">
                          {session.videoTitle}
                        </h3>
                        {session.channelTitle && (
                          <p className="text-gray-600 text-sm flex items-center mb-2">
                            <User className="h-4 w-4 mr-1" />
                            {session.channelTitle}
                          </p>
                        )}
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className="flex items-center">
                            <Play className="h-4 w-4 mr-1" />
                            {session.videoDuration}
                          </span>
                          <span className="flex items-center">
                            <BookOpen className="h-4 w-4 mr-1" />
                            {session.totalQuestions} questions
                          </span>
                          <span>{formatDate(session.createdAt)}</span>
                        </div>
                      </div>
                      
                      <div className="flex-shrink-0 text-right">
                        {session.completedAt ? (
                          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(session.completionPercentage)}`}>
                            {Math.round(session.completionPercentage)}%
                          </div>
                        ) : (
                          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-gray-600 bg-gray-100">
                            In Progress
                          </div>
                        )}
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
