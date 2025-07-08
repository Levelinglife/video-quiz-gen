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

const GOOGLE_API_KEY = 'AIzaSyBqJ3Z5vQrKnWk2ql_UG7L6QCmGtFrBKrE'; // You'll need to replace this with your actual API key

export const generateQuizFromVideo = async (
  videoId: string,
  videoTitle: string,
  transcript: string,
  videoDescription?: string
): Promise<GeneratedQuiz | null> => {
  try {
    const prompt = `Based on the YouTube video titled "${videoTitle}" with the following transcript and description, generate a comprehensive learning quiz with exactly 8 questions.

Video Description: ${videoDescription || 'Not provided'}

Transcript: ${transcript}

Generate questions in this exact format - return ONLY valid JSON:

{
  "questions": [
    {
      "id": 1,
      "type": "multiple-choice",
      "category": "comprehension",
      "question": "Question text here",
      "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
      "correctAnswer": "A"
    },
    {
      "id": 2,
      "type": "open-ended",
      "category": "reflection",
      "question": "Reflective question here"
    }
  ]
}

Requirements:
- Exactly 8 questions total
- Mix of question types: 4 multiple-choice, 4 open-ended
- Categories: 2 comprehension, 2 reflection, 2 application, 2 goal-setting
- Multiple-choice questions must have 4 options (A, B, C, D) and specify correctAnswer
- Open-ended questions should encourage deep thinking and personal application
- Questions should be based on the actual content from the transcript
- Focus on key concepts, practical applications, and personal growth opportunities`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response generated from Gemini API');
    }

    const generatedContent = data.candidates[0].content.parts[0].text;
    
    try {
      // Clean the response to extract JSON (Gemini sometimes adds markdown formatting)
      const jsonMatch = generatedContent.match(/\{[\s\S]*\}/);
      const cleanedContent = jsonMatch ? jsonMatch[0] : generatedContent;
      
      const quiz = JSON.parse(cleanedContent);
      
      return {
        videoId,
        videoTitle,
        questions: quiz.questions
      };
    } catch (parseError) {
      console.error('Failed to parse Gemini response as JSON:', generatedContent);
      throw new Error('Failed to generate valid quiz format');
    }

  } catch (error) {
    console.error('Error generating quiz:', error);
    return null;
  }
};