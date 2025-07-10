
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

    const prompt = `You are an instructional designer specializing in educational psychology and Bloom's Taxonomy.

**Task:**  
Given the transcript of an informative video, generate exactly **10 quiz questions**:
- 8 **MCQs** (with 4 options each, one correct answer)  
- 2 **open-response** questions requiring a long-form answer

Video Title: ${videoTitle}
Video Description: ${videoDescription || 'Not provided'}
Transcript: ${transcript}

Distribute questions across Bloom's revised cognitive levels:

**MCQs:**
1. **Remember** – 2 questions (factual recall from the video content)
2. **Understand** – 2 questions (comprehension of key concepts)
3. **Apply / Analyze** – 2 questions (practical use or analysis of content)
4. **Evaluate** – 2 questions (judgment or critique based on video)

**Open-response (long answer):**
5. **Analyze / Evaluate** – 1 question (deep analysis or evaluation)
6. **Create** – 1 question (design or synthesis)

**CRITICAL REQUIREMENTS:**
- All questions MUST be based on actual content from the transcript
- Use specific details, facts, and concepts mentioned in the video
- Avoid generic questions that could apply to any video
- MCQ options should include plausible distractors based on video content
- Questions should demonstrate you've analyzed the specific video content

**Format your output** exactly as follows JSON:

{
  "questions": [
    {
      "id": 1,
      "type": "multiple-choice",
      "category": "comprehension",
      "question": "[Specific question based on video content]",
      "options": ["A) Option based on video", "B) Option based on video", "C) Option based on video", "D) Option based on video"],
      "correctAnswer": "A"
    },
    {
      "id": 10,
      "type": "open-ended",
      "category": "application", 
      "question": "[Creative synthesis question based on video concepts]"
    }
  ]
}

**Instructions:**  
- Return ONLY valid JSON with the questions array
- Ensure each question clearly aligns with its Bloom's level  
- Keep MCQs concise and focused on video content
- Make open-response prompts specific to the video's teachings
- Quality over generic: Every question should prove you understood THIS specific video`;

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
