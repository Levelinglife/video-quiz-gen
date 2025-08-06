
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

  try {
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

    // Use the working method - extract from YouTube watch page
    const transcript = await extractTranscriptFromWatchPage(videoId);
    
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

async function extractTranscriptFromWatchPage(videoId: string) {
  console.log(`Extracting transcript from watch page for ${videoId}`);
  
  try {
    // Get the YouTube watch page
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    console.log(`Fetching watch page: ${watchUrl}`);
    
    const response = await fetch(watchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch watch page: ${response.status}`);
    }

    const html = await response.text();
    console.log(`Received HTML page, length: ${html.length}`);

    // Extract caption track URLs from the page
    const captionUrls = extractCaptionUrls(html);
    console.log(`Found ${captionUrls.length} caption tracks`);

    if (captionUrls.length === 0) {
      return null;
    }

    // Try each caption URL
    for (const url of captionUrls) {
      try {
        console.log(`Trying caption URL: ${url.substring(0, 100)}...`);
        const transcript = await fetchCaptionContent(url);
        if (transcript) {
          return {
            text: transcript,
            source: 'captions',
            language: 'en'
          };
        }
      } catch (error) {
        console.error(`Failed to fetch caption from URL:`, error.message);
        continue;
      }
    }

    return null;
  } catch (error) {
    console.error('Error extracting from watch page:', error);
    return null;
  }
}

function extractCaptionUrls(html: string): string[] {
  const urls: string[] = [];
  
  try {
    console.log('Starting comprehensive caption URL extraction...');
    
    // Enhanced patterns for caption detection
    const patterns = [
      // Standard caption tracks
      /"captionTracks":\s*\[(.*?)\]/,
      /"captions":\s*{[^}]*"playerCaptionsTracklistRenderer":\s*{[^}]*"captionTracks":\s*\[(.*?)\]/,
      
      // Direct baseUrl patterns
      /\"baseUrl\":\"([^\"]+timedtext[^\"]+)\"/g,
      /baseUrl.*?https:\\\/\\\/[^"]*timedtext[^"]*/g,
      
      // Alternative caption patterns
      /"timedtext[^"]*"/g,
      /https:\\?\/\\?\/[^"]*timedtext[^"]*/g,
      
      // Player response patterns
      /"playerResponse":\s*"([^"]*captionTracks[^"]*)"/,
      /"PLAYER_VARS":\s*{[^}]*"caption_tracks":\s*"([^"]*)"/
    ];

    // Try each pattern
    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i];
      console.log(`Trying pattern ${i + 1}/${patterns.length}: ${pattern.source.substring(0, 50)}...`);
      
      if (pattern.global) {
        let match;
        const regex = new RegExp(pattern.source, 'g');
        while ((match = regex.exec(html)) !== null) {
          const url = match[1] ? match[1] : match[0];
          const cleanUrl = url.replace(/\\u0026/g, '&').replace(/\\/g, '').replace(/"/g, '');
          
          if (cleanUrl.includes('timedtext') && !urls.includes(cleanUrl)) {
            console.log(`Found caption URL via pattern ${i + 1}: ${cleanUrl.substring(0, 100)}...`);
            urls.push(cleanUrl);
          }
        }
      } else {
        const matches = html.match(pattern);
        if (matches) {
          console.log(`Found potential caption data with pattern ${i + 1}`);
          
          // Parse the matched content for URLs
          const content = matches[1] || matches[0];
          const baseUrlMatches = content.match(/\"baseUrl\":\"([^\"]+)\"/g) || 
                                content.match(/baseUrl[^"]*"([^"]*timedtext[^"]*)"/g) ||
                                content.match(/https[^"]*timedtext[^"]*/g);
          
          if (baseUrlMatches) {
            for (const urlMatch of baseUrlMatches) {
              let url = urlMatch.match(/\"baseUrl\":\"([^\"]+)\"/)?.[1] || 
                       urlMatch.match(/baseUrl[^"]*"([^"]*)"/)?.[1] ||
                       urlMatch.match(/(https[^"]*timedtext[^"]*)/)?.[1];
              
              if (url) {
                const cleanUrl = url.replace(/\\u0026/g, '&').replace(/\\/g, '');
                if (!urls.includes(cleanUrl)) {
                  console.log(`Extracted caption URL: ${cleanUrl.substring(0, 100)}...`);
                  urls.push(cleanUrl);
                }
              }
            }
          }
        }
      }
    }

    // Additional fallback: search for any mention of transcript/caption APIs
    if (urls.length === 0) {
      console.log('No direct URLs found, trying alternative extraction...');
      
      // Use the videoId parameter that was passed to the function
      console.log(`Using passed videoId parameter for fallback URLs`);
      
      // Try common caption URL patterns with the correct video ID
      const potentialUrls = [
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3`,
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en-US&fmt=json3`,
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv3`,
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en-US&fmt=srv3`
      ];
      
      urls.push(...potentialUrls);
    }

    console.log(`Total extracted ${urls.length} caption URLs`);
    urls.forEach((url, index) => {
      console.log(`URL ${index + 1}: ${url.substring(0, 150)}...`);
    });
    
    return urls;
  } catch (error) {
    console.error('Error extracting caption URLs:', error);
    return [];
  }
}

async function fetchCaptionContent(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Referer': 'https://www.youtube.com/',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const content = await response.text();
    console.log(`Received caption content, length: ${content.length}`);

    // Try parsing as JSON first
    try {
      const jsonData = JSON.parse(content);
      return parseJsonCaptions(jsonData);
    } catch {
      // Try parsing as XML
      return parseXmlCaptions(content);
    }
  } catch (error) {
    console.error('Error fetching caption content:', error);
    return null;
  }
}

function parseJsonCaptions(data: any): string | null {
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

function parseXmlCaptions(xmlContent: string): string | null {
  if (!xmlContent) return null;
  
  try {
    // Extract text from XML elements
    const textPattern = /<text[^>]*>(.*?)<\/text>/g;
    const texts: string[] = [];
    let match;
    
    while ((match = textPattern.exec(xmlContent)) !== null) {
      const text = match[1]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/<[^>]*>/g, '') // Remove any remaining tags
        .trim();
      
      if (text.length > 0) {
        texts.push(text);
      }
    }
    
    const transcript = texts.join(' ').replace(/\s+/g, ' ').trim();
    return transcript.length > 50 ? transcript : null;
  } catch (error) {
    console.error('Error parsing XML captions:', error);
    return null;
  }
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
