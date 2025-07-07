
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoId } = await req.json();
    
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

    // Try to get transcript using multiple methods
    const transcript = await extractTranscript(videoId);
    
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

async function extractTranscript(videoId) {
  const methods = [
    () => tryYouTubeAPI(videoId),
    () => tryDirectCaptionFetch(videoId),
    () => tryAlternativeMethod(videoId)
  ];

  for (const method of methods) {
    try {
      const result = await method();
      if (result && result.text && result.text.length > 10) {
        return result;
      }
    } catch (error) {
      console.error('Method failed:', error.message);
      continue;
    }
  }

  return null;
}

async function tryYouTubeAPI(videoId) {
  console.log(`Trying YouTube API method for ${videoId}`);
  
  const languages = ['en', 'en-US', 'en-GB'];
  
  for (const lang of languages) {
    try {
      // Try auto-generated captions first
      let url = `https://www.youtube.com/api/timedtext?lang=${lang}&v=${videoId}&fmt=json3&kind=asr`;
      let response = await fetchWithRetry(url);
      
      if (response && response.ok) {
        const data = await response.json();
        const transcript = parseYouTubeData(data);
        if (transcript) {
          return {
            text: transcript,
            source: 'auto-generated',
            language: lang
          };
        }
      }
      
      // Try manual captions
      url = `https://www.youtube.com/api/timedtext?lang=${lang}&v=${videoId}&fmt=json3`;
      response = await fetchWithRetry(url);
      
      if (response && response.ok) {
        const data = await response.json();
        const transcript = parseYouTubeData(data);
        if (transcript) {
          return {
            text: transcript,
            source: 'manual',
            language: lang
          };
        }
      }
      
    } catch (error) {
      console.error(`Error with language ${lang}:`, error.message);
      continue;
    }
  }
  
  return null;
}

async function tryDirectCaptionFetch(videoId) {
  console.log(`Trying direct caption fetch for ${videoId}`);
  
  try {
    // Try to fetch the video page and extract caption info
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await fetchWithRetry(videoUrl);
    
    if (!response || !response.ok) {
      return null;
    }
    
    const htmlContent = await response.text();
    
    // Look for caption tracks in the HTML
    const captionRegex = /"captionTracks":\s*\[(.*?)\]/;
    const match = htmlContent.match(captionRegex);
    
    if (match) {
      try {
        const captionsData = JSON.parse(`[${match[1]}]`);
        
        for (const caption of captionsData) {
          if (caption.baseUrl && (caption.languageCode === 'en' || caption.languageCode.startsWith('en'))) {
            const captionResponse = await fetchWithRetry(caption.baseUrl);
            if (captionResponse && captionResponse.ok) {
              const captionText = await captionResponse.text();
              const cleanText = extractTextFromXML(captionText);
              
              if (cleanText && cleanText.length > 10) {
                return {
                  text: cleanText,
                  source: caption.kind === 'asr' ? 'auto-generated' : 'manual',
                  language: caption.languageCode
                };
              }
            }
          }
        }
      } catch (parseError) {
        console.error('Error parsing caption data:', parseError.message);
      }
    }
    
  } catch (error) {
    console.error('Direct caption fetch error:', error.message);
  }
  
  return null;
}

async function tryAlternativeMethod(videoId) {
  console.log(`Trying alternative method for ${videoId}`);
  
  // Try different formats and approaches
  const alternatives = [
    `https://video.google.com/timedtext?lang=en&v=${videoId}&fmt=json3`,
    `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv3`,
    `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=ttml`
  ];
  
  for (const url of alternatives) {
    try {
      const response = await fetchWithRetry(url);
      if (response && response.ok) {
        const data = await response.text();
        
        // Try to parse as JSON first
        try {
          const jsonData = JSON.parse(data);
          const transcript = parseYouTubeData(jsonData);
          if (transcript) {
            return {
              text: transcript,
              source: 'alternative',
              language: 'en'
            };
          }
        } catch {
          // Try to parse as XML
          const xmlText = extractTextFromXML(data);
          if (xmlText && xmlText.length > 10) {
            return {
              text: xmlText,
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

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.youtube.com/'
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
}

function parseYouTubeData(data) {
  if (!data || !data.events || !Array.isArray(data.events)) {
    return null;
  }

  const transcript = data.events
    .filter(event => event.segs && Array.isArray(event.segs))
    .map(event => 
      event.segs
        .map(seg => (seg.utf8 || '').trim())
        .filter(text => text.length > 0)
        .join('')
    )
    .filter(text => text.length > 0)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  return transcript.length > 0 ? transcript : null;
}

function extractTextFromXML(xmlContent) {
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
    
    return textContent.length > 10 ? textContent : null;
  } catch (error) {
    console.error('Error extracting text from XML:', error.message);
    return null;
  }
}
