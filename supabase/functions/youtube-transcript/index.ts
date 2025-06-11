
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

    // Simple, direct approach to YouTube's transcript API
    const transcript = await getYouTubeTranscript(videoId);

    if (!transcript || transcript.length < 50) {
      throw new Error('No captions found. This video may not have captions available, or they may be disabled.');
    }

    console.log(`Successfully extracted transcript, length: ${transcript.length}`);

    return new Response(JSON.stringify({
      transcript: transcript,
      source: 'captions'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fetching YouTube transcript:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      suggestions: [
        'Make sure the video has captions/subtitles enabled',
        'Try a different educational video with clear speech',
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
    console.log('Attempting to get transcript via direct API...');
    
    // Step 1: Get available caption tracks
    const trackListUrl = `https://www.youtube.com/api/timedtext?type=list&v=${videoId}`;
    console.log(`Fetching caption tracks from: ${trackListUrl}`);
    
    const trackResponse = await fetch(trackListUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!trackResponse.ok) {
      console.log(`Track list request failed: ${trackResponse.status}`);
      return null;
    }
    
    const trackXml = await trackResponse.text();
    console.log(`Track list XML received, length: ${trackXml.length}`);
    
    if (trackXml.length < 100) {
      console.log('Track list too short, likely no captions');
      return null;
    }
    
    // Step 2: Extract language codes from the XML
    const langMatches = [...trackXml.matchAll(/lang_code="([^"]+)"/g)];
    console.log(`Found ${langMatches.length} language tracks`);
    
    if (langMatches.length === 0) {
      console.log('No language codes found');
      return null;
    }
    
    // Step 3: Try English first, then fall back to any available
    const englishLang = langMatches.find(match => match[1].startsWith('en'));
    const selectedLang = englishLang ? englishLang[1] : langMatches[0][1];
    
    console.log(`Using language: ${selectedLang}`);
    
    // Step 4: Get the actual transcript
    const transcriptUrl = `https://www.youtube.com/api/timedtext?lang=${selectedLang}&v=${videoId}&fmt=srv3`;
    console.log(`Fetching transcript from: ${transcriptUrl}`);
    
    const transcriptResponse = await fetch(transcriptUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!transcriptResponse.ok) {
      console.log(`Transcript request failed: ${transcriptResponse.status}`);
      return null;
    }
    
    const transcriptXml = await transcriptResponse.text();
    console.log(`Transcript XML received, length: ${transcriptXml.length}`);
    
    return parseTranscriptXml(transcriptXml);
    
  } catch (error) {
    console.log('Direct transcript method failed:', error.message);
    return null;
  }
}

function parseTranscriptXml(xml: string): string | null {
  try {
    // Extract text from XML format
    const textPattern = /<text[^>]*>(.*?)<\/text>/gs;
    const matches = [...xml.matchAll(textPattern)];
    
    if (matches.length === 0) {
      console.log('No text segments found in XML');
      return null;
    }
    
    const segments = matches.map(match => {
      return match[1]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/<[^>]*>/g, '')
        .trim();
    }).filter(text => text.length > 0);
    
    if (segments.length === 0) {
      console.log('No valid text segments found');
      return null;
    }
    
    const transcript = segments.join(' ');
    console.log(`Parsed ${segments.length} segments, total length: ${transcript.length}`);
    
    return transcript;
    
  } catch (error) {
    console.log('Error parsing transcript XML:', error.message);
    return null;
  }
}
