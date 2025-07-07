
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
    console.log(`Getting transcript for video: ${videoId}`);
    
    const { data, error } = await supabase.functions.invoke('youtube-transcript', {
      body: { videoId }
    });

    if (error) {
      console.error('Transcript function error:', error);
      
      // Check if it's a function not found error
      if (error.message?.includes('Function not found') || error.message?.includes('404')) {
        throw new Error('Transcript service is not available. Please check if the edge function is deployed.');
      }
      
      // Handle other specific error cases
      if (error.message?.includes('Edge Function returned a non-2xx status code')) {
        throw new Error('Transcript extraction failed. The video may not have captions available.');
      }
      
      throw new Error(`Transcript extraction failed: ${error.message}`);
    }

    if (!data) {
      console.log('No transcript data returned from function');
      throw new Error('No transcript data received from the service');
    }

    if (!data.transcript) {
      console.log('Transcript field is empty in response');
      throw new Error('The video does not have captions or subtitles available');
    }

    console.log(`Transcript extracted successfully - Length: ${data.transcript.length} characters, Source: ${data.source || 'unknown'}`);
    return data.transcript;
    
  } catch (error) {
    console.error('Error getting transcript:', error);
    throw error;
  }
};

export const getTranscriptWithDetails = async (videoId: string): Promise<TranscriptResult | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('youtube-transcript', {
      body: { videoId }
    });

    if (error || !data) {
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
