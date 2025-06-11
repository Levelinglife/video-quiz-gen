
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
      throw new Error('Could not fetch video information. Please check the video URL and try again.');
    }

    console.log('Video info fetched successfully');
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
      
      // Handle specific error cases
      if (error.message?.includes('Edge Function returned a non-2xx status code')) {
        throw new Error('Transcript service is temporarily unavailable. Please try again in a moment.');
      }
      
      throw new Error('Could not extract transcript from this video. Please try a video with captions available.');
    }

    if (!data || !data.transcript) {
      console.log('No transcript data returned');
      return null;
    }

    console.log(`Transcript extracted successfully, length: ${data.transcript.length}`);
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
