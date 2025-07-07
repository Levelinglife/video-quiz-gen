
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

    // Try multiple extraction methods
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

async function extractTranscriptWithFallbacks(videoId) {
  console.log(`Trying Method 1: YouTube Watch Page Scraping for ${videoId}`);
  
  try {
    // Method 1: Try to get captions from the YouTube watch page
    const watchPageTranscript = await getTranscriptFromWatchPage(videoId);
    if (watchPageTranscript) {
      console.log('Success with Method 1: Watch page scraping');
      return watchPageTranscript;
    }
  } catch (error) {
    console.error('Method 1 failed:', error.message);
  }

  console.log(`Trying Method 2: Direct Timedtext API for ${videoId}`);
  
  try {
    // Method 2: Try direct timedtext API with various configurations
    const apiTranscript = await getTranscriptFromAPI(videoId);
    if (apiTranscript) {
      console.log('Success with Method 2: Direct API');
      return apiTranscript;
    }
  } catch (error) {
    console.error('Method 2 failed:', error.message);
  }

  console.log(`Trying Method 3: Alternative endpoints for ${videoId}`);
  
  try {
    // Method 3: Try alternative endpoints
    const altTranscript = await getTranscriptFromAlternatives(videoId);
    if (altTranscript) {
      console.log('Success with Method 3: Alternative endpoints');
      return altTranscript;
    }
  } catch (error) {
    console.error('Method 3 failed:', error.message);
  }

  return null;
}

async function getTranscriptFromWatchPage(videoId) {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  console.log(`Fetching watch page: ${watchUrl}`);
  
  const response = await fetchWithRetry(watchUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch watch page: ${response.status}`);
  }

  const html = await response.text();
  console.log(`Watch page HTML length: ${html.length}`);

  // Extract caption tracks from the page
  const captionTracks = extractCaptionTracks(html);
  console.log(`Found ${captionTracks.length} caption tracks`);

  if (captionTracks.length === 0) {
    return null;
  }

  // Try to get transcript from the first available caption track
  for (const track of captionTracks) {
    try {
      console.log(`Trying caption track: ${track.languageCode} (${track.kind || 'manual'})`);
      const captionResponse = await fetchWithRetry(track.baseUrl);
      
      if (captionResponse.ok) {
        const captionText = await captionResponse.text();
        const transcript = parseTranscriptFromXML(captionText);
        
        if (transcript && transcript.length > 50) {
          return {
            text: transcript,
            source: track.kind === 'asr' ? 'auto-generated' : 'manual',
            language: track.languageCode
          };
        }
      }
    } catch (error) {
      console.error(`Failed to fetch caption track ${track.languageCode}:`, error.message);
      continue;
    }
  }

  return null;
}

function extractCaptionTracks(html) {
  const tracks = [];
  
  // Look for caption tracks in various patterns
  const patterns = [
    /"captionTracks":\s*(\[.*?\])/,
    /"captions":\s*{[^}]*"playerCaptionsTracklistRenderer":\s*{[^}]*"captionTracks":\s*(\[.*?\])/,
    /ytInitialPlayerResponse[^{]*{[^}]*"captions"[^{]*{[^}]*"captionTracks":\s*(\[.*?\])/
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      try {
        const captionData = JSON.parse(match[1]);
        if (Array.isArray(captionData)) {
          tracks.push(...captionData);
          console.log(`Extracted ${captionData.length} tracks using pattern`);
          break;
        }
      } catch (error) {
        console.error('Failed to parse caption data:', error.message);
        continue;
      }
    }
  }

  return tracks.filter(track => track.baseUrl && track.languageCode);
}

async function getTranscriptFromAPI(videoId) {
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

async function getTranscriptFromAlternatives(videoId) {
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

async function fetchWithRetry(url, options = {}, retries = 3) {
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
}

function parseYouTubeTranscriptData(data) {
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

function parseTranscriptFromXML(xmlContent) {
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
