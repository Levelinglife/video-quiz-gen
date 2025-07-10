interface VideoSummary {
  keyPoints: string[];
  overview: string;
  tags: string[];
  insights: string[];
}

export const generateVideoSummary = async (transcript: string, videoTitle: string): Promise<VideoSummary> => {
  // For now, we'll generate a basic summary from the transcript
  // In the future, this can be enhanced with actual AI processing
  
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const keyWords = extractKeyWords(transcript);
  
  return {
    keyPoints: [
      `Main concepts from "${videoTitle}" are explored in detail`,
      "Practical applications and real-world examples provided",
      "Key methodologies and approaches explained",
      "Actionable insights for immediate implementation"
    ],
    overview: sentences.slice(0, 3).join('. ') + '.',
    tags: keyWords.slice(0, 4),
    insights: [
      "Video provides comprehensive educational content",
      "Structured approach to learning key concepts",
      "Practical skills development focus"
    ]
  };
};

const extractKeyWords = (text: string): string[] => {
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 4);
  
  const wordCount: { [key: string]: number } = {};
  words.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });
  
  return Object.entries(wordCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));
};