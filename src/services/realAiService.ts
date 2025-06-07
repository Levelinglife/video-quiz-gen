
import { supabase } from "@/integrations/supabase/client";

export interface Question {
  id: number;
  type: 'multiple-choice' | 'open-ended';
  category: 'comprehension' | 'reflection' | 'application' | 'goal-setting';
  question: string;
  options?: string[];
  correctAnswer?: string;
}

export interface GeneratedQuiz {
  videoId: string;
  videoTitle: string;
  questions: Question[];
}

export const generateQuizFromVideo = async (
  videoId: string,
  videoTitle: string,
  transcript: string,
  videoDescription?: string
): Promise<GeneratedQuiz | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('generate-quiz', {
      body: {
        videoTitle,
        transcript,
        videoDescription
      }
    });

    if (error) {
      console.error('Error generating quiz:', error);
      return null;
    }

    return {
      videoId,
      videoTitle,
      questions: data.questions
    };
  } catch (error) {
    console.error('Error generating quiz:', error);
    return null;
  }
};
