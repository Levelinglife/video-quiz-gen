
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
      throw new Error('Video ID is required');
    }

    console.log(`Getting transcript for video: ${videoId}`);

    // Try to get transcript using YouTube's timedtext API
    const transcript = await getTranscript(videoId);

    if (!transcript) {
      console.log('No transcript found');
      return new Response(JSON.stringify({ 
        error: 'No transcript available',
        suggestions: [
          'This video does not have captions or subtitles available',
          'Try a video with auto-generated or manual captions',
          'Educational videos often have better caption availability'
        ]
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Transcript found, length: ${transcript.length}`);

    return new Response(JSON.stringify({
      transcript: transcript,
      source: 'captions'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Transcript extraction error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to extract transcript',
      suggestions: [
        'Check if the video has captions enabled',
        'Try a different video with clear educational content',
        'Verify the YouTube URL is correct and the video is public'
      ]
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function getTranscript(videoId: string): Promise<string | null> {
  try {
    // Step 1: Get caption track list
    const trackUrl = `https://www.youtube.com/api/timedtext?type=list&v=${videoId}`;
    console.log(`Fetching caption tracks: ${trackUrl}`);
    
    const trackResponse = await fetch(trackUrl);
    if (!trackResponse.ok) {
      console.log(`Track request failed: ${trackResponse.status}`);
      return null;
    }
    
    const trackXml = await trackResponse.text();
    console.log(`Track XML length: ${trackXml.length}`);
    
    if (trackXml.length < 50) {
      console.log('No caption tracks found');
      return null;
    }
    
    // Step 2: Extract available languages
    const langMatches = trackXml.match(/lang_code="([^"]+)"/g);
    if (!langMatches || langMatches.length === 0) {
      console.log('No language codes found in tracks');
      return null;
    }
    
    // Extract the first language code
    const firstLang = langMatches[0].match(/lang_code="([^"]+)"/);
    if (!firstLang) {
      console.log('Could not parse language code');
      return null;
    }
    
    const langCode = firstLang[1];
    console.log(`Using language: ${langCode}`);
    
    // Step 3: Get the actual transcript
    const transcriptUrl = `https://www.youtube.com/api/timedtext?lang=${langCode}&v=${videoId}`;
    console.log(`Fetching transcript: ${transcriptUrl}`);
    
    const transcriptResponse = await fetch(transcriptUrl);
    if (!transcriptResponse.ok) {
      console.log(`Transcript request failed: ${transcriptResponse.status}`);
      return null;
    }
    
    const transcriptXml = await transcriptResponse.text();
    console.log(`Transcript XML length: ${transcriptXml.length}`);
    
    // Step 4: Parse the XML and extract text
    const textMatches = transcriptXml.match(/<text[^>]*>(.*?)<\/text>/g);
    if (!textMatches || textMatches.length === 0) {
      console.log('No text segments found');
      return null;
    }
    
    const textSegments = textMatches.map(match => {
      const textContent = match.replace(/<text[^>]*>/, '').replace(/<\/text>/, '');
      return textContent
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
    }).filter(text => text.length > 0);
    
    if (textSegments.length === 0) {
      console.log('No valid text segments');
      return null;
    }
    
    const fullTranscript = textSegments.join(' ');
    console.log(`Final transcript length: ${fullTranscript.length}`);
    
    return fullTranscript.length > 50 ? fullTranscript : null;
    
  } catch (error) {
    console.error('Error in getTranscript:', error);
    return null;
  }
}
