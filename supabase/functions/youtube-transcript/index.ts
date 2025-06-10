
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
    const { videoId } = await req.json();
    
    if (!videoId) {
      throw new Error('Video ID is required');
    }

    console.log(`Starting transcript extraction for video: ${videoId}`);

    // Try the direct caption tracks API approach first
    let transcript = null;
    let extractionMethod = '';

    // Method 1: Try YouTube's internal API for captions
    try {
      console.log('Method 1: Trying YouTube internal caption API...');
      transcript = await getYouTubeTranscriptAPI(videoId);
      if (transcript) {
        extractionMethod = 'youtube-api';
        console.log('Method 1 succeeded');
      }
    } catch (error) {
      console.log('Method 1 failed:', error.message);
    }

    // Method 2: Enhanced page parsing with debug info
    if (!transcript) {
      try {
        console.log('Method 2: Trying enhanced page parsing with debug...');
        transcript = await getYouTubeTranscriptEnhanced(videoId);
        if (transcript) {
          extractionMethod = 'enhanced-page-parsing';
          console.log('Method 2 succeeded');
        }
      } catch (error) {
        console.log('Method 2 failed:', error.message);
      }
    }

    // Method 3: Try different URL formats
    if (!transcript) {
      try {
        console.log('Method 3: Trying different URL formats...');
        transcript = await getYouTubeTranscriptAlternativeURLs(videoId);
        if (transcript) {
          extractionMethod = 'alternative-urls';
          console.log('Method 3 succeeded');
        }
      } catch (error) {
        console.log('Method 3 failed:', error.message);
      }
    }

    if (!transcript) {
      console.log('All extraction methods failed');
      throw new Error('Unable to extract transcript. The video may not have accessible captions, or YouTube has changed their page structure. Please try a different video with clear captions.');
    }

    console.log(`Successfully extracted transcript using ${extractionMethod}, length: ${transcript.length}`);

    return new Response(JSON.stringify({
      transcript: transcript,
      source: 'captions',
      extractionMethod: extractionMethod
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fetching YouTube transcript:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      suggestions: [
        'Make sure the video has captions available',
        'Try a different video with clear speech content',
        'Check if the video is public and accessible',
        'Some videos may have caption access restrictions'
      ]
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function getYouTubeTranscriptAPI(videoId: string): Promise<string | null> {
  try {
    console.log('API method: Attempting direct caption track access...');
    
    // Try to get caption tracks directly from YouTube's API endpoint
    const captionListUrl = `https://www.youtube.com/api/timedtext?type=list&v=${videoId}`;
    
    const response = await fetch(captionListUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Caption list API failed: ${response.status}`);
    }
    
    const xmlText = await response.text();
    console.log(`API method: Got caption list XML, length: ${xmlText.length}`);
    
    // Parse the XML to find available caption tracks
    const langCodeMatch = xmlText.match(/lang_code="([^"]+)"/);
    if (!langCodeMatch) {
      throw new Error('No caption tracks found in API response');
    }
    
    const langCode = langCodeMatch[1];
    console.log(`API method: Found language code: ${langCode}`);
    
    // Get the actual captions
    const captionUrl = `https://www.youtube.com/api/timedtext?lang=${langCode}&v=${videoId}&fmt=srv3`;
    const captionResponse = await fetch(captionUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!captionResponse.ok) {
      throw new Error(`Caption content API failed: ${captionResponse.status}`);
    }
    
    const captionXml = await captionResponse.text();
    return parseCaptionXML(captionXml);
    
  } catch (error) {
    console.error('API method error:', error);
    return null;
  }
}

async function getYouTubeTranscriptEnhanced(videoId: string): Promise<string | null> {
  try {
    console.log('Enhanced method: Fetching YouTube page with detailed debugging...');
    
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    console.log(`Enhanced method: Fetched HTML, length: ${html.length}`);

    // Log HTML snippets to see what we're working with
    const captionSearchTerms = ['captions', 'playerCaptionsTracklistRenderer', 'captionTracks'];
    for (const term of captionSearchTerms) {
      const index = html.indexOf(term);
      if (index !== -1) {
        const snippet = html.substring(Math.max(0, index - 100), index + 500);
        console.log(`Found "${term}" at position ${index}, snippet: ${snippet.substring(0, 200)}...`);
      } else {
        console.log(`Term "${term}" not found in HTML`);
      }
    }

    // Try multiple comprehensive extraction patterns
    const extractionPatterns = [
      // Standard ytInitialPlayerResponse patterns
      /var ytInitialPlayerResponse\s*=\s*(\{.*?\});var/s,
      /window\["ytInitialPlayerResponse"\]\s*=\s*(\{.*?\});/s,
      /ytInitialPlayerResponse\s*=\s*(\{[^;]+\});/s,
      
      // Embedded in script tags
      /<script[^>]*>var ytInitialPlayerResponse = (\{.*?\});<\/script>/s,
      /<script[^>]*>window\["ytInitialPlayerResponse"\] = (\{.*?\});<\/script>/s,
      
      // Direct captions object search
      /"captions":\s*(\{[^}]*"playerCaptionsTracklistRenderer"[^}]*\})/s,
      /"playerCaptionsTracklistRenderer":\s*(\{[^}]*"captionTracks"[^}]*\})/s,
      
      // More specific patterns
      /ytInitialPlayerResponse"\]\s*=\s*(\{[^<]*captions[^<]*\})/s,
      /ytInitialPlayerResponse\s*=\s*(\{[^<]*captions[^<]*\})/s,
    ];

    let captionsData = null;
    let matchedPattern = -1;

    for (let i = 0; i < extractionPatterns.length; i++) {
      console.log(`Testing extraction pattern ${i + 1}...`);
      const pattern = extractionPatterns[i];
      const match = html.match(pattern);
      
      if (match && match[1]) {
        console.log(`Pattern ${i + 1} matched, trying to parse JSON...`);
        try {
          let jsonStr = match[1];
          
          // Clean up JSON string
          jsonStr = jsonStr.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
          
          // Try to find where the JSON object ends
          let braceCount = 0;
          let endIndex = 0;
          for (let j = 0; j < jsonStr.length; j++) {
            if (jsonStr[j] === '{') braceCount++;
            if (jsonStr[j] === '}') braceCount--;
            if (braceCount === 0) {
              endIndex = j + 1;
              break;
            }
          }
          
          if (endIndex > 0) {
            jsonStr = jsonStr.substring(0, endIndex);
          }
          
          console.log(`Attempting to parse JSON of length: ${jsonStr.length}`);
          const parsed = JSON.parse(jsonStr);
          
          // Look for captions in the parsed object
          if (parsed.captions || (parsed.playerResponse && parsed.playerResponse.captions)) {
            captionsData = parsed;
            matchedPattern = i + 1;
            console.log(`Successfully parsed JSON from pattern ${i + 1} and found captions`);
            break;
          } else {
            console.log(`Pattern ${i + 1} parsed successfully but no captions found`);
          }
        } catch (parseError) {
          console.log(`Pattern ${i + 1} JSON parse failed:`, parseError.message);
        }
      } else {
        console.log(`Pattern ${i + 1} did not match`);
      }
    }

    if (!captionsData) {
      console.log('No captions data found in any pattern, trying raw search...');
      
      // Try to find caption tracks directly in the HTML
      const directCaptionSearch = /"captionTracks":\s*(\[[^\]]+\])/;
      const directMatch = html.match(directCaptionSearch);
      if (directMatch) {
        try {
          const tracks = JSON.parse(directMatch[1]);
          if (tracks.length > 0) {
            console.log(`Found ${tracks.length} caption tracks via direct search`);
            const selectedTrack = tracks.find((track: any) => 
              track.languageCode?.startsWith('en')
            ) || tracks[0];
            
            if (selectedTrack?.baseUrl) {
              return await fetchCaptionContent(selectedTrack.baseUrl);
            }
          }
        } catch (e) {
          console.log('Direct caption search parse failed:', e.message);
        }
      }
      
      throw new Error('No captions data found in page HTML');
    }

    // Extract caption tracks from the found data
    let captionTracks = null;
    
    if (captionsData.captions?.playerCaptionsTracklistRenderer?.captionTracks) {
      captionTracks = captionsData.captions.playerCaptionsTracklistRenderer.captionTracks;
    } else if (captionsData.playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks) {
      captionTracks = captionsData.playerResponse.captions.playerCaptionsTracklistRenderer.captionTracks;
    } else if (captionsData.playerCaptionsTracklistRenderer?.captionTracks) {
      captionTracks = captionsData.playerCaptionsTracklistRenderer.captionTracks;
    }

    if (!captionTracks || !Array.isArray(captionTracks) || captionTracks.length === 0) {
      throw new Error('No caption tracks found in extracted data');
    }

    console.log(`Found ${captionTracks.length} caption tracks`);

    // Select the best track
    let selectedTrack = captionTracks.find((track: any) => 
      track.languageCode === 'en' && track.kind !== 'asr'
    ) || captionTracks.find((track: any) => 
      track.languageCode?.startsWith('en')
    ) || captionTracks[0];

    if (!selectedTrack?.baseUrl) {
      throw new Error('No valid caption URL found in tracks');
    }

    console.log('Selected track:', {
      language: selectedTrack.languageCode,
      kind: selectedTrack.kind,
      name: selectedTrack.name?.simpleText || 'Unknown'
    });

    return await fetchCaptionContent(selectedTrack.baseUrl);

  } catch (error) {
    console.error('Enhanced method error:', error);
    throw error;
  }
}

