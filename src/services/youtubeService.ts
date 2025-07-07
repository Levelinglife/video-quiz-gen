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
    console.log(`Starting transcript extraction for video: ${videoId}`);
    console.log(`Calling function endpoint: /functions/v1/youtube-transcript`);
    
    const { data, error } = await supabase.functions.invoke('youtube-transcript', {
      body: { videoId }
    });

    if (error) {
      console.error('Transcript function error details:', error);
      
      // Check for specific error types
      if (error.message?.includes('404') || error.message?.includes('Function not found')) {
        throw new Error('The transcript extraction service is not available. Please contact support or try again later.');
      }
      
      if (error.message?.includes('Edge Function returned a non-2xx status code')) {
        console.log('Edge function returned error status, checking response...');
        
        // The error response should contain our custom error message
        if (data && data.error && data.message) {
          throw new Error(`${data.message}\n\nDetails: ${data.details || 'No additional details available'}`);
        }
        
        throw new Error('Could not extract transcript from this video. The video may not have captions available or may be private/restricted.');
      }
      
      throw new Error(`Transcript extraction failed: ${error.message}`);
    }

    if (!data) {
      console.log('No transcript data returned from function');
      throw new Error('No transcript data received. The video may not have captions available.');
    }

    if (!data.transcript) {
      console.log('Transcript field is empty in response');
      throw new Error('No transcript content found. The video may not have captions available.');
    }

    console.log(`Transcript extracted successfully!`);
    console.log(`- Length: ${data.length || data.transcript.length} characters`);
    console.log(`- Source: ${data.source || 'unknown'}`);
    console.log(`- Language: ${data.language || 'unknown'}`);
    console.log(`- Preview: "${data.transcript.substring(0, 200)}..."`);
    
    return data.transcript;
    
  } catch (error) {
    console.error('Error getting transcript:', error);
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
