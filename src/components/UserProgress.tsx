import { useState, useEffect } from 'react';
import { ArrowLeft, Play, Clock, User, TrendingUp, Award, BookOpen, FileText, Eye, Calendar, Target, Brain, BarChart3 } from 'lucide-react';
import { getQuizSessions, QuizSession } from '../services/quizDatabase';

interface UserProgressProps {
  onBackToDashboard: () => void;
  onViewQuiz?: (sessionId: string) => void;
}

const UserProgress = ({ onBackToDashboard, onViewQuiz }: UserProgressProps) => {
  const [quizSessions, setQuizSessions] = useState<QuizSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'all' | 'week' | 'month' | 'year'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'completed' | 'inProgress'>('all');

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

  const filterSessionsByTime = (sessions: QuizSession[]) => {
    if (timeFilter === 'all') return sessions;
    
    const now = new Date();
    const filterDate = new Date();
    
    switch (timeFilter) {
      case 'week':
        filterDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        filterDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        filterDate.setFullYear(now.getFullYear() - 1);
        break;
    }
    
    return sessions.filter(session => new Date(session.createdAt) >= filterDate);
  };

  const filterSessionsByCategory = (sessions: QuizSession[]) => {
    switch (categoryFilter) {
      case 'completed':
        return sessions.filter(session => session.completedAt);
      case 'inProgress':
        return sessions.filter(session => !session.completedAt);
      default:
        return sessions;
    }
  };

  const filteredSessions = filterSessionsByCategory(filterSessionsByTime(quizSessions));

  // Analytics calculations
  const totalVideosWatched = quizSessions.length;
  const completedQuizzes = quizSessions.filter(s => s.completedAt).length;
  const averageScore = completedQuizzes > 0 
    ? Math.round(quizSessions.filter(s => s.completedAt).reduce((acc, session) => acc + (session.completionPercentage || 0), 0) / completedQuizzes)
    : 0;
  const totalCorrectAnswers = quizSessions.reduce((acc, session) => acc + (session.correctAnswers || 0), 0);
  const totalLearningHours = Math.round(totalVideosWatched * 0.5 * 10) / 10;
  const weeklyGoal = 3; // Weekly learning goal
  const thisWeekSessions = filterSessionsByTime(quizSessions).length;
  const streakDays = 5; // Mock streak calculation

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const handleViewQuiz = (session: QuizSession) => {
    if (onViewQuiz) {
      onViewQuiz(session.id);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your learning progress...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBackToDashboard}
            className="flex items-center space-x-2 text-gray-600 hover:text-purple-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Dashboard</span>
          </button>
          <div className="h-6 w-px bg-gray-300"></div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Learning Progress
            </h1>
            <p className="text-gray-600">Comprehensive overview of your learning journey</p>
          </div>
        </div>
      </div>

      {/* Advanced Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-3xl p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Videos Watched</p>
              <p className="text-3xl font-bold">{totalVideosWatched}</p>
              <p className="text-purple-200 text-xs mt-1">All time</p>
            </div>
            <Play className="h-8 w-8 text-purple-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-3xl p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Average Score</p>
              <p className="text-3xl font-bold">{averageScore}%</p>
              <p className="text-green-200 text-xs mt-1">Knowledge tests</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-3xl p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Learning Hours</p>
              <p className="text-3xl font-bold">{totalLearningHours}</p>
              <p className="text-blue-200 text-xs mt-1">Total time invested</p>
            </div>
            <Clock className="h-8 w-8 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-3xl p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Learning Streak</p>
              <p className="text-3xl font-bold">{streakDays}</p>
              <p className="text-orange-200 text-xs mt-1">Days in a row</p>
            </div>
            <Target className="h-8 w-8 text-orange-200" />
          </div>
        </div>
      </div>

      {/* Weekly Goal Progress */}
      <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-white/50">
        <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <Target className="h-6 w-6 mr-3 text-purple-600" />
          Weekly Learning Goal
        </h3>
        <div className="flex items-center space-x-6">
          <div className="flex-1">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Progress this week</span>
              <span className="text-sm text-gray-500">{thisWeekSessions} / {weeklyGoal} videos</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((thisWeekSessions / weeklyGoal) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-purple-600">
              {Math.round((thisWeekSessions / weeklyGoal) * 100)}%
            </div>
            <div className="text-sm text-gray-500">Complete</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/50">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Time Period:</span>
            <select 
              value={timeFilter} 
              onChange={(e) => setTimeFilter(e.target.value as any)}
              className="bg-white border border-gray-300 rounded-lg px-3 py-1 text-sm"
            >
              <option value="all">All Time</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last Month</option>
              <option value="year">Last Year</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Status:</span>
            <select 
              value={categoryFilter} 
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="bg-white border border-gray-300 rounded-lg px-3 py-1 text-sm"
            >
              <option value="all">All Sessions</option>
              <option value="completed">Completed Only</option>
              <option value="inProgress">In Progress</option>
            </select>
          </div>
          
          <div className="ml-auto text-sm text-gray-600">
            Showing {filteredSessions.length} of {totalVideosWatched} sessions
          </div>
        </div>
      </div>

      {/* Detailed Session History */}
      <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-white/50">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <Brain className="h-6 w-6 mr-3 text-purple-600" />
          Detailed Learning History
        </h2>
        
        {filteredSessions.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No sessions found</h3>
            <p className="text-gray-500">Try adjusting your filters or create a new quiz to get started!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSessions.map((session) => (
              <div key={session.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-200">
                <div className="flex items-start space-x-4">
                  {session.videoThumbnail && (
                    <div className="flex-shrink-0">
                      <img 
                        src={session.videoThumbnail} 
                        alt={session.videoTitle}
                        className="w-24 h-14 object-cover rounded-lg shadow-sm"
                      />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 pr-4">
                        <h3 className="font-bold text-gray-900 text-lg mb-1 line-clamp-2">
                          {session.videoTitle}
                        </h3>
                        {session.channelTitle && (
                          <p className="text-gray-600 text-sm flex items-center mb-2">
                            <User className="h-4 w-4 mr-1" />
                            {session.channelTitle}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {session.videoDuration}
                          </span>
                          <span className="flex items-center">
                            <BookOpen className="h-4 w-4 mr-1" />
                            {session.totalQuestions} questions
                          </span>
                          <span className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {formatDate(session.createdAt)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex-shrink-0 text-right space-y-3">
                        {session.completedAt ? (
                          <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${getScoreColor(session.completionPercentage)}`}>
                            <Award className="h-4 w-4 mr-1" />
                            {Math.round(session.completionPercentage)}%
                          </div>
                        ) : (
                          <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium text-orange-600 bg-orange-100">
                            <Clock className="h-4 w-4 mr-1" />
                            In Progress
                          </div>
                        )}
                        
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewQuiz(session)}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Detailed Results"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {session.completedAt && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div className="bg-green-50 rounded-lg p-3">
                            <div className="text-lg font-bold text-green-600">
                              {session.correctAnswers || 0}
                            </div>
                            <div className="text-xs text-green-700">Correct</div>
                          </div>
                          <div className="bg-blue-50 rounded-lg p-3">
                            <div className="text-lg font-bold text-blue-600">
                              {session.totalQuestions}
                            </div>
                            <div className="text-xs text-blue-700">Total</div>
                          </div>
                          <div className="bg-purple-50 rounded-lg p-3">
                            <div className="text-lg font-bold text-purple-600">
                              {session.completedAt ? 'Done' : 'Active'}
                            </div>
                            <div className="text-xs text-purple-700">Status</div>
                          </div>
                        </div>
                      </div>
                    )}
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

export default UserProgress;