async function getYouTubeTranscriptAlternativeURLs(videoId: string): Promise<string | null> {
  const urlVariants = [
    `https://www.youtube.com/watch?v=${videoId}&hl=en`,
    `https://www.youtube.com/watch?v=${videoId}&cc_load_policy=1`,
    `https://www.youtube.com/embed/${videoId}?cc_load_policy=1`,
    `https://m.youtube.com/watch?v=${videoId}`,
  ];

  for (const url of urlVariants) {
    try {
      console.log(`Trying URL variant: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        }
      });
      
      if (!response.ok) continue;
      
      const html = await response.text();
      console.log(`Fetched HTML from ${url}, length: ${html.length}`);
      
      // Quick check for captions
      if (html.includes('captionTracks')) {
        const match = html.match(/"captionTracks":\s*(\[[^\]]+\])/);
        if (match) {
          try {
            const tracks = JSON.parse(match[1]);
            const track = tracks.find((t: any) => t.languageCode?.startsWith('en')) || tracks[0];
            if (track?.baseUrl) {
              console.log(`Found captions in ${url}`);
              return await fetchCaptionContent(track.baseUrl);
            }
          } catch (e) {
            continue;
          }
        }
      }
    } catch (error) {
      console.log(`URL variant ${url} failed:`, error.message);
      continue;
    }
  }
  
  return null;
}

async function fetchCaptionContent(captionUrl: string): Promise<string | null> {
  try {
    console.log('Fetching caption content from:', captionUrl);
    
    const url = new URL(captionUrl);
    url.searchParams.set('fmt', 'srv3');
    
    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Caption fetch failed: ${response.status}`);
    }
    
    const captionXml = await response.text();
    console.log(`Fetched caption XML, length: ${captionXml.length}`);
    
    return parseCaptionXML(captionXml);

  } catch (error) {
    console.error('Error fetching caption content:', error);
    return null;
  }
}

function parseCaptionXML(captionXml: string): string | null {
  try {
    const textPatterns = [
      /<text[^>]*>(.*?)<\/text>/gs,
      /<p[^>]*>(.*?)<\/p>/gs,
      /<span[^>]*>(.*?)<\/span>/gs
    ];

    let textSegments: string[] = [];

    for (const pattern of textPatterns) {
      const matches = captionXml.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          let text = match[1]
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&apos;/g, "'")
            .replace(/<[^>]*>/g, '')
            .trim();
          
          if (text.length > 0) {
            textSegments.push(text);
          }
        }
      }
      
      if (textSegments.length > 0) break;
    }

    if (textSegments.length === 0) {
      console.log('No text segments found in caption XML');
      return null;
    }

    const transcript = textSegments.join(' ');
    console.log(`Parsed transcript with ${textSegments.length} segments, total length: ${transcript.length}`);
    
    return transcript;

  } catch (error) {
    console.error('Error parsing caption XML:', error);
    return null;
  }
}
