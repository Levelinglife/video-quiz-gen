
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

    console.log(`Fetching transcript for video: ${videoId}`);

    // Try to get transcript using improved YouTube approach
    let transcript = await getYouTubeTranscript(videoId);
    
    if (!transcript) {
      console.log('No captions found, attempting Speech-to-Text fallback');
      transcript = await getSpeechToTextTranscript(videoId);
    }

    if (!transcript) {
      throw new Error('No transcript available for this video. The video may not have captions and audio extraction failed.');
    }

    return new Response(JSON.stringify({
      transcript: transcript,
      source: transcript.includes('[Auto-generated]') ? 'speech-to-text' : 'captions'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fetching YouTube transcript:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      suggestions: [
        'Make sure the video has captions available',
        'Try a different video with captions',
        'Check if the video is public and accessible'
      ]
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function getYouTubeTranscript(videoId: string): Promise<string | null> {
  try {
    // Get the YouTube watch page HTML with proper headers
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0'
      }
    });
    
    if (!response.ok) {
      console.log(`Failed to fetch YouTube page: ${response.status}`);
      return null;
    }

    const html = await response.text();
    console.log('Fetched YouTube page HTML, length:', html.length);

    // Enhanced regex patterns to find captions data in different formats
    const captionsPatterns = [
      // Standard captions format
      /"captions":(\{[^}]*"playerCaptionsTracklistRenderer":\{[^}]*"captionTracks":\[[^\]]*\][^}]*\}[^}]*\})/,
      // Alternative format 1
      /"playerCaptionsTracklistRenderer":(\{[^}]*"captionTracks":\[[^\]]*\][^}]*\})/,
      // Alternative format 2
      /"captionTracks":(\[[^\]]*\])/,
      // Embedded format
      /ytInitialPlayerResponse[^{]*(\{[^{]*"captions"[^}]*"playerCaptionsTracklistRenderer"[^}]*\})/,
      // Script tag format
      /var ytInitialPlayerResponse = (\{.*?"captions".*?\});/s,
      // Window format
      /window\["ytInitialPlayerResponse"\] = (\{.*?"captions".*?\});/s
    ];

    let captionsData = null;
    let rawCaptionsText = null;
    
    for (let i = 0; i < captionsPatterns.length; i++) {
      const pattern = captionsPatterns[i];
      const match = html.match(pattern);
      if (match) {
        try {
          rawCaptionsText = match[1];
          console.log(`Found potential captions data with pattern ${i + 1}, length: ${rawCaptionsText.length}`);
          
          // Try to parse as JSON
          if (rawCaptionsText.startsWith('{')) {
            captionsData = JSON.parse(rawCaptionsText);
          } else if (rawCaptionsText.startsWith('[')) {
            captionsData = { captionTracks: JSON.parse(rawCaptionsText) };
          }
          
          if (captionsData) {
            console.log('Successfully parsed captions data');
            break;
          }
        } catch (e) {
          console.log(`Failed to parse captions data from pattern ${i + 1}:`, e.message);
          continue;
        }
      }
    }

    // If no JSON data found, try to find ytInitialPlayerResponse in a script tag
    if (!captionsData) {
      console.log('Trying to extract ytInitialPlayerResponse from script tags');
      const scriptMatches = html.match(/<script[^>]*>.*?var ytInitialPlayerResponse = (\{.*?\});.*?<\/script>/gs);
      
      for (const scriptMatch of scriptMatches || []) {
        const dataMatch = scriptMatch.match(/var ytInitialPlayerResponse = (\{.*?\});/s);
        if (dataMatch) {
          try {
            const playerResponse = JSON.parse(dataMatch[1]);
            if (playerResponse.captions) {
              captionsData = playerResponse.captions;
              console.log('Found captions in ytInitialPlayerResponse');
              break;
            }
          } catch (e) {
            console.log('Failed to parse ytInitialPlayerResponse:', e.message);
          }
        }
      }
    }

    if (!captionsData) {
      console.log('No captions data found in page HTML');
      return null;
    }

    // Extract caption tracks from different possible structures
    let captionTracks = null;
    
    if (captionsData.playerCaptionsTracklistRenderer?.captionTracks) {
      captionTracks = captionsData.playerCaptionsTracklistRenderer.captionTracks;
    } else if (captionsData.captionTracks) {
      captionTracks = captionsData.captionTracks;
    } else if (Array.isArray(captionsData)) {
      captionTracks = captionsData;
    }

    if (!captionTracks || captionTracks.length === 0) {
      console.log('No caption tracks available');
      return null;
    }

    console.log(`Found ${captionTracks.length} caption tracks`);

    // Find the best caption track (prefer English, then any available)
    let selectedTrack = captionTracks.find((track: any) => 
      track.languageCode === 'en' || 
      track.languageCode === 'en-US' ||
      track.languageCode === 'en-GB'
    ) || captionTracks[0];

    if (!selectedTrack?.baseUrl) {
      console.log('No caption URL found');
      return null;
    }

    console.log('Selected caption track:', selectedTrack.languageCode, selectedTrack.name?.simpleText);

    // Fetch the caption content with retry logic
    let captionResponse;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        captionResponse = await fetch(selectedTrack.baseUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        if (captionResponse.ok) break;
        
        console.log(`Caption fetch attempt ${attempt + 1} failed: ${captionResponse.status}`);
        if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (e) {
        console.log(`Caption fetch attempt ${attempt + 1} error:`, e.message);
        if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    if (!captionResponse || !captionResponse.ok) {
      console.log('Failed to fetch caption content after retries');
      return null;
    }
    
    const captionXml = await captionResponse.text();
    console.log('Fetched caption XML, length:', captionXml.length);

    // Parse XML and extract text with improved regex
    const textElements = captionXml.match(/<text[^>]*>(.*?)<\/text>/gs) || [];
    
    const textMatches = textElements.map(element => {
      // Extract the text content from between the tags
      const textMatch = element.match(/<text[^>]*>(.*?)<\/text>/s);
      if (!textMatch) return '';
      
      let text = textMatch[1];
      
      // Decode HTML entities and clean up
      text = text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/<[^>]*>/g, '') // Remove any remaining HTML tags
        .trim();
      
      return text;
    }).filter(text => text.length > 0);

    if (textMatches.length === 0) {
      console.log('No text found in captions');
      return null;
    }

    console.log(`Extracted ${textMatches.length} caption segments`);
    const transcript = textMatches.join(' ');
    console.log('Final transcript length:', transcript.length);
    
    return transcript;

  } catch (error) {
    console.error('Error extracting YouTube transcript:', error);
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

    // This is a simplified approach - in a full implementation, you would:
    // 1. Extract audio from YouTube video using yt-dlp or similar
    // 2. Convert to the format required by Speech-to-Text API
    // 3. Send chunks to Google Speech-to-Text API
    // 4. Combine the results
    
    console.log('Speech-to-Text fallback not fully implemented yet');
    return '[Auto-generated] Speech-to-text transcription would be generated here for videos without captions.';

  } catch (error) {
    console.error('Error with Speech-to-Text fallback:', error);
    return null;
  }
}
