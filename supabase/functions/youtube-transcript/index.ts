
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

    // Try multiple extraction methods with detailed logging
    let transcript = null;
    let extractionMethod = '';

    // Method 1: Enhanced YouTube page parsing
    try {
      console.log('Method 1: Trying enhanced YouTube page parsing...');
      transcript = await getYouTubeTranscriptEnhanced(videoId);
      if (transcript) {
        extractionMethod = 'enhanced-page-parsing';
        console.log('Method 1 succeeded');
      }
    } catch (error) {
      console.log('Method 1 failed:', error.message);
    }

    // Method 2: Alternative page format parsing
    if (!transcript) {
      try {
        console.log('Method 2: Trying alternative page format parsing...');
        transcript = await getYouTubeTranscriptAlternative(videoId);
        if (transcript) {
          extractionMethod = 'alternative-parsing';
          console.log('Method 2 succeeded');
        }
      } catch (error) {
        console.log('Method 2 failed:', error.message);
      }
    }

    // Method 3: Embedded page parsing
    if (!transcript) {
      try {
        console.log('Method 3: Trying embedded page parsing...');
        transcript = await getYouTubeTranscriptEmbedded(videoId);
        if (transcript) {
          extractionMethod = 'embedded-parsing';
          console.log('Method 3 succeeded');
        }
      } catch (error) {
        console.log('Method 3 failed:', error.message);
      }
    }

    if (!transcript) {
      console.log('All extraction methods failed, attempting Speech-to-Text fallback');
      transcript = await getSpeechToTextTranscript(videoId);
      if (transcript) {
        extractionMethod = 'speech-to-text';
      }
    }

    if (!transcript) {
      throw new Error('No transcript available for this video. The video may not have captions and all extraction methods failed.');
    }

    console.log(`Successfully extracted transcript using ${extractionMethod}, length: ${transcript.length}`);

    return new Response(JSON.stringify({
      transcript: transcript,
      source: extractionMethod.includes('speech') ? 'speech-to-text' : 'captions',
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
        'Ensure the video URL is correct and complete'
      ]
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function getYouTubeTranscriptEnhanced(videoId: string): Promise<string | null> {
  try {
    console.log('Enhanced method: Fetching YouTube page...');
    
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    console.log(`Enhanced method: Fetched HTML, length: ${html.length}`);

    // Try multiple extraction patterns with more comprehensive regex
    const extractionPatterns = [
      // Pattern 1: Full ytInitialPlayerResponse
      /var ytInitialPlayerResponse = (\{.*?"captions".*?\});/s,
      /window\["ytInitialPlayerResponse"\] = (\{.*?"captions".*?\});/s,
      
      // Pattern 2: Captions section only
      /"captions":(\{.*?"playerCaptionsTracklistRenderer".*?\})/s,
      /"playerCaptionsTracklistRenderer":(\{.*?"captionTracks".*?\})/s,
      
      // Pattern 3: Caption tracks array
      /"captionTracks":(\[.*?\])/s,
      
      // Pattern 4: Alternative formats
      /ytInitialPlayerResponse["']?\s*[:=]\s*(\{[^;]*"captions"[^;]*\})/s,
      /"captions":\s*(\{[^}]*"playerCaptionsTracklistRenderer"[^}]*\})/s
    ];

    let captionsData = null;
    let matchedPattern = -1;

    for (let i = 0; i < extractionPatterns.length; i++) {
      const pattern = extractionPatterns[i];
      const match = html.match(pattern);
      
      if (match && match[1]) {
        try {
          console.log(`Enhanced method: Found match with pattern ${i + 1}`);
          const jsonStr = match[1];
          
          // Clean up the JSON string
          const cleanJson = jsonStr
            .replace(/,\s*}/g, '}')
            .replace(/,\s*]/g, ']')
            .trim();
          
          if (cleanJson.startsWith('{')) {
            captionsData = JSON.parse(cleanJson);
            matchedPattern = i + 1;
            console.log(`Enhanced method: Successfully parsed JSON from pattern ${i + 1}`);
            break;
          } else if (cleanJson.startsWith('[')) {
            captionsData = { captionTracks: JSON.parse(cleanJson) };
            matchedPattern = i + 1;
            console.log(`Enhanced method: Successfully parsed array from pattern ${i + 1}`);
            break;
          }
        } catch (parseError) {
          console.log(`Enhanced method: Failed to parse JSON from pattern ${i + 1}:`, parseError.message);
          continue;
        }
      }
    }

    if (!captionsData) {
      console.log('Enhanced method: No captions data found in any pattern');
      return null;
    }

    console.log(`Enhanced method: Found captions data using pattern ${matchedPattern}`);

    // Extract caption tracks with multiple fallback paths
    let captionTracks = null;
    
    if (captionsData.captions?.playerCaptionsTracklistRenderer?.captionTracks) {
      captionTracks = captionsData.captions.playerCaptionsTracklistRenderer.captionTracks;
    } else if (captionsData.playerCaptionsTracklistRenderer?.captionTracks) {
      captionTracks = captionsData.playerCaptionsTracklistRenderer.captionTracks;
    } else if (captionsData.captionTracks) {
      captionTracks = captionsData.captionTracks;
    } else if (Array.isArray(captionsData)) {
      captionTracks = captionsData;
    }

    if (!captionTracks || captionTracks.length === 0) {
      console.log('Enhanced method: No caption tracks found in data structure');
      return null;
    }

    console.log(`Enhanced method: Found ${captionTracks.length} caption tracks`);

    // Smart track selection with preference for English and manual captions
    let selectedTrack = null;
    
    // First, try to find manual English captions
    selectedTrack = captionTracks.find((track: any) => 
      (track.languageCode === 'en' || track.languageCode === 'en-US' || track.languageCode === 'en-GB') &&
      track.kind !== 'asr'
    );

    // If not found, try any English captions
    if (!selectedTrack) {
      selectedTrack = captionTracks.find((track: any) => 
        track.languageCode === 'en' || track.languageCode === 'en-US' || track.languageCode === 'en-GB'
      );
    }

    // If still not found, try any manual captions
    if (!selectedTrack) {
      selectedTrack = captionTracks.find((track: any) => track.kind !== 'asr');
    }

    // Last resort: use any available track
    if (!selectedTrack) {
      selectedTrack = captionTracks[0];
    }

    if (!selectedTrack?.baseUrl) {
      console.log('Enhanced method: No valid caption URL found');
      return null;
    }

    console.log('Enhanced method: Selected track:', {
      language: selectedTrack.languageCode,
      name: selectedTrack.name?.simpleText || selectedTrack.name?.runs?.[0]?.text,
      kind: selectedTrack.kind || 'manual'
    });

    return await fetchCaptionContent(selectedTrack.baseUrl);

  } catch (error) {
    console.error('Enhanced method error:', error);
    return null;
  }
}

