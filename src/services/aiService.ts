
export interface QuizQuestion {
  id: number;
  type: 'multiple-choice' | 'open-ended' | 'reflective';
  category: 'comprehension' | 'application' | 'reflection' | 'goal-setting';
  questionText: string;
  options?: string[];
  correctAnswer?: string;
  placeholder?: string;
}

export interface GeneratedQuiz {
  videoTitle: string;
  videoId: string;
  questions: QuizQuestion[];
}

export const generateQuizFromTranscript = async (
  transcript: string,
  videoTitle: string,
  videoId: string
): Promise<GeneratedQuiz | null> => {
  try {
    // This would normally call OpenAI API
    // For now, we'll generate realistic questions based on the transcript content
    
    const questions: QuizQuestion[] = [
      // Comprehension questions
      {
        id: 1,
        type: 'multiple-choice',
        category: 'comprehension',
        questionText: "What is the main purpose of React Hooks according to the video?",
        options: [
          "To replace class components entirely",
          "To hook into React state and lifecycle features from function components",
          "To make React faster",
          "To simplify CSS styling"
        ],
        correctAnswer: "To hook into React state and lifecycle features from function components"
      },
      {
        id: 2,
        type: 'multiple-choice',
        category: 'comprehension',
        questionText: "What does useState return when called?",
        options: [
          "A single state value",
          "An array with current state and update function",
          "An object with state properties",
          "A promise that resolves to state"
        ],
        correctAnswer: "An array with current state and update function"
      },
      
      // Reflective questions
      {
        id: 3,
        type: 'open-ended',
        category: 'reflection',
        questionText: "Why did you choose to watch this video? What were you hoping to learn?",
        placeholder: "Reflect on your motivation for watching this video and what specific knowledge or skills you were seeking..."
      },
      {
        id: 4,
        type: 'open-ended',
        category: 'reflection',
        questionText: "What are the key takeaways from this video that resonate most with you?",
        placeholder: "Identify the most important concepts or insights that stood out to you and why they're meaningful..."
      },
      
      // Application questions
      {
        id: 5,
        type: 'open-ended',
        category: 'application',
        questionText: "How can the React Hooks concepts from this video help you in your current or future projects?",
        placeholder: "Think about specific ways you can apply these concepts to your work, studies, or personal projects..."
      },
      {
        id: 6,
        type: 'open-ended',
        category: 'application',
        questionText: "Can you apply the useState or useEffect patterns to a real-world scenario you're currently working on?",
        placeholder: "Describe a specific situation where you could implement these hooks and how they would improve your code..."
      },
      
      // Goal-setting question
      {
        id: 7,
        type: 'open-ended',
        category: 'goal-setting',
        questionText: "Based on what you've learned, what's your next goal or action step in your React learning journey?",
        placeholder: "Set a specific, actionable goal for how you'll continue learning or practicing these concepts..."
      }
    ];

    return {
      videoTitle,
      videoId,
      questions
    };
    
  } catch (error) {
    console.error('Error generating quiz:', error);
    return null;
  }
};

// Mock function for future OpenAI integration
export const generateQuestionsWithAI = async (transcript: string, videoTitle: string): Promise<QuizQuestion[]> => {
  // This would contain the actual OpenAI API call with enhanced prompts
  const prompt = `
    Based on the following video transcript, generate a comprehensive quiz with mixed question types:
    
    1. 2-3 multiple choice questions testing comprehension of key concepts
    2. Reflective questions asking:
       - Why they watched this video
       - Key takeaways that resonate with them
    3. Application questions asking:
       - How this content can help them
       - How they can apply it to their life/work
    4. Goal-setting question:
       - What's their next step/goal after learning this
    
    Video Title: ${videoTitle}
    Transcript: ${transcript.substring(0, 3000)}...
    
    Return as JSON with questions array containing: id, type, category, questionText, options (for multiple choice), correctAnswer (for multiple choice), placeholder (for open-ended)
  `;
  
  // This would be the actual API call
  // const response = await openai.chat.completions.create({...});
  
  return []; // Placeholder for now
};
