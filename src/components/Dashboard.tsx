
import { useState, useEffect } from 'react';
import { Play, Clock, User, TrendingUp, Award, BookOpen, FileText, Eye } from 'lucide-react';
import { getQuizSessions, QuizSession } from '../services/quizDatabase';

interface DashboardProps {
  onBackToGenerator: () => void;
}

const Dashboard = ({ onBackToGenerator }: DashboardProps) => {
  const [quizSessions, setQuizSessions] = useState<QuizSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<QuizSession | null>(null);
  const [showSummary, setShowSummary] = useState(false);

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

  const handleViewSummary = (session: QuizSession) => {
    setSelectedSession(session);
    setShowSummary(true);
  };

  const closeSummary = () => {
    setSelectedSession(null);
    setShowSummary(false);
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
                      
                      <div className="flex-shrink-0 text-right space-y-2">
                        {session.completedAt ? (
                          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(session.completionPercentage)}`}>
                            {Math.round(session.completionPercentage)}%
                          </div>
                        ) : (
                          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-gray-600 bg-gray-100">
                            In Progress
                          </div>
                        )}
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewSummary(session)}
                            className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="View Summary"
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleViewSummary(session)}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Assessment"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
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

      {/* Summary Modal */}
      {showSummary && selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Video Summary & Assessment</h2>
              <button
                onClick={closeSummary}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              {/* Video Info */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{selectedSession.videoTitle}</h3>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span className="flex items-center">
                    <User className="h-4 w-4 mr-1" />
                    {selectedSession.channelTitle}
                  </span>
                  <span className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {selectedSession.videoDuration}
                  </span>
                  <span className="flex items-center">
                    <BookOpen className="h-4 w-4 mr-1" />
                    {selectedSession.totalQuestions} questions
                  </span>
                </div>
              </div>

              {/* AI Summary */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <span className="mr-2">🤖</span>
                  AI-Generated Video Summary
                </h4>
                <div className="space-y-4">
                  <div>
                    <h5 className="font-medium text-gray-700 mb-2">Key Learning Points:</h5>
                    <ul className="list-disc list-inside space-y-1 text-gray-600">
                      <li>Main concepts and learning objectives covered in detail</li>
                      <li>Practical applications and real-world implementation examples</li>
                      <li>Step-by-step methodology and systematic approach explained</li>
                      <li>Key takeaways and actionable insights for immediate use</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-700 mb-2">Content Overview:</h5>
                    <p className="text-gray-600">
                      This educational video provides comprehensive coverage of important concepts with practical 
                      examples and real-world applications. The content is structured to help learners understand 
                      fundamental principles while building practical skills they can apply immediately.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {['Educational', 'Skill Development', 'Learning', 'Practical'].map((tag) => (
                      <span key={tag} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Performance Summary */}
              {selectedSession.completedAt && (
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <span className="mr-2">📊</span>
                    Learning Assessment Results
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {Math.round(selectedSession.completionPercentage)}%
                      </div>
                      <div className="text-sm text-green-700">Overall Score</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {selectedSession.correctAnswers || 0}
                      </div>
                      <div className="text-sm text-blue-700">Correct Answers</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {selectedSession.totalQuestions}
                      </div>
                      <div className="text-sm text-purple-700">Total Questions</div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-gray-600 text-sm">
                      Completed on {formatDate(selectedSession.completedAt)}. 
                      This assessment included knowledge checks, reflection questions, and practical application scenarios.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 text-center">
              <button
                onClick={closeSummary}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3 px-8 rounded-2xl transition-all duration-300"
              >
                Close Summary
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
