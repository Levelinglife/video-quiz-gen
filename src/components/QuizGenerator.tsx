
import { useState } from 'react';
import { extractVideoId, getVideoInfo, getTranscript } from '../services/youtubeService';
import { generateQuizFromVideo, GeneratedQuiz } from '../services/realAiService';
import { createQuizSession } from '../services/quizDatabase';

interface QuizGeneratorProps {
  onQuizGenerated: (quiz: GeneratedQuiz, sessionId: string) => void;
}

const QuizGenerator = ({ onQuizGenerated }: QuizGeneratorProps) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState('');

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
      // Step 1: Get video info
      setCurrentStep('Fetching video information...');
      const videoInfo = await getVideoInfo(videoId);
      if (!videoInfo) {
        throw new Error('Could not fetch video information. The video may be private or unavailable.');
      }

      // Step 2: Get transcript
      setCurrentStep('Extracting video transcript...');
      const transcript = await getTranscript(videoId);
      if (!transcript) {
        throw new Error('Could not extract transcript from this video. The video may not have captions available.');
      }

      // Step 3: Generate questions with AI
      setCurrentStep('Analyzing content and generating personalized questions...');
      const quiz = await generateQuizFromVideo(videoId, videoInfo.title, transcript, videoInfo.description);
      if (!quiz) {
        throw new Error('Failed to generate quiz questions. Please try again.');
      }

      // Step 4: Save to database
      setCurrentStep('Saving your learning session...');
      const sessionId = await createQuizSession(quiz, videoInfo, transcript);
      if (!sessionId) {
        throw new Error('Failed to save quiz session. Please try again.');
      }

      setCurrentStep('Finalizing your learning experience...');
      await new Promise(resolve => setTimeout(resolve, 500));

      onQuizGenerated(quiz, sessionId);
    } catch (err) {
      console.error('Quiz generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate quiz. Please try again.');
    } finally {
      setLoading(false);
      setCurrentStep('');
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
                <span>Creating Your Personalized Learning Experience...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <span>Generate Interactive Learning Quiz</span>
                <span className="text-xl">✨</span>
              </div>
            )}
          </button>
        </div>

        {loading && currentStep && (
          <div className="mt-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-700 mb-3">Creating Your Personalized Quiz</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                  <span>{currentStep}</span>
                </div>
                <div className="text-xs text-gray-500 mt-4">
                  <p>🧠 Generating comprehension questions</p>
                  <p>💭 Creating reflective prompts about your learning goals</p>
                  <p>🎯 Designing application and goal-setting questions</p>
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
