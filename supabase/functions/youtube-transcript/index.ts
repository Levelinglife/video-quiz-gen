
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
      console.log('No video ID provided');
      return new Response(JSON.stringify({ 
        error: 'Video ID is required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Attempting to get transcript for video: ${videoId}`);

    // Try to get transcript using YouTube's timedtext API
    const transcript = await getYouTubeTranscript(videoId);

    if (!transcript) {
      console.log('No transcript found for video');
      return new Response(JSON.stringify({ 
        error: 'No transcript available for this video',
        message: 'This video does not have captions or subtitles available. Please try a video with auto-generated or manual captions enabled.'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Transcript extracted successfully, length: ${transcript.length} characters`);

    return new Response(JSON.stringify({
      transcript: transcript,
      source: 'youtube-captions',
      length: transcript.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Transcript extraction error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to extract transcript',
      message: error.message || 'An unexpected error occurred while extracting the transcript',
      details: 'Please check if the video has captions enabled and is publicly accessible'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function getYouTubeTranscript(videoId: string): Promise<string | null> {
  try {
    console.log(`Starting transcript extraction for ${videoId}`);
    
    // Step 1: Get the list of available caption tracks
    const trackListUrl = `https://www.youtube.com/api/timedtext?type=list&v=${videoId}`;
    console.log(`Fetching caption track list from: ${trackListUrl}`);
    
    const trackResponse = await fetch(trackListUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!trackResponse.ok) {
      console.log(`Track list request failed with status: ${trackResponse.status}`);
      return null;
    }
    
    const trackXml = await trackResponse.text();
    console.log(`Track XML response length: ${trackXml.length}`);
    
    if (trackXml.length < 20 || !trackXml.includes('track')) {
      console.log('No caption tracks found in response');
      return null;
    }
    
    // Step 2: Extract the first available language
    const langMatch = trackXml.match(/lang_code="([^"]+)"/);
    if (!langMatch) {
      console.log('No language code found in track list');
      return null;
    }
    
    const langCode = langMatch[1];
    console.log(`Found language code: ${langCode}`);
    
    // Step 3: Fetch the actual transcript
    const transcriptUrl = `https://www.youtube.com/api/timedtext?lang=${langCode}&v=${videoId}&fmt=srv3`;
    console.log(`Fetching transcript from: ${transcriptUrl}`);
    
    const transcriptResponse = await fetch(transcriptUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!transcriptResponse.ok) {
      console.log(`Transcript request failed with status: ${transcriptResponse.status}`);
      return null;
    }
    
    const transcriptXml = await transcriptResponse.text();
    console.log(`Transcript XML response length: ${transcriptXml.length}`);
    
    // Step 4: Parse the XML and extract text content
    const textMatches = transcriptXml.match(/<text[^>]*>(.*?)<\/text>/g);
    if (!textMatches || textMatches.length === 0) {
      console.log('No text elements found in transcript XML');
      return null;
    }
    
    console.log(`Found ${textMatches.length} text segments`);
    
    // Step 5: Clean and combine the text
    const cleanedSegments = textMatches
      .map(match => {
        // Extract text content between tags
        const textContent = match.replace(/<text[^>]*>/, '').replace(/<\/text>/, '');
        
        // Decode HTML entities
        return textContent
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&nbsp;/g, ' ')
          .trim();
      })
      .filter(text => text.length > 0);
    
    if (cleanedSegments.length === 0) {
      console.log('No valid text segments after cleaning');
      return null;
    }
    
    const fullTranscript = cleanedSegments.join(' ');
    console.log(`Final transcript length: ${fullTranscript.length} characters`);
    
    return fullTranscript.length > 10 ? fullTranscript : null;
    
  } catch (error) {
    console.error('Error in getYouTubeTranscript:', error);
    return null;
  }
}
