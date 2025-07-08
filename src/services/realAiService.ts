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
    console.log('Generating offline quiz from transcript...');
    
    // Generate a mock quiz since we're working offline
    const mockQuiz = {
      questions: [
        {
          id: 1,
          type: 'multiple-choice' as const,
          category: 'comprehension' as const,
          question: `What is the main topic discussed in "${videoTitle}"?`,
          options: ["A) Learning techniques", "B) Technology overview", "C) Historical facts", "D) Scientific methods"],
          correctAnswer: "A"
        },
        {
          id: 2,
          type: 'open-ended' as const,
          category: 'reflection' as const,
          question: `How can you apply the concepts from this video in your daily life?`
        },
        {
          id: 3,
          type: 'multiple-choice' as const,
          category: 'comprehension' as const,
          question: `Which approach was emphasized most in the video?`,
          options: ["A) Theoretical understanding", "B) Practical application", "C) Historical context", "D) Future predictions"],
          correctAnswer: "B"
        },
        {
          id: 4,
          type: 'open-ended' as const,
          category: 'reflection' as const,
          question: `What aspects of this topic do you find most challenging and why?`
        },
        {
          id: 5,
          type: 'multiple-choice' as const,
          category: 'application' as const,
          question: `Based on the video, what would be the best first step to implement these ideas?`,
          options: ["A) Research more", "B) Start small experiments", "C) Seek expert advice", "D) Create a detailed plan"],
          correctAnswer: "B"
        },
        {
          id: 6,
          type: 'open-ended' as const,
          category: 'application' as const,
          question: `Describe a specific scenario where you could apply these concepts.`
        },
        {
          id: 7,
          type: 'multiple-choice' as const,
          category: 'goal-setting' as const,
          question: `What would be a realistic timeline for mastering these concepts?`,
          options: ["A) 1-2 weeks", "B) 1-2 months", "C) 3-6 months", "D) 6-12 months"],
          correctAnswer: "C"
        },
        {
          id: 8,
          type: 'open-ended' as const,
          category: 'goal-setting' as const,
          question: `What specific goals will you set based on this video content?`
        }
      ]
    };
    
    console.log('Offline quiz generated successfully');
    
    return {
      videoId,
      videoTitle,
      questions: mockQuiz.questions
    };

  } catch (error) {
    console.error('Error generating offline quiz:', error);
    return null;
  }
};