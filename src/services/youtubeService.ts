
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
  source: 'captions' | 'speech-to-text';
  suggestions?: string[];
}

export const extractVideoId = (url: string): string | null => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

export const getVideoInfo = async (videoId: string): Promise<VideoInfo | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('youtube-metadata', {
      body: { videoId }
    });

    if (error) {
      console.error('Error fetching video metadata:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching video info:', error);
    return null;
  }
};

export const getTranscript = async (videoId: string): Promise<string | null> => {
  try {
    console.log(`Attempting to get transcript for video: ${videoId}`);
    
    const { data, error } = await supabase.functions.invoke('youtube-transcript', {
      body: { videoId }
    });

    if (error) {
      console.error('Transcript extraction error:', error);
      
      // Check for specific error types
      if (error.message?.includes('No captions found')) {
        console.log('Video does not have accessible captions');
        return null;
      }
      
      return null;
    }

    if (data?.transcript && data.transcript.length > 50) {
      console.log(`Successfully extracted transcript, length: ${data.transcript.length}`);
      return data.transcript;
    } else {
      console.log('Transcript too short or empty');
      return null;
    }
    
  } catch (error) {
    console.error('Error in getTranscript:', error);
    return null;
  }
};

export const getTranscriptWithDetails = async (videoId: string): Promise<TranscriptResult | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('youtube-transcript', {
      body: { videoId }
    });

    if (error) {
      console.error('Error fetching transcript with details:', error);
      return null;
    }

    return {
      transcript: data.transcript,
      source: data.source || 'captions',
      suggestions: data.suggestions
    };
  } catch (error) {
    console.error('Error fetching transcript with details:', error);
    return null;
  }
};
