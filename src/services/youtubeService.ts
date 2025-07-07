import { supabase } from "@/integrations/supabase/client";

export interface VideoInfo {
  id: string;
  title: string;
  description?: string;
  thumbnail: string;
  duration: string;
  channelTitle?: string;
  publishedAt?: string;
  viewCount?: string;
}

export interface TranscriptResult {
  transcript: string;
  source: 'auto-generated' | 'manual' | 'alternative' | 'captions';
  language?: string;
  videoId?: string;
  length?: number;
}

export const extractVideoId = (url: string): string | null => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

export const getVideoInfo = async (videoId: string): Promise<VideoInfo | null> => {
  try {
    console.log(`Fetching video info for: ${videoId}`);
    
    const { data, error } = await supabase.functions.invoke('youtube-metadata', {
      body: { videoId }
    });

    if (error) {
      console.error('Error fetching video metadata:', error);
      throw new Error(`Could not fetch video information: ${error.message}`);
    }

    if (!data) {
      throw new Error('No video data returned from metadata service');
    }

    console.log('Video info fetched successfully:', data.title);
    return data;
  } catch (error) {
    console.error('Error fetching video info:', error);
    throw error;
  }
};

export const getTranscript = async (videoId: string): Promise<string | null> => {
  try {
    console.log(`Starting comprehensive transcript extraction for video: ${videoId}`);
    
    const { data, error } = await supabase.functions.invoke('youtube-transcript', {
      body: { videoId }
    });

    if (error) {
      console.error('Complete transcript function error details:', error);
      
      // More detailed error messages based on common issues
      if (error.message?.includes('Function not found') || error.message?.includes('404')) {
        throw new Error('Transcript service is temporarily unavailable. Please try again in a moment.');
      }
      
      if (error.message?.includes('Edge Function returned a non-2xx status code')) {
        console.log('Edge function returned non-2xx status, checking for more details...');
        
        // Try to get more specific error information
        try {
          const errorDetails = JSON.parse(error.message || '{}');
          if (errorDetails.error) {
            throw new Error(`Transcript extraction failed: ${errorDetails.error}\n${errorDetails.message || ''}\n${errorDetails.details || ''}`);
          }
        } catch (parseError) {
          // Fallback to generic error
          console.error('Could not parse error details:', parseError);
        }
        
        throw new Error('Could not extract transcript from this video. This could be because:\n• The video doesn\'t have captions or subtitles\n• The video is in a language that isn\'t supported\n• The video is too short or doesn\'t contain speech\n• The video may be music-only or have background music that interferes with speech recognition\n\nTry using a video that has captions available or clear speech content.');
      }
      
      throw new Error(`Transcript extraction failed: ${error.message}`);
    }

    if (!data) {
      console.log('No transcript data returned from comprehensive function');
      throw new Error('Could not extract transcript from this video. This could be because:\n• The video doesn\'t have captions or subtitles\n• The video is in a language that isn\'t supported\n• The video is too short or doesn\'t contain speech\n• The video may be music-only or have background music that interferes with speech recognition\n\nTry using a video that has captions available or clear speech content.');
    }

    if (!data.transcript) {
      console.log('Transcript field is empty in comprehensive response');
      throw new Error('Could not extract transcript from this video. This could be because:\n• The video doesn\'t have captions or subtitles\n• The video is in a language that isn\'t supported\n• The video is too short or doesn\'t contain speech\n• The video may be music-only or have background music that interferes with speech recognition\n\nTry using a video that has captions available or clear speech content.');
    }

    console.log(`Comprehensive transcript extracted successfully!`);
    console.log(`- Length: ${data.length || data.transcript.length} characters`);
    console.log(`- Source: ${data.source || 'unknown'}`);
    console.log(`- Language: ${data.language || 'unknown'}`);
    console.log(`- Preview: "${data.transcript.substring(0, 200)}..."`);
    
    return data.transcript;
    
  } catch (error) {
    console.error('Error getting comprehensive transcript:', error);
    throw error;
  }
};

export const getTranscriptWithDetails = async (videoId: string): Promise<TranscriptResult | null> => {
  try {
    console.log(`Getting detailed transcript for video: ${videoId}`);
    
    const { data, error } = await supabase.functions.invoke('youtube-transcript', {
      body: { videoId }
    });

    if (error) {
      console.error('Error fetching transcript with details:', error);
      return null;
    }

    if (!data || !data.transcript) {
      console.log('No transcript data in detailed response');
      return null;
    }

    return {
      transcript: data.transcript,
      source: data.source || 'captions',
      language: data.language,
      videoId: data.videoId || videoId,
      length: data.length || data.transcript.length
    };
  } catch (error) {
    console.error('Error fetching transcript with details:', error);
    return null;
  }
};
