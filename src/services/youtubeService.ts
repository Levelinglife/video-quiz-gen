
export interface VideoInfo {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
}

export interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

export const extractVideoId = (url: string): string | null => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

export const getVideoInfo = async (videoId: string): Promise<VideoInfo | null> => {
  try {
    // Using YouTube Data API v3 (requires API key)
    // For now, we'll return mock data based on video ID
    return {
      id: videoId,
      title: "Video Title - " + videoId,
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      duration: "10:30"
    };
  } catch (error) {
    console.error('Error fetching video info:', error);
    return null;
  }
};

export const getTranscript = async (videoId: string): Promise<string | null> => {
  try {
    // This would normally call a backend service that uses youtube-transcript-api
    // For now, we'll simulate with a realistic transcript
    const mockTranscript = `
      Welcome to this comprehensive tutorial on React Hooks. In this video, we'll explore the fundamentals of hooks and how they revolutionize the way we write React components.

      First, let's understand what React Hooks are. Hooks are functions that let you "hook into" React state and lifecycle features from function components. They were introduced in React 16.8 and have completely changed how we approach React development.

      The most commonly used hook is useState. This hook allows you to add state to functional components. Before hooks, you needed class components to manage state. Now, with useState, you can manage state in a much simpler and more intuitive way.

      Let me show you how useState works. When you call useState, it returns an array with two elements: the current state value and a function to update it. This pattern is called array destructuring.

      Another essential hook is useEffect. This hook serves the same purpose as componentDidMount, componentDidUpdate, and componentWillUnmount combined in React class components. It's perfect for handling side effects like data fetching, subscriptions, or manually changing the DOM.

      The key to understanding useEffect is the dependency array. This array tells React when to re-run the effect. If you pass an empty array, the effect runs only once after the initial render. If you include variables in the array, the effect runs whenever those variables change.

      Advanced hooks like useContext, useReducer, and useMemo provide even more powerful ways to manage state and optimize performance. useContext allows you to consume context values without nesting, useReducer is great for complex state logic, and useMemo helps optimize expensive calculations.

      The rules of hooks are important to remember: only call hooks at the top level of your function, never inside loops, conditions, or nested functions. This ensures that hooks are called in the same order every time the component renders.

      By mastering these concepts, you'll be able to write cleaner, more maintainable React code. Hooks make it easier to share stateful logic between components and reduce the complexity of your component tree.

      Thank you for watching this tutorial. I hope you found it helpful and that you're now ready to start using hooks in your own React projects.
    `;
    
    return mockTranscript.trim();
  } catch (error) {
    console.error('Error fetching transcript:', error);
    return null;
  }
};
