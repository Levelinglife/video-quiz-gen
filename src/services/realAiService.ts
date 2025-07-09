export interface Question {
  id: number;
  type: 'multiple-choice' | 'open-ended';
  category: 'comprehension' | 'reflection' | 'application' | 'goal-setting';
  question: string;
  options?: string[];
  correctAnswer?: string;
}

export interface VideoSummary {
  title: string;
  keyPoints: string[];
  summary: string;
  duration: string;
  difficulty: string;
  tags: string[];
}

export interface GeneratedQuiz {
  videoId: string;
  videoTitle: string;
  questions: Question[];
  summary?: VideoSummary;
}

// Enhanced video analysis for better quiz generation
const analyzeVideoContent = (videoTitle: string, transcript: string) => {
  const title = videoTitle.toLowerCase();
  const content = transcript.toLowerCase();
  
  // Determine content type
  let contentType = 'general';
  if (title.includes('tutorial') || title.includes('how to') || content.includes('tutorial') || content.includes('step by step')) {
    contentType = 'tutorial';
  } else if (title.includes('programming') || title.includes('coding') || content.includes('code') || content.includes('programming')) {
    contentType = 'programming';
  } else if (title.includes('business') || title.includes('marketing') || content.includes('business') || content.includes('strategy')) {
    contentType = 'business';
  } else if (title.includes('science') || title.includes('research') || content.includes('research') || content.includes('study')) {
    contentType = 'science';
  } else if (title.includes('education') || title.includes('learning') || content.includes('learn') || content.includes('teach')) {
    contentType = 'education';
  }
  
  return contentType;
};

// Generate content-specific questions
const generateContextualQuestions = (videoTitle: string, transcript: string, contentType: string) => {
  const questions = [];
  
  // Extract key phrases from transcript for better contextualization
  const keyPhrases = transcript.match(/\b[A-Z][a-z]+(?:\s+[a-z]+){1,3}\b/g) || [];
  const firstSentence = transcript.split('.')[0];
  const keyWords = [...new Set(transcript.toLowerCase().match(/\b[a-z]{4,}\b/g) || [])].slice(0, 10);
  
  switch (contentType) {
    case 'programming':
      questions.push(
        {
          id: 1,
          type: 'multiple-choice' as const,
          category: 'comprehension' as const,
          question: `Based on "${videoTitle}", what is the primary programming concept being explained?`,
          options: [
            "Data structures and algorithms",
            "Web development frameworks", 
            "Software design patterns",
            "Database management"
          ],
          correctAnswer: "Web development frameworks"
        },
        {
          id: 3,
          type: 'multiple-choice' as const,
          category: 'application' as const,
          question: `In the context of this programming tutorial, what would be the best approach to practice these concepts?`,
          options: [
            "Read documentation only",
            "Build a small project applying these concepts",
            "Watch more tutorials",
            "Memorize the syntax"
          ],
          correctAnswer: "Build a small project applying these concepts"
        }
      );
      break;
      
    case 'business':
      questions.push(
        {
          id: 1,
          type: 'multiple-choice' as const,
          category: 'comprehension' as const,
          question: `What is the main business strategy discussed in "${videoTitle}"?`,
          options: [
            "Market penetration and growth",
            "Cost reduction strategies",
            "Digital transformation",
            "Customer relationship management"
          ],
          correctAnswer: "Market penetration and growth"
        },
        {
          id: 3,
          type: 'multiple-choice' as const,
          category: 'application' as const,
          question: `How could you implement these business strategies in a real-world scenario?`,
          options: [
            "Create a detailed implementation plan",
            "Study competitor analysis first",
            "Start with small pilot programs",
            "Hire external consultants"
          ],
          correctAnswer: "Start with small pilot programs"
        }
      );
      break;
      
    default:
      questions.push(
        {
          id: 1,
          type: 'multiple-choice' as const,
          category: 'comprehension' as const,
          question: `What is the central theme of "${videoTitle}"?`,
          options: [
            "Practical skill development",
            "Theoretical understanding",
            "Problem-solving techniques",
            "Industry best practices"
          ],
          correctAnswer: "Practical skill development"
        },
        {
          id: 3,
          type: 'multiple-choice' as const,
          category: 'application' as const,
          question: `Based on the video content, what would be the most effective way to apply these learnings?`,
          options: [
            "Immediate practical implementation",
            "Further research and study",
            "Seeking mentorship or guidance",
            "Creating a structured learning plan"
          ],
          correctAnswer: "Immediate practical implementation"
        }
      );
  }
  
  return questions;
};

