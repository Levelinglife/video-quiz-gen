
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

    // Method 1: Try YouTube's direct transcript API
    let transcript = await getYouTubeTranscriptDirect(videoId);
    
    if (!transcript) {
      // Method 2: Try page scraping with simplified approach
      transcript = await getYouTubeTranscriptSimple(videoId);
    }

    if (!transcript) {
      throw new Error('No captions found. This video may not have captions available, or they may be disabled. Please try a video that has captions enabled.');
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
        'Check if the video is public and accessible',
        'Some videos may have restricted caption access'
      ]
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function getYouTubeTranscriptDirect(videoId: string): Promise<string | null> {
  try {
    console.log('Trying YouTube transcript API...');
    
    // Get available caption tracks
    const trackListUrl = `https://www.youtube.com/api/timedtext?type=list&v=${videoId}`;
    const trackResponse = await fetch(trackListUrl);
    
    if (!trackResponse.ok) {
      console.log('Caption track list not available');
      return null;
    }
    
    const trackXml = await trackResponse.text();
    console.log(`Track list XML length: ${trackXml.length}`);
    
    if (trackXml.length < 50) { // Very short response likely means no captions
      console.log('No caption tracks found');
      return null;
    }
    
    // Look for English captions first, then any available
    const langMatches = [...trackXml.matchAll(/lang_code="([^"]+)"/g)];
    if (langMatches.length === 0) {
      console.log('No language codes found in track list');
      return null;
    }
    
    // Try English first, then fall back to any available language
    const englishLang = langMatches.find(match => match[1].startsWith('en'));
    const selectedLang = englishLang ? englishLang[1] : langMatches[0][1];
    
    console.log(`Using language: ${selectedLang}`);
    
    // Get the transcript content
    const transcriptUrl = `https://www.youtube.com/api/timedtext?lang=${selectedLang}&v=${videoId}&fmt=srv3`;
    const transcriptResponse = await fetch(transcriptUrl);
    
    if (!transcriptResponse.ok) {
      console.log('Failed to fetch transcript content');
      return null;
    }
    
    const transcriptXml = await transcriptResponse.text();
    return parseTranscriptXml(transcriptXml);
    
  } catch (error) {
    console.log('Direct API method failed:', error.message);
    return null;
  }
}

async function getYouTubeTranscriptSimple(videoId: string): Promise<string | null> {
  try {
    console.log('Trying simplified page scraping...');
    
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch video page: ${response.status}`);
    }
    
    const html = await response.text();
    console.log(`Fetched page HTML, length: ${html.length}`);
    
    // Look for caption tracks in the most common format
    const captionTrackPattern = /"captionTracks":\s*(\[.*?\])/s;
    const match = html.match(captionTrackPattern);
    
    if (!match) {
      console.log('No captionTracks found in page HTML');
      return null;
    }
    
    try {
      const tracks = JSON.parse(match[1]);
      console.log(`Found ${tracks.length} caption tracks`);
      
      if (tracks.length === 0) {
        return null;
      }
      
      // Find the best track (English if available, otherwise first available)
      const englishTrack = tracks.find((track: any) => 
        track.languageCode?.startsWith('en') && track.kind !== 'asr'
      );
      const selectedTrack = englishTrack || tracks.find((track: any) => 
        track.languageCode?.startsWith('en')
      ) || tracks[0];
      
      if (!selectedTrack?.baseUrl) {
        console.log('No valid caption URL found');
        return null;
      }
      
      console.log(`Selected track: ${selectedTrack.languageCode}, kind: ${selectedTrack.kind}`);
      
      // Fetch the caption content
      const captionResponse = await fetch(selectedTrack.baseUrl);
      if (!captionResponse.ok) {
        console.log('Failed to fetch caption content');
        return null;
      }
      
      const captionXml = await captionResponse.text();
      return parseTranscriptXml(captionXml);
      
    } catch (parseError) {
      console.log('Failed to parse caption tracks JSON:', parseError.message);
      return null;
    }
    
  } catch (error) {
    console.log('Simple scraping method failed:', error.message);
    return null;
  }
}

function parseTranscriptXml(xml: string): string | null {
  try {
    // Extract text from various XML formats
    const textPatterns = [
      /<text[^>]*>(.*?)<\/text>/gs,
      /<p[^>]*>(.*?)<\/p>/gs,
    ];
    
    let segments: string[] = [];
    
    for (const pattern of textPatterns) {
      const matches = [...xml.matchAll(pattern)];
      if (matches.length > 0) {
        segments = matches.map(match => {
          return match[1]
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/<[^>]*>/g, '') // Remove any remaining HTML tags
            .trim();
        }).filter(text => text.length > 0);
        
        if (segments.length > 0) {
          break;
        }
      }
    }
    
    if (segments.length === 0) {
      console.log('No text segments found in XML');
      return null;
    }
    
    const transcript = segments.join(' ');
    console.log(`Parsed ${segments.length} text segments, total length: ${transcript.length}`);
    
    return transcript;
    
  } catch (error) {
    console.log('Error parsing transcript XML:', error.message);
    return null;
  }
}
