
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

    const prompt = `You are an expert instructional designer and educational psychologist specializing in personalized learning and Bloom's Taxonomy.

**Context:** You will receive a YouTube video transcript along with the video title. Your task is to create a comprehensive learning assessment that helps learners deeply engage with and retain the video content.

**Task:** Generate exactly **8 quiz questions** based on the specific video content:
- 6 **MCQs** (multiple choice with 4 options each)
- 2 **open-response** questions for deep reflection

**Video Title:** ${videoTitle}
**Video Description:** ${videoDescription || 'Not provided'}
**Transcript:** ${transcript}

**Question Distribution by Bloom's Taxonomy:**

**MCQs (1-6):**
1. **Remember** (1 question): Key facts, terminology, or specific details mentioned in the video
2. **Understand** (2 questions): Main concepts, explanations, or cause-and-effect relationships
3. **Apply** (2 questions): How to use the knowledge in real scenarios or new contexts
4. **Analyze/Evaluate** (1 question): Compare concepts, critique ideas, or identify patterns

**Open-Response (7-8):**
7. **Analyze/Evaluate**: Critical thinking about the content's implications, strengths/weaknesses, or real-world applications
8. **Create/Synthesize**: Design, plan, or combine the video's concepts with personal experience or other knowledge

**Quality Requirements:**
- Extract specific details, examples, and terminology from the transcript
- Reference the video title and main themes throughout questions
- Use exact quotes or paraphrases from the transcript when relevant
- Ensure wrong MCQ options are plausible but clearly incorrect
- Make questions progressively more challenging
- Connect content to practical, real-world applications

**Output Format (JSON):**
{
  "questions": [
    {
      "id": 1,
      "type": "multiple-choice",
      "category": "comprehension",
      "question": "[specific question referencing video content]",
      "options": ["A) [option]", "B) [option]", "C) [option]", "D) [option]"],
      "correctAnswer": "A"
    },
    {
      "id": 7,
      "type": "open-ended",
      "category": "application",
      "question": "[Detailed analytical prompt connecting to video specifics]"
    },
    {
      "id": 8,
      "type": "open-ended", 
      "category": "application",
      "question": "[Creative synthesis prompt building on video concepts]"
    }
  ]
}

**Instructions:**
- Return ONLY valid JSON with exactly 8 questions
- Base ALL questions on specific video content, not generic concepts
- Make MCQ distractors plausible but clearly wrong based on video content
- Ensure open-response questions require deep engagement with video material`;

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
