
import { useState } from 'react';
import { Question, GeneratedQuiz } from '../services/realAiService';
import { saveQuizAnswer, updateQuizCompletion } from '../services/quizDatabase';

interface InteractiveQuizProps {
  quiz: GeneratedQuiz;
  sessionId: string;
  onComplete: () => void;
}

const InteractiveQuiz = ({ quiz, sessionId, onComplete }: InteractiveQuizProps) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;

  const handleAnswerSelect = (answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: answer
    }));
  };

  const handleTextAnswer = (answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: answer
    }));
  };

  const saveCurrentAnswer = async () => {
    const userAnswer = answers[currentQuestion.id];
    if (!userAnswer) return;

    const isCorrect = currentQuestion.type === 'multiple-choice' 
      ? userAnswer === currentQuestion.correctAnswer 
      : undefined;

    await saveQuizAnswer(
      sessionId,
      currentQuestion.id,
      currentQuestion.question,
      currentQuestion.type,
      currentQuestion.category,
      userAnswer,
      currentQuestion.correctAnswer,
      isCorrect
    );
  };

  const handleNext = async () => {
    await saveCurrentAnswer();

    if (isLastQuestion) {
      // Calculate final score and update completion
      const score = calculateScore();
      await updateQuizCompletion(sessionId, score.correct, score.total);
      setShowResults(true);
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const calculateScore = () => {
    let correct = 0;
    let total = 0;
    
    quiz.questions.forEach(question => {
      if (question.type === 'multiple-choice') {
        total++;
        if (answers[question.id] === question.correctAnswer) {
          correct++;
        }
      }
    });
    
    return { correct, total, percentage: total > 0 ? Math.round((correct / total) * 100) : 0 };
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

  if (showResults) {
    const score = calculateScore();
    const reflectiveAnswers = quiz.questions.filter(q => q.type === 'open-ended');
    
    return (
      <div className="max-w-5xl mx-auto">
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-white/50">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
              <span className="text-3xl">🎉</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Learning Session Complete!</h2>
            
            {score.total > 0 && (
              <>
                <div className="text-6xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
                  {score.percentage}%
                </div>
                <p className="text-xl text-gray-600 mb-6">
                  You scored {score.correct} out of {score.total} knowledge questions correctly
                </p>
              </>
            )}
          </div>

          {/* Knowledge Questions Results */}
          {score.total > 0 && (
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">📚 Knowledge Assessment</h3>
              <div className="space-y-4">
                {quiz.questions
                  .filter(q => q.type === 'multiple-choice')
                  .map((question) => {
                    const userAnswer = answers[question.id];
                    const isCorrect = userAnswer === question.correctAnswer;
                    
                    return (
                      <div key={question.id} className={`p-4 rounded-xl border-2 ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                        <div className="flex items-start space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
                            {isCorrect ? '✓' : '✗'}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-800 mb-2">{question.question}</h4>
                            <p className="text-sm">
                              <span className="font-medium">Your answer:</span> 
                              <span className={isCorrect ? 'text-green-700 ml-1' : 'text-red-700 ml-1'}>{userAnswer}</span>
                            </p>
                            {!isCorrect && (
                              <p className="text-sm">
                                <span className="font-medium">Correct answer:</span> 
                                <span className="text-green-700 ml-1">{question.correctAnswer}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Reflective Answers */}
          {reflectiveAnswers.length > 0 && (
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">💭 Your Learning Reflections</h3>
              <div className="space-y-6">
                {reflectiveAnswers.map((question) => (
                  <div key={question.id} className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200">
                    <div className="flex items-start space-x-3 mb-4">
                      <span className="text-2xl">{getCategoryIcon(question.category)}</span>
                      <div className="flex-1">
                        <div className="text-sm text-purple-600 font-medium mb-1">
                          {getCategoryLabel(question.category)}
                        </div>
                        <h4 className="font-semibold text-gray-800 mb-3">{question.question}</h4>
                        <div className="bg-white/70 p-4 rounded-lg border">
                          <p className="text-gray-700 whitespace-pre-wrap">
                            {answers[question.id] || 'No response provided'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-center">
            <button
              onClick={onComplete}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3 px-8 rounded-2xl transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
            >
              View Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Video Section */}
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/50">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">{quiz.videoTitle}</h3>
          <div className="aspect-video rounded-2xl overflow-hidden bg-gray-100">
            <iframe
              src={getEmbedUrl(quiz.videoId)}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>

        {/* Quiz Section */}
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-white/50">
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Question {currentQuestionIndex + 1} of {quiz.questions.length}</span>
              <span>{Math.round(((currentQuestionIndex + 1) / quiz.questions.length) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Question Category Badge */}
          <div className="mb-4">
            <span className="inline-flex items-center space-x-2 px-3 py-1 bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 rounded-full text-sm font-medium">
              <span>{getCategoryIcon(currentQuestion.category)}</span>
              <span>{getCategoryLabel(currentQuestion.category)}</span>
            </span>
          </div>

          {/* Question */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              {currentQuestion.question}
            </h2>

            {currentQuestion.type === 'multiple-choice' ? (
              <div className="space-y-4">
                {currentQuestion.options?.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(option)}
                    className={`w-full p-4 text-left rounded-2xl border-2 transition-all duration-300 ${
                      answers[currentQuestion.id] === option
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-25'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        answers[currentQuestion.id] === option
                          ? 'border-purple-500 bg-purple-500'
                          : 'border-gray-300'
                      }`}>
                        {answers[currentQuestion.id] === option && (
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        )}
                      </div>
                      <span className="font-medium">{option}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div>
                <textarea
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => handleTextAnswer(e.target.value)}
                  placeholder="Share your thoughts and reflections..."
                  className="w-full h-32 p-4 border-2 border-gray-200 rounded-2xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none resize-none"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Take your time to reflect on this question. There are no wrong answers.
                </p>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              className="px-6 py-3 border-2 border-gray-300 text-gray-600 rounded-2xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:border-gray-400 transition-all"
            >
              Previous
            </button>

            <button
              onClick={handleNext}
              disabled={!answers[currentQuestion.id] || (currentQuestion.type === 'open-ended' && !answers[currentQuestion.id]?.trim())}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-2xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-lg"
            >
              {isLastQuestion ? 'Complete Learning Session' : 'Next Question'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveQuiz;
