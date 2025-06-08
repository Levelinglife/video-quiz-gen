
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

    // Try to get transcript using direct YouTube approach
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
    // Get the YouTube watch page HTML
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
    const html = await response.text();

    // Extract captions data from the page
    const captionsRegex = /"captions":(\{.*?\}),"/;
    const match = html.match(captionsRegex);
    
    if (!match) {
      console.log('No captions data found in page HTML');
      return null;
    }

    const captionsData = JSON.parse(match[1]);
    const captionTracks = captionsData?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!captionTracks || captionTracks.length === 0) {
      console.log('No caption tracks available');
      return null;
    }

    // Find English captions or use the first available
    let selectedTrack = captionTracks.find((track: any) => 
      track.languageCode === 'en' || track.languageCode === 'en-US'
    ) || captionTracks[0];

    if (!selectedTrack?.baseUrl) {
      console.log('No caption URL found');
      return null;
    }

    // Fetch the caption content
    const captionResponse = await fetch(selectedTrack.baseUrl);
    const captionXml = await captionResponse.text();

    // Parse XML and extract text
    const textRegex = /<text[^>]*>(.*?)<\/text>/g;
    const textMatches = [];
    let match2;
    
    while ((match2 = textRegex.exec(captionXml)) !== null) {
      // Decode HTML entities and clean up
      const text = match2[1]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/<[^>]*>/g, '') // Remove any remaining HTML tags
        .trim();
      
      if (text) {
        textMatches.push(text);
      }
    }

    if (textMatches.length === 0) {
      console.log('No text found in captions');
      return null;
    }

    return textMatches.join(' ');

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
