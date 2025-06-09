
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoTitle, transcript, videoDescription } = await req.json();
    const googleApiKey = Deno.env.get('GOOGLE_API_KEY');

    if (!googleApiKey) {
      throw new Error('Google API key not configured');
    }

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

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${googleApiKey}`, {
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
      return new Response(JSON.stringify(quiz), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (parseError) {
      console.error('Failed to parse Gemini response as JSON:', generatedContent);
      throw new Error('Failed to generate valid quiz format');
    }

  } catch (error) {
    console.error('Error generating quiz:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
