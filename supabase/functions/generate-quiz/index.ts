
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
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
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

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert educational content creator. Generate high-quality learning questions that help users deeply understand and apply video content. Always return valid JSON only.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedContent = data.choices[0].message.content;
    
    try {
      const quiz = JSON.parse(generatedContent);
      return new Response(JSON.stringify(quiz), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', generatedContent);
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
