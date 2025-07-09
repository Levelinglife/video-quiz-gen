import { GeneratedQuiz } from "./realAiService";

export interface QuizSession {
  id: string;
  videoId: string;
  videoTitle: string;
  videoThumbnail?: string;
  videoDuration?: string;
  channelTitle?: string;
  transcript?: string;
  totalQuestions: number;
  correctAnswers: number;
  completionPercentage: number;
  completedAt?: string;
  createdAt: string;
}

export interface QuizAnswer {
  id: string;
  sessionId: string;
  questionId: number;
  questionText: string;
  questionType: 'multiple-choice' | 'open-ended';
  questionCategory: 'comprehension' | 'reflection' | 'application' | 'goal-setting';
  userAnswer?: string;
  correctAnswer?: string;
  isCorrect?: boolean;
}

// Helper function to generate unique IDs
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// LocalStorage keys
const QUIZ_SESSIONS_KEY = 'quizSessions';
const QUIZ_ANSWERS_KEY = 'quizAnswers';

export const createQuizSession = async (
  quiz: GeneratedQuiz,
  videoInfo: any,
  transcript: string
): Promise<string | null> => {
  try {
    const sessionId = generateId();
    
    const session: QuizSession = {
      id: sessionId,
      videoId: quiz.videoId,
      videoTitle: quiz.videoTitle,
      videoThumbnail: videoInfo.thumbnail,
      videoDuration: videoInfo.duration,
      channelTitle: videoInfo.channelTitle,
      transcript: transcript,
      totalQuestions: quiz.questions.length,
      correctAnswers: 0,
      completionPercentage: 0,
      createdAt: new Date().toISOString()
    };

    // Get existing sessions
    const existingSessions = getStoredSessions();
    
    // Add new session
    existingSessions.push(session);
    
    // Save to localStorage
    localStorage.setItem(QUIZ_SESSIONS_KEY, JSON.stringify(existingSessions));

    console.log(`Quiz session created with ID: ${sessionId}`);
    return sessionId;
  } catch (error) {
    console.error('Error creating quiz session:', error);
    return null;
  }
};

export const saveQuizAnswer = async (
  sessionId: string,
  questionId: number,
  questionText: string,
  questionType: 'multiple-choice' | 'open-ended',
  questionCategory: 'comprehension' | 'reflection' | 'application' | 'goal-setting',
  userAnswer: string,
  correctAnswer?: string,
  isCorrect?: boolean
): Promise<boolean> => {
  try {
    const answerId = generateId();
    
    const answer: QuizAnswer = {
      id: answerId,
      sessionId,
      questionId,
      questionText,
      questionType,
      questionCategory,
      userAnswer,
      correctAnswer,
      isCorrect
    };

    // Get existing answers
    const existingAnswers = getStoredAnswers();
    
    // Add new answer
    existingAnswers.push(answer);
    
    // Save to localStorage
    localStorage.setItem(QUIZ_ANSWERS_KEY, JSON.stringify(existingAnswers));

    return true;
  } catch (error) {
    console.error('Error saving quiz answer:', error);
    return false;
  }
};

export const updateQuizCompletion = async (
  sessionId: string,
  correctAnswers: number,
  totalQuestions: number
): Promise<boolean> => {
  try {
    const completionPercentage = (correctAnswers / totalQuestions) * 100;
    
    // Get existing sessions
    const existingSessions = getStoredSessions();
    
    // Find and update the session
    const sessionIndex = existingSessions.findIndex(s => s.id === sessionId);
    if (sessionIndex !== -1) {
      existingSessions[sessionIndex].correctAnswers = correctAnswers;
      existingSessions[sessionIndex].completionPercentage = completionPercentage;
      existingSessions[sessionIndex].completedAt = new Date().toISOString();
      
      // Save updated sessions
      localStorage.setItem(QUIZ_SESSIONS_KEY, JSON.stringify(existingSessions));
      
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error updating quiz completion:', error);
    return false;
  }
};

export const getQuizSessions = async (): Promise<QuizSession[]> => {
  try {
    const sessions = getStoredSessions();
    
    // Sort by creation date (newest first)
    return sessions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error('Error fetching quiz sessions:', error);
    return [];
  }
};

// Helper functions for localStorage operations
function getStoredSessions(): QuizSession[] {
  try {
    const stored = localStorage.getItem(QUIZ_SESSIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error parsing stored sessions:', error);
    return [];
  }
}

function getStoredAnswers(): QuizAnswer[] {
  try {
    const stored = localStorage.getItem(QUIZ_ANSWERS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error parsing stored answers:', error);
    return [];
  }
}

export const getQuizSession = async (sessionId: string): Promise<QuizSession | null> => {
  try {
    const sessions = await getQuizSessions();
    return sessions.find(session => session.id === sessionId) || null;
  } catch (error) {
    console.error('Error fetching quiz session:', error);
    return null;
  }
};

export const getQuizAnswers = async (sessionId: string): Promise<QuizAnswer[]> => {
  try {
    const storedAnswers = localStorage.getItem(QUIZ_ANSWERS_KEY);
    if (!storedAnswers) return [];
    
    const allAnswers: QuizAnswer[] = JSON.parse(storedAnswers);
    return allAnswers.filter(answer => answer.sessionId === sessionId);
  } catch (error) {
    console.error('Error fetching quiz answers:', error);
    return [];
  }
};

// Optional: Clear all data (for debugging)
export const clearAllData = (): void => {
  localStorage.removeItem(QUIZ_SESSIONS_KEY);
  localStorage.removeItem(QUIZ_ANSWERS_KEY);
  console.log('All quiz data cleared from localStorage');
};