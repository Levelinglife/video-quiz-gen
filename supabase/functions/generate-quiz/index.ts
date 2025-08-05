
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

    // STRICT VALIDATION: Ensure we have real transcript content
    if (!transcript || transcript.length < 200) {
      throw new Error('Invalid or insufficient transcript content - quiz generation requires real video captions with at least 200 characters');
    }

    // Additional validation: Check for common fake/generic content patterns
    const genericPatterns = [
      'welcome to this educational presentation',
      'in this video, we explore',
      'the presenter discusses fundamental principles',
      'throughout this presentation',
      'this educational content provides'
    ];
    
    const lowerTranscript = transcript.toLowerCase();
    const hasGenericContent = genericPatterns.some(pattern => lowerTranscript.includes(pattern));
    
    if (hasGenericContent) {
      throw new Error('Detected generic/template content instead of real video transcript - only actual video captions are allowed');
    }

    console.log(`✅ Validated real transcript: ${transcript.length} characters, video: "${videoTitle}"`);
    console.log(`📝 Transcript preview: "${transcript.substring(0, 150)}..."`);


    const prompt = `You are an expert instructional designer and educational psychologist specializing in creating complex, analytical quiz questions based on specific video content.

**CRITICAL REQUIREMENT:** You MUST create questions based ONLY on the actual video transcript provided. DO NOT create generic questions. Every question must reference specific details, quotes, examples, or concepts mentioned in the transcript.

**Video Title:** ${videoTitle}
**Video Description:** ${videoDescription || 'Not provided'}
**ACTUAL VIDEO TRANSCRIPT:** ${transcript}

**Task:** Generate exactly **8 complex quiz questions** that test deep understanding of the specific video content:
- 6 **MCQs** (multiple choice with 4 options each) - focus on specific details, quotes, concepts from the transcript
- 2 **open-response** questions for critical analysis of the specific content discussed

**Question Complexity Requirements:**
1. **Specific Content References**: Every question must reference specific details, examples, or quotes from the transcript
2. **No Generic Questions**: Avoid general knowledge questions - focus on what was actually said in this video
3. **Deep Analysis**: Questions should test understanding, not just recall
4. **Complex Scenarios**: Use real examples or scenarios mentioned in the video
5. **Technical Details**: Include specific terminology, numbers, processes mentioned in the transcript

**MCQs (1-6) - Based on Bloom's Taxonomy:**
1. **Remember** (1 question): Specific facts, quotes, or exact details mentioned in the video
2. **Understand** (2 questions): Concepts, explanations, or cause-and-effect relationships from the transcript
3. **Apply** (2 questions): How to use specific knowledge/techniques discussed in the video
4. **Analyze** (1 question): Compare specific concepts, critique ideas, or identify patterns mentioned in the video

**Open-Response (7-8):**
7. **Critical Analysis**: Analyze specific implications, strengths/weaknesses of concepts discussed in the video
8. **Complex Application**: How would you apply/implement the specific techniques or ideas presented in the video

**Quality Requirements:**
- Quote or reference specific parts of the transcript in each question
- Use exact terminology and concepts from the video
- Include specific examples, case studies, or scenarios mentioned in the transcript
- Make wrong MCQ options plausible but clearly incorrect based on video content
- Ensure questions require knowledge of the actual video content to answer correctly

**Output Format (JSON):**
{
  "questions": [
    {
      "id": 1,
      "type": "multiple-choice",
      "category": "comprehension",
      "question": "[Question referencing specific transcript content with quotes or examples]",
      "options": ["A) [option based on video]", "B) [option based on video]", "C) [option based on video]", "D) [option based on video]"],
      "correctAnswer": "A"
    },
    {
      "id": 7,
      "type": "open-ended",
      "category": "analysis",
      "question": "[Complex analytical question about specific video concepts]"
    },
    {
      "id": 8,
      "type": "open-ended", 
      "category": "application",
      "question": "[Implementation question based on specific video techniques/methods]"
    }
  ]
}

**CRITICAL:** Return ONLY valid JSON. Base ALL questions on the specific video transcript - no generic educational content allowed.`;

    // Retry logic for API calls with exponential backoff
    const maxRetries = 3;
    let response;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${maxRetries} to call Gemini API`);
        
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${googleApiKey}`, {
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
              temperature: 0.3,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 4096,
            },
            safetySettings: [
              {
                category: "HARM_CATEGORY_HARASSMENT",
                threshold: "BLOCK_NONE"
              },
              {
                category: "HARM_CATEGORY_HATE_SPEECH", 
                threshold: "BLOCK_NONE"
              },
              {
                category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                threshold: "BLOCK_NONE"
              },
              {
                category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                threshold: "BLOCK_NONE"
              }
            ]
          }),
        });

        if (response.ok) {
          console.log(`Gemini API call successful on attempt ${attempt}`);
          break;
        }

        const errorText = await response.text();
        lastError = new Error(`Google Gemini API error: ${response.status} - ${errorText}`);
        
        // If it's a rate limit or overload error (503, 429), retry after delay
        if ((response.status === 503 || response.status === 429) && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
          console.log(`API overloaded (${response.status}), retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // For other errors, don't retry
        throw lastError;
        
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries && (error.message.includes('503') || error.message.includes('overloaded') || error.message.includes('429'))) {
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`API error, retrying in ${delay}ms...`, error.message);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }

    if (!response || !response.ok) {
      throw lastError || new Error('Failed to get response from Gemini API after retries');
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
