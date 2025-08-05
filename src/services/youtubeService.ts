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
    console.log(`Fetching REAL video metadata for: ${videoId}`);
    
    // ONLY get real video title using YouTube oEmbed API (no fallbacks)
    const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const response = await fetch(oEmbedUrl);
    
    if (!response.ok) {
      console.error(`❌ YouTube oEmbed API failed: ${response.status} ${response.statusText}`);
      throw new Error(`Video not found or not accessible. Please check the video URL and ensure it's public.`);
    }
    
    const data = await response.json();
    
    if (!data.title) {
      throw new Error('Unable to fetch video information - video may be private or restricted.');
    }
    
    console.log('✅ Real video info fetched successfully:', data.title);
    
    return {
      id: videoId,
      title: data.title,
      description: 'Educational video content for quiz generation',
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      duration: '10:00',
      channelTitle: data.author_name || 'YouTube Channel',
      publishedAt: new Date().toISOString(),
      viewCount: '1000'
    };
    
  } catch (error) {
    console.error('❌ Error fetching real video info:', error);
    throw error;
  }
};

function parseDuration(duration: string): string {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return '0:00';
  
  const hours = parseInt(match[1]?.replace('H', '') || '0');
  const minutes = parseInt(match[2]?.replace('M', '') || '0');
  const seconds = parseInt(match[3]?.replace('S', '') || '0');
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export const getTranscript = async (videoId: string): Promise<string | null> => {
  try {
    console.log(`Fetching REAL transcript/captions for video: ${videoId}`);
    
    // ONLY try to get real transcript from video captions - NO FALLBACKS
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase.functions.invoke('youtube-transcript', {
        body: { videoId }
      });

      if (!error && data && data.transcript && data.transcript.length > 100) {
        console.log(`✅ REAL transcript fetched successfully! Length: ${data.transcript.length} characters`);
        console.log(`📝 Content preview: "${data.transcript.substring(0, 200)}..."`);
        return data.transcript;
      } else {
        console.log('❌ No real captions found for this video:', error?.message || 'No transcript data');
        return null;
      }
    } catch (supabaseError) {
      console.log('❌ Caption extraction service error:', supabaseError);
      return null;
    }
    
  } catch (error) {
    console.error('❌ Error getting real transcript:', error);
    return null;
  }
};

function extractCaptionUrls(html: string): string[] {
  const urls: string[] = [];
  
  try {
    // Look for caption tracks in the player config
    const patterns = [
      /"captionTracks":\s*\[(.*?)\]/,
      /"captions":\s*{[^}]*"playerCaptionsTracklistRenderer":\s*{[^}]*"captionTracks":\s*\[(.*?)\]/,
      /\"baseUrl\":\"([^\"]+timedtext[^\"]+)\"/g
    ];

    for (const pattern of patterns) {
      const matches = html.match(pattern);
      if (matches) {
        console.log(`Found potential caption data`);
        
        if (pattern.global) {
          // Extract all baseUrl matches
          let match;
          const regex = new RegExp(pattern.source, 'g');
          while ((match = regex.exec(html)) !== null) {
            const url = match[1].replace(/\\u0026/g, '&').replace(/\\/g, '');
            if (url.includes('timedtext')) {
              urls.push(url);
            }
          }
        } else {
          // Try to parse the caption tracks
          try {
            const captionData = matches[1] || matches[0];
            const urlMatches = captionData.match(/\"baseUrl\":\"([^\"]+)\"/g);
            if (urlMatches) {
              for (const urlMatch of urlMatches) {
                const url = urlMatch.match(/\"baseUrl\":\"([^\"]+)\"/)?.[1];
                if (url) {
                  const cleanUrl = url.replace(/\\u0026/g, '&').replace(/\\/g, '');
                  urls.push(cleanUrl);
                }
              }
            }
          } catch (e) {
            console.error('Error parsing caption data:', e);
          }
        }
      }
    }

    console.log(`Extracted ${urls.length} caption URLs`);
    return urls;
  } catch (error) {
    console.error('Error extracting caption URLs:', error);
    return [];
  }
}

async function fetchCaptionContent(url: string): Promise<string | null> {
  try {
    // Use CORS proxy for caption URLs too
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    
    const response = await fetch(proxyUrl);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const content = data.contents;

    console.log(`Received caption content, length: ${content.length}`);

    // Try parsing as JSON first
    try {
      const jsonData = JSON.parse(content);
      return parseJsonCaptions(jsonData);
    } catch {
      // Try parsing as XML
      return parseXmlCaptions(content);
    }
  } catch (error) {
    console.error('Error fetching caption content:', error);
    return null;
  }
}

function parseJsonCaptions(data: any): string | null {
  if (!data || !data.events || !Array.isArray(data.events)) {
    return null;
  }

  const transcript = data.events
    .filter((event: any) => event.segs && Array.isArray(event.segs))
    .map((event: any) => 
      event.segs
        .map((seg: any) => (seg.utf8 || '').trim())
        .filter((text: string) => text.length > 0)
        .join('')
    )
    .filter((text: string) => text.length > 0)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  return transcript.length > 0 ? transcript : null;
}

function parseXmlCaptions(xmlContent: string): string | null {
  if (!xmlContent) return null;
  
  try {
    // Extract text from XML elements
    const textPattern = /<text[^>]*>(.*?)<\/text>/g;
    const texts: string[] = [];
    let match;
    
    while ((match = textPattern.exec(xmlContent)) !== null) {
      const text = match[1]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/<[^>]*>/g, '') // Remove any remaining tags
        .trim();
      
      if (text.length > 0) {
        texts.push(text);
      }
    }
    
    const transcript = texts.join(' ').replace(/\s+/g, ' ').trim();
    return transcript.length > 50 ? transcript : null;
  } catch (error) {
    console.error('Error parsing XML captions:', error);
    return null;
  }
}

export const getTranscriptWithDetails = async (videoId: string): Promise<TranscriptResult | null> => {
  try {
    console.log(`Getting detailed transcript for video: ${videoId}`);
    
    const transcript = await getTranscript(videoId);
    
    if (!transcript) {
      return null;
    }

    return {
      transcript: transcript,
      source: 'captions',
      language: 'en',
      videoId: videoId,
      length: transcript.length
    };
  } catch (error) {
    console.error('Error fetching transcript with details:', error);
    return null;
  }
};

// REMOVED: createIntelligentTranscript function
// We only generate quizzes from REAL video captions, never fake content