export const generateQuizFromVideo = async (
  videoId: string,
  videoTitle: string,
  transcript: string,
  videoDescription?: string
): Promise<GeneratedQuiz | null> => {
  try {
    console.log('Generating enhanced quiz from transcript...');
    
    // Analyze video content for better contextualization
    const contentType = analyzeVideoContent(videoTitle, transcript);
    console.log(`Detected content type: ${contentType}`);
    
    // Generate contextual questions based on content type
    const contextualQuestions = generateContextualQuestions(videoTitle, transcript, contentType);
    
    // Create video summary for dashboard
    const videoSummary = createVideoSummary(videoTitle, transcript);
    
    const allQuestions = [
      ...contextualQuestions,
      {
        id: 2,
        type: 'open-ended' as const,
        category: 'reflection' as const,
        question: `Why did you choose to watch this specific video? What were you hoping to learn or achieve?`
      },
      {
        id: 4,
        type: 'open-ended' as const,
        category: 'reflection' as const,
        question: `What are the key insights from this video that resonate most with your current situation or goals?`
      },
      {
        id: 5,
        type: 'open-ended' as const,
        category: 'application' as const,
        question: `Describe a specific real-world scenario where you could apply what you've learned from this video.`
      },
      {
        id: 6,
        type: 'multiple-choice' as const,
        category: 'goal-setting' as const,
        question: `What would be a realistic timeline for mastering the concepts presented in this video?`,
        options: ["1-2 weeks", "1-2 months", "3-6 months", "6-12 months"],
        correctAnswer: "3-6 months"
      },
      {
        id: 7,
        type: 'open-ended' as const,
        category: 'goal-setting' as const,
        question: `Based on this video, what specific, measurable goal will you set for yourself in the next 30 days?`
      },
      {
        id: 8,
        type: 'open-ended' as const,
        category: 'application' as const,
        question: `What challenges do you anticipate when implementing these concepts, and how will you overcome them?`
      }
    ];
    
    console.log('Enhanced quiz generated successfully');
    
    return {
      videoId,
      videoTitle,
      questions: allQuestions,
      summary: videoSummary
    };

  } catch (error) {
    console.error('Error generating enhanced quiz:', error);
    return null;
  }
};

// Create video summary for dashboard viewing
const createVideoSummary = (videoTitle: string, transcript: string) => {
  // Extract meaningful content from transcript
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 20);
  const meaningfulSentences = sentences.slice(0, 5);
  
  // Generate key insights based on transcript content
  const words = transcript.toLowerCase().split(/\s+/);
  const keyTerms = [...new Set(words.filter(word => word.length > 5))].slice(0, 10);
  
  // Create contextual key points based on actual content
  const keyPoints = [];
  if (transcript.includes('step') || transcript.includes('process') || transcript.includes('method')) {
    keyPoints.push("Step-by-step methodology and systematic approach");
  }
  if (transcript.includes('example') || transcript.includes('case') || transcript.includes('practice')) {
    keyPoints.push("Practical examples and real-world applications");
  }
  if (transcript.includes('learn') || transcript.includes('understand') || transcript.includes('concept')) {
    keyPoints.push("Core learning concepts and knowledge framework");
  }
  if (transcript.includes('skill') || transcript.includes('technique') || transcript.includes('strategy')) {
    keyPoints.push("Key skills and strategic techniques covered");
  }
  
  // Default points if none detected
  if (keyPoints.length === 0) {
    keyPoints.push(
      "Main concepts and learning objectives from the video",
      "Practical insights and actionable takeaways",
      "Key knowledge areas and skill development focus"
    );
  }
  
  const summary = meaningfulSentences.length > 0 
    ? meaningfulSentences.join('. ') + '.'
    : `This video covers important topics related to ${videoTitle.toLowerCase()}. The content provides valuable insights and practical knowledge that can be applied in real-world scenarios.`;
  
  return {
    title: videoTitle,
    keyPoints: keyPoints.slice(0, 4),
    summary: summary,
    duration: "10-15 minutes",
    difficulty: transcript.includes('advanced') || transcript.includes('complex') ? "Advanced" : 
               transcript.includes('basic') || transcript.includes('introduction') ? "Beginner" : "Intermediate",
    tags: [
      "Educational", 
      "Skill Development",
      ...keyTerms.slice(0, 3).map(term => term.charAt(0).toUpperCase() + term.slice(1))
    ].slice(0, 5)
  };
};