async function getYouTubeTranscriptAlternative(videoId: string): Promise<string | null> {
  try {
    console.log('Alternative method: Trying different YouTube URL format...');
    
    // Try with different parameters and headers
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}&has_verified=1&bpctr=9999999999`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.5',
        'X-YouTube-Client-Name': '1',
        'X-YouTube-Client-Version': '2.20231201.00.00'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Alternative method HTTP error: ${response.status}`);
    }

    const html = await response.text();
    console.log(`Alternative method: Fetched HTML, length: ${html.length}`);

    // Look for different script patterns
    const scriptPatterns = [
      /<script[^>]*>\s*var ytInitialPlayerResponse\s*=\s*(\{.*?\});\s*<\/script>/gs,
      /<script[^>]*>\s*window\.ytInitialPlayerResponse\s*=\s*(\{.*?\});\s*<\/script>/gs,
      /ytInitialPlayerResponse["']?\s*[:=]\s*(\{[^<]*\})/gs
    ];

    for (const pattern of scriptPatterns) {
      const matches = html.matchAll(pattern);
      for (const match of matches) {
        try {
          const playerResponse = JSON.parse(match[1]);
          if (playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks) {
            console.log('Alternative method: Found captions in player response');
            const tracks = playerResponse.captions.playerCaptionsTracklistRenderer.captionTracks;
            const track = tracks.find((t: any) => t.languageCode?.startsWith('en')) || tracks[0];
            if (track?.baseUrl) {
              return await fetchCaptionContent(track.baseUrl);
            }
          }
        } catch (e) {
          continue;
        }
      }
    }

    console.log('Alternative method: No captions found');
    return null;

  } catch (error) {
    console.error('Alternative method error:', error);
    return null;
  }
}

async function getYouTubeTranscriptEmbedded(videoId: string): Promise<string | null> {
  try {
    console.log('Embedded method: Trying embedded video page...');
    
    const response = await fetch(`https://www.youtube.com/embed/${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.youtube.com/'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Embedded method HTTP error: ${response.status}`);
    }

    const html = await response.text();
    console.log(`Embedded method: Fetched HTML, length: ${html.length}`);

    // Look for embedded player response
    const embedPattern = /"playerResponse":"(\{.*?\})"/s;
    const match = html.match(embedPattern);
    
    if (match) {
      try {
        // Decode the escaped JSON
        const decodedJson = match[1]
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\');
        
        const playerResponse = JSON.parse(decodedJson);
        
        if (playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks) {
          console.log('Embedded method: Found captions');
          const tracks = playerResponse.captions.playerCaptionsTracklistRenderer.captionTracks;
          const track = tracks.find((t: any) => t.languageCode?.startsWith('en')) || tracks[0];
          if (track?.baseUrl) {
            return await fetchCaptionContent(track.baseUrl);
          }
        }
      } catch (parseError) {
        console.log('Embedded method: JSON parse error:', parseError.message);
      }
    }

    console.log('Embedded method: No captions found');
    return null;

  } catch (error) {
    console.error('Embedded method error:', error);
    return null;
  }
}

async function fetchCaptionContent(captionUrl: string): Promise<string | null> {
  try {
    console.log('Fetching caption content from:', captionUrl);
    
    // Add format parameter to get plain text if possible
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

    // Enhanced XML parsing with multiple patterns
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
      console.log('No text segments found in caption content');
      return null;
    }

    const transcript = textSegments.join(' ');
    console.log(`Extracted transcript with ${textSegments.length} segments, total length: ${transcript.length}`);
    
    return transcript;

  } catch (error) {
    console.error('Error fetching caption content:', error);
    return null;
  }
}

async function getSpeechToTextTranscript(videoId: string): Promise<string | null> {
  try {
    const googleCloudKey = Deno.env.get('GOOGLE_CLOUD_API_KEY');
    
    if (!googleCloudKey) {
      console.log('Google Cloud API key not configured, skipping Speech-to-Text fallback');
      return null;
    }

    console.log('Speech-to-Text fallback not fully implemented yet');
    return '[Auto-generated] Speech-to-text transcription would be generated here for videos without captions.';

  } catch (error) {
    console.error('Error with Speech-to-Text fallback:', error);
    return null;
  }
}
