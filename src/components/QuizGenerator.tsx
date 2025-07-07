
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
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${info}`]);
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
      addDebugInfo('Fetching video metadata from YouTube API...');
      
      const videoInfo = await getVideoInfo(videoId);
      if (!videoInfo) {
        throw new Error('Could not fetch video information. Please check the video URL and try again.');
      }
      
      addDebugInfo(`Video info retrieved: "${videoInfo.title}" by ${videoInfo.channelTitle} (${videoInfo.duration})`);

      // Step 2: Get transcript
      setCurrentStep('Extracting video captions...');
      addDebugInfo('Attempting to extract transcript/captions using multiple methods...');
      
      const transcript = await getTranscript(videoId);
      if (!transcript) {
        throw new Error('Could not extract transcript from this video. This could be because:\n• The video doesn\'t have captions or subtitles\n• The video is in a language that isn\'t supported\n• The video is too short or doesn\'t contain speech\n• The video may be music-only or have background music that interferes with speech recognition\n\nTry using a video that has captions available or clear speech content.');
      }
      
      addDebugInfo(`Transcript extracted successfully - ${transcript.length} characters`);
      addDebugInfo(`First 100 chars: "${transcript.substring(0, 100)}..."`);

      // Step 3: Generate quiz
      setCurrentStep('Generating personalized questions...');
      addDebugInfo('Sending transcript to AI for quiz generation...');
      
      const quiz = await generateQuizFromVideo(videoId, videoInfo.title, transcript, videoInfo.description);
      if (!quiz) {
        throw new Error('Failed to generate quiz questions. The AI service may be temporarily unavailable. Please try again.');
      }
      
      addDebugInfo(`Quiz generated successfully with ${quiz.questions.length} questions`);

      // Step 4: Save session
      setCurrentStep('Saving your learning session...');
      addDebugInfo('Saving quiz session to database...');
      
      const sessionId = await createQuizSession(quiz, videoInfo, transcript);
      if (!sessionId) {
        throw new Error('Failed to save quiz session. Please try again.');
      }
      
      addDebugInfo(`Quiz session saved with ID: ${sessionId}`);
      addDebugInfo('Quiz generation completed successfully!');

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

  const renderErrorMessage = () => {
    if (!error) return null;

    const isTranscriptError = error.includes('could not extract transcript') || error.includes('doesn\'t have captions');
    
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <span className="text-red-500 text-xl">⚠️</span>
          <div>
            <p className="text-red-600 font-medium mb-2">
              {isTranscriptError ? 'Unable to process this video' : 'An error occurred'}
            </p>
            <div className="text-red-600 text-sm whitespace-pre-line mb-3">{error}</div>
            
            {isTranscriptError && (
              <div className="mt-3 text-sm text-gray-600">
                <p className="font-medium">Try these suggestions:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Use a video with captions or subtitles enabled</li>
                  <li>Try educational content from channels like Khan Academy, TED, or Coursera</li>
                  <li>Look for the CC (closed captions) button on the YouTube player to verify captions exist</li>
                  <li>Try a different video with clear, spoken content</li>
                </ul>
              </div>
            )}
            
            {debugInfo.length > 0 && (
              <details className="mt-3">
                <summary className="text-xs text-gray-500 cursor-pointer">Debug Information</summary>
                <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono max-h-40 overflow-y-auto">
                  {debugInfo.map((info, index) => (
                    <div key={index} className="text-gray-700 mb-1">{info}</div>
                  ))}
                </div>
              </details>
            )}
          </div>
        </div>
      </div>
    );
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
              💡 Tip: Works best with educational videos that have captions (CC button visible on YouTube)
            </p>
          </div>

          {renderErrorMessage()}

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
              <div className="flex items-center justify-center space-x-2 mb-4">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600">{currentStep}</span>
              </div>
              
              {debugInfo.length > 0 && (
                <div className="text-left">
                  <details>
                    <summary className="text-xs text-gray-500 cursor-pointer text-center">View Progress Details</summary>
                    <div className="mt-2 p-3 bg-white/50 rounded text-xs font-mono text-left max-h-32 overflow-y-auto">
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
