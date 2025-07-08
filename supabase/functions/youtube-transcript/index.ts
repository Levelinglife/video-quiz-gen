
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log(`Request method: ${req.method}`);
  console.log(`Request headers:`, Object.fromEntries(req.headers.entries()));

  let body;
  try {
    const rawBody = await req.text();
    console.log(`Raw request body: ${rawBody}`);
    
    if (!rawBody || rawBody.trim() === '') {
      console.log('Empty request body received');
      return new Response(JSON.stringify({ 
        error: 'Empty request body',
        message: 'Request body is required and must contain videoId'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    body = JSON.parse(rawBody);
    console.log(`Parsed request body:`, body);
  } catch (parseError) {
    console.error('JSON parsing error:', parseError);
    return new Response(JSON.stringify({ 
      error: 'Invalid JSON in request body',
      message: 'Request body must be valid JSON with videoId field'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const { videoId } = body || {};
    
    if (!videoId) {
      console.log('No video ID provided');
      return new Response(JSON.stringify({ 
        error: 'Video ID is required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Starting transcript extraction for video: ${videoId}`);

    // Try to extract transcript using multiple methods
    const transcript = await extractTranscriptWithFallbacks(videoId);
    
    if (!transcript) {
      console.log('No transcript found with any method');
      return new Response(JSON.stringify({ 
        error: 'No transcript available for this video',
        message: 'This video does not have captions or subtitles available. Please try a video with captions enabled.',
        details: 'We tried multiple methods but could not find any captions for this video.'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Successfully extracted transcript: ${transcript.text.length} characters`);
    
    return new Response(JSON.stringify({
      transcript: transcript.text,
      source: transcript.source,
      language: transcript.language || 'unknown',
      length: transcript.text.length,
      videoId: videoId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Transcript extraction error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to extract transcript',
      message: error.message || 'An unexpected error occurred while extracting the transcript',
      details: 'Please check if the video is publicly accessible and has captions enabled'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function extractTranscriptWithFallbacks(videoId: string) {
  console.log(`Trying Method 1: Direct API calls for ${videoId}`);
  
  try {
    // Method 1: Try direct timedtext API with various configurations
    const apiTranscript = await getTranscriptFromAPI(videoId);
    if (apiTranscript) {
      console.log('Success with Method 1: Direct API');
      return apiTranscript;
    }
  } catch (error) {
    console.error('Method 1 failed:', error.message);
  }

  console.log(`Trying Method 2: Alternative endpoints for ${videoId}`);
  
  try {
    // Method 2: Try alternative endpoints
    const altTranscript = await getTranscriptFromAlternatives(videoId);
    if (altTranscript) {
      console.log('Success with Method 2: Alternative endpoints');
      return altTranscript;
    }
  } catch (error) {
    console.error('Method 2 failed:', error.message);
  }

  return null;
}

async function getTranscriptFromAPI(videoId: string) {
  const languages = ['en', 'en-US', 'en-GB'];
  const kinds = ['asr', null]; // auto-generated first, then manual
  
  for (const kind of kinds) {
    for (const lang of languages) {
      try {
        let url = `https://www.youtube.com/api/timedtext?lang=${lang}&v=${videoId}&fmt=json3`;
        if (kind) {
          url += `&kind=${kind}`;
        }
        
        console.log(`Trying API URL: ${url}`);
        const response = await fetchWithRetry(url);
        
        if (response.ok) {
          const data = await response.json();
          const transcript = parseYouTubeTranscriptData(data);
          
          if (transcript && transcript.length > 50) {
            return {
              text: transcript,
              source: kind === 'asr' ? 'auto-generated' : 'manual',
              language: lang
            };
          }
        }
      } catch (error) {
        console.error(`API method failed for ${lang} ${kind || 'manual'}:`, error.message);
        continue;
      }
    }
  }
  
  return null;
}

async function getTranscriptFromAlternatives(videoId: string) {
  const alternatives = [
    `https://video.google.com/timedtext?lang=en&v=${videoId}&fmt=json3`,
    `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv3`,
    `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=ttml`,
    `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en-US&fmt=json3&kind=asr`
  ];
  
  for (const url of alternatives) {
    try {
      console.log(`Trying alternative URL: ${url}`);
      const response = await fetchWithRetry(url);
      
      if (response.ok) {
        const data = await response.text();
        
        // Try parsing as JSON first
        try {
          const jsonData = JSON.parse(data);
          const transcript = parseYouTubeTranscriptData(jsonData);
          if (transcript && transcript.length > 50) {
            return {
              text: transcript,
              source: 'alternative',
              language: 'en'
            };
          }
        } catch {
          // Try parsing as XML
          const xmlTranscript = parseTranscriptFromXML(data);
          if (xmlTranscript && xmlTranscript.length > 50) {
            return {
              text: xmlTranscript,
              source: 'alternative',
              language: 'en'
            };
          }
        }
      }
    } catch (error) {
      console.error(`Alternative method failed for ${url}:`, error.message);
      continue;
    }
  }
  
  return null;
}

async function fetchWithRetry(url: string, options: RequestInit = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.youtube.com/',
          ...options.headers
        },
        signal: AbortSignal.timeout(15000) // 15 second timeout
      });
      
      return response;
    } catch (error) {
      console.error(`Fetch attempt ${i + 1} failed:`, error.message);
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
    }
  }
  throw new Error('All fetch attempts failed');
}

function parseYouTubeTranscriptData(data: any): string | null {
  if (!data || !data.events || !Array.isArray(data.events)) {
    return null;
  }

  const transcript = data.events
    .filter((event: any) => event.segs && Array.isArray(event.segs))
    .map((event: any) => 
      event.segs
        .map((seg: any) => (seg.utf8 || '').trim())
        .filter((text: string) => text.length > 0)
        .join('')
    )
    .filter((text: string) => text.length > 0)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  return transcript.length > 0 ? transcript : null;
}

function parseTranscriptFromXML(xmlContent: string): string | null {
  if (!xmlContent) return null;
  
  try {
    // Remove XML tags and extract text content
    const textContent = xmlContent
      .replace(/<[^>]*>/g, ' ') // Remove all XML tags
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
    
    return textContent.length > 50 ? textContent : null;
  } catch (error) {
    console.error('Error extracting text from XML:', error.message);
    return null;
  }
}
