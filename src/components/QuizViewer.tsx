import { useState, useEffect } from 'react';
import { ArrowLeft, Play, User, Clock, BookOpen, FileText } from 'lucide-react';
import { getQuizSession, getQuizAnswers, QuizSession, QuizAnswer } from '../services/quizDatabase';

interface QuizViewerProps {
  sessionId: string;
  onBackToDashboard: () => void;
}

const QuizViewer = ({ sessionId, onBackToDashboard }: QuizViewerProps) => {
  const [session, setSession] = useState<QuizSession | null>(null);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSessionData = async () => {
      try {
        const [sessionData, answerData] = await Promise.all([
          getQuizSession(sessionId),
          getQuizAnswers(sessionId)
        ]);
        
        setSession(sessionData);
        setAnswers(answerData);
      } catch (error) {
        console.error('Failed to load session data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSessionData();
  }, [sessionId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEmbedUrl = (videoId: string) => {
    return `https://www.youtube.com/embed/${videoId}`;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'comprehension': return '🧠';
      case 'reflection': return '💭';
      case 'application': return '🎯';
      case 'goal-setting': return '🚀';
      default: return '❓';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'comprehension': return 'Knowledge Check';
      case 'reflection': return 'Personal Reflection';
      case 'application': return 'Real-World Application';
      case 'goal-setting': return 'Goal Setting';
      default: return 'Question';
    }
  };

  const getScoreColor = (isCorrect: boolean | null) => {
    if (isCorrect === null) return 'text-blue-600 bg-blue-100';
    return isCorrect ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100';
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading quiz details...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="text-center py-12">
          <p className="text-gray-600">Quiz session not found.</p>
          <button
            onClick={onBackToDashboard}
            className="mt-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3 px-6 rounded-2xl transition-all duration-300"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const multipleChoiceAnswers = answers.filter(a => a.questionType === 'multiple-choice');
  const openEndedAnswers = answers.filter(a => a.questionType === 'open-ended');
  const correctAnswers = multipleChoiceAnswers.filter(a => a.isCorrect).length;
  const totalMultipleChoice = multipleChoiceAnswers.length;
  const scorePercentage = totalMultipleChoice > 0 ? Math.round((correctAnswers / totalMultipleChoice) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToDashboard}
          className="flex items-center space-x-2 text-gray-600 hover:text-purple-600 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Dashboard</span>
        </button>
      </div>

      {/* Video and Session Info */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Video Section */}
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/50">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{session.videoTitle}</h2>
          
          <div className="aspect-video rounded-2xl overflow-hidden bg-gray-100 mb-4">
            <iframe
              src={getEmbedUrl(session.videoId)}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          <div className="space-y-2 text-sm text-gray-600">
            {session.channelTitle && (
              <div className="flex items-center">
                <User className="h-4 w-4 mr-2" />
                {session.channelTitle}
              </div>
            )}
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              {session.videoDuration}
            </div>
            <div className="flex items-center">
              <BookOpen className="h-4 w-4 mr-2" />
              {session.totalQuestions} questions
            </div>
            <div className="flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Completed {formatDate(session.completedAt || session.createdAt)}
            </div>
          </div>
        </div>

        {/* Score Summary */}
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/50">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Learning Assessment Results</h3>
          
          {totalMultipleChoice > 0 && (
            <div className="text-center mb-6">
              <div className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
                {scorePercentage}%
              </div>
              <p className="text-gray-600">
                You scored {correctAnswers} out of {totalMultipleChoice} knowledge questions correctly
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-xl">
              <div className="text-2xl font-bold text-green-600">{correctAnswers}</div>
              <div className="text-sm text-green-700">Correct</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-xl">
              <div className="text-2xl font-bold text-red-600">{totalMultipleChoice - correctAnswers}</div>
              <div className="text-sm text-red-700">Incorrect</div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-xl">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{openEndedAnswers.length}</div>
              <div className="text-sm text-blue-700">Reflection Questions</div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Answers */}
      <div className="space-y-8">
        {/* Knowledge Questions */}
        {multipleChoiceAnswers.length > 0 && (
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-white/50">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">📚 Knowledge Assessment</h3>
            <div className="space-y-4">
              {multipleChoiceAnswers.map((answer) => (
                <div key={answer.id} className={`p-6 rounded-xl border-2 ${answer.isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-start space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${answer.isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
                      {answer.isCorrect ? '✓' : '✗'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start space-x-2 mb-2">
                        <span className="text-lg">{getCategoryIcon(answer.questionCategory)}</span>
                        <div>
                          <div className="text-xs text-purple-600 font-medium mb-1">
                            {getCategoryLabel(answer.questionCategory)}
                          </div>
                          <h4 className="font-semibold text-gray-800">{answer.questionText}</h4>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm">
                          <span className="font-medium">Your answer:</span> 
                          <span className={answer.isCorrect ? 'text-green-700 ml-1' : 'text-red-700 ml-1'}>{answer.userAnswer}</span>
                        </p>
                        {!answer.isCorrect && answer.correctAnswer && (
                          <p className="text-sm">
                            <span className="font-medium">Correct answer:</span> 
                            <span className="text-green-700 ml-1">{answer.correctAnswer}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reflection Questions */}
        {openEndedAnswers.length > 0 && (
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-white/50">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">💭 Your Learning Reflections</h3>
            <div className="space-y-6">
              {openEndedAnswers.map((answer) => (
                <div key={answer.id} className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200">
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">{getCategoryIcon(answer.questionCategory)}</span>
                    <div className="flex-1">
                      <div className="text-sm text-purple-600 font-medium mb-1">
                        {getCategoryLabel(answer.questionCategory)}
                      </div>
                      <h4 className="font-semibold text-gray-800 mb-3">{answer.questionText}</h4>
                      <div className="bg-white/70 p-4 rounded-lg border">
                        <p className="text-gray-700 whitespace-pre-wrap">
                          {answer.userAnswer || 'No response provided'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizViewer;