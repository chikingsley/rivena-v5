import { useState, useEffect } from 'react';

/**
 * Custom hook to check if a CSS media query matches.
 * 
 * @param query - The CSS media query to check.
 * @returns A boolean indicating whether the media query matches.
 * 
 * Example: const isMobile = useMediaQuery('(max-width: 768px)');
 */
export function useMediaQuery(query: string): boolean {
  // Server-side rendering check
  const getMatches = (mediaQuery: string): boolean => {
    // Check if window is available (client side)
    if (typeof window !== 'undefined') {
      return window.matchMedia(mediaQuery).matches;
    }
    return false;
  };

  const [matches, setMatches] = useState<boolean>(getMatches(query));

  useEffect(() => {
    // Initial check
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    // Create a listener function to update the state when the media query changes
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Add the listener for changes
    mediaQuery.addEventListener('change', handleChange);

    // Clean up the listener on component unmount
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [query]);

  return matches;
}

export default useMediaQuery;
