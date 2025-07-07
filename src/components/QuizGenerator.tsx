
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
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const addDebugInfo = (info: string) => {
    console.log(`[QuizGenerator] ${info}`);
    setDebugInfo(prev => [...prev, info]);
  };

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
    setDebugInfo([]);

    try {
      addDebugInfo(`Starting quiz generation for video ID: ${videoId}`);

      // Step 1: Get video info
      setCurrentStep('Fetching video information...');
      addDebugInfo('Fetching video metadata...');
      
      const videoInfo = await getVideoInfo(videoId);
      if (!videoInfo) {
        throw new Error('Could not fetch video information. Please check the video URL.');
      }
      
      addDebugInfo(`Video info retrieved: "${videoInfo.title}" by ${videoInfo.channelTitle}`);

      // Step 2: Get transcript
      setCurrentStep('Extracting video captions...');
      addDebugInfo('Attempting to extract transcript/captions...');
      
      const transcript = await getTranscript(videoId);
      if (!transcript) {
        throw new Error('This video does not have captions available. Please try a video with captions or subtitles enabled.');
      }
      
      addDebugInfo(`Transcript extracted successfully - ${transcript.length} characters`);

      // Step 3: Generate quiz
      setCurrentStep('Generating personalized questions...');
      addDebugInfo('Sending transcript to AI for quiz generation...');
      
      const quiz = await generateQuizFromVideo(videoId, videoInfo.title, transcript, videoInfo.description);
      if (!quiz) {
        throw new Error('Failed to generate quiz questions. Please try again.');
      }
      
      addDebugInfo(`Quiz generated with ${quiz.questions.length} questions`);

      // Step 4: Save session
      setCurrentStep('Saving your learning session...');
      addDebugInfo('Saving quiz session to database...');
      
      const sessionId = await createQuizSession(quiz, videoInfo, transcript);
      if (!sessionId) {
        throw new Error('Failed to save quiz session. Please try again.');
      }
      
      addDebugInfo(`Quiz session saved with ID: ${sessionId}`);

      onQuizGenerated(quiz, sessionId);
    } catch (err) {
      console.error('Quiz generation error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate quiz. Please try again.';
      setError(errorMessage);
      addDebugInfo(`Error occurred: ${errorMessage}`);
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
            <p className="text-sm text-gray-500 mt-2">
              💡 Tip: Works best with educational videos that have captions or subtitles
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <span className="text-red-500 text-xl">⚠️</span>
                <div>
                  <p className="text-red-600 font-medium mb-2">Unable to process this video</p>
                  <p className="text-red-600 text-sm">{error}</p>
                  <div className="mt-3 text-sm text-gray-600">
                    <p className="font-medium">Try these suggestions:</p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>Use a video with captions or subtitles enabled</li>
                      <li>Try educational content with clear speech</li>
                      <li>Check if the video is public and accessible</li>
                      <li>Try a different video from a popular educational channel</li>
                    </ul>
                  </div>
                  
                  {debugInfo.length > 0 && (
                    <details className="mt-3">
                      <summary className="text-xs text-gray-500 cursor-pointer">Debug Information</summary>
                      <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono">
                        {debugInfo.map((info, index) => (
                          <div key={index} className="text-gray-700">{info}</div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              </div>
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
                <span>Creating Your Learning Experience...</span>
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
              <h3 className="text-lg font-semibold text-gray-700 mb-3">Creating Your Quiz</h3>
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600">{currentStep}</span>
              </div>
              
              {debugInfo.length > 0 && (
                <div className="mt-4 text-left">
                  <details>
                    <summary className="text-xs text-gray-500 cursor-pointer text-center">View Progress Details</summary>
                    <div className="mt-2 p-2 bg-white/50 rounded text-xs font-mono text-left max-h-32 overflow-y-auto">
                      {debugInfo.map((info, index) => (
                        <div key={index} className="text-gray-700 mb-1">{info}</div>
                      ))}
                    </div>
                  </details>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizGenerator;
