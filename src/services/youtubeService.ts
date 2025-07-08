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

const GOOGLE_API_KEY = 'AIzaSyBqJ3Z5vQrKnWk2ql_UG7L6QCmGtFrBKrE'; // You'll need to replace this with your actual API key

export const extractVideoId = (url: string): string | null => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

export const getVideoInfo = async (videoId: string): Promise<VideoInfo | null> => {
  try {
    console.log(`Fetching video info for: ${videoId}`);
    
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${GOOGLE_API_KEY}&part=snippet,contentDetails,statistics`
    );

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      throw new Error('Video not found or is private');
    }

    const video = data.items[0];
    const duration = parseDuration(video.contentDetails.duration);

    const videoInfo = {
      id: video.id,
      title: video.snippet.title,
      description: video.snippet.description,
      thumbnail: video.snippet.thumbnails.maxresdefault?.url || video.snippet.thumbnails.high.url,
      duration: duration,
      channelTitle: video.snippet.channelTitle,
      publishedAt: video.snippet.publishedAt,
      viewCount: video.statistics.viewCount
    };

    console.log('Video info fetched successfully:', videoInfo.title);
    return videoInfo;
  } catch (error) {
    console.error('Error fetching video info:', error);
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
    console.log(`Starting transcript extraction for video: ${videoId}`);
    
    // Try to fetch transcript from YouTube's watch page
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    // Use a CORS proxy to fetch the YouTube page
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(watchUrl)}`;
    
    const response = await fetch(proxyUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch video page: ${response.status}`);
    }

    const data = await response.json();
    const html = data.contents;

    // Extract caption track URLs from the page
    const captionUrls = extractCaptionUrls(html);
    console.log(`Found ${captionUrls.length} caption tracks`);

    if (captionUrls.length === 0) {
      throw new Error('No captions found for this video. Please try a video with available captions (CC button visible on YouTube).');
    }

    // Try each caption URL
    for (const url of captionUrls) {
      try {
        console.log(`Trying caption URL...`);
        const transcript = await fetchCaptionContent(url);
        if (transcript) {
          console.log(`Transcript extracted successfully! Length: ${transcript.length} characters`);
          return transcript;
        }
      } catch (error) {
        console.error(`Failed to fetch caption:`, error);
        continue;
      }
    }

    throw new Error('Unable to extract transcript from any available caption track. The video may not have accessible captions.');
    
  } catch (error) {
    console.error('Error getting transcript:', error);
    throw error;
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