
import { supabase } from "@/integrations/supabase/client";
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

export const createQuizSession = async (
  quiz: GeneratedQuiz,
  videoInfo: any,
  transcript: string
): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('quiz_sessions')
      .insert({
        video_id: quiz.videoId,
        video_title: quiz.videoTitle,
        video_thumbnail: videoInfo.thumbnail,
        video_duration: videoInfo.duration,
        channel_title: videoInfo.channelTitle,
        transcript: transcript,
        total_questions: quiz.questions.length
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating quiz session:', error);
      return null;
    }

    return data.id;
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
    const { error } = await supabase
      .from('quiz_answers')
      .insert({
        session_id: sessionId,
        question_id: questionId,
        question_text: questionText,
        question_type: questionType,
        question_category: questionCategory,
        user_answer: userAnswer,
        correct_answer: correctAnswer,
        is_correct: isCorrect
      });

    if (error) {
      console.error('Error saving quiz answer:', error);
      return false;
    }

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
    
    const { error } = await supabase
      .from('quiz_sessions')
      .update({
        correct_answers: correctAnswers,
        completion_percentage: completionPercentage,
        completed_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (error) {
      console.error('Error updating quiz completion:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating quiz completion:', error);
    return false;
  }
};

export const getQuizSessions = async (): Promise<QuizSession[]> => {
  try {
    const { data, error } = await supabase
      .from('quiz_sessions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching quiz sessions:', error);
      return [];
    }

    return data.map(session => ({
      id: session.id,
      videoId: session.video_id,
      videoTitle: session.video_title,
      videoThumbnail: session.video_thumbnail,
      videoDuration: session.video_duration,
      channelTitle: session.channel_title,
      transcript: session.transcript,
      totalQuestions: session.total_questions,
      correctAnswers: session.correct_answers,
      completionPercentage: session.completion_percentage,
      completedAt: session.completed_at,
      createdAt: session.created_at
    }));
  } catch (error) {
    console.error('Error fetching quiz sessions:', error);
    return [];
  }
};
